import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createStaticHandler, type StaticHandler } from './static.js';

/** Just enough of a ServerResponse to record what a handler did to it. */
function fakeResponse() {
  const chunks: Buffer[] = [];
  const res = {
    statusCode: 0,
    headers: {} as Record<string, string | number>,
    body: '',
    writeHead(status: number, headers: Record<string, string | number>) {
      res.statusCode = status;
      res.headers = headers;
    },
    // createReadStream().pipe() needs these three and nothing else.
    on() {},
    once() {},
    emit() {},
    write(chunk: Buffer) {
      chunks.push(Buffer.from(chunk));
      return true;
    },
    end(chunk?: Buffer) {
      if (chunk) chunks.push(Buffer.from(chunk));
      res.body = Buffer.concat(chunks).toString();
      done();
    },
  };

  let done = () => {};
  const finished = new Promise<void>((resolve) => {
    done = resolve;
  });

  return { res, finished };
}

/** Serves a path and waits for the stream to finish before reporting. */
async function get(serve: StaticHandler, path: string) {
  const { res, finished } = fakeResponse();
  const served = await serve(path, res as never);
  if (served) await finished;
  return { served, ...res };
}

describe('static handler', () => {
  let root: string;
  let serve: StaticHandler;

  beforeAll(async () => {
    root = await mkdtemp(join(tmpdir(), 'flens-static-'));
    await mkdir(join(root, 'assets'), { recursive: true });
    await writeFile(join(root, 'index.html'), '<!doctype html><title>Flens</title>');
    await writeFile(join(root, 'assets', 'index-abc123.js'), 'console.log(1)');
    await writeFile(join(root, 'secret-sibling.txt'), 'not served');
    serve = createStaticHandler(root);
  });

  afterAll(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it('serves index.html at the root', async () => {
    const response = await get(serve, '/');
    expect(response.served).toBe(true);
    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toBe('text/html; charset=utf-8');
    expect(response.body).toContain('Flens');
  });

  it('serves hashed assets as immutable, and everything else revalidating', async () => {
    const asset = await get(serve, '/assets/index-abc123.js');
    expect(asset.headers['cache-control']).toBe('public, max-age=31536000, immutable');
    expect(asset.headers['content-type']).toBe('text/javascript; charset=utf-8');

    const page = await get(serve, '/');
    expect(page.headers['cache-control']).toBe('no-cache');
  });

  it('ignores the query string when resolving a file', async () => {
    const response = await get(serve, '/assets/index-abc123.js?v=2');
    expect(response.served).toBe(true);
    expect(response.body).toBe('console.log(1)');
  });

  it('falls back to index.html for client-side routes', async () => {
    const response = await get(serve, '/some/deep/route');
    expect(response.served).toBe(true);
    expect(response.body).toContain('Flens');
  });

  it('404s a missing asset rather than answering it with HTML', async () => {
    // Serving index.html here would make the browser report that HTML is not a
    // valid script, which hides the real problem: the file is not there.
    const response = await get(serve, '/assets/index-gone.js');
    expect(response.served).toBe(false);
  });

  it('refuses to escape the root', async () => {
    for (const path of [
      '/../secret-sibling.txt',
      '/assets/../../secret-sibling.txt',
      '/%2e%2e/secret-sibling.txt',
    ]) {
      const response = await get(serve, path);
      expect(response.body).not.toContain('not served');
    }
  });

  it('reports nothing to serve when the root does not exist', async () => {
    const missing = createStaticHandler(join(root, 'nope'));
    expect((await get(missing, '/')).served).toBe(false);
  });
});
