import Link from "next/link";
import { Button } from "@/components/ui/button";
import { MapPin, ShieldCheck, Users, Smartphone, CheckCircle2, ArrowRight, Lock, Clock, Navigation } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50/50 text-slate-900 font-sans selection:bg-blue-500 selection:text-white">
      {/* Top Navbar */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-white/80 border-b border-slate-100 px-6 py-4 flex justify-between items-center transition-all shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-sky-400 flex items-center justify-center shadow-lg shadow-blue-500/20 text-white">
            <MapPin className="w-5 h-5 stroke-[2.5]" />
          </div>
          <span className="text-2xl font-bold tracking-tight bg-gradient-to-r from-slate-900 via-slate-800 to-blue-900 bg-clip-text text-transparent">
            GotU <span className="text-blue-600 font-semibold text-sm tracking-normal">LocationShare</span>
          </span>
        </div>

        <nav className="hidden md:flex items-center space-x-8 text-sm font-medium text-slate-600">
          <Link href="#how-it-works" className="hover:text-blue-600 transition-colors">
            How It Works
          </Link>
          <Link href="#features" className="hover:text-blue-600 transition-colors">
            Features
          </Link>
          <Link href="#privacy" className="hover:text-blue-600 transition-colors">
            Privacy & Control
          </Link>
        </nav>

        <div className="flex items-center space-x-3">
          <Link href="/admin">
            <Button className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/20 px-6 font-semibold transition-all">
              Login to Admin <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </Link>
        </div>
      </header>

      <main className="flex-grow">
        {/* Hero Section */}
        <section className="relative overflow-hidden pt-16 pb-24 px-6 max-w-7xl mx-auto">
          {/* Subtle Background Glows */}
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-tr from-blue-200/40 to-sky-100/40 rounded-full blur-3xl -z-10 pointer-events-none" />

          <div className="grid lg:grid-cols-12 gap-12 items-center">
            {/* Left Hero Text & Request Card */}
            <div className="lg:col-span-7 space-y-8">
              <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-xs font-semibold tracking-wide">
                <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                <span>• Consent-First • Family & Friends</span>
              </div>

              <h1 className="text-5xl lg:text-6xl font-black tracking-tight text-slate-900 leading-[1.15]">
                Request Location <br />
                <span className="bg-gradient-to-r from-blue-600 via-sky-500 to-blue-800 bg-clip-text text-transparent">
                  With Consent
                </span>
              </h1>

              <p className="text-lg text-slate-600 max-w-xl leading-relaxed font-normal">
                Connect with family and friends through secure, consent-based location sharing. Perfect for coordinating meetups, ensuring safety, and staying connected with loved ones.
              </p>

              {/* Consent Request Form Card */}
              <div className="bg-white p-6 lg:p-8 rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50 space-y-5 max-w-lg">
                <div className="flex items-start space-x-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-lg">Send Consent Request</h3>
                    <p className="text-xs text-slate-500">Invite family or friends to share their location safely</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex rounded-2xl border border-slate-200 overflow-hidden focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all bg-slate-50/50">
                    <div className="px-3.5 py-3 bg-slate-100/80 border-r border-slate-200 text-slate-600 text-xs font-semibold flex items-center space-x-1">
                      <span>US</span>
                      <span className="text-slate-400">+1</span>
                    </div>
                    <input
                      type="text"
                      placeholder="Enter phone number or email"
                      className="w-full px-4 py-3 bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
                    />
                  </div>

                  <p className="text-[11px] text-slate-400 text-center font-medium">Using default location (US)</p>

                  <Link href="/register" className="block">
                    <Button className="w-full py-6 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-lg shadow-blue-600/25 transition-all">
                      <Navigation className="w-4 h-4 mr-2" /> Send Consent Request
                    </Button>
                  </Link>
                </div>
              </div>

              {/* Bottom Feature Badges */}
              <div className="flex flex-wrap gap-3 pt-2">
                <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Consent-First Design</span>
                </div>
                <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-blue-50 border border-blue-100 text-blue-800 text-xs font-semibold">
                  <Users className="w-4 h-4 text-blue-600" />
                  <span>Family & Friends</span>
                </div>
                <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold">
                  <ShieldCheck className="w-4 h-4 text-slate-600" />
                  <span>Zero Trail Storage</span>
                </div>
              </div>
            </div>

            {/* Right Side Phone Mockup Card */}
            <div className="lg:col-span-5 flex justify-center">
              <div className="relative w-full max-w-[340px] aspect-[9/18] bg-slate-950 rounded-[48px] p-4 shadow-2xl shadow-blue-900/20 border-4 border-slate-800 ring-1 ring-slate-900">
                {/* Phone Notch/Island */}
                <div className="absolute top-7 left-1/2 -translate-x-1/2 w-28 h-4 bg-slate-900 rounded-full z-20 flex items-center justify-between px-3">
                  <span className="text-[10px] text-slate-400 font-semibold">9:41</span>
                  <div className="w-2.5 h-2.5 rounded-full bg-slate-700" />
                </div>

                {/* Inner Screen */}
                <div className="w-full h-full bg-gradient-to-b from-sky-50 via-white to-blue-50 rounded-[36px] pt-14 p-6 flex flex-col justify-between items-center text-center overflow-hidden">
                  <div className="my-auto space-y-6">
                    {/* Glowing Green Success Badge */}
                    <div className="relative mx-auto w-20 h-20 rounded-full bg-emerald-500/10 border-4 border-emerald-500/20 flex items-center justify-center">
                      <div className="w-14 h-14 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/40">
                        <CheckCircle2 className="w-8 h-8" />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h3 className="text-xl font-black text-slate-900 leading-tight">
                        Location Shared <br /> Successfully
                      </h3>
                      <p className="text-xs text-slate-500 max-w-[220px] mx-auto leading-relaxed">
                        Your location has been securely shared with the requester. You can revoke access at any time.
                      </p>
                    </div>

                    {/* Location Card */}
                    <div className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-md flex items-center space-x-3 text-left">
                      <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                        <MapPin className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Current Location</p>
                        <p className="text-xs font-bold text-slate-800">San Francisco, CA</p>
                      </div>
                    </div>
                  </div>

                  <div className="w-full pb-2">
                    <Button className="w-full py-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/30">
                      Manage Permissions
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section id="how-it-works" className="py-20 bg-white border-t border-slate-100 px-6">
          <div className="max-w-6xl mx-auto text-center space-y-14">
            <div className="space-y-3">
              <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight">How It Works</h2>
              <p className="text-slate-500 text-base max-w-xl mx-auto">
                Three simple steps to consent-based location sharing with family and friends
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 text-left">
              <div className="p-8 rounded-3xl bg-slate-50 border border-slate-100 space-y-4 hover:shadow-xl hover:shadow-slate-200/50 transition-all">
                <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white font-bold text-lg flex items-center justify-center shadow-lg shadow-blue-600/30">
                  1
                </div>
                <h3 className="text-xl font-bold text-slate-900">Create Consent Link</h3>
                <p className="text-slate-600 text-sm leading-relaxed">
                  Generate a unique, cryptographically signed invitation link with customized duration options.
                </p>
              </div>

              <div className="p-8 rounded-3xl bg-slate-50 border border-slate-100 space-y-4 hover:shadow-xl hover:shadow-slate-200/50 transition-all">
                <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white font-bold text-lg flex items-center justify-center shadow-lg shadow-blue-600/30">
                  2
                </div>
                <h3 className="text-xl font-bold text-slate-900">Recipient Approves</h3>
                <p className="text-slate-600 text-sm leading-relaxed">
                  The recipient reviews requester details and chooses whether to share their GPS location voluntarily.
                </p>
              </div>

              <div className="p-8 rounded-3xl bg-slate-50 border border-slate-100 space-y-4 hover:shadow-xl hover:shadow-slate-200/50 transition-all">
                <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white font-bold text-lg flex items-center justify-center shadow-lg shadow-blue-600/30">
                  3
                </div>
                <h3 className="text-xl font-bold text-slate-900">Live Secure Tracking</h3>
                <p className="text-slate-600 text-sm leading-relaxed">
                  View active location on an interactive map. Recipient can stop sharing instantly with one tap.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section id="features" className="py-20 bg-slate-50/50 border-t border-slate-100 px-6">
          <div className="max-w-6xl mx-auto space-y-12">
            <div className="text-center space-y-3">
              <h2 className="text-3xl font-bold text-slate-900">Built For Maximum Privacy</h2>
              <p className="text-slate-500 max-w-lg mx-auto text-sm">
                Every feature is architected to protect user location data and guarantee consent.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-3">
                <Lock className="w-6 h-6 text-blue-600" />
                <h3 className="font-bold text-slate-900 text-base">Token-Based Invitations</h3>
                <p className="text-slate-500 text-xs leading-relaxed">
                  Single-use cryptographically hashed tokens ensure links cannot be intercepted or recycled.
                </p>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-3">
                <Clock className="w-6 h-6 text-blue-600" />
                <h3 className="font-bold text-slate-900 text-base">Time-Limited Sessions</h3>
                <p className="text-slate-500 text-xs leading-relaxed">
                  Choose sharing durations of 15m, 30m, or 60m. Sessions automatically expire server-side.
                </p>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-3">
                <ShieldCheck className="w-6 h-6 text-blue-600" />
                <h3 className="font-bold text-slate-900 text-base">Zero Historical Trails</h3>
                <p className="text-slate-500 text-xs leading-relaxed">
                  Only the single latest GPS coordinate is stored. Historical location logs are never kept.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Privacy Section */}
        <section id="privacy" className="py-20 bg-white border-t border-slate-100 px-6">
          <div className="max-w-4xl mx-auto text-center space-y-6">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h2 className="text-3xl font-extrabold text-slate-900">Consent & Privacy Statement</h2>
            <p className="text-slate-600 text-sm max-w-2xl mx-auto leading-relaxed">
              GotU requires explicit recipient action before accessing browser geolocation. Sharing can be stopped immediately at any time. Expired session coordinates are purged from database storage automatically.
            </p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-slate-100 text-center text-xs text-slate-500 bg-white">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
          <p>&copy; 2026 GotU LocationShare. Consent-First GPS Platform.</p>
          <div className="flex space-x-6 text-slate-400">
            <Link href="#privacy" className="hover:text-slate-600">Privacy Policy</Link>
            <Link href="#how-it-works" className="hover:text-slate-600">Terms of Service</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

