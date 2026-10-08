import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-zinc-950 text-zinc-50 hidden md:block">
        <div className="p-6">
          <div className="flex items-center space-x-2 font-bold text-xl mb-8">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
              <span className="text-primary-foreground text-sm">G</span>
            </div>
            <span>GotU Admin</span>
          </div>
          <nav className="space-y-2">
            <Link href="/admin" className="block px-3 py-2 rounded-md bg-zinc-800 font-medium">Overview</Link>
            <Link href="/admin/users" className="block px-3 py-2 rounded-md text-zinc-400 hover:bg-zinc-800">Users</Link>
            <Link href="/admin/sessions" className="block px-3 py-2 rounded-md text-zinc-400 hover:bg-zinc-800">Sharing Sessions</Link>
            <Link href="/admin/security" className="block px-3 py-2 rounded-md text-zinc-400 hover:bg-zinc-800">Security Events</Link>
            <Link href="/admin/settings" className="block px-3 py-2 rounded-md text-zinc-400 hover:bg-zinc-800">Settings</Link>
          </nav>
        </div>
      </aside>
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        <header className="h-16 border-b flex items-center justify-between px-6 bg-card">
          <h2 className="font-semibold md:hidden">GotU Admin</h2>
          <div className="flex-1" />
          <div className="flex items-center space-x-4">
            <span className="text-sm font-medium text-destructive">Super Admin</span>
            <Button variant="outline" size="sm">Log out</Button>
          </div>
        </header>
        <main className="p-6 flex-1 bg-muted/5">
          {children}
        </main>
      </div>
    </div>
  );
}
