import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function UserDashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-muted/20 hidden md:block">
        <div className="p-6">
          <div className="flex items-center space-x-2 font-bold text-xl mb-8">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
              <span className="text-primary-foreground text-sm">G</span>
            </div>
            <span>GotU</span>
          </div>
          <nav className="space-y-2">
            <Link href="/dashboard" className="block px-3 py-2 rounded-md bg-secondary text-secondary-foreground font-medium">Overview</Link>
            <Link href="/dashboard/invitations" className="block px-3 py-2 rounded-md text-muted-foreground hover:bg-muted">My Invitations</Link>
            <Link href="/dashboard/sessions" className="block px-3 py-2 rounded-md text-muted-foreground hover:bg-muted">Active Sessions</Link>
            <Link href="/dashboard/map" className="block px-3 py-2 rounded-md text-muted-foreground hover:bg-muted">Map</Link>
            <Link href="/dashboard/settings" className="block px-3 py-2 rounded-md text-muted-foreground hover:bg-muted">Settings</Link>
          </nav>
        </div>
      </aside>
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        <header className="h-16 border-b flex items-center justify-between px-6">
          <h2 className="font-semibold md:hidden">GotU Dashboard</h2>
          <div className="flex-1" />
          <Button variant="ghost" size="sm">Log out</Button>
        </header>
        <main className="p-6 flex-1 bg-muted/5">
          {children}
        </main>
      </div>
    </div>
  );
}
