/**
 * Discord Activity integration.
 *
 * An Activity *is* this web app, loaded in an iframe inside Discord — so there
 * is no separate Discord build. This hook detects that context, runs the SDK
 * handshake, and hands back the player's Discord name plus the instance id that
 * puts everyone in the same voice channel at the same table.
 *
 * Outside Discord it does nothing and reports `inDiscord: false`, so the plain
 * website is completely unaffected.
 */

import { useEffect, useRef, useState } from 'react';

/**
 * The handshake in order. Each step fails for entirely different reasons, and
 * the only thing on screen is whatever this hook reports — so the step that
 * failed is the single most useful fact to carry out of it.
 */
export type HandshakeStage =
  | 'loading the Discord SDK'
  | 'handshaking with the Discord client'
  | 'asking Discord to authorise this app'
  | 'exchanging the code for a token on the server'
  | 'signing in with the token';

export interface DiscordSession {
  /** Still deciding, or running the handshake. */
  readonly status: 'checking' | 'ready' | 'unavailable' | 'error';
  readonly inDiscord: boolean;
  /** Shared by everyone who launched this Activity together. */
  readonly instanceId: string | null;
  readonly displayName: string | null;
  readonly error: string | null;
  /** Where it broke, when it broke. */
  readonly stage: HandshakeStage | null;
}

/**
 * Turns whatever was thrown into something worth putting on screen.
 *
 * This matters more than it looks: the Discord SDK rejects with plain RPC
 * payloads — `{ code, message }` — not `Error`s, so an `instanceof Error` check
 * discards precisely the detail that identifies the problem.
 */
export function describe(cause: unknown): string {
  if (cause instanceof Error) return cause.message;
  if (typeof cause === 'string') return cause;

  if (cause && typeof cause === 'object') {
    const record = cause as Record<string, unknown>;
    const code = record['code'];
    // Discord nests the useful half under `message` on some rejections and
    // under OAuth's `error_description` on others.
    const message = record['message'] ?? record['error_description'] ?? record['error'];

    const parts: string[] = [];
    if (typeof code === 'number' || typeof code === 'string') parts.push(`code ${code}`);
    if (typeof message === 'string' && message) parts.push(message);
    if (parts.length) return parts.join(' — ');

    try {
      const json = JSON.stringify(cause);
      if (json && json !== '{}') return json;
    } catch {
      // Circular, which tells us nothing either way.
    }
  }

  return 'Discord gave no reason';
}

/** A snippet of a non-JSON response body, enough to recognise what it was. */
function describeBody(body: string): string {
  const trimmed = body.trim();
  if (!trimmed) return 'an empty body';
  if (trimmed.startsWith('<')) return 'HTML';
  return `"${trimmed.slice(0, 60)}"`;
}

/**
 * `prompt: 'none'` is the documented path and is what should happen every time:
 * launching an Activity is itself consent, so the user should never see a
 * dialog. When the application has not been authorised by this account at all,
 * though, Discord has nothing to silently reuse and refuses. Asking once,
 * explicitly, is a far better outcome than a dead screen.
 */
async function authorize(
  sdk: { commands: { authorize: (args: never) => Promise<{ code: string }> } },
  clientId: string,
): Promise<{ code: string }> {
  const request = (prompt: 'none' | 'consent') =>
    sdk.commands.authorize({
      client_id: clientId,
      response_type: 'code',
      state: '',
      prompt,
      // Just enough to show who is at the table.
      scope: ['identify'],
    } as never);

  try {
    return await request('none');
  } catch (silent) {
    console.warn('[flens] silent authorize failed, asking for consent', silent);
    try {
      return await request('consent');
    } catch (consented) {
      // Report both: if the retry fails the same way, the cause is upstream of
      // consent and the first message is the honest one.
      throw new Error(`${describe(consented)} (silent attempt: ${describe(silent)})`);
    }
  }
}

/**
 * Discord always passes these in the iframe URL. Their presence is the only
 * reliable signal, and checking it first means the SDK is never even imported
 * for ordinary web visitors.
 */
export function isRunningInDiscord(): boolean {
  if (typeof window === 'undefined') return false;
  const params = new URLSearchParams(window.location.search);
  return params.has('frame_id') && params.has('instance_id');
}

export function useDiscord(clientId: string | undefined): DiscordSession {
  const [session, setSession] = useState<DiscordSession>({
    status: isRunningInDiscord() ? 'checking' : 'unavailable',
    inDiscord: isRunningInDiscord(),
    instanceId: null,
    displayName: null,
    error: null,
    stage: null,
  });

  // React 18 StrictMode mounts effects twice in development; the SDK handshake
  // must not run twice against the same frame.
  const startedRef = useRef(false);

  useEffect(() => {
    if (!isRunningInDiscord() || startedRef.current) return;
    startedRef.current = true;

    if (!clientId) {
      setSession((s) => ({
        ...s,
        status: 'error',
        error: 'VITE_DISCORD_CLIENT_ID is not set in this build',
      }));
      return;
    }

    let cancelled = false;

    // Which step is in flight, so a failure can name it. Every stage here is a
    // different thing to go and fix, and without the label they are
    // indistinguishable from the outside.
    let stage: HandshakeStage = 'loading the Discord SDK';

    void (async () => {
      try {
        // Imported lazily so the SDK never lands in the bundle path taken by
        // ordinary web visitors.
        const { DiscordSDK } = await import('@discord/embedded-app-sdk');
        const sdk = new DiscordSDK(clientId);

        stage = 'handshaking with the Discord client';
        await sdk.ready();

        stage = 'asking Discord to authorise this app';
        const { code } = await authorize(sdk, clientId);

        stage = 'exchanging the code for a token on the server';
        // The exchange happens server-side; the client secret never ships here.
        // The path depends on the application's URL mapping, so it is overridable.
        const tokenPath =
          (import.meta.env['VITE_DISCORD_TOKEN_PATH'] as string | undefined) ??
          '/.proxy/api/discord/token';
        const response = await fetch(tokenPath, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ code }),
        });

        // A URL mapping that misses this route answers with the SPA's HTML, and
        // parsing that as JSON produces an error about an unexpected `<` that
        // says nothing about the actual problem.
        const body = await response.text();
        let payload: { access_token?: string; error?: string };
        try {
          payload = JSON.parse(body);
        } catch {
          throw new Error(
            `${tokenPath} answered ${response.status} with ${describeBody(body)} instead of JSON — ` +
              'check the URL mapping for this route',
          );
        }
        if (!payload.access_token) {
          throw new Error(payload.error ?? `token exchange failed (${response.status})`);
        }

        stage = 'signing in with the token';
        const auth = await sdk.commands.authenticate({ access_token: payload.access_token });
        if (cancelled) return;

        setSession({
          status: 'ready',
          inDiscord: true,
          instanceId: sdk.instanceId,
          displayName: auth.user.global_name ?? auth.user.username,
          error: null,
          stage: null,
        });
      } catch (cause) {
        if (cancelled) return;
        // The raw value goes to the console too: `describe` is deliberately
        // short, and inside Discord devtools is one right-click away.
        console.error(`[flens] Discord handshake failed while ${stage}`, cause);
        setSession({
          status: 'error',
          inDiscord: true,
          instanceId: null,
          displayName: null,
          error: `Failed while ${stage}: ${describe(cause)}`,
          stage,
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [clientId]);

  return session;
}
