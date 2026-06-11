'use client';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '../services/supabase';

export function AuthGuard({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const [authed, setAuthed] = useState(false);

    useEffect(() => {
        let active = true;

        const redirectToLogin = () => {
            router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
        };

        supabase.auth.getSession().then(({ data: { session } }) => {
            if (!active) return;
            if (session) setAuthed(true);
            else redirectToLogin();
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
            if (event === 'SIGNED_OUT') redirectToLogin();
        });

        return () => {
            active = false;
            subscription.unsubscribe();
        };
    }, [router, pathname]);

    if (!authed) {
        return (
            <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span className="auth-spinner" />
            </div>
        );
    }

    return <>{children}</>;
}
