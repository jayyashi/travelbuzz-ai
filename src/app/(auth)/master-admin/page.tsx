'use client';

export const dynamic = 'force-dynamic';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseStore } from '@/services/SupabaseStore';
import { MasterAdmin } from '@/views/MasterAdmin';
const ADMIN_EMAIL = 'jau205@gmail.com';
export default function Page() {
  const router = useRouter();
  const user = supabaseStore.getCurrentUser();
  useEffect(() => {
    if (!user) router.replace('/login');
    else if (user.email !== ADMIN_EMAIL) router.replace('/dashboard');
  }, [user, router]);
  if (!user || user.email !== ADMIN_EMAIL) return null;
  return <MasterAdmin />;
}
