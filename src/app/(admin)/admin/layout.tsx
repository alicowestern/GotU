import React, { Suspense } from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireSuperAdmin } from '@/features/admin/services/adminService';
import { Button } from '@/components/ui/button';

async function AdminLayoutGuard({ children }: { children: React.ReactNode }) {
  try {
    await requireSuperAdmin();
  } catch {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-zinc-950 text-zinc-50 hidden md:block flex-shrink-0">
        <div className="p-6">
          <div className="flex items-center space-x-2 font-bold text-xl mb-8">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
              <span className="text-primary-foreground text-sm font-bold">G</span>
            </div>
            <span>GotU Admin</span>
          </div>

          <nav className="space-y-1.5 text-sm">
            <Link href="/admin" className="block px-3 py-2 rounded-md hover:bg-zinc-800 font-medium">
              Overview
            </Link>
            <Link href="/admin/users" className="block px-3 py-2 rounded-md text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100">
              Users
            </Link>
            <Link href="/admin/sessions" className="block px-3 py-2 rounded-md text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100">
              Sharing Sessions
            </Link>
            <Link href="/admin/live" className="block px-3 py-2 rounded-md text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100">
              Admin Live Map
            </Link>
            <Link href="/admin/security" className="block px-3 py-2 rounded-md text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100">
              Security & Audits
            </Link>
            <Link href="/admin/settings" className="block px-3 py-2 rounded-md text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100">
              Platform Settings
            </Link>
          </nav>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b flex items-center justify-between px-6 bg-card">
          <h2 className="font-semibold md:hidden">GotU Admin</h2>
          <div className="flex-1" />
          <div className="flex items-center space-x-4">
            <span className="text-xs font-bold px-2.5 py-1 rounded bg-rose-500/15 text-rose-600 border border-rose-500/30 uppercase">
              Super Admin Mode
            </span>
            <Link href="/dashboard">
              <Button variant="outline" size="sm" className="text-xs">
                Exit Admin
              </Button>
            </Link>
          </div>
        </header>

        <main className="p-6 flex-1 bg-muted/5 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}

export default function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      }
    >
      <AdminLayoutGuard>{children}</AdminLayoutGuard>
    </Suspense>
  );
}
