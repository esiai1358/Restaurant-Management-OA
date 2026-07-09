/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Meal, WeeklyMenu, CustomField, DailyLog } from './types';
import {
  DEFAULT_MEALS,
  DEFAULT_WEEKLY_MENU,
  generateSampleDailyLogs,
} from './utils/farsi';
import Header from './components/Header';
import DailyLogForm from './components/DailyLogForm';
import DashboardReports from './components/DashboardReports';
import ConfigurationPanel from './components/ConfigurationPanel';
import BackupData from './components/BackupData';

import { 
  ClipboardEdit, 
  BarChart3, 
  SlidersHorizontal, 
  Database,
  Calendar,
  Building,
  User2,
  Lock
} from 'lucide-react';

export default function App() {
  // Main Tab State: 0 = Daily Logging, 1 = Reports & Analytics, 2 = Base Settings
  const [activeTab, setActiveTab] = useState<number>(1); // Default to Reports/Analytics so charts load beautifully

  // Role Management State
  const [currentRole, setCurrentRole] = useState<'admin' | 'supervisor' | 'guest'>(() => {
    const saved = localStorage.getItem('omran_current_role');
    return (saved as 'admin' | 'supervisor' | 'guest') || 'admin';
  });

  // State initialization with LocalStorage or smart pre-seeded defaults
  const [meals, setMeals] = useState<Meal[]>(() => {
    const saved = localStorage.getItem('omran_meals');
    return saved ? JSON.parse(saved) : DEFAULT_MEALS;
  });

  const [weeklyMenu, setWeeklyMenu] = useState<WeeklyMenu[]>(() => {
    const saved = localStorage.getItem('omran_weekly_menu');
    return saved ? JSON.parse(saved) : DEFAULT_WEEKLY_MENU;
  });

  const [customFields, setCustomFields] = useState<CustomField[]>(() => {
    const saved = localStorage.getItem('omran_custom_fields');
    return saved ? JSON.parse(saved) : [];
  });

  const [logs, setLogs] = useState<DailyLog[]>(() => {
    const saved = localStorage.getItem('omran_logs');
    return saved ? JSON.parse(saved) : generateSampleDailyLogs();
  });

  // LocalStorage Persistors
  useEffect(() => {
    localStorage.setItem('omran_current_role', currentRole);
  }, [currentRole]);

  useEffect(() => {
    localStorage.setItem('omran_meals', JSON.stringify(meals));
  }, [meals]);

  useEffect(() => {
    localStorage.setItem('omran_weekly_menu', JSON.stringify(weeklyMenu));
  }, [weeklyMenu]);

  useEffect(() => {
    localStorage.setItem('omran_custom_fields', JSON.stringify(customFields));
  }, [customFields]);

  useEffect(() => {
    localStorage.setItem('omran_logs', JSON.stringify(logs));
  }, [logs]);

  // Handler to update or insert a daily log
  const handleSaveLog = (newLog: DailyLog) => {
    setLogs((prevLogs) => {
      const idx = prevLogs.findIndex((l) => l.id === newLog.id);
      if (idx > -1) {
        const updated = [...prevLogs];
        updated[idx] = newLog;
        return updated;
      }
      return [newLog, ...prevLogs];
    });
  };

  // Import whole backup helper
  const handleImportAll = (imported: {
    meals: Meal[];
    weeklyMenu: WeeklyMenu[];
    customFields: CustomField[];
    logs: DailyLog[];
  }) => {
    setMeals(imported.meals);
    setWeeklyMenu(imported.weeklyMenu);
    setCustomFields(imported.customFields);
    setLogs(imported.logs);
  };

  // Reset to sample seeded data
  const handleResetToDefaults = () => {
    setMeals(DEFAULT_MEALS);
    setWeeklyMenu(DEFAULT_WEEKLY_MENU);
    setCustomFields([]);
    setLogs(generateSampleDailyLogs());
    setActiveTab(1);
  };

  return (
    <div className="min-h-screen bg-slate-950 font-sans text-right text-slate-200" dir="rtl" id="app-root">
      {/* Brand Header */}
      <Header currentRole={currentRole} onRoleChange={setCurrentRole} />

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8 space-y-6">
        
        {/* Navigation Tabs Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-[#0f172a] p-2.5 rounded-2xl border border-slate-800 shadow-sm">
          
          {/* Tabs */}
          <div className="flex flex-wrap bg-slate-950/40 p-1 rounded-xl gap-1">
            <button
              onClick={() => setActiveTab(0)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold cursor-pointer transition-all ${
                activeTab === 0
                  ? 'bg-slate-850 text-emerald-400 shadow-sm border-b-2 border-emerald-500'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/40'
              }`}
            >
              <ClipboardEdit className="h-4.5 w-4.5 text-emerald-500" />
              ثبت آمار و فعالیت روزانه
            </button>
            
            <button
              onClick={() => setActiveTab(1)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold cursor-pointer transition-all ${
                activeTab === 1
                  ? 'bg-slate-850 text-emerald-400 shadow-sm border-b-2 border-emerald-500'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/40'
              }`}
            >
              <BarChart3 className="h-4.5 w-4.5 text-emerald-500" />
              گزارشات و نمودارهای تحلیلی
            </button>

            <button
              onClick={() => setActiveTab(2)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold cursor-pointer transition-all ${
                activeTab === 2
                  ? 'bg-slate-850 text-emerald-400 shadow-sm border-b-2 border-emerald-500'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/40'
              }`}
            >
              <SlidersHorizontal className="h-4.5 w-4.5 text-emerald-500" />
              تنظیمات پایه و تعاریف
            </button>
          </div>

          {/* Quick Info Header */}
          <div className="hidden lg:flex items-center gap-2.5 text-xs text-slate-400 bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-2 font-medium">
            <Lock className="h-4 w-4 text-emerald-500" />
            <span>پایگاه داده لوکال فعال است.</span>
          </div>

        </div>

        {/* Tab Contents */}
        <div className="transition-all duration-300">
          
          {/* TAB 0: Daily Activity Log Form */}
          {activeTab === 0 && (
            <DailyLogForm
              meals={meals}
              weeklyMenu={weeklyMenu}
              customFields={customFields}
              logs={logs}
              onSaveLog={handleSaveLog}
              currentRole={currentRole}
            />
          )}

          {/* TAB 1: Dashboard Reports */}
          {activeTab === 1 && (
            <DashboardReports
              logs={logs}
              meals={meals}
              customFields={customFields}
            />
          )}

          {/* TAB 2: Base Configuration Panel */}
          {activeTab === 2 && (
            <ConfigurationPanel
              meals={meals}
              setMeals={setMeals}
              weeklyMenu={weeklyMenu}
              setWeeklyMenu={setWeeklyMenu}
              customFields={customFields}
              setCustomFields={setCustomFields}
              currentRole={currentRole}
            />
          )}

        </div>

        {/* Backup & Database Maintenance Center */}
        <BackupData
          meals={meals}
          weeklyMenu={weeklyMenu}
          customFields={customFields}
          logs={logs}
          onImportAll={handleImportAll}
          onResetToDefaults={handleResetToDefaults}
        />

        {/* Beautiful Footer */}
        <footer className="text-center text-slate-500 text-xs pt-4 pb-8 border-t border-slate-800">
          <p>© {new Date().getFullYear()} شرکت عمران آذرستان - پروژه بوشهر. کلیه حقوق مادی و معنوی متعلق به واحد فناوری اطلاعات و ارتباطات (ICT) می‌باشد.</p>
        </footer>

      </main>
    </div>
  );
}
