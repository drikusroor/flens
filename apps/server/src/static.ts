/**
 * Static file serving for the built web app.
 *
 * In production the server is the *only* host: it serves `apps/web/dist` and
 * the WebSocket and the Discord token endpoint, all on one origin. That is
 * what makes the Discord setup tractable — one URL mapping (`/` → this host)
 * instead of three, and no CORS anywhere.
 *
 * Kept deliberately small: this serves a hashed-asset SPA bundle, nothing more.
 * No directory listings, no range requests, no compression — put a CDN in front
 * if any of that starts to matter.
 */

import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { extname, join, resolve, sep } from 'node:path';
import type { ServerResponse } from 'node:http';

const CONTENT_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.map': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
};

export interface StaticHandler {
  /**
   * Serves `path` if it resolves to a file under the root, falling back to
   * `index.html` for client-side routes. Returns false when there is nothing
   * to serve, so the caller can 404 in its own voice.
   */
  (path: string, res: ServerResponse): Promise<boolean>;
}

export function createStaticHandler(rootDir: string): StaticHandler {
  const root = resolve(rootDir);

  return async function serve(path, res) {
    // Query strings and hashes are not part of the file name.
    const withoutQuery = path.split('?')[0]?.split('#')[0] ?? '/';

    let decoded: string;
    try {
      decoded = decodeURIComponent(withoutQuery);
    } catch {
      return false;
    }

    const file = await locate(root, decoded);
    if (!file) return false;

    res.writeHead(200, {
      'content-type': CONTENT_TYPES[extname(file.path).toLowerCase()] ?? 'application/octet-stream',
      'content-length': file.size,
      // Vite fingerprints everything under /assets, so those are immutable.
      // Anything else — index.html above all — must be revalidated, or a deploy
      // leaves clients pointing at asset names that no longer exist.
      'cache-control': file.hashed ? 'public, max-age=31536000, immutable' : 'no-cache',
    });
    createReadStream(file.path).pipe(res);
    return true;
  };
}

interface Located {
  path: string;
  size: number;
  hashed: boolean;
}

async function locate(root: string, requestPath: string): Promise<Located | null> {
  const direct = await tryFile(root, requestPath);
  if (direct) return direct;

  // A request that looks like an asset and is missing is a 404, not a page.
  // Falling back to index.html for those turns a broken deploy into a browser
  // complaining that HTML is not JavaScript, which is far harder to diagnose.
  if (extname(requestPath)) return null;

  return tryFile(root, '/index.html');
}

async function tryFile(root: string, requestPath: string): Promise<Located | null> {
  const candidate = requestPath === '/' || requestPath === '' ? '/index.html' : requestPath;
  const full = resolve(join(root, candidate));

  // `..` in a request must never escape the root.
  if (full !== root && !full.startsWith(root + sep)) return null;

  try {
    const info = await stat(full);
    if (!info.isFile()) return null;
    return { path: full, size: info.size, hashed: candidate.startsWith('/assets/') };
  } catch {
    return null;
  }
}
