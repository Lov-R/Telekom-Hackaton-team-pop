import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import type { Config, Context } from '@netlify/functions';

// Must be set before the server modules load (they read it at import time), hence the dynamic imports.
process.env.RELAI_RUNTIME = 'netlify';
process.env.RELAI_DATA_DIR ??= '/tmp/relai';

/**
 * The whole Express API as one function. Express listens on a loopback port inside the function and each
 * request is forwarded to it, so routes, multer uploads and cookies work unchanged.
 */
const ready = (async () => {
  const persist = await import('../../server/src/persist.js');
  const { app } = await import('../../server/src/app.js');
  const { failStuckDocuments } = await import('../../server/src/services/processDocument.js');
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  return { persist, failStuckDocuments, port: (server.address() as AddressInfo).port };
})();

/** Longer than the 60 s function limit, so only documents whose function was killed get marked as failed. */
const STUCK_AFTER_MS = 3 * 60_000;
const HOP_HEADERS = ['host', 'connection', 'content-length', 'transfer-encoding', 'keep-alive', 'upgrade'];

export default async (req: Request, context: Context): Promise<Response> => {
  try {
    const { persist, failStuckDocuments, port } = await ready;
    const url = new URL(req.url);
    if (url.pathname.startsWith('/api/admin/')) return persist.handleAdmin(req);

    await persist.pullDb();
    failStuckDocuments(STUCK_AFTER_MS);

    const headers = new Headers(req.headers);
    for (const h of HOP_HEADERS) headers.delete(h);
    // Express trusts loopback proxies: req.ip becomes the client IP and req.secure true (Secure cookie).
    headers.set('x-forwarded-for', context.ip);
    headers.set('x-forwarded-proto', 'https');
    const hasBody = req.method !== 'GET' && req.method !== 'HEAD';
    const res = await fetch(`http://127.0.0.1:${port}${url.pathname}${url.search}`, {
      method: req.method,
      headers,
      body: hasBody ? await req.arrayBuffer() : undefined,
      redirect: 'manual',
    });
    const body = await res.arrayBuffer();

    // Store changes before answering, so the client's next request sees them on any instance.
    await persist.pushDb();
    // Document processing continues after the response; keep the function alive until it is stored.
    context.waitUntil(persist.drainBackground().then(() => persist.pushDb()));

    const outHeaders = new Headers(res.headers);
    for (const h of HOP_HEADERS) outHeaders.delete(h);
    const empty = res.status === 204 || res.status === 304 || req.method === 'HEAD';
    return new Response(empty ? null : body, { status: res.status, headers: outHeaders });
  } catch (err) {
    console.error('Netlify function error:', err);
    return new Response(
      JSON.stringify({
        error: {
          code: 'internal',
          message: err instanceof Error ? err.message : 'Došlo je do greške u Netlify funkciji.',
        },
      }),
      {
        status: 500,
        headers: { 'content-type': 'application/json' },
      },
    );
  }
};

export const config: Config = { path: '/api/*' };
