import { useEffect, useRef } from 'react';
import { mountFutureSelf } from './ui/mount.js';

// The original, approved board is isolated in ui/. Supabase and device features
// live in separate modules so they can be reused in a native or React rewrite.
export default function App() {
  const host = useRef(null);
  useEffect(() => {
    const abort = new AbortController();
    mountFutureSelf(host.current, abort.signal).catch(error => {
      if (!abort.signal.aborted) {
        host.current.replaceChildren();
        const p = document.createElement('p');
        p.className = 'startup-error';
        p.textContent = `Aplikacija se nije mogla učitati: ${error.message}`;
        host.current.append(p);
      }
    });
    return () => abort.abort();
  }, []);
  return <div ref={host} />;
}
