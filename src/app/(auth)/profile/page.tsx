'use client';

export const dynamic = 'force-dynamic';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseStore } from '@/services/SupabaseStore';
import { Profile } from '@/views/Profile';
export default function Page() {
  const router = useRouter();
  const user = supabaseStore.getCurrentUser();
  useEffect(() => { if (!user) router.replace('/login'); }, [user, router]);
  if (!user) return null;
  return <Profile />;
}
