import React from 'react';
import { getAdminSessions } from '@/features/admin/services/adminService';
import AdminSessionsClient from '@/components/admin/AdminSessionsClient';

export default async function AdminSessionsPage() {
  const sessions = await getAdminSessions();
  return <AdminSessionsClient initialSessions={sessions} />;
}
