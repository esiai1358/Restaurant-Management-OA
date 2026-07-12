/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { DailyLog, Meal } from '../types';
import { formatToJalali, toPersianDigits } from '../utils/farsi';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import {
  Activity,
  Users,
  Utensils,
  TrendingUp,
  Percent,
  Calendar,
  Zap,
  ChevronDown,
  AlertTriangle,
  Table,
  BarChart3,
  CalendarDays,
  FileSpreadsheet,
  TrendingDown,
  AlertCircle,
  HelpCircle,
  Info,
  Sparkles
} from 'lucide-react';

interface PresenceVsCookingChartProps {
  logs: DailyLog[];
  meals: Meal[];
}

type TimeRange = '7days' | '15days' | '30days' | 'all';
type ActiveTab = 'chart' | 'dailyTable' | 'periodicTable' | 'forecasting';

export default function PresenceVsCookingChart({ logs, meals }: PresenceVsCookingChartProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>('15days');
  const [selectedMealId, setSelectedMealId] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<ActiveTab>('chart');

  // State for forecasting controls
  const [forecastBasis, setForecastBasis] = useState<TimeRange>('15days');
  const [safetyBuffer, setSafetyBuffer] = useState<number>(10);
  const [roundingOption, setRoundingOption] = useState<number>(5);

  // Filter logs by meal first
  const baseFilteredLogs = useMemo(() => {
    let filtered = logs;
    if (selectedMealId !== 'all') {
      filtered = logs.filter((log) => log.mealId === selectedMealId);
    }
    return [...filtered].sort((a, b) => a.date.localeCompare(b.date));
  }, [logs, selectedMealId]);

  // Filter logs by time range for the chart/daily table
  const processedData = useMemo(() => {
    let sliced = baseFilteredLogs;
    if (timeRange === '7days') {
      sliced = baseFilteredLogs.slice(-7);
    } else if (timeRange === '15days') {
      sliced = baseFilteredLogs.slice(-15);
    } else if (timeRange === '30days') {
      sliced = baseFilteredLogs.slice(-30);
    }

    return sliced.map((log) => {
      const jDate = formatToJalali(log.date);
      const shortJDate = jDate.substring(5); // e.g. "۰۴/۱۸"
      const mealName = meals.find((m) => m.id === log.mealId)?.name || 'نامشخص';

      // Consumption/acceptance calculation
      const actualConsumption = log.systemOutput || (log.receivedInRestaurant || 0) + (log.forgottenTicket || 0) + (log.takeaways || 0);
      const wastage = (log.contractorCooked || 0) - actualConsumption;
      const complianceGap = (log.officeAnnounced || 0) - actualConsumption;
      
      const acceptanceRate = log.contractorCooked > 0 
        ? Math.round((actualConsumption / log.contractorCooked) * 100) 
        : 0;

      return {
        ...log,
        dateLabel: shortJDate,
        fullDateLabel: `${jDate} (${mealName})`,
        workshopPersonnel: log.workshopPersonnel || 0,
        officeAnnounced: log.officeAnnounced || 0,
        cookingInstruction: log.cookingInstruction || 0,
        contractorCooked: log.contractorCooked || 0,
        actualConsumption,
        wastage,
        complianceGap,
        acceptanceRate,
        cookingToPresenceGap: (log.contractorCooked || 0) - (log.officeAnnounced || 0),
      };
    });
  }, [baseFilteredLogs, meals, timeRange]);

  // Helper to calculate statistics for any arbitrary slice of logs
  const calculatePeriodStats = (slicedLogs: DailyLog[]) => {
    if (slicedLogs.length === 0) {
      return {
        count: 0,
        avgWorkshop: 0,
        avgOffice: 0,
        avgCookingInstruction: 0,
        avgContractorCooked: 0,
        avgConsumption: 0,
        avgAcceptanceRate: 0,
        avgWastage: 0,
        avgComplianceGap: 0,
      };
    }

    const count = slicedLogs.length;
    let totalWorkshop = 0;
    let totalOffice = 0;
    let totalInstruction = 0;
    let totalCooked = 0;
    let totalConsumption = 0;
    let totalWastage = 0;
    let totalComplianceGap = 0;

    slicedLogs.forEach((log) => {
      const consumption = log.systemOutput || (log.receivedInRestaurant || 0) + (log.forgottenTicket || 0) + (log.takeaways || 0);
      totalWorkshop += log.workshopPersonnel || 0;
      totalOffice += log.officeAnnounced || 0;
      totalInstruction += log.cookingInstruction || 0;
      totalCooked += log.contractorCooked || 0;
      totalConsumption += consumption;
      totalWastage += Math.max(0, (log.contractorCooked || 0) - consumption);
      totalComplianceGap += (log.officeAnnounced || 0) - consumption;
    });

    const avgWorkshop = Math.round(totalWorkshop / count);
    const avgOffice = Math.round(totalOffice / count);
    const avgCookingInstruction = Math.round(totalInstruction / count);
    const avgContractorCooked = Math.round(totalCooked / count);
    const avgConsumption = Math.round(totalConsumption / count);
    
    const avgAcceptanceRate = avgContractorCooked > 0 
      ? Math.round((avgConsumption / avgContractorCooked) * 100) 
      : 0;

    const avgWastage = Math.round(totalWastage / count);
    const avgComplianceGap = Math.round(totalComplianceGap / count);

    return {
      count,
      avgWorkshop,
      avgOffice,
      avgCookingInstruction,
      avgContractorCooked,
      avgConsumption,
      avgAcceptanceRate,
      avgWastage,
      avgComplianceGap,
    };
  };

  // Compute live statistics and insights based on the visible data
  const stats = useMemo(() => {
    return calculatePeriodStats(processedData);
  }, [processedData]);

  // Dynamic calculations for all periods (7 days, 15 days, 30 days, all time) for comparison
  const periodicComparisonData = useMemo(() => {
    const p7 = calculatePeriodStats(baseFilteredLogs.slice(-7));
    const p15 = calculatePeriodStats(baseFilteredLogs.slice(-15));
    const p30 = calculatePeriodStats(baseFilteredLogs.slice(-30));
    const pAll = calculatePeriodStats(baseFilteredLogs);

    return [
      { id: '7days', name: '۷ روز اخیر', ...p7 },
      { id: '15days', name: '۱۵ روز اخیر', ...p15 },
      { id: '30days', name: '۳۰ روز اخیر', ...p30 },
      { id: 'all', name: 'کل دوره ثبت شده', ...pAll },
    ];
  }, [baseFilteredLogs]);

  // Dynamic calculations for future meal forecast demand
  const forecastResults = useMemo(() => {
    let basisLogs = [...logs].sort((a, b) => a.date.localeCompare(b.date));
    if (forecastBasis === '7days') {
      basisLogs = basisLogs.slice(-7);
    } else if (forecastBasis === '15days') {
      basisLogs = basisLogs.slice(-15);
    } else if (forecastBasis === '30days') {
      basisLogs = basisLogs.slice(-30);
    }

    const mealsToForecast = selectedMealId === 'all' 
      ? meals 
      : meals.filter((m) => m.id === selectedMealId);

    return mealsToForecast.map((meal) => {
      const mealLogs = basisLogs.filter((log) => log.mealId === meal.id);
      
      if (mealLogs.length === 0) {
        return {
          meal,
          hasData: false,
          avgPresence: 0,
          avgOffice: 0,
          avgCooked: 0,
          avgConsumption: 0,
          forecastedDemand: 0,
          peakDemand: 0,
          floorDemand: 0,
          weeklyEstimatedWastageAvoided: 0,
        };
      }

      const count = mealLogs.length;
      let totalPresence = 0;
      let totalOffice = 0;
      let totalCooked = 0;
      let totalConsumption = 0;
      const consumptions: number[] = [];

      mealLogs.forEach((log) => {
        const consumption = log.systemOutput || (log.receivedInRestaurant || 0) + (log.forgottenTicket || 0) + (log.takeaways || 0);
        totalPresence += log.workshopPersonnel || 0;
        totalOffice += log.officeAnnounced || 0;
        totalCooked += log.contractorCooked || 0;
        totalConsumption += consumption;
        consumptions.push(consumption);
      });

      const avgPresence = totalPresence / count;
      const avgOffice = totalOffice / count;
      const avgCooked = totalCooked / count;
      const avgConsumption = totalConsumption / count;

      // Apply the safety buffer to average consumption
      const rawForecast = avgConsumption * (1 + safetyBuffer / 100);
      
      // Apply chosen rounding factor
      let forecastedDemand = Math.round(rawForecast);
      if (roundingOption > 1) {
        forecastedDemand = Math.round(rawForecast / roundingOption) * roundingOption;
      }
      if (forecastedDemand < 0) forecastedDemand = 0;

      const peakDemand = Math.max(...consumptions);
      const floorDemand = Math.min(...consumptions);

      // Save calculation: old cooked versus new forecasted demand (for 6 days work week)
      const dailySaving = Math.max(0, avgCooked - forecastedDemand);
      const weeklyEstimatedWastageAvoided = Math.round(dailySaving * 6);

      return {
        meal,
        hasData: true,
        avgPresence: Math.round(avgPresence),
        avgOffice: Math.round(avgOffice),
        avgCooked: Math.round(avgCooked),
        avgConsumption: Math.round(avgConsumption),
        forecastedDemand,
        peakDemand,
        floorDemand,
        weeklyEstimatedWastageAvoided,
      };
    });
  }, [logs, meals, selectedMealId, forecastBasis, safetyBuffer, roundingOption]);

  // Dynamic custom tooltip component for Recharts
  const CustomChartTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 shadow-2xl text-right direction-rtl space-y-2 max-w-xs text-xs">
          <p className="font-bold text-slate-100 border-b border-slate-850 pb-1.5 mb-1.5">
            {data.fullDateLabel}
          </p>
          <div className="space-y-1">
            <div className="flex justify-between items-center gap-6">
              <span className="text-slate-400 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded bg-indigo-500 inline-block"></span>
                آمار کل کارگاه:
              </span>
              <span className="font-mono font-bold text-indigo-300">{toPersianDigits(data.workshopPersonnel)} نفر</span>
            </div>
            <div className="flex justify-between items-center gap-6">
              <span className="text-slate-400 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded bg-sky-500 inline-block"></span>
                آمار اعلامی اداری:
              </span>
              <span className="font-mono font-bold text-sky-300">{toPersianDigits(data.officeAnnounced)} نفر</span>
            </div>
            <div className="flex justify-between items-center gap-6 border-t border-slate-900 pt-1.5 mt-1">
              <span className="text-slate-400 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded bg-amber-500 inline-block"></span>
                دستور پخت ابلاغی:
              </span>
              <span className="font-mono font-bold text-amber-300">{toPersianDigits(data.cookingInstruction)} پرس</span>
            </div>
            <div className="flex justify-between items-center gap-6">
              <span className="text-slate-400 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded bg-rose-500 inline-block"></span>
                میزان پخت واقعی:
              </span>
              <span className="font-mono font-bold text-rose-300">{toPersianDigits(data.contractorCooked)} پرس</span>
            </div>
            <div className="flex justify-between items-center gap-6">
              <span className="text-slate-400 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded bg-emerald-500 inline-block"></span>
                استقبال واقعی (مصرف):
              </span>
              <span className="font-mono font-bold text-emerald-400">{toPersianDigits(data.actualConsumption)} پرس</span>
            </div>
            <div className="flex justify-between items-center gap-6">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Percent className="h-3 w-3 text-emerald-400 inline" />
                درصد استقبال از پخت:
              </span>
              <span className={`font-mono font-bold ${
                data.acceptanceRate >= 95 ? 'text-emerald-400' : data.acceptanceRate >= 85 ? 'text-sky-400' : 'text-amber-400'
              }`}>{toPersianDigits(data.acceptanceRate)}٪</span>
            </div>
          </div>
          <div className="border-t border-slate-900 pt-1.5 mt-2 flex justify-between items-center">
            <span className="text-[10px] text-slate-500">پرت غذا (پسماند):</span>
            <span className={`font-mono font-bold text-[10px] px-1.5 py-0.5 rounded ${
              data.wastage > 0 ? 'bg-rose-500/10 text-rose-400' : 'bg-emerald-500/10 text-emerald-400'
            }`}>
              {toPersianDigits(Math.max(0, data.wastage))} پرس
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-[#0f172a] rounded-2xl border border-slate-800 shadow-xl overflow-hidden p-6 space-y-6" id="presence-cooking-comparison">
      {/* Header and Filter Controls */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-850 pb-5">
        <div>
          <span className="text-[10px] font-extrabold text-amber-400 bg-amber-500/10 border border-amber-500/25 px-2.5 py-1 rounded-full uppercase tracking-wider">
            سیستم هوشمند تحلیل مغایرت و انطباق
          </span>
          <h3 className="font-black text-slate-100 text-base mt-2 flex items-center gap-2">
            <Activity className="h-5 w-5 text-amber-500 animate-pulse" />
            تحلیل مقایسه‌ای وضعیت حضور پرسنل، پخت واقعی و استقبال از غذا
          </h3>
          <p className="text-[11px] text-slate-400 mt-1">
            سنجش زنده انطباق آمار کل کارگاه و اعلام اداری با میزان پخت پیمانکار و استقبال پرسنل در ادوار مختلف
          </p>
        </div>

        {/* Action and selection buttons */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Meal filter */}
          <div className="relative">
            <select
              value={selectedMealId}
              onChange={(e) => setSelectedMealId(e.target.value)}
              className="appearance-none pr-9 pl-4 py-2 bg-slate-950 text-slate-300 border border-slate-800 rounded-xl text-xs font-bold cursor-pointer hover:border-slate-700 transition-all outline-none"
            >
              <option value="all">همه وعده‌های غذایی</option>
              {meals.map((meal) => (
                <option key={meal.id} value={meal.id}>
                  وعده {meal.name}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500 pointer-events-none" />
          </div>

          {/* Time range selector */}
          <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
            {(
              [
                { id: '7days', label: '۷ روز اخیر' },
                { id: '15days', label: '۱۵ روز اخیر' },
                { id: '30days', label: '۳۰ روز اخیر' },
                { id: 'all', label: 'کل دوره' },
              ] as const
            ).map((range) => (
              <button
                key={range.id}
                onClick={() => setTimeRange(range.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                  timeRange === range.id
                    ? 'bg-amber-500 text-slate-950 shadow-md font-extrabold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {range.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Primary Tab Bar */}
      <div className="flex flex-wrap border-b border-slate-800 bg-slate-950/40 p-1 rounded-xl max-w-2xl gap-1">
        <button
          onClick={() => setActiveTab('chart')}
          className={`flex-1 min-w-[120px] py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'chart'
              ? 'bg-slate-900 border border-slate-800 text-amber-400 font-extrabold shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <BarChart3 className="h-4 w-4" />
          نمودار انطباق گرافیکی
        </button>
        <button
          onClick={() => setActiveTab('dailyTable')}
          className={`flex-1 min-w-[120px] py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'dailyTable'
              ? 'bg-slate-900 border border-slate-800 text-amber-400 font-extrabold shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Table className="h-4 w-4" />
          جدول مقایسه‌ای روزانه
        </button>
        <button
          onClick={() => setActiveTab('periodicTable')}
          className={`flex-1 min-w-[120px] py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'periodicTable'
              ? 'bg-slate-900 border border-slate-800 text-amber-400 font-extrabold shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <CalendarDays className="h-4 w-4" />
          مقایسه ادواری دوره‌ها
        </button>
        <button
          onClick={() => setActiveTab('forecasting')}
          className={`flex-1 min-w-[160px] py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'forecasting'
              ? 'bg-slate-900 border border-slate-800 text-amber-400 font-extrabold shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sparkles className="h-4 w-4" />
          تخمین و پیش‌بینی هفته آینده
        </button>
      </div>

      {processedData.length === 0 ? (
        <div className="py-12 text-center text-slate-500 text-xs">
          <AlertTriangle className="h-10 w-10 text-amber-500/40 mx-auto mb-2" />
          هیچ داده آماری برای بازه زمانی و فیلترهای انتخابی یافت نشد.
        </div>
      ) : (
        <div className="space-y-6">
          {/* TAB 1: Chart View */}
          {activeTab === 'chart' && (
            <div className="bg-slate-950/40 border border-slate-850 rounded-2xl p-4 sm:p-5">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-4">
                <div className="flex items-center gap-1 text-xs font-bold text-slate-300">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-800 border border-slate-700"></span>
                  محور افقی: تاریخ ثبت آمار | محور عمودی: تعداد نفرات / پرس غذا
                </div>
                
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] font-medium text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-2 rounded bg-indigo-500/20 border border-indigo-500"></span>
                    آمار کل کارگاه (ستونی)
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-2 rounded bg-sky-500/20 border border-sky-400"></span>
                    اعلامی اداری (ستونی)
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-0.5 bg-amber-500 inline-block"></span>
                    دستور پخت (خط چین)
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-1 bg-rose-500 inline-block rounded-full"></span>
                    پخت واقعی (منحنی)
                  </div>
                </div>
              </div>

              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={processedData}
                    margin={{ top: 10, right: 5, left: -20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis 
                      dataKey="dateLabel" 
                      stroke="#475569" 
                      tick={{ fontSize: 10, fontWeight: 'bold' }} 
                    />
                    <YAxis 
                      stroke="#475569" 
                      tick={{ fontSize: 10, fontWeight: 'medium' }} 
                      domain={['auto', 'auto']}
                    />
                    <Tooltip content={<CustomChartTooltip />} />
                    <Legend wrapperStyle={{ display: 'none' }} />
                    
                    {/* Presence Bars */}
                    <Bar 
                      name="آمار کل کارگاه" 
                      dataKey="workshopPersonnel" 
                      fill="#6366f1" 
                      fillOpacity={0.12}
                      stroke="#6366f1"
                      strokeWidth={1}
                      radius={[4, 4, 0, 0]} 
                      maxBarSize={24}
                    />
                    <Bar 
                      name="آمار اعلامی اداری" 
                      dataKey="officeAnnounced" 
                      fill="#38bdf8" 
                      fillOpacity={0.22}
                      stroke="#38bdf8"
                      strokeWidth={1}
                      radius={[4, 4, 0, 0]} 
                      maxBarSize={24}
                    />

                    {/* Reference Average Lines or Cooking guidelines */}
                    <ReferenceLine 
                      y={stats.avgOffice} 
                      stroke="#38bdf8" 
                      strokeDasharray="3 3" 
                      strokeOpacity={0.4}
                      label={{ value: 'میانگین حضور اداری', fill: '#0284c7', position: 'insideRight', fontSize: 9, fontWeight: 'bold' }} 
                    />

                    {/* Cooking lines */}
                    <Line 
                      type="monotone" 
                      name="دستور پخت ابلاغی" 
                      dataKey="cookingInstruction" 
                      stroke="#f59e0b" 
                      strokeDasharray="4 4" 
                      strokeWidth={1.5} 
                      dot={false}
                    />
                    <Line 
                      type="monotone" 
                      name="پخت واقعی پیمانکار" 
                      dataKey="contractorCooked" 
                      stroke="#f43f5e" 
                      strokeWidth={3} 
                      dot={{ r: 3.5, fill: '#f43f5e', strokeWidth: 1 }}
                      activeDot={{ r: 6 }} 
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* TAB 2: Daily Comparative Table */}
          {activeTab === 'dailyTable' && (
            <div className="bg-slate-950/40 border border-slate-850 rounded-2xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-900/80 text-slate-300 font-bold border-b border-slate-800">
                      <th className="px-4 py-3.5">تاریخ (شمسی)</th>
                      <th className="px-4 py-3.5">وعده</th>
                      <th className="px-4 py-3.5 text-center">آمار کل کارگاه</th>
                      <th className="px-4 py-3.5 text-center">حضور اعلامی اداری</th>
                      <th className="px-4 py-3.5 text-center">دستور پخت ابلاغی</th>
                      <th className="px-4 py-3.5 text-center">میزان پخت واقعی</th>
                      <th className="px-4 py-3.5 text-center">استقبال واقعی (مصرف)</th>
                      <th className="px-4 py-3.5 text-center">درصد استقبال از پخت</th>
                      <th className="px-4 py-3.5 text-center">میزان پرت (پسماند)</th>
                      <th className="px-4 py-3.5 text-center">انحراف از آمار اداری</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900">
                    {[...processedData].reverse().map((row, idx) => {
                      const mealName = meals.find((m) => m.id === row.mealId)?.name || 'نامشخص';
                      const shamsiDate = formatToJalali(row.date);
                      
                      // Status colors for acceptance rate
                      let badgeColor = 'bg-rose-500/10 text-rose-400 border-rose-500/20';
                      if (row.acceptanceRate >= 95) {
                        badgeColor = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
                      } else if (row.acceptanceRate >= 85) {
                        badgeColor = 'bg-sky-500/10 text-sky-400 border-sky-500/20';
                      } else if (row.acceptanceRate >= 70) {
                        badgeColor = 'bg-amber-500/10 text-amber-300 border-amber-500/20';
                      }

                      return (
                        <tr key={row.id || idx} className="hover:bg-slate-900/40 text-slate-300 transition-colors">
                          <td className="px-4 py-3 font-medium text-slate-200">{toPersianDigits(shamsiDate)}</td>
                          <td className="px-4 py-3"><span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded text-[10px] font-bold">{mealName}</span></td>
                          <td className="px-4 py-3 text-center font-mono">{toPersianDigits(row.workshopPersonnel)}</td>
                          <td className="px-4 py-3 text-center font-mono text-sky-300">{toPersianDigits(row.officeAnnounced)}</td>
                          <td className="px-4 py-3 text-center font-mono text-amber-400">{toPersianDigits(row.cookingInstruction)}</td>
                          <td className="px-4 py-3 text-center font-mono text-rose-400 font-bold">{toPersianDigits(row.contractorCooked)}</td>
                          <td className="px-4 py-3 text-center font-mono text-emerald-400 font-bold">{toPersianDigits(row.actualConsumption)}</td>
                          <td className="px-4 py-3 text-center">
                            <span className={`px-2.5 py-0.5 rounded-full border text-[11px] font-bold font-mono ${badgeColor}`}>
                              {toPersianDigits(row.acceptanceRate)}٪
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center font-mono">
                            {row.wastage > 0 ? (
                              <span className="text-rose-400 font-medium">+{toPersianDigits(row.wastage)}</span>
                            ) : (
                              <span className="text-emerald-400 font-medium">{toPersianDigits(row.wastage)}</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center font-mono">
                            {row.complianceGap > 0 ? (
                              <span className="text-amber-400">+{toPersianDigits(row.complianceGap)} (مازاد)</span>
                            ) : row.complianceGap < 0 ? (
                              <span className="text-rose-400">{toPersianDigits(row.complianceGap)} (کسری)</span>
                            ) : (
                              <span className="text-emerald-400">منطبق</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: Periodic Comparative Matrix */}
          {activeTab === 'periodicTable' && (
            <div className="bg-slate-950/40 border border-slate-850 rounded-2xl overflow-hidden shadow-sm p-4 sm:p-6 space-y-6">
              <div>
                <h4 className="font-bold text-slate-200 text-sm mb-1">جدول مقایسه شاخص‌های تجمعی ادوار</h4>
                <p className="text-[10px] text-slate-400">
                  مقایسه میانگین‌های آماری کلیدواژه‌های حیاتی حضور و طبخ در بازه‌های ۷، ۱۵، ۳۰ روزه و کل دوره جهت ارزیابی پیشرفت و راندمان
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-900/80 text-slate-200 font-bold border-b border-slate-800">
                      <th className="px-4 py-3.5">بازه زمانی مقایسه</th>
                      <th className="px-4 py-3.5 text-center">تعداد روزهای فعال</th>
                      <th className="px-4 py-3.5 text-center">میانگین کل کارگاه</th>
                      <th className="px-4 py-3.5 text-center">میانگین اعلام اداری</th>
                      <th className="px-4 py-3.5 text-center">میانگین پخت پیمانکار</th>
                      <th className="px-4 py-3.5 text-center">میانگین توزیع (استقبال)</th>
                      <th className="px-4 py-3.5 text-center">نرخ استقبال متوسط</th>
                      <th className="px-4 py-3.5 text-center">میانگین پسماند (پرت)</th>
                      <th className="px-4 py-3.5 text-center">میانگین ناترازی اداری</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900">
                    {periodicComparisonData.map((period) => {
                      const isActive = timeRange === period.id;
                      
                      let rateBadge = 'text-rose-400 bg-rose-500/5 border border-rose-500/10';
                      if (period.avgAcceptanceRate >= 95) {
                        rateBadge = 'text-emerald-400 bg-emerald-500/5 border border-emerald-500/10';
                      } else if (period.avgAcceptanceRate >= 85) {
                        rateBadge = 'text-sky-400 bg-sky-500/5 border border-sky-500/10';
                      } else if (period.avgAcceptanceRate >= 70) {
                        rateBadge = 'text-amber-300 bg-amber-500/5 border border-amber-500/10';
                      }

                      return (
                        <tr 
                          key={period.id} 
                          className={`transition-colors text-slate-300 ${
                            isActive 
                              ? 'bg-amber-500/5 font-bold text-amber-300 border-l-2 border-l-amber-500' 
                              : 'hover:bg-slate-900/20'
                          }`}
                        >
                          <td className="px-4 py-4 font-bold flex items-center gap-2">
                            {isActive && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping"></span>}
                            {period.name}
                          </td>
                          <td className="px-4 py-4 text-center font-mono font-bold text-slate-400">
                            {toPersianDigits(period.count)} روز
                          </td>
                          <td className="px-4 py-4 text-center font-mono">{toPersianDigits(period.avgWorkshop)} نفر</td>
                          <td className="px-4 py-4 text-center font-mono text-sky-300">{toPersianDigits(period.avgOffice)} نفر</td>
                          <td className="px-4 py-4 text-center font-mono text-rose-400 font-bold">{toPersianDigits(period.avgContractorCooked)} پرس</td>
                          <td className="px-4 py-4 text-center font-mono text-emerald-400 font-bold">{toPersianDigits(period.avgConsumption)} پرس</td>
                          <td className="px-4 py-4 text-center">
                            <span className={`px-3 py-1 rounded-full text-xs font-black font-mono ${rateBadge}`}>
                              {toPersianDigits(period.avgAcceptanceRate)}٪
                            </span>
                          </td>
                          <td className="px-4 py-4 text-center font-mono text-rose-300">
                            +{toPersianDigits(period.avgWastage)} پرس
                          </td>
                          <td className="px-4 py-4 text-center font-mono text-amber-300">
                            {toPersianDigits(period.avgComplianceGap)} پرس
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Advanced Diagnostic Insights */}
              <div className="bg-[#1e1b4b]/30 border border-indigo-950/60 rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h5 className="text-xs font-black text-indigo-300 flex items-center gap-1.5">
                    <Info className="h-4 w-4 text-indigo-400" />
                    تحلیل انطباق هوشمند و عارضه‌یابی نوسانات:
                  </h5>
                  <p className="text-[11px] text-slate-400 leading-relaxed max-w-2xl">
                    میانگین استقبال از غذا در این دوره معادل <strong className="text-emerald-400">{toPersianDigits(stats.avgAcceptanceRate)}٪</strong> از کل غذای پخته شده است. 
                    همچنین متوسط میزان ناترازی آمار اداری نسبت به توزیع واقعی آشپزخانه حدود <strong className="text-amber-400">{toPersianDigits(stats.avgComplianceGap)} پرس</strong> در هر وعده بوده که نشان‌دهنده نیاز به بازنگری در روش تخمین و اعلام آمار روزانه پیش از ابلاغ دستور پخت است.
                  </p>
                </div>
                <div className="bg-indigo-950/50 border border-indigo-900/60 px-4 py-3 rounded-xl text-center self-stretch md:self-auto flex flex-col justify-center">
                  <span className="text-[10px] text-indigo-300 block font-bold mb-0.5">وضعیت هدررفت کترینگ</span>
                  <span className="text-sm font-black text-rose-400 font-mono">
                    {toPersianDigits(stats.avgWastage)} پرس / وعده
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Smart Weekly Forecasting */}
          {activeTab === 'forecasting' && (
            <div className="space-y-6 animate-fade-in">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-right direction-rtl">
                {/* Sidebar parameters panel */}
                <div className="lg:col-span-1 bg-slate-950/40 border border-slate-850 rounded-2xl p-5 space-y-5">
                  <div className="flex items-center gap-2 border-b border-slate-850 pb-3">
                    <Sparkles className="h-4.5 w-4.5 text-amber-400" />
                    <h4 className="font-extrabold text-slate-200 text-xs">تنظیمات موتور پیش‌بینی هوشمند</h4>
                  </div>
                  
                  {/* 1. Base period */}
                  <div className="space-y-2">
                    <label className="block text-slate-300 text-xs font-semibold">دوره تاریخی مبنا جهت میانگین‌گیری:</label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { id: '7days', label: '۷ روز اخیر' },
                        { id: '15days', label: '۱۵ روز اخیر' },
                        { id: '30days', label: '۳۰ روز اخیر' },
                        { id: 'all', label: 'کل تاریخچه ثبت' }
                      ].map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setForecastBasis(opt.id as TimeRange)}
                          className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer text-center ${
                            forecastBasis === opt.id
                              ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 font-extrabold'
                              : 'bg-slate-950/80 border-slate-900 text-slate-400 hover:text-slate-300'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 2. Safety Buffer margin slider/buttons */}
                  <div className="space-y-2 pt-1">
                    <div className="flex justify-between items-center text-xs">
                      <label className="text-slate-300 font-semibold">ضریب تعدیل / حاشیه احتیاط:</label>
                      <span className="font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/10">
                        {safetyBuffer >= 0 ? '+' : ''}{toPersianDigits(safetyBuffer)}٪
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 leading-relaxed">
                      افزایش یا کاهش آمار جهت جبران اوج مصرف پیش‌بینی‌نشده یا روزهای تعطیل کارگاه
                    </p>
                    
                    <div className="flex items-center gap-2 py-1">
                      <input
                        type="range"
                        min="-20"
                        max="30"
                        step="5"
                        value={safetyBuffer}
                        onChange={(e) => setSafetyBuffer(Number(e.target.value))}
                        className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                      />
                    </div>
                    
                    {/* Presets */}
                    <div className="flex flex-wrap gap-1.5">
                      {[-10, -5, 0, 5, 10, 15, 20].map((val) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setSafetyBuffer(val)}
                          className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                            safetyBuffer === val
                              ? 'bg-amber-500 text-slate-950 font-extrabold border-amber-500'
                              : 'bg-slate-950 border-slate-900 text-slate-400 hover:border-slate-850'
                          }`}
                        >
                          {val >= 0 ? '+' : ''}{toPersianDigits(val)}٪
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 3. Rounding Options */}
                  <div className="space-y-2 pt-1">
                    <label className="block text-slate-300 text-xs font-semibold">فرمت رند کردن حجم سفارش:</label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { id: 1, label: 'دقیق (بدون رند)' },
                        { id: 5, label: 'مضرب ۵ نزدیک' },
                        { id: 10, label: 'مضرب ۱۰ نزدیک' },
                        { id: 50, label: 'مضرب ۵۰ نزدیک' }
                      ].map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setRoundingOption(opt.id)}
                          className={`py-2 px-1 rounded-xl text-xs font-bold border transition-all cursor-pointer text-center ${
                            roundingOption === opt.id
                              ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 font-extrabold'
                              : 'bg-slate-950/80 border-slate-900 text-slate-400 hover:text-slate-300'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <div className="pt-2 border-t border-slate-900">
                    <div className="bg-amber-500/5 border border-amber-500/10 rounded-xl p-3 text-[10px] text-amber-400/90 leading-relaxed flex items-start gap-2">
                      <HelpCircle className="h-4.5 w-4.5 shrink-0 text-amber-500 mt-0.5" />
                      <span>
                        <strong>راهنمای بهینه‌سازی:</strong> میانگین مصرف واقعی گذشته بر اساس مجموع دریافتی سالن، غذای بیرون‌بر و فیش‌های فراموش‌شده روزانه محاسبه شده است. توصیه می‌شود جهت جلوگیری از هدررفت غذا، سفارش هفته آینده را معادل این پیش‌بینی ثبت کنید.
                      </span>
                    </div>
                  </div>
                </div>

                {/* Main results board */}
                <div className="lg:col-span-2 space-y-4">
                  <div className="bg-slate-950/30 border border-slate-850 rounded-2xl p-5 space-y-4">
                    <div>
                      <h4 className="font-extrabold text-slate-200 text-xs">سند پیش‌بینی تقاضا و دستور پخت هفته آینده</h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        برآورد آماری مصرف غذا بر اساس روند {forecastBasis === '7days' ? '۷ روزه' : forecastBasis === '15days' ? '۱۵ روزه' : forecastBasis === '30days' ? '۳۰ روزه' : 'کل تاریخچه فعال'}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {forecastResults.map((result, index) => {
                        if (!result.hasData) {
                          return (
                            <div key={index} className="bg-slate-900/40 border border-slate-850 rounded-2xl p-4 text-center text-slate-500 text-xs flex flex-col justify-center items-center py-8">
                              <AlertCircle className="h-8 w-8 text-slate-600 mb-2" />
                              وعده {result.meal.name} فاقد داده آماری کافی جهت پیش‌بینی است.
                            </div>
                          );
                        }

                        return (
                          <div key={result.meal.id} className="bg-slate-900/40 border border-slate-850 rounded-2xl p-4 flex flex-col justify-between hover:border-slate-800 transition-all space-y-4">
                            <div>
                              <div className="flex justify-between items-center">
                                <span className="text-[11px] font-black text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 rounded-full">
                                  وعده {result.meal.name}
                                </span>
                                {result.weeklyEstimatedWastageAvoided > 0 && (
                                  <span className="text-[10px] font-black text-emerald-400 bg-emerald-500/5 px-2 py-0.5 rounded-full flex items-center gap-1 border border-emerald-500/10">
                                    <TrendingDown className="h-3 w-3" />
                                    کاهش دورریز: {toPersianDigits(result.weeklyEstimatedWastageAvoided)} پرس در هفته
                                  </span>
                                )}
                              </div>

                              {/* Forecasting visual badge */}
                              <div className="mt-4 text-center p-4 bg-slate-950/80 border border-slate-900 rounded-xl">
                                <span className="text-[10px] text-slate-500 block font-bold mb-1">حجم پخت روزانه توصیه‌شده (هر روز)</span>
                                <div className="flex items-baseline justify-center gap-2">
                                  <span className="text-4xl font-black text-amber-400 font-mono tracking-tight">
                                    {toPersianDigits(result.forecastedDemand)}
                                  </span>
                                  <span className="text-xs text-slate-400 font-bold">پرس در روز</span>
                                </div>
                              </div>
                            </div>

                            {/* Historic comparison metrics */}
                            <div className="space-y-2 text-xs border-t border-slate-900 pt-3">
                              <div className="flex justify-between items-center text-slate-400">
                                <span>میانگین تقاضای واقعی (مصرف گذشته):</span>
                                <span className="font-mono text-slate-200 font-bold">{toPersianDigits(result.avgConsumption)} پرس</span>
                              </div>
                              <div className="flex justify-between items-center text-slate-400">
                                <span>نوسان تقاضای گذشته (حداقل تا حداکثر):</span>
                                <span className="font-mono text-slate-200">
                                  {toPersianDigits(result.floorDemand)} تا {toPersianDigits(result.peakDemand)} پرس
                                </span>
                              </div>
                              <div className="flex justify-between items-center text-slate-400">
                                <span>میانگین آمار اعلامی اداری گذشته:</span>
                                <span className="font-mono text-sky-400">{toPersianDigits(result.avgOffice)} نفر</span>
                              </div>
                              <div className="flex justify-between items-center text-slate-400">
                                <span>میانگین طبخ قدیمی پیمانکار:</span>
                                <span className="font-mono text-rose-400">{toPersianDigits(result.avgCooked)} پرس</span>
                              </div>
                            </div>

                            {/* Total weekly sum */}
                            <div className="bg-slate-950/80 p-3 rounded-xl flex justify-between items-center text-xs border border-slate-900">
                              <span className="text-slate-400 font-medium">سفارش کل هفته آینده (۶ روز کاری):</span>
                              <span className="font-mono font-black text-emerald-400 text-sm">
                                {toPersianDigits(result.forecastedDemand * 6)} پرس
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Explanatory analytical insight */}
                    <div className="bg-indigo-950/20 border border-indigo-950/40 rounded-2xl p-4 flex gap-3.5 items-start">
                      <div className="bg-indigo-500/10 text-indigo-400 p-2 rounded-xl shrink-0 mt-0.5">
                        <Info className="h-4.5 w-4.5" />
                      </div>
                      <div className="space-y-1 text-xs text-right">
                        <h5 className="font-extrabold text-indigo-300">موتور برآورد و مدل پیش‌بینی چگونه کار می‌کند؟</h5>
                        <p className="text-slate-400 leading-relaxed text-[11px]">
                          کترینگ‌های صنعتی معمولاً مقدار پخت روزانه را کورکورانه بر اساس اعلام حضور اداری تنظیم می‌کنند. از آنجا که حضور همواره با آمار واقعی سرو غذا سروکار ندارد، این مسئله منجر به پرت روزانه فراوان می‌شود. این ابزار میانگین دقیق استقبال واقعی از غذا را استخراج کرده و به سرپرست امکان می‌دهد با در نظر گرفتن نوسانات ظرفیت (ضریب تعدیل)، سفارش بهینه دقیقی ارسال کند که دورریز غذا را به حداقل ممکن برساند.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Analytical stat cards under the chart */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Stat 1: Matching / Utilization Index */}
            <div className="bg-slate-950/40 border border-slate-850 rounded-2xl p-4 flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-bold text-sky-400 bg-sky-500/10 border border-sky-500/20 px-2 py-0.5 rounded-full">
                    شاخص تغذیه حضور
                  </span>
                  <h4 className="font-bold text-slate-100 text-xs mt-2">انطباق پخت به حضور اداری</h4>
                </div>
                <div className="bg-sky-500/10 text-sky-400 p-2 rounded-xl">
                  <Percent className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl font-extrabold text-sky-400 font-mono">
                    {toPersianDigits(stats.avgOffice > 0 ? Math.round((stats.avgContractorCooked / stats.avgOffice) * 100) : 0)}٪
                  </span>
                  <span className="text-[10px] text-slate-500 font-medium">معدل دوره</span>
                </div>
                <div className="w-full bg-slate-900 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div 
                    className="bg-sky-500 h-1.5 rounded-full transition-all duration-500" 
                    style={{ width: `${Math.min(stats.avgOffice > 0 ? Math.round((stats.avgContractorCooked / stats.avgOffice) * 100) : 0, 100)}%` }}
                  ></div>
                </div>
                <p className="text-[9px] text-slate-400 mt-1.5 font-medium">
                  {stats.avgOffice > 0 && (stats.avgContractorCooked / stats.avgOffice) > 1 
                    ? '* طبخ بیش از آمار حضور روزانه اداری ثبت شده است' 
                    : 'میزان پوشش پخت کترینگ نسبت به آمار حضور اداری'}
                </p>
              </div>
            </div>

            {/* Stat 2: Daily Presence vs Cooked Average */}
            <div className="bg-slate-950/40 border border-slate-850 rounded-2xl p-4 flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-full">
                    حضور کارگاه
                  </span>
                  <h4 className="font-bold text-slate-100 text-xs mt-2">معدل حضور در برابر طبخ</h4>
                </div>
                <div className="bg-indigo-500/10 text-indigo-400 p-2 rounded-xl">
                  <Users className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3 space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                    معدل کل کارگاه:
                  </span>
                  <span className="font-mono font-bold text-indigo-300">{toPersianDigits(stats.avgWorkshop)} نفر</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                    معدل پخت واقعی:
                  </span>
                  <span className="font-mono font-bold text-rose-300">{toPersianDigits(stats.avgContractorCooked)} پرس</span>
                </div>
                <p className="text-[9px] text-slate-500 border-t border-slate-900 pt-1 mt-1 font-medium">
                  تفاوت ظرفیت کارگاه با طبخ: {toPersianDigits(Math.max(0, stats.avgWorkshop - stats.avgContractorCooked))} نفر
                </p>
              </div>
            </div>

            {/* Stat 3: Food Acceptance rate */}
            <div className="bg-slate-950/40 border border-slate-850 rounded-2xl p-4 flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                    نرخ استقبال عمومی
                  </span>
                  <h4 className="font-bold text-slate-100 text-xs mt-2">درصد مصرف کل پخت پیمانکار</h4>
                </div>
                <div className="bg-emerald-500/10 text-emerald-400 p-2 rounded-xl">
                  <Percent className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl font-extrabold text-emerald-400 font-mono">
                    {toPersianDigits(stats.avgAcceptanceRate)}٪
                  </span>
                  <span className="text-[10px] text-slate-500 font-medium">معدل دوره</span>
                </div>
                <div className="w-full bg-slate-900 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div 
                    className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500" 
                    style={{ width: `${Math.min(stats.avgAcceptanceRate, 100)}%` }}
                  ></div>
                </div>
                <p className="text-[9px] text-slate-400 mt-1.5 font-medium">
                  متوسط توزیع غذا: {toPersianDigits(stats.avgConsumption)} پرس در روز
                </p>
              </div>
            </div>

            {/* Stat 4: Food Wastage Metrics */}
            <div className="bg-slate-950/40 border border-slate-850 rounded-2xl p-4 flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-full">
                    میانگین پرت کترینگ
                  </span>
                  <h4 className="font-bold text-slate-100 text-xs mt-2">متوسط حجم غذای توزیع‌نشده</h4>
                </div>
                <div className="bg-rose-500/10 text-rose-400 p-2 rounded-xl">
                  <TrendingDown className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3 space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
                    متوسط پرت غذا:
                  </span>
                  <span className="font-mono font-bold text-rose-400">{toPersianDigits(stats.avgWastage)} پرس</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                    متوسط مغایرت اداری:
                  </span>
                  <span className="font-mono font-bold text-amber-300">{toPersianDigits(stats.avgComplianceGap)} پرس</span>
                </div>
                <p className="text-[9px] text-slate-500 border-t border-slate-900 pt-1 mt-1 font-medium">
                  * هرچه میزان پرت به صفر نزدیکتر شود، سود بالاتر است.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
