import React from 'react';
import { getAdminUsers } from '@/features/admin/services/adminService';
import AdminUsersClient from '@/components/admin/AdminUsersClient';

export default async function AdminUsersPage() {
  const users = await getAdminUsers();
  return <AdminUsersClient initialUsers={users} />;
}
