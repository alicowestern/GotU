'use client';

import { useActionState, useState } from 'react';
import { createInvitation } from '@/features/invitations/actions';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import Link from 'next/link';

export default function NewInvitationPage() {
  const [state, action, isPending] = useActionState(createInvitation, null);
  const [copied, setCopied] = useState(false);

  if (state?.success && state.rawToken) {
    const shareLink = `${window.location.origin}/share/${state.rawToken}`;
    
    const copyToClipboard = async () => {
      try {
        await navigator.clipboard.writeText(shareLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy', err);
      }
    };

    const shareNative = async () => {
      if (navigator.share) {
        try {
          await navigator.share({
            title: 'GotU Location Share Request',
            text: 'I am requesting to share your live location through GotU. You can review the request and choose whether to participate.',
            url: shareLink,
          });
        } catch (err) {
          console.error('Error sharing', err);
        }
      }
    };

    return (
      <div className="max-w-2xl mx-auto mt-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-green-600">Invitation Created Successfully</CardTitle>
            <CardDescription>
              This is the ONLY time you will see this link. The secure token is not stored in our database.
              Copy it now and send it to your recipient.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-muted rounded-md break-all font-mono text-sm">
              {shareLink}
            </div>
            <div className="flex flex-wrap gap-4">
              <Button onClick={copyToClipboard} variant="secondary">
                {copied ? 'Copied!' : 'Copy Link'}
              </Button>
              {typeof navigator !== 'undefined' && 'share' in navigator && (
                <Button onClick={shareNative}>Native Share</Button>
              )}
              <a href={`https://wa.me/?text=${encodeURIComponent(`I am requesting to share your live location through GotU. You can review the request and choose whether to participate. ${shareLink}`)}`} target="_blank" rel="noopener noreferrer" className={buttonVariants({ variant: "outline" })}>
                WhatsApp
              </a>
              <a href={`https://t.me/share/url?url=${encodeURIComponent(shareLink)}&text=${encodeURIComponent('I am requesting to share your live location through GotU. You can review the request and choose whether to participate.')}`} target="_blank" rel="noopener noreferrer" className={buttonVariants({ variant: "outline" })}>
                Telegram
              </a>
            </div>
          </CardContent>
          <CardFooter>
            <Link href="/dashboard/invitations">
              <Button variant="ghost">Return to Invitations</Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto mt-8">
      <Card>
        <CardHeader>
          <CardTitle>Create Location Request</CardTitle>
          <CardDescription>Generate a secure, one-time invitation link.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={action} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="recipientLabel">Recipient Name / Label (Optional)</Label>
              <Input id="recipientLabel" name="recipientLabel" placeholder="e.g. John Doe" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="purpose">Purpose of Request (Required)</Label>
              <Textarea id="purpose" name="purpose" placeholder="e.g. Ensure you arrive home safely." required maxLength={300} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="message">Personal Message (Optional)</Label>
              <Textarea id="message" name="message" placeholder="A short note to the recipient" maxLength={500} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expiryHours">Invitation Expiry</Label>
              <select id="expiryHours" name="expiryHours" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
                <option value="0.25">15 Minutes</option>
                <option value="1">1 Hour</option>
                <option value="24">24 Hours</option>
              </select>
              <p className="text-xs text-muted-foreground">How long the link will remain valid to open.</p>
            </div>

            {state?.error && (
              <div className="text-sm text-destructive">{state.error}</div>
            )}

            <Button type="submit" disabled={isPending} className="w-full">
              {isPending ? 'Generating Link...' : 'Generate Secure Link'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
