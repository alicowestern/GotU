import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { History, ShieldCheck } from "lucide-react";

export default function HistoryPage() {
  return (
    <div className="space-y-8 max-w-5xl">
      <div>
        <h2 className="text-2xl font-black text-slate-900 tracking-tight">Session History</h2>
        <p className="text-slate-500 text-xs font-medium">Audit logs of past completed and revoked location sharing sessions</p>
      </div>

      <Card className="rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/40 p-8 text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
          <History className="w-8 h-8" />
        </div>
        <div className="space-y-1 max-w-sm mx-auto">
          <h3 className="font-bold text-slate-900 text-base">No session history yet</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Completed or revoked sessions will be logged here for security auditing. No GPS coordinates are stored in history logs.
          </p>
        </div>
      </Card>
    </div>
  );
}
