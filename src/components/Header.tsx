/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ChefHat, Building2, User, Cpu, Calendar, Shield, Users, Eye } from 'lucide-react';
import { formatToJalali, toPersianDigits } from '../utils/farsi';

import { AppUser, SystemSettings } from '../types';

interface HeaderProps {
  currentRole: 'admin' | 'supervisor' | 'guest';
  users: AppUser[];
  currentUserId: string;
  onUserChange: (id: string) => void;
  systemSettings?: SystemSettings;
}

export default function Header({ currentRole, users, currentUserId, onUserChange, systemSettings }: HeaderProps) {
  const todayStr = new Date().toISOString().split('T')[0];
  const shamsiDate = formatToJalali(todayStr, true);

  const getRoleBadgeStyle = () => {
    switch (currentRole) {
      case 'admin':
        return {
          bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
          badge: 'آدمین (مدیر سیستم)',
          desc: 'دسترسی کامل به تمامی بخش‌ها و تنظیمات اصلی',
          icon: <Shield className="h-4.5 w-4.5 text-emerald-400 shrink-0" />
        };
      case 'supervisor':
        return {
          bg: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30',
          badge: 'سرپرست خدمات کارگاه',
          desc: 'ثبت و ویرایش آمار روزانه + خروجی اکسل و PDF',
          icon: <Users className="h-4.5 w-4.5 text-indigo-400 shrink-0" />
        };
      case 'guest':
        return {
          bg: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
          badge: 'مهمان (ناظر)',
          desc: 'فقط مشاهده گزارشات، نمودارها و آمار روزانه',
          icon: <Eye className="h-4.5 w-4.5 text-amber-400 shrink-0" />
        };
    }
  };

  const roleStyle = getRoleBadgeStyle();
  const currentUser = users.find(u => u.id === currentUserId) || users[0];

  return (
    <header className="bg-slate-900 text-slate-200 border-b border-slate-800 shadow-xl" id="app-header">
      <div className="max-w-[96rem] mx-auto px-4 py-5 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          
          {/* Logo & Company Identity */}
          <div className="flex items-center gap-4">
            {systemSettings?.companyLogo ? (
              <div className="bg-white p-1 rounded-xl shadow-md border-2 border-slate-700 shrink-0 w-14 h-14 flex items-center justify-center overflow-hidden">
                <img
                  src={systemSettings.companyLogo}
                  alt="لوگوی شرکت"
                  className="max-w-full max-h-full object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>
            ) : (
              <div className="bg-emerald-500 text-slate-950 p-3 rounded-xl shadow-md border-2 border-emerald-400 shrink-0">
                <ChefHat className="h-8 w-8" />
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-emerald-500/10 text-emerald-400 text-xs font-semibold px-2 py-0.5 rounded-full border border-emerald-500/30">
                  سامانه مدیریت رستوران کارگاهی
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-50 mt-1">
                شرکت عمران آذرستان
              </h1>
              <p className="text-slate-400 text-xs sm:text-sm flex items-center gap-1.5 mt-0.5">
                <Building2 className="h-3.5 w-3.5 text-emerald-500" />
                پروژه بوشهر
              </p>
            </div>
          </div>

          {/* User Session & Role Switcher */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-3.5 flex flex-col sm:flex-row items-stretch sm:items-center gap-4 flex-1 max-w-2xl">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0">
                {roleStyle.icon}
              </div>
              <div className="text-right">
                <p className="text-slate-400 text-[10px] leading-3">کاربر فعال جاری</p>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="text-xs font-black text-slate-50">{currentUser?.name || 'کاربر سیستم'}</span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${roleStyle.bg}`}>
                    {roleStyle.badge}
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 mt-1 leading-3">{roleStyle.desc}</p>
              </div>
            </div>

            {/* Selector dropdown */}
            <div className="sm:mr-auto flex flex-col gap-1.5 min-w-[200px]">
              <label className="text-[10px] text-slate-400 font-semibold">سوئیچ سریع کاربر فعال</label>
              <select
                value={currentUserId}
                onChange={(e) => {
                  const targetId = e.target.value;
                  const targetUser = users.find(u => u.id === targetId);
                  if (targetUser && targetUser.password) {
                    const entered = window.prompt(`جهت سوئیچ به کاربر "${targetUser.name}"، کلمه عبور را وارد نمایید:`);
                    if (entered !== targetUser.password) {
                      window.alert('خطا: کلمه عبور وارد شده نامعتبر می‌باشد!');
                      return;
                    }
                  }
                  onUserChange(targetId);
                }}
                className="w-full px-3 py-1.5 border border-slate-800 bg-slate-900 text-slate-100 rounded-xl text-xs font-bold focus:ring-2 focus:ring-emerald-500 outline-none cursor-pointer transition-all"
              >
                {users.map((u) => (
                  <option key={u.id} value={u.id} className="bg-slate-900 text-slate-100 font-sans">
                    {u.name} ({u.role === 'admin' ? 'آدمین' : u.role === 'supervisor' ? 'سرپرست' : 'مهمان'})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Date Card */}
          <div className="flex lg:flex-col justify-between sm:justify-start items-center lg:items-end gap-3 sm:gap-4 shrink-0">
            <div className="bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-2 flex items-center gap-2.5 shadow-sm">
              <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 shrink-0">
                <Calendar className="h-4 w-4" />
              </div>
              <div className="text-right">
                <p className="text-slate-400 text-[10px] leading-3">تاریخ امروز (شمسی)</p>
                <p className="font-bold text-emerald-400 mt-0.5 font-mono text-xs sm:text-sm">
                  {toPersianDigits(shamsiDate)}
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </header>
  );
}
