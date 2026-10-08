import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <header className="px-6 py-4 border-b flex justify-between items-center bg-card">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">G</span>
          </div>
          <span className="text-xl font-bold">GotU</span>
        </div>
        <nav className="hidden md:flex space-x-6">
          <Link href="#how-it-works" className="text-muted-foreground hover:text-primary transition-colors">How It Works</Link>
          <Link href="#features" className="text-muted-foreground hover:text-primary transition-colors">Features</Link>
          <Link href="#privacy" className="text-muted-foreground hover:text-primary transition-colors">Privacy</Link>
        </nav>
        <div className="flex space-x-4">
          <Link href="/login">
            <Button variant="ghost">Log In</Button>
          </Link>
          <Link href="/register">
            <Button>Get Started</Button>
          </Link>
        </div>
      </header>

      <main className="flex-grow">
        {/* Hero Section */}
        <section className="py-24 px-6 text-center">
          <h1 className="text-5xl font-extrabold tracking-tight mb-6">Share your location. Stay in control.</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
            Request and share live location securely with friends and family. No account is required for recipients, and sharing starts only with permission.
          </p>
          <div className="flex justify-center space-x-4">
            <Link href="/register">
              <Button size="lg" className="px-8">Get Started</Button>
            </Link>
            <Link href="#how-it-works">
              <Button size="lg" variant="outline" className="px-8">How It Works</Button>
            </Link>
          </div>
        </section>

        {/* How It Works */}
        <section id="how-it-works" className="py-24 bg-muted/50 px-6">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
            <div className="grid md:grid-cols-4 gap-8">
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xl font-bold mx-auto mb-4">1</div>
                <h3 className="font-semibold mb-2">Create Request</h3>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xl font-bold mx-auto mb-4">2</div>
                <h3 className="font-semibold mb-2">Send Link</h3>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xl font-bold mx-auto mb-4">3</div>
                <h3 className="font-semibold mb-2">Recipient Approves</h3>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xl font-bold mx-auto mb-4">4</div>
                <h3 className="font-semibold mb-2">View Location</h3>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="py-24 px-6">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12">Features</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="p-6 border rounded-lg bg-card shadow-sm">
                <h3 className="font-bold text-lg mb-2">Secure invitation links</h3>
                <p className="text-muted-foreground">Unique tokens that expire.</p>
              </div>
              <div className="p-6 border rounded-lg bg-card shadow-sm">
                <h3 className="font-bold text-lg mb-2">Time-limited sharing</h3>
                <p className="text-muted-foreground">Automatically stops after 15, 30, or 60 mins.</p>
              </div>
              <div className="p-6 border rounded-lg bg-card shadow-sm">
                <h3 className="font-bold text-lg mb-2">No recipient registration</h3>
                <p className="text-muted-foreground">Guests don&apos;t need to sign up.</p>
              </div>
              <div className="p-6 border rounded-lg bg-card shadow-sm">
                <h3 className="font-bold text-lg mb-2">Privacy-first design</h3>
                <p className="text-muted-foreground">No historical location trails retained.</p>
              </div>
            </div>
          </div>
        </section>
        
        {/* Privacy */}
        <section id="privacy" className="py-24 bg-muted/50 px-6">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-6">Privacy and Trust</h2>
            <p className="text-muted-foreground mb-4">
              Location sharing is strictly voluntary. GPS access requires explicit browser permission.
            </p>
            <p className="text-muted-foreground mb-4">
              The requester and GotU administrator may view active shared locations, as disclosed before consent.
              Sharing can be stopped anytime. Expired sessions do not provide access to coordinates.
            </p>
          </div>
        </section>
      </main>

      <footer className="py-8 px-6 border-t text-center text-muted-foreground">
        <p>&copy; 2026 GotU. All rights reserved.</p>
      </footer>
    </div>
  );
}
