/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Meal, WeeklyMenu, CustomField, DailyLog, AppUser, SystemSettings, AuditLog } from './types';
import {
  DEFAULT_MEALS,
  DEFAULT_WEEKLY_MENU,
  generateSampleDailyLogs,
  formatToJalali,
} from './utils/farsi';
import Header from './components/Header';
import DailyLogForm from './components/DailyLogForm';
import DashboardReports from './components/DashboardReports';
import ConfigurationPanel from './components/ConfigurationPanel';
import UserManagement from './components/UserManagement';
import AuditLogPanel from './components/AuditLogPanel';
import BackupData from './components/BackupData';

import { 
  ClipboardEdit, 
  BarChart3, 
  SlidersHorizontal, 
  Database,
  Calendar,
  Building,
  User2,
  Users,
  Lock,
  FileText
} from 'lucide-react';

export default function App() {
  // Main Tab State: 0 = Daily Logging, 1 = Reports & Analytics, 2 = Base Settings, 3 = User Management
  const [activeTab, setActiveTab] = useState<number>(1); // Default to Reports/Analytics so charts load beautifully

  // Users State
  const [users, setUsers] = useState<AppUser[]>(() => {
    const saved = localStorage.getItem('omran_users');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // ignore
      }
    }
    const defaults: AppUser[] = [
      { id: '1', name: 'مهندس حسینی (مدیر ارشد)', role: 'admin', createdAt: '۱۴۰۵/۰۴/۱۸' },
      { id: '2', name: 'مهندس رضایی (سرپرست خدمات)', role: 'supervisor', createdAt: '۱۴۰۵/۰۴/۱۸' },
      { id: '3', name: 'مهندس احمدی (ناظر پروژه)', role: 'guest', createdAt: '۱۴۰۵/۰۴/۱۸' }
    ];
    localStorage.setItem('omran_users', JSON.stringify(defaults));
    return defaults;
  });

  const [currentUserId, setCurrentUserId] = useState<string>(() => {
    return localStorage.getItem('omran_current_user_id') || '1';
  });

  // Derive currentRole from the active user
  const currentUser = users.find(u => u.id === currentUserId) || users[0];
  const currentRole = currentUser?.role || 'admin';

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
    localStorage.setItem('omran_users', JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    localStorage.setItem('omran_current_user_id', currentUserId);
    localStorage.setItem('omran_current_role', currentRole);
  }, [currentUserId, currentRole]);

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

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => {
    const saved = localStorage.getItem('omran_audit_logs');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // ignore
      }
    }
    return [
      {
        id: 'log_seed_1',
        timestamp: '۱۴۰۵/۰۴/۱۸ ۱۲:۳۰:۴۵',
        userId: '1',
        userName: 'مهندس حسینی (مدیر ارشد)',
        userRole: 'admin',
        action: 'ورود',
        details: 'کاربر ارشد وارد سامانه مدیریت رستوران کارگاه شد.'
      }
    ];
  });

  // System Settings State (Contractor and Supervisor info)
  const [systemSettings, setSystemSettings] = useState<SystemSettings>(() => {
    const saved = localStorage.getItem('omran_system_settings');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // ignore
      }
    }
    return {
      contractorName: 'شرکت کترینگ خلیج فارس',
      supervisorName: 'مهندس رضوانی',
      signatures: [
        { id: 'sig_1', title: 'سرپرست خدمات', name: 'مهندس رضوانی', isVisible: true },
        { id: 'sig_2', title: 'پیمانکار رستوران', name: 'شرکت کترینگ خلیج فارس', isVisible: true }
      ]
    };
  });

  useEffect(() => {
    localStorage.setItem('omran_audit_logs', JSON.stringify(auditLogs));
  }, [auditLogs]);

  useEffect(() => {
    localStorage.setItem('omran_system_settings', JSON.stringify(systemSettings));
  }, [systemSettings]);

  const addAuditLog = (action: string, details: string) => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const shamsiDate = formatToJalali(todayStr);
    const timeStr = now.toTimeString().split(' ')[0];
    const timestamp = `${shamsiDate} ${timeStr}`;

    const newLog: AuditLog = {
      id: String(Date.now() + Math.random()),
      timestamp,
      userId: currentUserId,
      userName: currentUser?.name || 'ناشناس',
      userRole: currentRole,
      action,
      details
    };
    setAuditLogs((prev) => [newLog, ...prev]);
  };

  // Switch User Audit Logs
  useEffect(() => {
    const previousUserId = localStorage.getItem('omran_current_user_id');
    if (previousUserId && previousUserId !== currentUserId) {
      const prevUser = users.find(u => u.id === previousUserId);
      const nextUser = users.find(u => u.id === currentUserId);
      if (prevUser && nextUser) {
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];
        const shamsiDate = formatToJalali(todayStr);
        const timeStr = now.toTimeString().split(' ')[0];
        const timestamp = `${shamsiDate} ${timeStr}`;

        const logoutLog: AuditLog = {
          id: String(Date.now() + 1),
          timestamp,
          userId: prevUser.id,
          userName: prevUser.name,
          userRole: prevUser.role,
          action: 'خروج',
          details: `کاربر ${prevUser.name} از سامانه خارج شد.`
        };
        const loginLog: AuditLog = {
          id: String(Date.now() + 2),
          timestamp,
          userId: nextUser.id,
          userName: nextUser.name,
          userRole: nextUser.role,
          action: 'ورود',
          details: `کاربر ${nextUser.name} با نقش ${nextUser.role === 'admin' ? 'مدیر ارشد' : nextUser.role === 'supervisor' ? 'سرپرست' : 'ناظر'} وارد سامانه شد.`
        };
        setAuditLogs((prev) => [loginLog, logoutLog, ...prev]);
      }
    }
  }, [currentUserId]);

  // User Administration Handlers
  const handleAddUser = (name: string, role: 'admin' | 'supervisor' | 'guest', password?: string) => {
    const todayStr = new Date().toISOString().split('T')[0];
    const newUser: AppUser = {
      id: String(Date.now()),
      name,
      role,
      createdAt: formatToJalali(todayStr),
      password
    };
    setUsers((prev) => [...prev, newUser]);
    addAuditLog('تغییر دسترسی', `کاربر جدید با نام ${name} و نقش ${role === 'admin' ? 'مدیر سیستم' : role === 'supervisor' ? 'سرپرست خدمات' : 'ناظر'} تعریف گردید.`);
  };

  const handleUpdateUserRole = (id: string, role: 'admin' | 'supervisor' | 'guest') => {
    setUsers((prev) =>
      prev.map((u) => (u.id === id ? { ...u, role } : u))
    );
    const targetUser = users.find(u => u.id === id);
    if (targetUser) {
      addAuditLog('تغییر دسترسی', `نقش کاربر ${targetUser.name} به ${role === 'admin' ? 'مدیر سیستم' : role === 'supervisor' ? 'سرپرست خدمات' : 'ناظر'} تغییر داده شد.`);
    }
  };

  const handleUpdateUserPassword = (id: string, password?: string) => {
    setUsers((prev) =>
      prev.map((u) => (u.id === id ? { ...u, password } : u))
    );
    const targetUser = users.find(u => u.id === id);
    if (targetUser) {
      addAuditLog('تغییر دسترسی', `کلمه عبور ورود کاربر ${targetUser.name} ویرایش گردید.`);
    }
  };

  const handleDeleteUser = (id: string) => {
    const targetUser = users.find(u => u.id === id);
    setUsers((prev) => prev.filter((u) => u.id !== id));
    if (id === currentUserId) {
      setCurrentUserId('1');
    }
    if (targetUser) {
      addAuditLog('تغییر دسترسی', `کاربر ${targetUser.name} از سامانه حذف گردید.`);
    }
  };

  // Redirect away from User Management/Logs if switched to a non-admin user
  useEffect(() => {
    if ((activeTab === 3 || activeTab === 4) && currentRole !== 'admin') {
      setActiveTab(1);
    }
  }, [currentRole, activeTab]);

  // Handler to update or insert a daily log
  const handleSaveLog = (newLog: DailyLog) => {
    setLogs((prevLogs) => {
      const idx = prevLogs.findIndex((l) => l.id === newLog.id);
      if (idx > -1) {
        const updated = [...prevLogs];
        updated[idx] = newLog;
        addAuditLog('ویرایش داده', `آمار روزانه تاریخ ${newLog.date} وعده ${newLog.mealId === 'lunch' ? 'ناهار' : newLog.mealId === 'dinner' ? 'شام' : 'صبحانه'} ویرایش گردید.`);
        return updated;
      }
      addAuditLog('ثبت داده', `آمار روزانه جدید برای تاریخ ${newLog.date} وعده ${newLog.mealId === 'lunch' ? 'ناهار' : newLog.mealId === 'dinner' ? 'شام' : 'صبحانه'} ثبت گردید.`);
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
    addAuditLog('تغییر تنظیمات', 'نسخه پشتیبان کل سیستم بازیابی (ایمپورت) شد.');
  };

  // Reset to sample seeded data
  const handleResetToDefaults = () => {
    setMeals(DEFAULT_MEALS);
    setWeeklyMenu(DEFAULT_WEEKLY_MENU);
    setCustomFields([]);
    setLogs(generateSampleDailyLogs());
    setActiveTab(1);
    addAuditLog('تغییر تنظیمات', 'اطلاعات سیستم و پایگاه داده به مقادیر اولیه کارخانه ریست گردید.');
  };

  return (
    <div className="min-h-screen bg-slate-950 font-sans text-right text-slate-200" dir="rtl" id="app-root">
      {/* Brand Header */}
      <Header
        currentRole={currentRole}
        users={users}
        currentUserId={currentUserId}
        onUserChange={setCurrentUserId}
        systemSettings={systemSettings}
      />

      {/* Main Container */}
      <main className="max-w-[96rem] mx-auto px-4 py-6 sm:px-6 lg:px-8 space-y-6">
        
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

            {currentRole === 'admin' && (
              <>
                <button
                  onClick={() => setActiveTab(3)}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold cursor-pointer transition-all ${
                    activeTab === 3
                      ? 'bg-slate-850 text-emerald-400 shadow-sm border-b-2 border-emerald-500'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/40'
                  }`}
                >
                  <Users className="h-4.5 w-4.5 text-emerald-500" />
                  مدیریت دسترسی کاربران
                </button>

                <button
                  onClick={() => setActiveTab(4)}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold cursor-pointer transition-all ${
                    activeTab === 4
                      ? 'bg-slate-850 text-emerald-400 shadow-sm border-b-2 border-emerald-500'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/40'
                  }`}
                >
                  <FileText className="h-4.5 w-4.5 text-emerald-500" />
                  دفترچه وقایع سیستم (لاگ)
                </button>
              </>
            )}
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
              systemSettings={systemSettings}
            />
          )}

          {/* TAB 1: Dashboard Reports */}
          {activeTab === 1 && (
            <DashboardReports
              logs={logs}
              meals={meals}
              customFields={customFields}
              systemSettings={systemSettings}
            />
          )}

          {/* TAB 2: Base Configuration Panel */}
          {activeTab === 2 && (
            <ConfigurationPanel
              meals={meals}
              setMeals={(m) => {
                setMeals(m);
                addAuditLog('تغییر تنظیمات', 'پیکربندی وعده‌های غذایی توسط مدیر سیستم تغییر یافت.');
              }}
              weeklyMenu={weeklyMenu}
              setWeeklyMenu={(w) => {
                setWeeklyMenu(w);
                addAuditLog('تغییر تنظیمات', 'برنامه غذایی هفتگی رستوران ویرایش شد.');
              }}
              customFields={customFields}
              setCustomFields={(c) => {
                const diff = c.length - customFields.length;
                setCustomFields(c);
                if (diff > 0) {
                  addAuditLog('تغییر تنظیمات', 'یک پارامتر سفارشی ورودی/خروجی جدید در سیستم تعریف گردید.');
                } else if (diff < 0) {
                  addAuditLog('تغییر تنظیمات', 'یکی از پارامترهای سفارشی سیستم حذف گردید.');
                } else {
                  addAuditLog('تغییر تنظیمات', 'تنظیمات پارامترهای سفارشی سیستم بروزرسانی شد.');
                }
              }}
              currentRole={currentRole}
              systemSettings={systemSettings}
              onUpdateSystemSettings={(s) => {
                setSystemSettings(s);
                addAuditLog('تغییر تنظیمات', 'اطلاعات قرارداد و تنظیمات باکس‌های امضا بروزرسانی شد.');
              }}
            />
          )}

          {/* TAB 3: User Management (Admin Only) */}
          {activeTab === 3 && currentRole === 'admin' && (
            <UserManagement
              users={users}
              onAddUser={handleAddUser}
              onUpdateUserRole={handleUpdateUserRole}
              onUpdateUserPassword={handleUpdateUserPassword}
              onDeleteUser={handleDeleteUser}
              currentUserId={currentUserId}
            />
          )}

          {/* TAB 4: Audit Logs (Admin Only) */}
          {activeTab === 4 && currentRole === 'admin' && (
            <AuditLogPanel
              logs={auditLogs}
              onClearLogs={() => {
                setAuditLogs([]);
                addAuditLog('حذف داده', 'دفترچه وقایع و لاگ‌های امنیتی سیستم پاکسازی گردید.');
              }}
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
