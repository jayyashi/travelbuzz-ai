import { Suspense } from 'react';
import { ResetPassword } from '@/views/ResetPassword';

export const dynamic = 'force-dynamic';
export default function Page() { return <Suspense><ResetPassword /></Suspense>; }
