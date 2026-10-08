import React from 'react';
import { getAdminSessions } from '@/features/admin/services/adminService';
import AdminLiveClient from '@/components/admin/AdminLiveClient';

export default async function AdminLivePage() {
  const sessions = await getAdminSessions();
  return <AdminLiveClient initialSessions={sessions} />;
}
