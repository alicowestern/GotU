import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getMyAuthorizedSessions } from '@/features/sessions/actions';
import LiveDashboardClient from '@/components/dashboard/LiveDashboardClient';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Live GPS Dashboard | GotU',
  description: 'Interactive live location tracking map for authorized sharing sessions.',
};

async function LiveDashboardContent() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const sessions = await getMyAuthorizedSessions();

  return <LiveDashboardClient initialSessions={sessions} />;
}

export default function LiveDashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col h-[calc(100vh-5rem)] min-h-[500px] items-center justify-center bg-background p-6">
          <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin mb-3" />
          <p className="text-sm text-muted-foreground font-medium">Loading Live Dashboard...</p>
        </div>
      }
    >
      <LiveDashboardContent />
    </Suspense>
  );
}
