'use client';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

declare global {
    interface Window {
        Tawk_API?: {
            hideWidget?: () => void;
            showWidget?: () => void;
            onLoad?: () => void;
        };
        Tawk_LoadStart?: Date;
    }
}

const TAWK_SRC = 'https://embed.tawk.to/6a2bec056c52711c2f2513ca/1jqtp3u6t';
const SCRIPT_ID = 'tawkto-embed-script';

/** Public share links must not show the chat widget:
 *  /view/:id and /:company/:destination/:shortId (the only 3-segment routes) */
function isSharePage(pathname: string): boolean {
    if (pathname.startsWith('/view/')) return true;
    return pathname.split('/').filter(Boolean).length === 3;
}

export function TawkToChat() {
    const pathname = usePathname();
    const onSharePage = isSharePage(pathname ?? '');

    useEffect(() => {
        if (onSharePage) {
            // Script is never injected when landing directly on a share page;
            // hide the widget if it was loaded on a previous page.
            if (window.Tawk_API) {
                window.Tawk_API.hideWidget?.();
                window.Tawk_API.onLoad = () => window.Tawk_API?.hideWidget?.();
            }
            return;
        }

        if (document.getElementById(SCRIPT_ID)) {
            window.Tawk_API?.showWidget?.();
            if (window.Tawk_API) {
                window.Tawk_API.onLoad = () => window.Tawk_API?.showWidget?.();
            }
            return;
        }

        window.Tawk_API = window.Tawk_API || {};
        window.Tawk_LoadStart = new Date();
        const s1 = document.createElement('script');
        s1.id = SCRIPT_ID;
        s1.async = true;
        s1.src = TAWK_SRC;
        s1.charset = 'UTF-8';
        s1.setAttribute('crossorigin', '*');
        document.body.appendChild(s1);
    }, [onSharePage]);

    return null;
}
