import { Suspense } from 'react';
import { Signup } from '@/views/Signup';

export const dynamic = 'force-dynamic';
export default function Page() {
  return <Suspense><Signup /></Suspense>;
}
