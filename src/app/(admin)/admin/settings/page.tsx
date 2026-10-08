import React from 'react';
import { getPlatformSettings } from '@/features/admin/services/adminService';
import AdminSettingsClient from '@/components/admin/AdminSettingsClient';

export default async function AdminSettingsPage() {
  const settings = await getPlatformSettings();
  return <AdminSettingsClient initialSettings={settings} />;
}
