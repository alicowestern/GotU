import { Suspense } from 'react';
import { getMyInvitations, revokeInvitation } from '@/features/invitations/actions';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { RefreshCw } from 'lucide-react';
import Link from 'next/link';

async function InvitationsContent() {
  const invitations = await getMyInvitations();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Active & Past Invitations</CardTitle>
      </CardHeader>
      <CardContent>
        {invitations.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">No invitations found. Create one to start sharing.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Recipient</TableHead>
                <TableHead>Purpose</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invitations.map((inv) => (
                <TableRow key={inv.id}>
                  <TableCell className="font-medium">{inv.recipient_label || 'Unnamed'}</TableCell>
                  <TableCell>{inv.purpose}</TableCell>
                  <TableCell>
                    <Badge variant={inv.status === 'active' ? 'default' : 'secondary'}>
                      {inv.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{new Date(inv.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>{new Date(inv.expires_at).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">
                    {inv.status === 'active' && (
                      <form action={async () => {
                        'use server';
                        await revokeInvitation(inv.id);
                      }}>
                        <Button variant="destructive" size="sm" type="submit">Revoke</Button>
                      </form>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

export default function InvitationsPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Invitations</h1>
        <Link href="/dashboard/invitations/new">
          <Button>Create Invitation</Button>
        </Link>
      </div>

      <Suspense
        fallback={
          <div className="flex items-center justify-center p-8">
            <RefreshCw className="w-6 h-6 animate-spin text-primary" />
          </div>
        }
      >
        <InvitationsContent />
      </Suspense>
    </div>
  );
}
