/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { AuditLog } from '../types';
import { toPersianDigits } from '../utils/farsi';
import {
  FileText,
  Search,
  Filter,
  Trash2,
  Calendar,
  User,
  Shield,
  Layers,
  ArrowDownToLine,
  RefreshCw,
  Clock,
} from 'lucide-react';

interface AuditLogPanelProps {
  logs: AuditLog[];
  onClearLogs: () => void;
  currentRole: 'admin' | 'supervisor' | 'guest';
}

export default function AuditLogPanel({
  logs,
  onClearLogs,
  currentRole,
}: AuditLogPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedActionFilter, setSelectedActionFilter] = useState('all');

  const actionTypes = useMemo(() => {
    const types = new Set<string>();
    logs.forEach((log) => types.add(log.action));
    return Array.from(types);
  }, [logs]);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchSearch =
        log.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.details.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.action.toLowerCase().includes(searchQuery.toLowerCase());

      const matchAction = selectedActionFilter === 'all' || log.action === selectedActionFilter;

      return matchSearch && matchAction;
    });
  }, [logs, searchQuery, selectedActionFilter]);

  const handleExportCSV = () => {
    if (filteredLogs.length === 0) return;
    
    let csvContent = '\uFEFF'; // UTF-8 BOM
    csvContent += 'زمان,کاربر,نقش,عملیات,جزئیات\n';

    filteredLogs.forEach((log) => {
      csvContent += `"${log.timestamp}","${log.userName}","${log.userRole}","${log.action}","${log.details}"\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `لاگ_فعالیت‌های_سیستم_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getActionBadgeColor = (action: string) => {
    switch (action) {
      case 'ورود':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'خروج':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      case 'ثبت داده':
        return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
      case 'ویرایش داده':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'حذف داده':
        return 'bg-red-500/10 text-red-400 border-red-500/20';
      case 'تغییر تنظیمات':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case 'تغییر دسترسی':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      default:
        return 'bg-slate-800 text-slate-400 border-slate-700/50';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin':
        return 'مدیر';
      case 'supervisor':
        return 'سرپرست';
      case 'guest':
        return 'ناظر';
      default:
        return role;
    }
  };

  return (
    <div className="bg-[#0f172a] rounded-2xl border border-slate-800 shadow-xl overflow-hidden" id="audit-log-panel">
      {/* Header */}
      <div className="bg-slate-900/60 border-b border-slate-800 px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-emerald-500" />
          <div>
            <h2 className="font-bold text-slate-50 text-lg">بخش سوم: دفترچه وقایع و لاگ امنیتی سیستم</h2>
            <p className="text-xs text-slate-400 mt-0.5">ردیابی تمامی ورود و خروج‌ها، ثبت، ویرایش و هرگونه تغییرات پیکربندی</p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            onClick={handleExportCSV}
            disabled={filteredLogs.length === 0}
            className="bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 hover:border-slate-600 disabled:opacity-40 disabled:cursor-not-allowed font-extrabold text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-sm transition-all"
            title="دانلود لاگ‌ها به فرمت CSV"
          >
            <ArrowDownToLine className="h-4 w-4" />
            <span>خروجی اکسل لاگ</span>
          </button>

          {currentRole === 'admin' && (
            <button
              onClick={onClearLogs}
              disabled={logs.length === 0}
              className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/25 disabled:opacity-40 disabled:cursor-not-allowed font-extrabold text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5 cursor-pointer transition-all"
              title="پاکسازی کامل وقایع سیستم"
            >
              <Trash2 className="h-4 w-4" />
              <span>پاکسازی همه‌ وقایع</span>
            </button>
          )}
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Filters and search bar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-950/40 p-4 rounded-xl border border-slate-800/80">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input
              type="text"
              placeholder="جستجو در وقایع، کاربران و کلمات کلیدی..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pr-9 pl-3 py-2 border border-slate-800 bg-slate-950 text-slate-100 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>

          <div>
            <select
              value={selectedActionFilter}
              onChange={(e) => setSelectedActionFilter(e.target.value)}
              className="w-full px-3 py-2 border border-slate-800 bg-slate-950 text-slate-100 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 outline-none cursor-pointer"
            >
              <option value="all">فیلتر نوع عملیات: همه موارد</option>
              {actionTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-between bg-slate-950 p-2 rounded-xl border border-slate-900 text-xs text-slate-400 font-medium">
            <div className="flex items-center gap-1">
              <Layers className="h-4 w-4 text-emerald-500" />
              <span>تعداد رکورد نمایش‌داده‌شده:</span>
            </div>
            <span className="font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md">
              {toPersianDigits(filteredLogs.length)}
            </span>
          </div>
        </div>

        {/* Audit Log Timeline / Table */}
        {filteredLogs.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-xs border border-dashed border-slate-800 rounded-2xl max-w-md mx-auto">
            <RefreshCw className="h-10 w-10 text-slate-700 mx-auto mb-3 animate-spin duration-3000" />
            <p className="font-bold text-slate-300 mb-1">هیچ واقعه‌ای ثبت نشده است</p>
            <p className="text-slate-500 leading-relaxed text-[11px]">در حال حاضر هیچ واقعه‌ای منطبق با فیلترها و عبارات جستجوی شما یافت نشد.</p>
          </div>
        ) : (
          <div className="border border-slate-800 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs sm:text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-950/60 text-slate-300 font-bold border-b border-slate-800">
                    <th className="px-4 py-3 w-44">زمان دقیق (جلالی)</th>
                    <th className="px-4 py-3 w-40">کاربر اقدام‌کننده</th>
                    <th className="px-4 py-3 w-32">نقش کاربر</th>
                    <th className="px-4 py-3 w-36">نوع عملیات</th>
                    <th className="px-4 py-3">شرح دقیق واقعه و تغییرات اعمال‌شده</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850">
                  {filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-900/30 transition-colors">
                      <td className="px-4 py-3.5 font-semibold text-slate-300 font-mono text-xs flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                        <span>{toPersianDigits(log.timestamp)}</span>
                      </td>
                      <td className="px-4 py-3.5 font-bold text-slate-100 flex-1">
                        <div className="flex items-center gap-2">
                          <User className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                          <span>{log.userName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 font-medium text-slate-400">
                        <span className="flex items-center gap-1 text-[11px]">
                          <Shield className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                          {getRoleLabel(log.userRole)}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${getActionBadgeColor(log.action)}`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 font-medium text-slate-200">
                        <p className="max-w-2xl text-[11px] leading-relaxed break-words">{toPersianDigits(log.details)}</p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
