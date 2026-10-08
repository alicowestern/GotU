'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ShieldCheck, Eye, Clock, Lock, Database } from 'lucide-react';

export function PrivacyInfoDialog() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        type="button"
        className="text-xs text-muted-foreground underline hover:text-foreground transition-colors cursor-pointer"
      >
        Learn how GotU protects your location privacy
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" />
            GotU Location Privacy Policy
          </DialogTitle>
          <DialogDescription>
            Transparency and explicit recipient consent are at the core of GotU.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 text-sm pt-2">
          <div className="flex gap-3 items-start">
            <Eye className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-foreground">Who can see your location?</p>
              <p className="text-muted-foreground text-xs">
                Only the person who invited you and the GotU Super Administrator (for operational oversight). No public or unauthenticated access is permitted.
              </p>
            </div>
          </div>

          <div className="flex gap-3 items-start">
            <Database className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-foreground">No Location History</p>
              <p className="text-muted-foreground text-xs">
                GotU stores strictly only your single latest GPS coordinate. No historical logs, breadcrumbs, or past location trails are ever recorded.
              </p>
            </div>
          </div>

          <div className="flex gap-3 items-start">
            <Clock className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-foreground">Automatic Expiration</p>
              <p className="text-muted-foreground text-xs">
                Location sharing automatically ends when your chosen duration expires. Expired sessions immediately purge location data from our servers.
              </p>
            </div>
          </div>

          <div className="flex gap-3 items-start">
            <Lock className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-foreground">Instant Revocation</p>
              <p className="text-muted-foreground text-xs">
                You can press &quot;Stop Sharing&quot; at any point. Access is revoked instantly on the server and your stored coordinate is immediately deleted.
              </p>
            </div>
          </div>
        </div>
        <div className="pt-4 text-right">
          <Button onClick={() => setOpen(false)} variant="secondary" size="sm">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
