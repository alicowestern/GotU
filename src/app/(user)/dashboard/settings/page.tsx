import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShieldCheck, User, Bell, Lock } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h2 className="text-2xl font-black text-slate-900 tracking-tight">Account Settings</h2>
        <p className="text-slate-500 text-xs font-medium">Manage your profile, security preferences, and location privacy</p>
      </div>

      <div className="grid gap-6">
        <Card className="rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/40 overflow-hidden">
          <CardHeader className="border-b border-slate-100 bg-slate-50/50 p-6">
            <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-900">
              <User className="w-5 h-5 text-blue-600" /> User Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="displayName" className="text-xs font-semibold text-slate-700">Display Name</Label>
                <Input id="displayName" placeholder="Your Name" className="rounded-xl border-slate-200 text-xs" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs font-semibold text-slate-700">Email Address</Label>
                <Input id="email" type="email" placeholder="user@example.com" disabled className="rounded-xl border-slate-200 text-xs bg-slate-100" />
              </div>
            </div>
            <Button className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-5 py-2">
              Save Profile Changes
            </Button>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/40 overflow-hidden">
          <CardHeader className="border-b border-slate-100 bg-slate-50/50 p-6">
            <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-900">
              <ShieldCheck className="w-5 h-5 text-blue-600" /> Privacy & Location Security
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-100 space-y-1">
              <h4 className="text-xs font-bold text-blue-900">Consent Enforcement Active</h4>
              <p className="text-[11px] text-blue-700 leading-relaxed">
                GotU strictly purges all location coordinates upon session termination. No historical GPS log trail is retained.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
