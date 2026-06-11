import { Suspense } from 'react';
import { Login } from '@/views/Login';

export const dynamic = 'force-dynamic';
export default function Page() {
  return <Suspense><Login /></Suspense>;
}
