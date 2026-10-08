import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Send, MapPin, ArrowUpRight, Clock, Plus, ShieldCheck } from "lucide-react";

export default function DashboardPage() {
  return (
    <div className="space-y-8 max-w-7xl">
      {/* Top Welcome & Quick Action Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Overview</h2>
          <p className="text-slate-500 text-xs font-medium">Manage your active GPS sharing sessions & invitations</p>
        </div>
        <Link href="/dashboard/invitations/new">
          <Button className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-5 py-2.5 shadow-md shadow-blue-600/20 transition-all">
            <Plus className="w-4 h-4 mr-1.5" /> New Consent Request
          </Button>
        </Link>
      </div>

      {/* 3 Metric Stat Cards (Inspired directly by Reference Image 2) */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Stat Card 1: Active Sessions */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/40 space-y-4 relative overflow-hidden">
          <div className="flex justify-between items-center text-xs font-semibold text-slate-400">
            <span>Active Sessions</span>
            <span className="inline-flex items-center text-[11px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full font-bold">
              <ArrowUpRight className="w-3 h-3 mr-0.5" /> 32% week ago
            </span>
          </div>

          <div className="text-3xl font-black text-slate-900 tracking-tight">
            0 <span className="text-xs font-normal text-slate-400 font-medium">active users</span>
          </div>

          {/* Mini Bar Graph Visualization */}
          <div className="flex items-end justify-between h-14 pt-2 gap-1.5">
            <div className="w-full bg-orange-400/80 rounded-t-lg h-[40%]" />
            <div className="w-full bg-orange-500 rounded-t-lg h-[65%]" />
            <div className="w-full bg-orange-400/80 rounded-t-lg h-[35%]" />
            <div className="w-full bg-orange-500 rounded-t-lg h-[80%]" />
            <div className="w-full bg-orange-500/90 rounded-t-lg h-[55%]" />
            <div className="w-full bg-blue-600 rounded-t-lg h-[90%]" />
          </div>
        </div>

        {/* Stat Card 2: Invitations Sent */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/40 space-y-4 relative overflow-hidden">
          <div className="flex justify-between items-center text-xs font-semibold text-slate-400">
            <span>Total Invitations</span>
            <span className="inline-flex items-center text-[11px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full font-bold">
              <ArrowUpRight className="w-3 h-3 mr-0.5" /> 20% week ago
            </span>
          </div>

          <div className="text-3xl font-black text-slate-900 tracking-tight">
            0 <span className="text-xs font-normal text-slate-400 font-medium">sent overall</span>
          </div>

          {/* Mini Dark Bar Graph Visualization */}
          <div className="flex items-end justify-between h-14 pt-2 gap-1.5">
            <div className="w-full bg-slate-800/80 rounded-t-lg h-[50%]" />
            <div className="w-full bg-slate-900 rounded-t-lg h-[70%]" />
            <div className="w-full bg-slate-800/80 rounded-t-lg h-[40%]" />
            <div className="w-full bg-slate-900 rounded-t-lg h-[90%]" />
            <div className="w-full bg-slate-800/90 rounded-t-lg h-[60%]" />
            <div className="w-full bg-slate-950 rounded-t-lg h-[75%]" />
          </div>
        </div>

        {/* Stat Card 3: Consent Acceptance Rate */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/40 space-y-4 relative overflow-hidden">
          <div className="flex justify-between items-center text-xs font-semibold text-slate-400">
            <span>Consent Rate</span>
            <span className="inline-flex items-center text-[11px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full font-bold">
              <ArrowUpRight className="w-3 h-3 mr-0.5" /> 10% week ago
            </span>
          </div>

          <div className="text-3xl font-black text-slate-900 tracking-tight">
            100% <span className="text-xs font-normal text-slate-400 font-medium">acceptance</span>
          </div>

          {/* Mini Curved Trend Visualizer */}
          <div className="relative h-14 w-full pt-2 flex items-center">
            <svg className="w-full h-full overflow-visible" viewBox="0 0 100 30" preserveAspectRatio="none">
              <defs>
                <linearGradient id="curveGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f97316" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#f97316" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              <path d="M 0 25 Q 25 20, 50 12 T 100 5 L 100 30 L 0 30 Z" fill="url(#curveGradient)" />
              <path d="M 0 25 Q 25 20, 50 12 T 100 5" fill="none" stroke="#f97316" strokeWidth="3" strokeLinecap="round" />
            </svg>
          </div>
        </div>
      </div>

      {/* History & Active Sessions Table (Inspired directly by Reference Image 2) */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/40 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-bold text-slate-900">History & Active Sessions</h3>
            <p className="text-xs text-slate-400 font-medium">Recent location sharing transactions</p>
          </div>
          <Link href="/dashboard/invitations">
            <Button variant="outline" className="rounded-xl text-xs font-semibold px-4 py-2 border-slate-200">
              View All
            </Button>
          </Link>
        </div>

        {/* Empty State / Active List */}
        <div className="p-8 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto shadow-inner">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <div className="space-y-1 max-w-sm mx-auto">
            <h4 className="font-bold text-slate-800 text-base">No active location streams right now</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Create an invitation link to request live GPS coordinates with family or friends.
            </p>
          </div>
          <Link href="/dashboard/invitations/new" className="inline-block pt-2">
            <Button className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-6 py-2.5 shadow-md shadow-blue-600/20">
              Create First Invitation
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

