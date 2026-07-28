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

export interface DiscordSession {
  /** Still deciding, or running the handshake. */
  readonly status: 'checking' | 'ready' | 'unavailable' | 'error';
  readonly inDiscord: boolean;
  /** Shared by everyone who launched this Activity together. */
  readonly instanceId: string | null;
  readonly displayName: string | null;
  readonly error: string | null;
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

    void (async () => {
      try {
        // Imported lazily so the SDK never lands in the bundle path taken by
        // ordinary web visitors.
        const { DiscordSDK } = await import('@discord/embedded-app-sdk');
        const sdk = new DiscordSDK(clientId);
        await sdk.ready();

        const { code } = await sdk.commands.authorize({
          client_id: clientId,
          response_type: 'code',
          state: '',
          prompt: 'none',
          // Just enough to show who is at the table.
          scope: ['identify'],
        });

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
        const payload = (await response.json()) as { access_token?: string; error?: string };
        if (!payload.access_token) throw new Error(payload.error ?? 'token exchange failed');

        const auth = await sdk.commands.authenticate({ access_token: payload.access_token });
        if (cancelled) return;

        setSession({
          status: 'ready',
          inDiscord: true,
          instanceId: sdk.instanceId,
          displayName: auth.user.global_name ?? auth.user.username,
          error: null,
        });
      } catch (cause) {
        if (cancelled) return;
        setSession({
          status: 'error',
          inDiscord: true,
          instanceId: null,
          displayName: null,
          error: cause instanceof Error ? cause.message : 'Discord handshake failed',
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [clientId]);

  return session;
}
