import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export async function requireAuthenticatedUser() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    redirect('/login');
  }

  return user;
}

export async function requireSuperAdmin() {
  const user = await requireAuthenticatedUser();
  const adminId = process.env.GOTU_ADMIN_USER_ID;

  if (!adminId || user.id !== adminId) {
    // Treat absent admin ID as fail-closed. Not admin, redirect to normal dashboard.
    redirect('/dashboard');
  }

  return user;
}

export async function requireRegisteredUser() {
  const user = await requireAuthenticatedUser();
  const adminId = process.env.GOTU_ADMIN_USER_ID;

  if (adminId && user.id === adminId) {
    // Admin trying to access normal user routes
    redirect('/admin');
  }

  return user;
}
