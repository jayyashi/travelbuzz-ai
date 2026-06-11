'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseStore } from '@/services/SupabaseStore';
import { CompletedTrips } from '@/views/CompletedTrips';

export const dynamic = 'force-dynamic';

export default function Page() {
  const router = useRouter();
  const user = supabaseStore.getCurrentUser();
  useEffect(() => { if (!user) router.replace('/login'); }, [user, router]);
  if (!user) return null;
  return <CompletedTrips />;
}
