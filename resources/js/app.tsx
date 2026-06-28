import '../css/app.css';
import './lib/http';

import { createInertiaApp } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { initializeTheme } from './hooks/use-appearance';
import { syncCsrfMetaTag } from './lib/http';
import { registerUiLockRecovery } from './lib/reset-ui-lock';

const appName = import.meta.env.VITE_APP_NAME || 'POS';

registerUiLockRecovery();

document.addEventListener('inertia:success', (event) => {
    const token = (event as CustomEvent).detail?.page?.props?.csrf_token;
    if (typeof token === 'string') {
        syncCsrfMetaTag(token);
    }
});

if (import.meta.env.DEV) {
    console.log('[POS] Frontend bootstrapped (development mode).');
}

createInertiaApp({
    title: (title) => (title ? `${title} - ${appName}` : appName),
    resolve: (name) =>
        resolvePageComponent(
            `./pages/${name}.tsx`,
            import.meta.glob('./pages/**/*.tsx'),
        ),
    setup({ el, App, props }) {
        const root = createRoot(el);

        root.render(
            <StrictMode>
                <App {...props} />
            </StrictMode>,
        );
    },
    progress: {
        color: '#4B5563',
    },
});

// This will set light / dark mode on load...
initializeTheme();

if ('serviceWorker' in navigator && import.meta.env.PROD) {
    window.addEventListener('load', () => {
        navigator.serviceWorker
            .register('/sw.js')
            .then(() => {
                console.log('[POS] Service worker registered.');
            })
            .catch((error) => {
                console.error('[POS] Service worker registration failed:', error);
            });
    });
}
