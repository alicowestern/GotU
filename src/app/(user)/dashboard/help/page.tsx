import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HelpCircle, ShieldCheck, Smartphone, MapPin } from "lucide-react";

export default function HelpPage() {
  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h2 className="text-2xl font-black text-slate-900 tracking-tight">Help & Support</h2>
        <p className="text-slate-500 text-xs font-medium">Frequently asked questions and location sharing guides</p>
      </div>

      <div className="grid gap-6">
        <Card className="rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/40 p-6 space-y-4">
          <div className="flex items-start space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">How does consent-based location sharing work?</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                When you create a request, a unique cryptographically signed link is generated. Recipients open the link on their mobile device or browser, review your identity and request purpose, select a duration (15m, 30m, 60m), and grant browser location access. Sharing starts only after explicit consent and can be stopped by the recipient at any time.
              </p>
            </div>
          </div>
        </Card>

        <Card className="rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/40 p-6 space-y-4">
          <div className="flex items-start space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Is location history stored on GotU servers?</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                No. GotU adheres strictly to zero-historical trail data retention policies. Only the single latest GPS coordinate is stored while a sharing session is active. Once revoked or expired, coordinate data is immediately purged.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
