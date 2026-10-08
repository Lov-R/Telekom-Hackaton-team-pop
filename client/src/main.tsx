import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/sonner';
import { captureInvite } from '@/lib/invite';
import { applyTheme, usePrefs } from '@/lib/prefs';
import { queryClient } from '@/lib/queryClient';
import App from './App';
import './index.css';

applyTheme();
captureInvite();

function ThemedToaster() {
  const { theme } = usePrefs();
  return <Toaster position="top-center" theme={theme} />;
}

// Netlify adds its badge script to the served HTML; reserve room for the badge only then (see index.css).
if (document.querySelector('script[src^="/.netlify/scripts/hud"]')) {
  document.documentElement.dataset.hostBadge = '';
}

// SRS §7.4: push-only worker without a cache. Registering it also replaces the old caching worker on phones.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/sw.js').catch(() => undefined);
  });
}

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
        <ThemedToaster />
      </TooltipProvider>
    </QueryClientProvider>
  </StrictMode>,
);
