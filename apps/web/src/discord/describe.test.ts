import { describe as group, expect, it } from 'vitest';
import { describe } from './useDiscord';

group('describe', () => {
  it('uses the message of a real Error', () => {
    expect(describe(new Error('token exchange failed'))).toBe('token exchange failed');
  });

  it('reads Discord RPC rejections, which are not Errors', () => {
    // This is the shape that used to be discarded entirely, leaving the screen
    // saying only "Discord handshake failed".
    expect(describe({ code: 4006, message: 'Not authenticated' })).toBe(
      'code 4006 — Not authenticated',
    );
  });

  it('reads OAuth error payloads', () => {
    expect(describe({ error: 'invalid_client', error_description: 'Invalid client secret' })).toBe(
      'Invalid client secret',
    );
  });

  it('falls back to the code alone when there is no message', () => {
    expect(describe({ code: 4009 })).toBe('code 4009');
  });

  it('serialises anything else rather than dropping it', () => {
    expect(describe({ weird: true })).toBe('{"weird":true}');
  });

  it('admits when there is genuinely nothing', () => {
    for (const nothing of [undefined, null, {}]) {
      expect(describe(nothing)).toBe('Discord gave no reason');
    }
  });

  it('survives a circular payload', () => {
    const circular: Record<string, unknown> = {};
    circular['self'] = circular;
    expect(describe(circular)).toBe('Discord gave no reason');
  });
});
