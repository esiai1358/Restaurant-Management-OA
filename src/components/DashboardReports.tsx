/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { DailyLog, Meal, CustomField, SystemSettings } from '../types';
import { formatToJalali, getJalaliMonthName, toPersianDigits, getIranLocalDateStr } from '../utils/farsi';
import { exportToCSV, printToPDF } from '../utils/exportHelpers';
import ExportSelectionModal from './ExportSelectionModal';
import PresenceVsCookingChart from './PresenceVsCookingChart';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
} from 'recharts';
import {
  TrendingUp,
  FileSpreadsheet,
  AlertCircle,
  TrendingDown,
  CalendarDays,
  Activity,
  PlusCircle,
  Eye,
  Settings,
  Scale,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  Filter,
  Printer,
} from 'lucide-react';

interface DashboardReportsProps {
  logs: DailyLog[];
  meals: Meal[];
  customFields: CustomField[];
  systemSettings: SystemSettings;
}

export default function DashboardReports({ logs, meals, customFields, systemSettings }: DashboardReportsProps) {
  // Filters state
  const [selectedYear, setSelectedYear] = useState<number>(1405); // Persian Year (matching Gregorian 2026)
  const [selectedMonth, setSelectedMonth] = useState<number>(4); // تیر (July is roughly month 4 of Solar year)
  const [selectedMealFilter, setSelectedMealFilter] = useState<string>('all'); // 'all' or specific meal id
  const [chartPeriod, setChartPeriod] = useState<'daily' | 'weekly' | 'monthly' | 'comparison'>('daily');

  // Time range filtering panel state variables
  const [timeRangeType, setTimeRangeType] = useState<'jalaliMonth' | 'last10days' | 'last30days' | 'custom'>('jalaliMonth');
  
  const todayStr = getIranLocalDateStr();
  const tenDaysAgoStr = useMemo(() => {
    const d = new Date(todayStr);
    d.setDate(d.getDate() - 10);
    return d.toISOString().split('T')[0];
  }, [todayStr]);

  const [customStartDate, setCustomStartDate] = useState<string>(tenDaysAgoStr);
  const [customEndDate, setCustomEndDate] = useState<string>(todayStr);

  // Export selection modal states
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportModalType, setExportModalType] = useState<'excel' | 'pdf'>('excel');

  // Helper lists for Persian Months
  const JALALI_MONTHS = [
    { num: 1, name: 'فروردین' },
    { num: 2, name: 'اردیبهشت' },
    { num: 3, name: 'خرداد' },
    { num: 4, name: 'تیر' },
    { num: 5, name: 'مرداد' },
    { num: 6, name: 'شهریور' },
    { num: 7, name: 'مهر' },
    { num: 8, name: 'آبان' },
    { num: 9, name: 'آذر' },
    { num: 10, name: 'دی' },
    { num: 11, name: 'بهمن' },
    { num: 12, name: 'اسفند' },
  ];

  // Map greg date to Jalali year and month, and filter logs
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      if (!log.date) return false;
      
      const matchMeal = selectedMealFilter === 'all' || log.mealId === selectedMealFilter;
      if (!matchMeal) return false;

      if (timeRangeType === 'jalaliMonth') {
        const [y, m, d] = log.date.split('-').map(Number);
        if (isNaN(y) || isNaN(m) || isNaN(d)) return false;
        
        const g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 335];
        const gy2 = m > 2 ? y + 1 : y;
        let g_day_no = 365 * y + Math.floor((gy2 + 3) / 4) - Math.floor((gy2 + 99) / 100) + Math.floor((gy2 + 399) / 400) - 80 + d + g_d_m[m - 1];
        let jy = 979 + 33 * Math.floor(g_day_no / 12053) + 4 * Math.floor((g_day_no % 12053) / 1461);
        g_day_no %= 1461;
        if (g_day_no >= 366) {
          jy += Math.floor((g_day_no - 1) / 365);
          g_day_no = (g_day_no - 1) % 365;
        }
        let j_day_no = g_day_no + 78;
        if (j_day_no >= 366) {
          jy += 1;
          j_day_no -= 366;
        }
        const jm = 1 + Math.floor(j_day_no / 31);

        return jy === selectedYear && jm === selectedMonth;
      } else if (timeRangeType === 'last10days') {
        const today = new Date(todayStr);
        const tenDaysAgo = new Date(today);
        tenDaysAgo.setDate(today.getDate() - 10);
        
        const logDate = new Date(log.date);
        return logDate >= tenDaysAgo && logDate <= today;
      } else if (timeRangeType === 'last30days') {
        const today = new Date(todayStr);
        const thirtyDaysAgo = new Date(today);
        thirtyDaysAgo.setDate(today.getDate() - 30);
        
        const logDate = new Date(log.date);
        return logDate >= thirtyDaysAgo && logDate <= today;
      } else if (timeRangeType === 'custom') {
        const logDate = new Date(log.date);
        if (customStartDate) {
          const start = new Date(customStartDate);
          if (logDate < start) return false;
        }
        if (customEndDate) {
          const end = new Date(customEndDate);
          if (logDate > end) return false;
        }
        return true;
      }

      return false;
    });
  }, [logs, selectedYear, selectedMonth, selectedMealFilter, timeRangeType, customStartDate, customEndDate, todayStr]);

  // Aggregate monthly statistics
  const aggregates = useMemo(() => {
    let totalOfficeAnnounced = 0;
    let totalCookingInstruction = 0;
    let totalContractorCooked = 0;
    let totalReceivedInRestaurant = 0;
    let totalForgottenTicket = 0;
    let totalTakeaways = 0;
    let totalSystemOutput = 0;
    let count = 0;

    filteredLogs.forEach((log) => {
      totalOfficeAnnounced += log.officeAnnounced;
      totalCookingInstruction += log.cookingInstruction;
      totalContractorCooked += log.contractorCooked;
      totalReceivedInRestaurant += log.receivedInRestaurant;
      totalForgottenTicket += log.forgottenTicket;
      totalTakeaways += log.takeaways;
      totalSystemOutput += log.systemOutput;
      count++;
    });

    const totalDistributed = totalReceivedInRestaurant + totalForgottenTicket + totalTakeaways;
    const foodWastage = totalContractorCooked - totalDistributed;
    const efficiency = totalContractorCooked > 0 ? (totalDistributed / totalContractorCooked) * 100 : 0;

    return {
      officeAnnounced: totalOfficeAnnounced,
      cookingInstruction: totalCookingInstruction,
      contractorCooked: totalContractorCooked,
      receivedInRestaurant: totalReceivedInRestaurant,
      forgottenTicket: totalForgottenTicket,
      takeaways: totalTakeaways,
      systemOutput: totalSystemOutput,
      totalDistributed,
      foodWastage,
      efficiency,
      count,
    };
  }, [filteredLogs]);

  // Transform filtered logs for chart rendering (grouped by day)
  const chartData = useMemo(() => {
    // Group logs by date
    const dateGroups: Record<string, {
      dateLabel: string;
      officeAnnounced: number;
      cookingInstruction: number;
      contractorCooked: number;
      receivedInRestaurant: number;
      forgottenTicket: number;
      takeaways: number;
      systemOutput: number;
    }> = {};

    filteredLogs.forEach((log) => {
      const shamsi = formatToJalali(log.date);
      const dayOnly = shamsi.split('/')[2]; // Extract just the day number
      const label = `روز ${dayOnly}`;

      if (!dateGroups[log.date]) {
        dateGroups[log.date] = {
          dateLabel: label,
          officeAnnounced: 0,
          cookingInstruction: 0,
          contractorCooked: 0,
          receivedInRestaurant: 0,
          forgottenTicket: 0,
          takeaways: 0,
          systemOutput: 0,
        };
      }

      dateGroups[log.date].officeAnnounced += log.officeAnnounced;
      dateGroups[log.date].cookingInstruction += log.cookingInstruction;
      dateGroups[log.date].contractorCooked += log.contractorCooked;
      dateGroups[log.date].receivedInRestaurant += log.receivedInRestaurant;
      dateGroups[log.date].forgottenTicket += log.forgottenTicket;
      dateGroups[log.date].takeaways += log.takeaways;
      dateGroups[log.date].systemOutput += log.systemOutput;
    });

    // Convert to sorted array
    return Object.entries(dateGroups)
      .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
      .map(([_, val]) => val);
  }, [filteredLogs]);

  // Aggregate weekly statistics (grouped into Weeks 1-5 of the selected month)
  const weeklyChartData = useMemo(() => {
    const weeks: Record<string, {
      weekLabel: string;
      officeAnnounced: number;
      cookingInstruction: number;
      contractorCooked: number;
      totalDistributed: number;
      receptionRate: number;
    }> = {
      'w1': { weekLabel: 'هفته اول', officeAnnounced: 0, cookingInstruction: 0, contractorCooked: 0, totalDistributed: 0, receptionRate: 0 },
      'w2': { weekLabel: 'هفته دوم', officeAnnounced: 0, cookingInstruction: 0, contractorCooked: 0, totalDistributed: 0, receptionRate: 0 },
      'w3': { weekLabel: 'هفته سوم', officeAnnounced: 0, cookingInstruction: 0, contractorCooked: 0, totalDistributed: 0, receptionRate: 0 },
      'w4': { weekLabel: 'هفته چهارم', officeAnnounced: 0, cookingInstruction: 0, contractorCooked: 0, totalDistributed: 0, receptionRate: 0 },
      'w5': { weekLabel: 'هفته پنجم', officeAnnounced: 0, cookingInstruction: 0, contractorCooked: 0, totalDistributed: 0, receptionRate: 0 },
    };

    filteredLogs.forEach((log) => {
      if (!log.date) return;
      const shamsi = formatToJalali(log.date);
      const dayNum = Number(shamsi.split('/')[2]);

      let weekKey = 'w5';
      if (dayNum <= 7) weekKey = 'w1';
      else if (dayNum <= 14) weekKey = 'w2';
      else if (dayNum <= 21) weekKey = 'w3';
      else if (dayNum <= 28) weekKey = 'w4';

      const totalDist = log.receivedInRestaurant + log.forgottenTicket + log.takeaways;
      
      weeks[weekKey].officeAnnounced += log.officeAnnounced;
      weeks[weekKey].cookingInstruction += log.cookingInstruction;
      weeks[weekKey].contractorCooked += log.contractorCooked;
      weeks[weekKey].totalDistributed += totalDist;
    });

    return Object.values(weeks).map(w => {
      const reception = w.officeAnnounced > 0 ? (w.totalDistributed / w.officeAnnounced) * 100 : 0;
      return {
        ...w,
        receptionRate: Math.round(reception)
      };
    });
  }, [filteredLogs]);

  // Aggregate monthly statistics for the selected year
  const monthlyChartData = useMemo(() => {
    const monthsData = JALALI_MONTHS.map(m => ({
      monthLabel: m.name,
      monthNum: m.num,
      officeAnnounced: 0,
      cookingInstruction: 0,
      contractorCooked: 0,
      totalDistributed: 0,
      receptionRate: 0
    }));

    logs.forEach((log) => {
      if (!log.date) return;
      const [y, m, d] = log.date.split('-').map(Number);
      if (isNaN(y) || isNaN(m) || isNaN(d)) return;

      const g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 335];
      const gy2 = m > 2 ? y + 1 : y;
      let g_day_no = 365 * y + Math.floor((gy2 + 3) / 4) - Math.floor((gy2 + 99) / 100) + Math.floor((gy2 + 399) / 400) - 80 + d + g_d_m[m - 1];
      let jy = 979 + 33 * Math.floor(g_day_no / 12053) + 4 * Math.floor((g_day_no % 12053) / 1461);
      g_day_no %= 1461;
      if (g_day_no >= 366) {
        jy += Math.floor((g_day_no - 1) / 365);
        g_day_no = (g_day_no - 1) % 365;
      }
      let j_day_no = g_day_no + 78;
      if (j_day_no >= 366) {
        jy += 1;
        j_day_no -= 366;
      }
      const jm = 1 + Math.floor(j_day_no / 31);

      if (jy === selectedYear) {
        const targetMonth = monthsData.find(md => md.monthNum === jm);
        if (targetMonth) {
          const totalDist = log.receivedInRestaurant + log.forgottenTicket + log.takeaways;
          targetMonth.officeAnnounced += log.officeAnnounced;
          targetMonth.cookingInstruction += log.cookingInstruction;
          targetMonth.contractorCooked += log.contractorCooked;
          targetMonth.totalDistributed += totalDist;
        }
      }
    });

    return monthsData.map(m => {
      const reception = m.officeAnnounced > 0 ? (m.totalDistributed / m.officeAnnounced) * 100 : 0;
      return {
        ...m,
        receptionRate: Math.round(reception)
      };
    });
  }, [logs, selectedYear]);

  // Return list of available fields to export
  const getReportsExportItems = () => {
    return [
      { key: 'officeAnnounced', label: 'آمار حضور روزانه ( اعلام شده اداری )', category: 'اداری' },
      { key: 'cookingInstruction', label: 'کل دستور پخت', category: 'پیمانکار' },
      { key: 'contractorCooked', label: 'کل پخت پیمانکار', category: 'پیمانکار' },
      { key: 'receivedInRestaurant', label: 'دریافت واقعی رستوران (کارت)', category: 'رستوران' },
      { key: 'forgottenTicket', label: 'دریافت با فیش فراموشی', category: 'رستوران' },
      { key: 'takeaways', label: 'دریافت غذای بیرون‌بر', category: 'رستوران' },
      { key: 'systemOutput', label: 'آمار خروجی سامانه', category: 'سیستم' },
      { key: 'workshopPersonnel', label: 'آمار کل کارگاه', category: 'ظرفیت' },
      { key: 'wastage', label: 'میزان پرت غذا', category: 'محاسباتی' },
    ];
  };

  const handleExportCSVClick = () => {
    if (filteredLogs.length === 0) {
      alert('داده‌ای برای خروجی گرفتن وجود ندارد.');
      return;
    }
    setExportModalType('excel');
    setIsExportModalOpen(true);
  };

  const handleExportPDFClick = () => {
    if (filteredLogs.length === 0) {
      alert('داده‌ای برای خروجی گرفتن وجود ندارد.');
      return;
    }
    setExportModalType('pdf');
    setIsExportModalOpen(true);
  };

  const executeReportsExport = (selectedKeys: string[]) => {
    if (filteredLogs.length === 0) return;
    
    let rangeSubtitle = '';
    let exportFileNameSuffix = '';
    if (timeRangeType === 'jalaliMonth') {
      const monthName = getJalaliMonthName(selectedMonth);
      rangeSubtitle = `${monthName} ماه سال ${selectedYear}`;
      exportFileNameSuffix = `${selectedYear}_${selectedMonth}`;
    } else if (timeRangeType === 'last10days') {
      rangeSubtitle = `۱۰ روز اخیر`;
      exportFileNameSuffix = `10days`;
    } else if (timeRangeType === 'last30days') {
      rangeSubtitle = `۳۰ روز اخیر`;
      exportFileNameSuffix = `30days`;
    } else if (timeRangeType === 'custom') {
      const startJ = customStartDate ? formatToJalali(customStartDate) : 'ابتدا';
      const endJ = customEndDate ? formatToJalali(customEndDate) : 'انتها';
      rangeSubtitle = `از ${startJ} تا ${endJ}`;
      exportFileNameSuffix = `custom_${customStartDate || 'start'}_to_${customEndDate || 'end'}`;
    }

    if (exportModalType === 'excel') {
      const headers: string[] = ['تاریخ', 'وعده غذایی'];
      if (selectedKeys.includes('officeAnnounced')) headers.push('آمار حضور روزانه ( اعلام شده اداری )');
      if (selectedKeys.includes('cookingInstruction')) headers.push('دستور پخت');
      if (selectedKeys.includes('contractorCooked')) headers.push('پخت پیمانکار');
      if (selectedKeys.includes('receivedInRestaurant')) headers.push('دریافت رستوران');
      if (selectedKeys.includes('forgottenTicket')) headers.push('فیش فراموشی');
      if (selectedKeys.includes('takeaways')) headers.push('بیرون‌بر');
      if (selectedKeys.includes('systemOutput')) headers.push('خروجی سیستم');
      if (selectedKeys.includes('workshopPersonnel')) headers.push('آمار کل کارگاه');
      if (selectedKeys.includes('wastage')) headers.push('پرت غذا');

      let csvContent = '\uFEFF'; // UTF-8 BOM for Persian excel alignment
      csvContent += `"شرکت عمران آذرستان - پروژه ساخت و ساز صنعتی بوشهر"${systemSettings?.companyLogo ? ',"(دارای لوگوی اختصاصی شرکت)"' : ''}\n`;
      csvContent += `"گزارش عملکرد و مغایرت تجمعی دوره رستوران کارگاهی"\n`;
      csvContent += `"دوره گزارش: ${rangeSubtitle}"\n\n`;
      csvContent += headers.join(',') + '\n';

      filteredLogs.forEach((log) => {
        const mealName = meals.find((m) => m.id === log.mealId)?.name || log.mealId;
        const shamsi = formatToJalali(log.date);
        
        const rowValues: string[] = [shamsi, mealName];
        if (selectedKeys.includes('officeAnnounced')) rowValues.push(String(log.officeAnnounced));
        if (selectedKeys.includes('cookingInstruction')) rowValues.push(String(log.cookingInstruction));
        if (selectedKeys.includes('contractorCooked')) rowValues.push(String(log.contractorCooked));
        if (selectedKeys.includes('receivedInRestaurant')) rowValues.push(String(log.receivedInRestaurant));
        if (selectedKeys.includes('forgottenTicket')) rowValues.push(String(log.forgottenTicket));
        if (selectedKeys.includes('takeaways')) rowValues.push(String(log.takeaways));
        if (selectedKeys.includes('systemOutput')) rowValues.push(String(log.systemOutput));
        if (selectedKeys.includes('workshopPersonnel')) rowValues.push(String(log.workshopPersonnel));
        if (selectedKeys.includes('wastage')) {
          const realConsumption = log.receivedInRestaurant + log.forgottenTicket + log.takeaways;
          const wastage = log.contractorCooked - realConsumption;
          rowValues.push(String(wastage));
        }

        csvContent += rowValues.join(',') + '\n';
      });

      if (systemSettings && systemSettings.signatures) {
        csvContent += '\n'; // blank line
        systemSettings.signatures.filter(s => s.isVisible).forEach(s => {
          csvContent += `امضای ${s.title},${s.name}\n`;
        });
      }

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `گزارش_رستوران_${exportFileNameSuffix}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      // PDF Dynamic
      const headers = ['تاریخ', 'وعده'];
      if (selectedKeys.includes('officeAnnounced')) headers.push('آمار حضور روزانه ( اعلام شده اداری )');
      if (selectedKeys.includes('cookingInstruction')) headers.push('دستور پخت');
      if (selectedKeys.includes('contractorCooked')) headers.push('پخت پیمانکار');
      if (selectedKeys.includes('receivedInRestaurant')) headers.push('دریافت واقعی');
      if (selectedKeys.includes('forgottenTicket')) headers.push('فیش فراموشی');
      if (selectedKeys.includes('takeaways')) headers.push('بیرون‌بر');
      if (selectedKeys.includes('systemOutput')) headers.push('خروجی سیستم');
      if (selectedKeys.includes('wastage')) headers.push('پرت غذا');

      const rows = filteredLogs.map((log) => {
        const mealName = meals.find((m) => m.id === log.mealId)?.name || log.mealId;
        const shamsi = formatToJalali(log.date);
        
        const rowValues: (string | number)[] = [shamsi, mealName];
        if (selectedKeys.includes('officeAnnounced')) rowValues.push(log.officeAnnounced);
        if (selectedKeys.includes('cookingInstruction')) rowValues.push(log.cookingInstruction);
        if (selectedKeys.includes('contractorCooked')) rowValues.push(log.contractorCooked);
        if (selectedKeys.includes('receivedInRestaurant')) rowValues.push(log.receivedInRestaurant);
        if (selectedKeys.includes('forgottenTicket')) rowValues.push(log.forgottenTicket);
        if (selectedKeys.includes('takeaways')) rowValues.push(log.takeaways);
        if (selectedKeys.includes('systemOutput')) rowValues.push(log.systemOutput);
        if (selectedKeys.includes('wastage')) {
          const realConsumption = log.receivedInRestaurant + log.forgottenTicket + log.takeaways;
          const wastage = log.contractorCooked - realConsumption;
          rowValues.push(wastage);
        }
        return rowValues;
      });

      const summaries = [];
      if (selectedKeys.includes('officeAnnounced')) {
        summaries.push({ label: 'کل آمار حضور روزانه ( اعلام شده اداری ) دوره', value: aggregates.officeAnnounced });
      }
      if (selectedKeys.includes('contractorCooked')) {
        summaries.push({ label: 'کل غذای پخته شده', value: aggregates.contractorCooked });
      }
      if (selectedKeys.includes('receivedInRestaurant') || selectedKeys.includes('forgottenTicket') || selectedKeys.includes('takeaways')) {
        summaries.push({ label: 'کل غذای توزیع شده', value: aggregates.totalDistributed });
      }
      if (selectedKeys.includes('wastage')) {
        summaries.push({ label: 'کل پرت غذای دوره (پرس)', value: aggregates.foodWastage });
      }

      printToPDF(
        `گزارش عملکرد و مغایرت تجمعی ماهانه رستوران کارگاهی بوشهر`,
        `دوره گزارش: ${rangeSubtitle} | تعداد کل رکوردها: ${aggregates.count} مورد`,
        headers,
        rows,
        summaries,
        systemSettings.signatures,
        systemSettings.companyLogo
      );
    }
  };

  return (
    <div className="space-y-6" id="dashboard-reports">
      
      {/* Filters Card */}
      <div className="bg-[#0f172a] rounded-2xl border border-slate-800 shadow-xl p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4 mb-5">
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-emerald-500" />
            <h2 className="font-bold text-slate-50 text-lg">بخش دوم: سیستم گزارشات ماهیانه و آمار تجمعی</h2>
          </div>
          
          <div className="flex flex-wrap items-center gap-3 self-end md:self-auto">
            <button
              onClick={handleExportCSVClick}
              className="bg-emerald-600 hover:bg-emerald-700 text-slate-950 font-extrabold text-xs px-4 py-2.5 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-sm shadow-emerald-600/10 transition-all"
            >
              <FileSpreadsheet className="h-4 w-4" />
              خروجی اکسل (CSV)
            </button>

            <button
              onClick={handleExportPDFClick}
              className="bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 font-extrabold text-xs px-4 py-2.5 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-sm transition-all"
            >
              <Printer className="h-4 w-4 text-amber-400" />
              خروجی گزارش PDF
            </button>
          </div>
        </div>

        {/* Time Range Selector Panel */}
        <div className="mb-6 bg-slate-950 p-1.5 rounded-xl border border-slate-800 flex flex-wrap gap-1 max-w-4xl text-right direction-rtl">
          {[
            { id: 'jalaliMonth', label: 'ماه شمسی خاص' },
            { id: 'last10days', label: '۱۰ روز اخیر' },
            { id: 'last30days', label: '۳۰ روز اخیر' },
            { id: 'custom', label: 'محدوده تاریخ انتخابی (میلادی)' }
          ].map((type) => (
            <button
              key={type.id}
              onClick={() => setTimeRangeType(type.id as any)}
              className={`px-4 py-2 rounded-lg text-xs font-black transition-all cursor-pointer ${
                timeRangeType === type.id
                  ? 'bg-emerald-600 text-slate-950 shadow-md font-extrabold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
              }`}
            >
              {type.label}
            </button>
          ))}
        </div>

        {/* Filters Form Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          {timeRangeType === 'jalaliMonth' ? (
            <>
              <div>
                <label className="block text-slate-300 text-xs font-semibold mb-1.5">انتخاب سال شمسی</label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-800 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none bg-slate-950 text-slate-100 font-mono"
                >
                  <option value="1405" className="bg-slate-950 text-slate-100">۱۴۰۵</option>
                  <option value="1404" className="bg-slate-950 text-slate-100">۱۴۰۴</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 text-xs font-semibold mb-1.5">انتخاب ماه</label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-800 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none bg-slate-950 text-slate-100"
                >
                  {JALALI_MONTHS.map((m) => (
                    <option key={m.num} value={m.num} className="bg-slate-950 text-slate-100">
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>
            </>
          ) : timeRangeType === 'custom' ? (
            <>
              <div>
                <label className="block text-slate-300 text-xs font-semibold mb-1.5">تاریخ شروع</label>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-800 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none bg-slate-950 text-slate-100 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-300 text-xs font-semibold mb-1.5">تاریخ پایان</label>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-800 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none bg-slate-950 text-slate-100 font-mono"
                />
              </div>
            </>
          ) : (
            <div className="sm:col-span-2 flex items-center bg-slate-950/40 border border-slate-850 p-3.5 rounded-xl">
              <span className="text-xs text-slate-400">
                گزارش برای بازه {timeRangeType === 'last10days' ? '۱۰ روز اخیر' : '۳۰ روز اخیر'} منتهی به تاریخ امروز ({toPersianDigits(formatToJalali(todayStr))}) فعال است.
              </span>
            </div>
          )}

          <div>
            <label className="block text-slate-300 text-xs font-semibold mb-1.5">تفکیک وعده غذایی</label>
            <select
              value={selectedMealFilter}
              onChange={(e) => setSelectedMealFilter(e.target.value)}
              className="w-full px-3 py-2 border border-slate-800 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none bg-slate-950 text-slate-100"
            >
              <option value="all" className="bg-slate-950 text-slate-100">همه وعده‌ها (مجموع کل)</option>
              {meals.map((m) => (
                <option key={m.id} value={m.id} className="bg-slate-950 text-slate-100">
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          {/* Quick status badge */}
          <div className="flex items-center justify-center bg-slate-950 border border-slate-800 rounded-xl p-3">
            <div className="text-center">
              <p className="text-[10px] text-slate-400">تعداد روزهای ثبت‌شده در این بازه</p>
              <p className="font-extrabold text-emerald-400 text-lg font-mono">
                {toPersianDigits(Math.ceil(filteredLogs.length / (selectedMealFilter === 'all' ? meals.filter(m => m.isActive).length || 1 : 1)))} روز
              </p>
            </div>
          </div>
        </div>
      </div>

      {filteredLogs.length === 0 ? (
        <div className="bg-slate-900/40 rounded-2xl border border-dashed border-slate-800 p-12 text-center max-w-lg mx-auto">
          <CalendarDays className="h-12 w-12 text-slate-700 mx-auto mb-3" />
          <h3 className="font-bold text-slate-100 text-base mb-1">داده‌ای یافت نشد</h3>
          <p className="text-slate-400 text-xs leading-relaxed">
            {timeRangeType === 'jalaliMonth' 
              ? `برای سال ${toPersianDigits(selectedYear)} ماه ${getJalaliMonthName(selectedMonth)} و فیلتر مشخص شده، هنوز هیچ آمار روزانه‌ای ثبت نشده است. لطفاً ابتدا در بخش اول تاریخ دلخواهی را ثبت کنید.`
              : 'برای بازه زمانی انتخاب شده و فیلتر مشخص شده، هنوز هیچ آمار روزانه‌ای ثبت نشده است. لطفاً ابتدا در بخش اول تاریخ دلخواهی را ثبت کنید.'}
          </p>
        </div>
      ) : (
        <>
          {/* Dashboard Summary Statistics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Total Office Announced Card */}
            <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-[11px] leading-3">مجموع آمار حضور روزانه ( اعلام شده اداری )</p>
                <h3 className="font-extrabold text-indigo-400 text-xl font-mono mt-1.5">
                  {toPersianDigits(aggregates.officeAnnounced)}
                </h3>
                <p className="text-[10px] text-slate-500 mt-0.5">پرس غذا در ماه جاری</p>
              </div>
              <div className="bg-indigo-500/10 text-indigo-400 p-3 rounded-xl">
                <Activity className="h-5 w-5" />
              </div>
            </div>

            {/* Total Contractor Cooked Card */}
            <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-[11px] leading-3">مجموع پخت پیمانکار (مرادی)</p>
                <h3 className="font-extrabold text-amber-400 text-xl font-mono mt-1.5">
                  {toPersianDigits(aggregates.contractorCooked)}
                </h3>
                <p className="text-[10px] text-slate-500 mt-0.5">دستور پخت: {toPersianDigits(aggregates.cookingInstruction)}</p>
              </div>
              <div className="bg-amber-500/10 text-amber-400 p-3 rounded-xl">
                <Scale className="h-5 w-5" />
              </div>
            </div>

            {/* Total Distributed Card */}
            <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-[11px] leading-3">مجموع غذای توزیع شده</p>
                <h3 className="font-extrabold text-emerald-400 text-xl font-mono mt-1.5">
                  {toPersianDigits(aggregates.totalDistributed)}
                </h3>
                <p className="text-[10px] text-slate-500 mt-0.5">رستوران: {toPersianDigits(aggregates.receivedInRestaurant)} | فیش فراموشی: {toPersianDigits(aggregates.forgottenTicket)} | بیرون‌بر: {toPersianDigits(aggregates.takeaways)}</p>
              </div>
              <div className="bg-emerald-500/10 text-emerald-400 p-3 rounded-xl">
                <TrendingUp className="h-5 w-5" />
              </div>
            </div>

            {/* Wastage Food Card */}
            <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-[11px] leading-3">آمار هدررفت و پرت غذا</p>
                <h3 className={`font-extrabold text-xl font-mono mt-1.5 ${aggregates.foodWastage > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {toPersianDigits(aggregates.foodWastage)}
                </h3>
                <p className="text-[10px] text-slate-500 mt-0.5">نرخ بهره‌وری: {toPersianDigits(aggregates.efficiency.toFixed(1))}%</p>
              </div>
              <div className={`p-3 rounded-xl ${aggregates.foodWastage > 0 ? 'bg-rose-500/10 text-rose-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                <TrendingDown className="h-5 w-5" />
              </div>
            </div>

          </div>

          {/* Advanced Period Switcher and Popularity Analysis */}
          <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h4 className="font-bold text-slate-100 text-sm">سطح تحلیل زمانی و نمودارهای مقایسه‌ای استقبال</h4>
              <p className="text-[10px] text-slate-400 mt-1">بازه زمانی مورد نظر جهت ترسیم آمار و سنجش درصد استقبال از رستوران را انتخاب کنید</p>
            </div>
            
            <div className="flex bg-slate-950/80 p-1 rounded-xl border border-slate-800 self-start sm:self-auto gap-1">
              <button
                onClick={() => setChartPeriod('daily')}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                  chartPeriod === 'daily'
                    ? 'bg-emerald-500 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                آمار روزانه
              </button>
              <button
                onClick={() => setChartPeriod('weekly')}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                  chartPeriod === 'weekly'
                    ? 'bg-emerald-500 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                آمار هفتگی تجمعی
              </button>
              <button
                onClick={() => setChartPeriod('monthly')}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                  chartPeriod === 'monthly'
                    ? 'bg-emerald-500 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                آمار سالانه ماه به ماه
              </button>
              <button
                onClick={() => setChartPeriod('comparison')}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                  chartPeriod === 'comparison'
                    ? 'bg-emerald-500 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                مقایسه حرفه‌ای استقبال
              </button>
            </div>
          </div>

          {/* Interactive Charting Panel based on selection */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* DAILY CHARTS */}
            {chartPeriod === 'daily' && (
              <>
                {/* Chart 1: Daily comparison bar chart */}
                <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-5 shadow-sm">
                  <h4 className="font-bold text-slate-100 text-xs sm:text-sm mb-4 flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-indigo-500"></span>
                    نمودار مقایسه‌ای آمار اداری، پخت پیمانکار و مصرف واقعی (روزانه)
                  </h4>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={chartData}
                        margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis dataKey="dateLabel" tick={{ fontSize: 10 }} stroke="#475569" />
                        <YAxis tick={{ fontSize: 10 }} stroke="#475569" />
                        <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', color: '#f8fafc', direction: 'rtl', textAlign: 'right', fontSize: 12, borderRadius: 8 }} />
                        <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                        <Bar name="آمار حضور روزانه ( اعلام شده اداری )" dataKey="officeAnnounced" fill="#6366f1" radius={[4, 4, 0, 0]} />
                        <Bar name="پخت پیمانکار" dataKey="contractorCooked" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                        <Bar name="سامانه خروجی" dataKey="systemOutput" fill="#a855f7" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Chart 2: Consumption Breakdown trend chart */}
                <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-5 shadow-sm">
                  <h4 className="font-bold text-slate-100 text-xs sm:text-sm mb-4 flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                    روند روزانه مصرف واقعی رستوران، بیرون‌بر و فیش فراموشی
                  </h4>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={chartData}
                        margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient id="colorRest" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="colorTake" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis dataKey="dateLabel" tick={{ fontSize: 10 }} stroke="#475569" />
                        <YAxis tick={{ fontSize: 10 }} stroke="#475569" />
                        <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', color: '#f8fafc', direction: 'rtl', textAlign: 'right', fontSize: 12, borderRadius: 8 }} />
                        <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                        <Area type="monotone" name="دریافت در رستوران" dataKey="receivedInRestaurant" stroke="#10b981" fillOpacity={1} fill="url(#colorRest)" />
                        <Area type="monotone" name="غذای بیرون‌بر" dataKey="takeaways" stroke="#0ea5e9" fillOpacity={1} fill="url(#colorTake)" />
                        <Line type="monotone" name="فیش فراموشی" dataKey="forgottenTicket" stroke="#f43f5e" strokeWidth={2} activeDot={{ r: 4 }} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </>
            )}

            {/* WEEKLY CHARTS */}
            {chartPeriod === 'weekly' && (
              <>
                {/* Chart 1: Weekly comparisons */}
                <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-5 shadow-sm">
                  <h4 className="font-bold text-slate-100 text-xs sm:text-sm mb-4 flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-indigo-500"></span>
                    مقایسه تجمعی هفتگی آمار اداری در مقابل توزیع واقعی غذا
                  </h4>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={weeklyChartData}
                        margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis dataKey="weekLabel" stroke="#475569" tick={{ fontSize: 11 }} />
                        <YAxis stroke="#475569" tick={{ fontSize: 11 }} />
                        <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', color: '#f8fafc', direction: 'rtl', textAlign: 'right', fontSize: 12, borderRadius: 8 }} />
                        <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                        <Bar name="آمار کل ابلاغی اداری" dataKey="officeAnnounced" fill="#6366f1" radius={[4, 4, 0, 0]} />
                        <Bar name="کل پخت پیمانکار" dataKey="contractorCooked" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                        <Bar name="کل غذای توزیع شده واقعی" dataKey="totalDistributed" fill="#10b981" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Chart 2: Weekly popularity / reception trend */}
                <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-5 shadow-sm">
                  <h4 className="font-bold text-slate-100 text-xs sm:text-sm mb-4 flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                    روند درصد استقبال و مصرف کل رستوران نسبت به آمار اداری (هفتگی)
                  </h4>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={weeklyChartData}
                        margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient id="colorWeeklyRec" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.25}/>
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis dataKey="weekLabel" stroke="#475569" tick={{ fontSize: 11 }} />
                        <YAxis stroke="#475569" tick={{ fontSize: 11 }} domain={[0, 100]} unit="%" />
                        <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', color: '#f8fafc', direction: 'rtl', textAlign: 'right', fontSize: 12, borderRadius: 8 }} />
                        <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                        <Area type="monotone" name="درصد استقبال پرسنل" dataKey="receptionRate" stroke="#10b981" fillOpacity={1} fill="url(#colorWeeklyRec)" strokeWidth={3} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </>
            )}

            {/* MONTHLY CHARTS */}
            {chartPeriod === 'monthly' && (
              <>
                {/* Chart 1: Monthly comparisons */}
                <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-5 shadow-sm">
                  <h4 className="font-bold text-slate-100 text-xs sm:text-sm mb-4 flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-indigo-500"></span>
                    مقایسه ماه به ماه سال {toPersianDigits(selectedYear)} (آمار اداری، پخت و توزیع)
                  </h4>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={monthlyChartData}
                        margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis dataKey="monthLabel" stroke="#475569" tick={{ fontSize: 10 }} />
                        <YAxis stroke="#475569" tick={{ fontSize: 10 }} />
                        <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', color: '#f8fafc', direction: 'rtl', textAlign: 'right', fontSize: 12, borderRadius: 8 }} />
                        <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                        <Bar name="کل آمار حضور روزانه ( اعلام شده اداری )" dataKey="officeAnnounced" fill="#6366f1" radius={[3, 3, 0, 0]} />
                        <Bar name="کل پخت پیمانکار" dataKey="contractorCooked" fill="#f59e0b" radius={[3, 3, 0, 0]} />
                        <Bar name="کل مصرف واقعی" dataKey="totalDistributed" fill="#10b981" radius={[3, 3, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Chart 2: Monthly Popularity trend */}
                <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-5 shadow-sm">
                  <h4 className="font-bold text-slate-100 text-xs sm:text-sm mb-4 flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-purple-500"></span>
                    نوسانات میزان استقبال پرسنل از کترینگ در ماه‌های سال جاری
                  </h4>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={monthlyChartData}
                        margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient id="colorMonthlyRec" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.25}/>
                            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis dataKey="monthLabel" stroke="#475569" tick={{ fontSize: 10 }} />
                        <YAxis stroke="#475569" tick={{ fontSize: 10 }} domain={[0, 100]} unit="%" />
                        <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', color: '#f8fafc', direction: 'rtl', textAlign: 'right', fontSize: 12, borderRadius: 8 }} />
                        <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                        <Area type="monotone" name="میزان استقبال عمومی" dataKey="receptionRate" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorMonthlyRec)" strokeWidth={3} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </>
            )}

            {/* COMPARATIVE POPULARITY */}
            {chartPeriod === 'comparison' && (
              <>
                {/* Comparison chart 1: Weekly popularity reception comparison */}
                <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-5 shadow-sm">
                  <h4 className="font-bold text-slate-100 text-xs sm:text-sm mb-4 flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                    تحلیل مقایسه‌ای استقبال هفتگی از رستوران کارگاه (درصد)
                  </h4>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={weeklyChartData}
                        margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis dataKey="weekLabel" stroke="#475569" tick={{ fontSize: 11 }} />
                        <YAxis stroke="#475569" tick={{ fontSize: 11 }} domain={[0, 100]} unit="%" />
                        <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', color: '#f8fafc', direction: 'rtl', textAlign: 'right', fontSize: 12, borderRadius: 8 }} />
                        <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                        <Line type="monotone" name="درصد استقبال پرسنل" dataKey="receptionRate" stroke="#10b981" strokeWidth={3} dot={{ r: 5 }} activeDot={{ r: 8 }} />
                        <Line type="monotone" name="روند ایده آل مصرف" dataKey="officeAnnounced" stroke="#475569" strokeDasharray="5 5" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Comparison chart 2: Monthly Popularity vs. wastage */}
                <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-5 shadow-sm">
                  <h4 className="font-bold text-slate-100 text-xs sm:text-sm mb-4 flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-rose-500"></span>
                    رابطه مغایرت و استقبال ماهانه (استقبال بالاتر = مغایرت و پرت کمتر)
                  </h4>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={monthlyChartData}
                        margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis dataKey="monthLabel" stroke="#475569" tick={{ fontSize: 10 }} />
                        <YAxis stroke="#475569" tick={{ fontSize: 10 }} />
                        <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', color: '#f8fafc', direction: 'rtl', textAlign: 'right', fontSize: 12, borderRadius: 8 }} />
                        <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                        <Bar name="کل مصرف واقعی پرسنل (حجم توزیع)" dataKey="totalDistributed" fill="#10b981" radius={[3, 3, 0, 0]} />
                        <Bar name="کل پخت انجام شده (پیمانکار)" dataKey="contractorCooked" fill="#f59e0b" radius={[3, 3, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </>
            )}

          </div>

          {/* Live Comparison Chart: Presence vs Cooking Quantity */}
          <PresenceVsCookingChart logs={logs} meals={meals} />

          {/* Complete Month Log List Table */}
          <div className="bg-[#0f172a] rounded-2xl border border-slate-800 shadow-sm overflow-hidden">
            <div className="px-6 py-4 bg-slate-900 border-b border-slate-800">
              <h4 className="font-bold text-slate-100 text-sm">لیست جزئیات آمار روزانه ماه جاری</h4>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs sm:text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-950/60 text-slate-300 font-bold border-b border-slate-800">
                    <th className="px-4 py-3">تاریخ (شمسی)</th>
                    <th className="px-4 py-3">وعده</th>
                    <th className="px-4 py-3 text-center">آمار کل کارگاه</th>
                    <th className="px-4 py-3 text-center">آمار حضور روزانه ( اعلام شده اداری )</th>
                    <th className="px-4 py-3 text-center">دستور پخت</th>
                    <th className="px-4 py-3 text-center">پخت مرادی</th>
                    <th className="px-4 py-3 text-center">دریافت رستوران</th>
                    <th className="px-4 py-3 text-center">فیش فراموشی</th>
                    <th className="px-4 py-3 text-center">بیرون بر</th>
                    <th className="px-4 py-3 text-center">خروجی سیستم</th>
                    <th className="px-4 py-3">یادداشت</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850">
                  {filteredLogs
                    .sort((a, b) => b.date.localeCompare(a.date))
                    .map((log) => {
                       const mealName = meals.find((m) => m.id === log.mealId)?.name || log.mealId;
                       const shamsi = formatToJalali(log.date);
                       return (
                        <tr key={log.id} className="hover:bg-slate-900/40 transition-colors">
                          <td className="px-4 py-3 font-semibold text-slate-200 font-mono">
                            {toPersianDigits(shamsi)}
                          </td>
                          <td className="px-4 py-3">
                            <span className="bg-slate-850 text-slate-200 text-[10px] font-bold px-2 py-0.5 rounded-full border border-slate-800">
                              {mealName}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center font-mono text-slate-400">
                            {toPersianDigits(log.workshopPersonnel)}
                          </td>
                          <td className="px-4 py-3 text-center font-mono font-semibold text-indigo-400">
                            {toPersianDigits(log.officeAnnounced)}
                          </td>
                          <td className="px-4 py-3 text-center font-mono text-slate-400">
                            {toPersianDigits(log.cookingInstruction)}
                          </td>
                          <td className="px-4 py-3 text-center font-mono font-semibold text-amber-400">
                            {toPersianDigits(log.contractorCooked)}
                          </td>
                          <td className="px-4 py-3 text-center font-mono text-emerald-400">
                            {toPersianDigits(log.receivedInRestaurant)}
                          </td>
                          <td className="px-4 py-3 text-center font-mono text-rose-400">
                            {toPersianDigits(log.forgottenTicket)}
                          </td>
                          <td className="px-4 py-3 text-center font-mono text-sky-400">
                            {toPersianDigits(log.takeaways)}
                          </td>
                          <td className="px-4 py-3 text-center font-mono font-bold text-slate-200">
                            {toPersianDigits(log.systemOutput)}
                          </td>
                          <td className="px-4 py-3 max-w-xs truncate text-slate-400 italic" title={log.note}>
                            {log.note || '-'}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      <ExportSelectionModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        onConfirm={executeReportsExport}
        availableItems={getReportsExportItems()}
        title={exportModalType === 'excel' ? 'انتخاب آیتم‌های آماری برای خروجی اکسل' : 'انتخاب آیتم‌های آماری برای خروجی PDF'}
        subtitle="لطفاً آیتم‌های آماری مورد نظر خود را جهت قرارگیری در فایل خروجی تیک بزنید."
        exportType={exportModalType}
      />
    </div>
  );
}
