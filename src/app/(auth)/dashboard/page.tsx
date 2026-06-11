'use client';
import { Suspense } from 'react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseStore } from '@/services/SupabaseStore';
import { Dashboard } from '@/views/Dashboard';
import { TravelerDashboard } from '@/views/TravelerDashboard';

export const dynamic = 'force-dynamic';

function DashboardContent() {
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);
  const [user, setUser] = useState(supabaseStore.getCurrentUser());

  useEffect(() => {
    const currentUser = supabaseStore.getCurrentUser();
    setUser(currentUser);
    if (!currentUser) {
      router.replace('/login');
    } else {
      setIsReady(true);
    }
  }, [router]);

  if (!isReady) return null;
  return user?.role === 'traveler' ? <TravelerDashboard /> : <Dashboard />;
}

export default function Page() {
  return <Suspense><DashboardContent /></Suspense>;
}
