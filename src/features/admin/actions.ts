'use server';

import { revalidatePath } from 'next/cache';
import {
  suspendUser,
  reactivateUser,
  terminateSessionByAdmin,
  updatePlatformSetting,
  getAdminSessionLocation,
} from './services/adminService';

function getErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error) return err.message;
  return fallback;
}

export async function suspendUserAction(targetUserId: string, reason: string) {
  try {
    const res = await suspendUser(targetUserId, reason);
    revalidatePath('/admin/users');
    revalidatePath('/admin/dashboard');
    revalidatePath('/admin/sessions');
    return res;
  } catch (err: unknown) {
    return { error: getErrorMessage(err, 'Failed to suspend user') };
  }
}

export async function reactivateUserAction(targetUserId: string) {
  try {
    const res = await reactivateUser(targetUserId);
    revalidatePath('/admin/users');
    revalidatePath('/admin/dashboard');
    return res;
  } catch (err: unknown) {
    return { error: getErrorMessage(err, 'Failed to reactivate user') };
  }
}

export async function terminateSessionAction(sessionId: string, reason: string) {
  try {
    const res = await terminateSessionByAdmin(sessionId, reason);
    revalidatePath('/admin/sessions');
    revalidatePath('/admin/dashboard');
    revalidatePath('/admin/live');
    return res;
  } catch (err: unknown) {
    return { error: getErrorMessage(err, 'Failed to terminate session') };
  }
}

export async function updatePlatformSettingAction(key: string, value: string) {
  try {
    const res = await updatePlatformSetting(key, value);
    revalidatePath('/admin/settings');
    return res;
  } catch (err: unknown) {
    return { error: getErrorMessage(err, 'Failed to update setting') };
  }
}

export async function getAdminLocationAction(sessionId: string, reason: string) {
  try {
    const location = await getAdminSessionLocation(sessionId, reason);
    return { success: true, location };
  } catch (err: unknown) {
    return { error: getErrorMessage(err, 'Failed to access location') };
  }
}
