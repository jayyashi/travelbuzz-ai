'use client';
/**
 * react-router-dom compatibility shim for Next.js App Router.
 * Drop-in replacement — only the import path needs to change in each file.
 */

import React from 'react';
import NextLink from 'next/link';
import {
    useRouter as useNextRouter,
    usePathname,
    useParams as useNextParams,
} from 'next/navigation';
import { useSearchParams as useNextSearchParams } from 'next/navigation';

// ── Link ─────────────────────────────────────────────────────────────────────
// Accepts react-router-dom's `to` prop (or plain `href`)
interface LinkProps extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
    to?: string;
    href?: string;
    children?: React.ReactNode;
    className?: string;
    style?: React.CSSProperties;
    replace?: boolean;
    prefetch?: boolean;
    onMouseEnter?: React.MouseEventHandler<HTMLAnchorElement>;
    onMouseLeave?: React.MouseEventHandler<HTMLAnchorElement>;
}

export function Link({ to, href, children, replace, prefetch, ...rest }: LinkProps) {
    return (
        <NextLink href={to ?? href ?? '/'} replace={replace} prefetch={prefetch ?? false} {...rest}>
            {children}
        </NextLink>
    );
}

// ── useNavigate ───────────────────────────────────────────────────────────────
export function useNavigate() {
    const router = useNextRouter();
    return (path: string, options?: { replace?: boolean; state?: unknown }) => {
        if (options?.replace) router.replace(path);
        else router.push(path);
    };
}

// ── useParams ─────────────────────────────────────────────────────────────────
export function useParams<T extends Record<string, string | string[]>>(): T {
    return useNextParams() as T;
}

// ── useLocation ───────────────────────────────────────────────────────────────
// NOTE: intentionally does NOT call useSearchParams to avoid Suspense requirement
export function useLocation() {
    const pathname = usePathname();
    // search is available on client after hydration; most usages only need pathname
    const search = typeof window !== 'undefined' ? window.location.search : '';
    return { pathname, search, hash: '' };
}

// ── useSearchParams ───────────────────────────────────────────────────────────
// Returns [URLSearchParams, setter] — matches react-router-dom tuple API
export function useSearchParams(): [URLSearchParams, (params: URLSearchParams) => void] {
    const nextParams = useNextSearchParams();
    const router = useNextRouter();
    const pathname = usePathname();

    const urlParams = new URLSearchParams(nextParams.toString());

    const setParams = (newParams: URLSearchParams) => {
        const qs = newParams.toString();
        router.push(`${pathname}${qs ? '?' + qs : ''}`);
    };

    return [urlParams, setParams];
}

// ── Navigate ──────────────────────────────────────────────────────────────────
export function Navigate({ to, replace }: { to: string; replace?: boolean }) {
    const router = useNextRouter();
    React.useEffect(() => {
        if (replace) router.replace(to);
        else router.push(to);
    }, [to, replace, router]);
    return null;
}

// Re-export useRouter for any direct usage
export { useNextRouter as useRouter };
