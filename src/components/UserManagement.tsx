/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AppUser } from '../types';
import { toPersianDigits } from '../utils/farsi';
import {
  Users,
  UserPlus,
  ShieldAlert,
  UserCheck,
  Shield,
  Trash2,
  Lock,
  Search,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface UserManagementProps {
  users: AppUser[];
  onAddUser: (name: string, role: 'admin' | 'supervisor' | 'guest', password?: string) => void;
  onUpdateUserRole: (id: string, role: 'admin' | 'supervisor' | 'guest') => void;
  onUpdateUserPassword: (id: string, password?: string) => void;
  onDeleteUser: (id: string) => void;
  currentUserId: string;
}

export default function UserManagement({
  users,
  onAddUser,
  onUpdateUserRole,
  onUpdateUserPassword,
  onDeleteUser,
  currentUserId,
}: UserManagementProps) {
  const [newUserName, setNewUserName] = useState('');
  const [newUserRole, setNewUserRole] = useState<'admin' | 'supervisor' | 'guest'>('supervisor');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim()) {
      setStatusMessage({ text: 'نام کاربر نمی‌تواند خالی باشد.', type: 'error' });
      return;
    }
    
    // Check if name already exists
    if (users.some(u => u.name.trim() === newUserName.trim())) {
      setStatusMessage({ text: 'کاربری با این نام قبلاً تعریف شده است.', type: 'error' });
      return;
    }

    onAddUser(newUserName.trim(), newUserRole, newUserPassword.trim() || undefined);
    setNewUserName('');
    setNewUserRole('supervisor');
    setNewUserPassword('');
    setStatusMessage({ text: 'کاربر جدید با موفقیت ایجاد شد.', type: 'success' });
    setTimeout(() => setStatusMessage(null), 3000);
  };

  const handleRoleChange = (userId: string, newRole: 'admin' | 'supervisor' | 'guest') => {
    onUpdateUserRole(userId, newRole);
    setStatusMessage({ text: 'سطح دسترسی کاربر با موفقیت بروزرسانی شد.', type: 'success' });
    setTimeout(() => setStatusMessage(null), 3000);
  };

  const handleDelete = (userId: string, name: string) => {
    if (userId === currentUserId) {
      alert('شما نمی‌توانید حساب کاربری فعال خودتان را حذف کنید!');
      return;
    }

    if (window.confirm(`آیا از حذف کاربر "${name}" اطمینان دارید؟`)) {
      onDeleteUser(userId);
      setStatusMessage({ text: `کاربر "${name}" با موفقیت حذف شد.`, type: 'success' });
      setTimeout(() => setStatusMessage(null), 3000);
    }
  };

  const getRoleInfo = (role: 'admin' | 'supervisor' | 'guest') => {
    switch (role) {
      case 'admin':
        return {
          label: 'مدیر سیستم (آدمین)',
          badgeClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
          desc: 'دسترسی کامل به تمامی ابزارها، تنظیمات و مدیریت کاربران',
        };
      case 'supervisor':
        return {
          label: 'سرپرست خدمات کارگاه',
          badgeClass: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
          desc: 'امکان ثبت و ویرایش آمار روزانه، گزارش‌گیری و خروجی اکسل و PDF',
        };
      case 'guest':
        return {
          label: 'مهمان (ناظر)',
          badgeClass: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
          desc: 'فقط مشاهده گزارشات، نمودارها و آمار ثبت شده بدون حق ویرایش',
        };
    }
  };

  const filteredUsers = users.filter((user) =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6" id="user-management-panel" dir="rtl">
      
      {/* Overview Card */}
      <div className="bg-[#0f172a] rounded-2xl border border-slate-800 shadow-xl p-6">
        <div className="flex items-center gap-3 border-b border-slate-800 pb-4 mb-5">
          <Users className="h-6 w-6 text-emerald-500" />
          <div>
            <h2 className="font-bold text-slate-50 text-lg">بخش مدیریت و دسترسی کاربران</h2>
            <p className="text-xs text-slate-400 mt-1">مدیریت کاربران، سطح دسترسی (آدمین، سرپرست خدمات، ناظر مهمان) و امنیت سیستم</p>
          </div>
        </div>

        {/* Dynamic status toast banner */}
        <AnimatePresence>
          {statusMessage && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className={`mb-5 p-3 rounded-xl border text-xs font-bold flex items-center gap-2 ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                  : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="h-4.5 w-4.5 shrink-0" />
              ) : (
                <AlertTriangle className="h-4.5 w-4.5 shrink-0" />
              )}
              <span>{statusMessage.text}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          
          {/* User Creation Section */}
          <div className="bg-slate-950/40 p-5 rounded-2xl border border-slate-800/80">
            <h3 className="font-bold text-slate-100 text-sm mb-4 flex items-center gap-1.5">
              <UserPlus className="h-4 w-4 text-emerald-500" />
              تعریف کاربر و دسترسی جدید
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-slate-300 text-xs font-semibold mb-1.5">نام و نام خانوادگی کاربر</label>
                <input
                  type="text"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  placeholder="مثال: مهندس رضوانی"
                  className="w-full px-3 py-2 border border-slate-800 bg-slate-950 text-slate-100 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 text-xs font-semibold mb-1.5">تعیین سطح دسترسی (نقش)</label>
                <select
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-800 bg-slate-950 text-slate-100 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 outline-none cursor-pointer"
                >
                  <option value="supervisor">سرپرست خدمات کارگاه (ورود اطلاعات و گزارشات)</option>
                  <option value="guest">مهمان / ناظر پروژه (فقط مشاهده آمار بدون ویرایش)</option>
                  <option value="admin">مدیر سیستم (دسترسی کامل به تمامی بخش‌ها)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 text-xs font-semibold mb-1.5">کلمه عبور ورود (اختیاری)</label>
                <input
                  type="text"
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  placeholder="مثال: admin123 (یا خالی برای بدون رمز)"
                  className="w-full px-3 py-2 border border-slate-800 bg-slate-950 text-slate-100 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 outline-none font-mono"
                />
                <p className="text-[9px] text-slate-500 mt-1">جهت بالا بردن امنیت سوئیچ کاربری (مخصوصاً اکانت‌های مدیریت).</p>
              </div>

              {/* Helpful access description panel */}
              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/40 text-[11px] text-slate-400 space-y-1">
                <span className="font-bold text-slate-300 block mb-1">دسترسی‌های این نقش:</span>
                <p>{getRoleInfo(newUserRole).desc}</p>
              </div>

              <button
                type="submit"
                className="w-full bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-slate-950 font-extrabold text-xs py-2.5 rounded-xl transition-all shadow-md shadow-emerald-500/10 cursor-pointer flex items-center justify-center gap-1.5"
              >
                <UserCheck className="h-4 w-4" />
                <span>ثبت و تعریف حساب جدید</span>
              </button>
            </form>
          </div>

          {/* Users List & Role Editor Section */}
          <div className="lg:col-span-2 space-y-4">
            
            {/* Search and stats bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950/40 p-3.5 rounded-xl border border-slate-800/80">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input
                  type="text"
                  placeholder="جستجو در نام کاربران..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pr-9 pl-3 py-1.5 border border-slate-800 bg-slate-950 text-slate-100 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div className="text-xs text-slate-400 flex items-center gap-1">
                <span>تعداد کل کاربران:</span>
                <span className="font-mono font-bold text-emerald-400">{toPersianDigits(users.length)}</span>
                <span>نفر</span>
              </div>
            </div>

            {/* Users list grid */}
            <div className="space-y-3">
              {filteredUsers.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-xs border border-dashed border-slate-800 rounded-xl">
                  کاربری با این مشخصات یافت نشد.
                </div>
              ) : (
                filteredUsers.map((user) => {
                  const roleDetail = getRoleInfo(user.role);
                  const isSelf = user.id === currentUserId;

                  return (
                    <div
                      key={user.id}
                      className={`p-4 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                        isSelf
                          ? 'bg-slate-900 border-emerald-500/40 shadow-md shadow-emerald-500/2'
                          : 'bg-slate-950/30 border-slate-800/80 hover:border-slate-700'
                      }`}
                    >
                      {/* Left/Right: Identity & Avatar */}
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${isSelf ? 'bg-emerald-500/10' : 'bg-slate-800'} text-slate-300 border border-slate-700/50 shrink-0`}>
                          <Shield className={`h-4.5 w-4.5 ${isSelf ? 'text-emerald-400 animate-pulse' : 'text-slate-400'}`} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-100 text-xs sm:text-sm">
                              {user.name}
                            </span>
                            {isSelf && (
                              <span className="bg-emerald-500/15 text-emerald-400 text-[9px] font-bold px-1.5 py-0.5 rounded border border-emerald-500/30">
                                شما (کاربر جاری)
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-500 block mt-0.5">
                            تاریخ تعریف: {user.createdAt || '۱۴۰۵/۰۴/۱۸'}
                          </span>
                        </div>
                      </div>

                      {/* Right/Left: Role Selector and Delete Button */}
                      <div className="flex flex-wrap items-center gap-3 sm:mr-auto">
                        
                        {/* Selector or read-only indicator */}
                        <div className="flex items-center gap-2">
                          <label className="text-[10px] text-slate-400 font-semibold whitespace-nowrap">ویرایش دسترسی:</label>
                          <select
                            value={user.role}
                            onChange={(e) => handleRoleChange(user.id, e.target.value as any)}
                            className="px-2 py-1.5 border border-slate-800 bg-slate-950 text-slate-100 rounded-lg text-xs focus:ring-1 focus:ring-emerald-500 outline-none cursor-pointer font-bold"
                          >
                            <option value="admin">مدیر سیستم (آدمین)</option>
                            <option value="supervisor">سرپرست خدمات</option>
                            <option value="guest">مهمان (ناظر)</option>
                          </select>
                        </div>

                        {/* Password configuration */}
                        <div className="flex items-center gap-2">
                          <label className="text-[10px] text-slate-400 font-semibold whitespace-nowrap">کلمه عبور ورود:</label>
                          <input
                            type="text"
                            value={user.password || ''}
                            onChange={(e) => onUpdateUserPassword(user.id, e.target.value || undefined)}
                            placeholder="بدون رمز"
                            className="w-24 px-2 py-1 border border-slate-800 bg-slate-950 text-slate-100 rounded-lg text-[10px] font-mono focus:ring-1 focus:ring-emerald-500 outline-none text-center"
                          />
                        </div>

                        {/* Delete button (Cannot delete themselves) */}
                        <button
                          type="button"
                          onClick={() => handleDelete(user.id, user.name)}
                          disabled={isSelf}
                          className={`p-2 rounded-lg border transition-all cursor-pointer ${
                            isSelf
                              ? 'bg-slate-900 border-slate-800 text-slate-600 cursor-not-allowed opacity-40'
                              : 'bg-rose-500/5 hover:bg-rose-500/15 border-rose-500/20 hover:border-rose-500/40 text-rose-400'
                          }`}
                          title={isSelf ? "شما نمی‌توانید حساب جاری خودتان را حذف کنید." : "حذف کامل کاربر"}
                        >
                          <Trash2 className="h-4.5 w-4.5" />
                        </button>

                      </div>

                    </div>
                  );
                })
              )}
            </div>

          </div>

        </div>

      </div>

    </div>
  );
}
