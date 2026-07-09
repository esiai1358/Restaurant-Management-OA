/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef } from 'react';
import { Meal, WeeklyMenu, CustomField, DailyLog } from '../types';
import { generateSampleDailyLogs, DEFAULT_MEALS, DEFAULT_WEEKLY_MENU } from '../utils/farsi';
import { Download, Upload, RotateCcw, ShieldCheck, Database } from 'lucide-react';

interface BackupDataProps {
  onImportAll: (data: {
    meals: Meal[];
    weeklyMenu: WeeklyMenu[];
    customFields: CustomField[];
    logs: DailyLog[];
  }) => void;
  onResetToDefaults: () => void;
  meals: Meal[];
  weeklyMenu: WeeklyMenu[];
  customFields: CustomField[];
  logs: DailyLog[];
}

export default function BackupData({
  onImportAll,
  onResetToDefaults,
  meals,
  weeklyMenu,
  customFields,
  logs,
}: BackupDataProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Export state to JSON file
  const handleExportBackup = () => {
    const backupData = {
      meals,
      weeklyMenu,
      customFields,
      logs,
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `پشتیبان_سامانه_رستوران_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Import JSON backup
  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.meals && parsed.weeklyMenu && parsed.logs) {
          onImportAll({
            meals: parsed.meals,
            weeklyMenu: parsed.weeklyMenu,
            customFields: parsed.customFields || [],
            logs: parsed.logs,
          });
          alert('اطلاعات پشتیبان با موفقیت بازیابی شد!');
        } else {
          alert('فرمت فایل پشتیبان معتبر نیست.');
        }
      } catch (err) {
        alert('خطا در خواندن فایل پشتیبان. لطفاً فایل سالمی را انتخاب کنید.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="bg-[#0f172a] rounded-2xl border border-slate-800 p-6 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl" id="backup-section">
      
      {/* Branding / Info info */}
      <div className="flex items-center gap-3.5 text-right w-full md:w-auto">
        <div className="bg-emerald-500/10 text-emerald-400 p-3 rounded-xl border border-emerald-500/20 shrink-0">
          <Database className="h-6 w-6" />
        </div>
        <div>
          <h3 className="font-extrabold text-slate-100 text-sm flex items-center gap-1.5">
            <ShieldCheck className="h-4.5 w-4.5 text-emerald-400 animate-pulse shrink-0" />
            مرکز مدیریت پایگاه‌داده لوکال و پشتیبان‌گیری
          </h3>
          <p className="text-slate-400 text-xs mt-1 max-w-xl leading-relaxed">
            جهت حفظ اطلاعات ارزشمند آماری پروژه بوشهر عمران آذرستان، توصیه می‌شود در پایان هر هفته با زدن دکمه «تهیه فایل پشتیبان»، نسخه پشتیبان داده‌ها را دانلود نموده و نزد خود نگهداری کنید.
          </p>
        </div>
      </div>

      {/* Buttons controls */}
      <div className="flex flex-wrap items-center justify-end gap-3 w-full md:w-auto">
        
        {/* Import input hidden */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleImportBackup}
          accept=".json"
          className="hidden"
        />

        <button
          onClick={() => fileInputRef.current?.click()}
          className="bg-slate-900 hover:bg-slate-800 text-slate-200 font-bold text-xs px-4 py-2.5 rounded-xl border border-slate-800 hover:border-slate-700 flex items-center gap-2 cursor-pointer transition-all shadow-sm"
        >
          <Upload className="h-4 w-4 text-slate-400" />
          بازیابی فایل پشتیبان
        </button>

        <button
          onClick={handleExportBackup}
          className="bg-emerald-600 hover:bg-emerald-700 text-slate-950 font-extrabold text-xs px-4 py-2.5 rounded-xl flex items-center gap-2 cursor-pointer transition-all shadow-md shadow-emerald-600/10"
        >
          <Download className="h-4 w-4 text-slate-950" />
          تهیه فایل پشتیبان (JSON)
        </button>

        <button
          onClick={() => {
            if (confirm('آیا از بازگرداندن داده‌ها به تنظیمات پیش‌فرض کارخانه مطمئن هستید؟ این کار تمام رکوردهای دستی ثبت‌شده فعلی را پاک می‌کند.')) {
              onResetToDefaults();
            }
          }}
          className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-semibold text-xs px-4 py-2.5 rounded-xl flex items-center gap-2 cursor-pointer transition-all"
          title="بازنشانی پایگاه داده"
        >
          <RotateCcw className="h-4 w-4" />
          ریست داده‌ها
        </button>

      </div>

    </div>
  );
}
