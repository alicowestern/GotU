import React from 'react';
import { getSecurityAuditLogs } from '@/features/admin/services/adminService';
import AdminSecurityClient from '@/components/admin/AdminSecurityClient';

export default async function AdminSecurityPage() {
  const { securityAuditEvents, adminAccessEvents } = await getSecurityAuditLogs();
  return <AdminSecurityClient securityEvents={securityAuditEvents} accessEvents={adminAccessEvents} />;
}
