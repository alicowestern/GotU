'use client';

import React, { useState } from 'react';
import { PlatformSettingItem } from '@/features/admin/services/adminService';
import { updatePlatformSettingAction } from '@/features/admin/actions';
import { Button } from '@/components/ui/button';

interface AdminSettingsClientProps {
  initialSettings: PlatformSettingItem[];
}

export default function AdminSettingsClient({ initialSettings }: AdminSettingsClientProps) {
  const [settings, setSettings] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    initialSettings.forEach((s) => {
      map[s.key] = s.value;
    });
    return map;
  });

  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleUpdate = async (key: string) => {
    const value = settings[key];
    if (value === undefined || value.trim() === '') {
      setFeedback({ type: 'error', message: 'Setting value cannot be empty.' });
      return;
    }

    setSavingKey(key);
    setFeedback(null);

    const res = await updatePlatformSettingAction(key, value);
    setSavingKey(null);

    if ('error' in res && res.error) {
      setFeedback({ type: 'error', message: res.error });
    } else {
      setFeedback({ type: 'success', message: `Setting "${key}" updated successfully.` });
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Platform Operational Settings</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Configure security thresholds, rate limits, invitation boundaries, and audit log retention.
        </p>
      </div>

      {feedback && (
        <div
          className={`p-3 rounded-md text-xs font-medium border ${
            feedback.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/40 dark:border-rose-900 dark:text-rose-300'
              : 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-900 dark:text-emerald-300'
          }`}
        >
          {feedback.message}
        </div>
      )}

      <div className="border rounded-lg bg-card divide-y">
        {initialSettings.map((item) => (
          <div key={item.key} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1 max-w-md">
              <div className="font-semibold text-xs font-mono text-foreground">{item.key}</div>
              <p className="text-xs text-muted-foreground leading-relaxed">{item.description}</p>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={settings[item.key] ?? item.value}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    [item.key]: e.target.value,
                  }))
                }
                className="px-3 py-1.5 rounded border text-xs font-mono bg-background text-foreground w-36"
              />

              <Button
                variant="outline"
                size="sm"
                disabled={savingKey === item.key}
                onClick={() => handleUpdate(item.key)}
                className="text-xs h-8 min-h-[44px] md:min-h-[32px]"
              >
                {savingKey === item.key ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
