import { Suspense } from 'react';
import { validatePublicToken } from '@/features/invitations/actions';
import RecipientConsentClient from './RecipientConsentClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, RefreshCw } from 'lucide-react';
import Link from 'next/link';

async function RecipientConsentContent({ params }: { params: Promise<{ token: string }> | { token: string } }) {
  const resolvedParams = await params;
  const result = await validatePublicToken(resolvedParams.token);

  if (result.error || !result.invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <CardTitle>Invalid or Expired Link</CardTitle>
            <CardDescription>
              {result.error || 'This location sharing invitation is no longer valid.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Link href="/" className="text-primary hover:underline">
              Return to GotU
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <RecipientConsentClient invitation={{ ...result.invitation, rawToken: resolvedParams.token }} />;
}

export default function RecipientConsentPage({ params }: { params: Promise<{ token: string }> | { token: string } }) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
          <div className="flex flex-col items-center gap-2">
            <RefreshCw className="w-6 h-6 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading invitation...</p>
          </div>
        </div>
      }
    >
      <RecipientConsentContent params={params} />
    </Suspense>
  );
}
