import axios from 'axios';

/**
 * Read the CSRF token Laravel sets on each response.
 * Prefer the XSRF-TOKEN cookie (always fresh) over the meta tag (set only on full page load).
 */
export function getCsrfToken(): string | null {
    const cookieMatch = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]*)/);

    if (cookieMatch?.[1]) {
        return decodeURIComponent(cookieMatch[1]);
    }

    return (
        document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') ??
        null
    );
}

export function applyCsrfHeaders(
    headers: Record<string, string>,
): Record<string, string> {
    const cookieMatch = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]*)/);

    if (cookieMatch?.[1]) {
        headers['X-XSRF-TOKEN'] = decodeURIComponent(cookieMatch[1]);

        return headers;
    }

    const metaToken = document
        .querySelector('meta[name="csrf-token"]')
        ?.getAttribute('content');

    if (metaToken) {
        headers['X-CSRF-TOKEN'] = metaToken;
    }

    return headers;
}

export function syncCsrfMetaTag(token: string): void {
    const meta = document.querySelector('meta[name="csrf-token"]');
    if (meta) {
        meta.setAttribute('content', token);
    }
}

axios.defaults.withCredentials = true;
axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';

axios.interceptors.request.use((config) => {
    const cookieMatch = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]*)/);

    if (cookieMatch?.[1]) {
        config.headers.set('X-XSRF-TOKEN', decodeURIComponent(cookieMatch[1]));
    } else {
        const metaToken = document
            .querySelector('meta[name="csrf-token"]')
            ?.getAttribute('content');

        if (metaToken) {
            config.headers.set('X-CSRF-TOKEN', metaToken);
        }
    }

    return config;
});

export default axios;
