/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Meal, WeeklyMenu, CustomField, DailyLog, DayOfWeek } from '../types';
import { getDayOfWeekFromGregorian, getDayNameInPersian, formatToJalali, toPersianDigits } from '../utils/farsi';
import { exportToCSV, printToPDF } from '../utils/exportHelpers';
import {
  Calendar,
  ClipboardEdit,
  PlusCircle,
  CheckCircle2,
  RefreshCw,
  Zap,
  AlertTriangle,
  FileText,
  FileSpreadsheet,
  Download,
  Printer
} from 'lucide-react';

interface DailyLogFormProps {
  meals: Meal[];
  weeklyMenu: WeeklyMenu[];
  customFields: CustomField[];
  logs: DailyLog[];
  onSaveLog: (log: DailyLog) => void;
  currentRole?: 'admin' | 'supervisor' | 'guest';
}

export default function DailyLogForm({
  meals,
  weeklyMenu,
  customFields,
  logs,
  onSaveLog,
  currentRole = 'admin',
}: DailyLogFormProps) {
  // Current date & meal selection
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [selectedMealId, setSelectedMealId] = useState<string>('lunch');

  // Form states matching DailyLog fields
  const [workshopPersonnel, setWorkshopPersonnel] = useState<number>(240);
  const [officeAnnounced, setOfficeAnnounced] = useState<number>(0);
  const [cookingInstruction, setCookingInstruction] = useState<number>(0);
  const [contractorCooked, setContractorCooked] = useState<number>(0);
  const [receivedInRestaurant, setReceivedInRestaurant] = useState<number>(0);
  const [forgottenTicket, setForgottenTicket] = useState<number>(0);
  const [takeaways, setTakeaways] = useState<number>(0);
  const [systemOutput, setSystemOutput] = useState<number>(0);
  const [note, setNote] = useState<string>('');

  // Dynamic values for custom fields
  const [customValues, setCustomValues] = useState<Record<string, number | string>>({});

  // Status/feedback state
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved'>('idle');

  const isReadOnly = currentRole === 'guest';

  // Find active meals
  const activeMeals = meals.filter(m => m.isActive);

  // Compute current day of week and food name based on configuration
  const currentDayOfWeek: DayOfWeek = getDayOfWeekFromGregorian(selectedDate);
  const currentFood = weeklyMenu.find(
    item => item.day === currentDayOfWeek && item.mealId === selectedMealId
  )?.foodName || 'تعریف نشده در برنامه غذایی';

  // Load existing log if available for the selected date + meal combination
  useEffect(() => {
    const logKey = `${selectedDate}_${selectedMealId}`;
    const existingLog = logs.find(l => l.id === logKey);

    if (existingLog) {
      setWorkshopPersonnel(existingLog.workshopPersonnel);
      setOfficeAnnounced(existingLog.officeAnnounced);
      setCookingInstruction(existingLog.cookingInstruction);
      setContractorCooked(existingLog.contractorCooked);
      setReceivedInRestaurant(existingLog.receivedInRestaurant);
      setForgottenTicket(existingLog.forgottenTicket);
      setTakeaways(existingLog.takeaways);
      setSystemOutput(existingLog.systemOutput);
      setNote(existingLog.note || '');
      setCustomValues(existingLog.customValues || {});
    } else {
      // Set some smart defaults based on other logs or base values
      // Find the most recent workshopPersonnel value
      const lastLog = [...logs].sort((a, b) => b.date.localeCompare(a.date))[0];
      if (lastLog) {
        setWorkshopPersonnel(lastLog.workshopPersonnel);
      } else {
        setWorkshopPersonnel(240);
      }
      
      setOfficeAnnounced(0);
      setCookingInstruction(0);
      setContractorCooked(0);
      setReceivedInRestaurant(0);
      setForgottenTicket(0);
      setTakeaways(0);
      setSystemOutput(0);
      setNote('');
      setCustomValues({});
    }
  }, [selectedDate, selectedMealId, logs]);

  // Autofill smart helper
  const handleSmartAutofill = () => {
    if (isReadOnly) return;
    if (officeAnnounced > 0) {
      setCookingInstruction(officeAnnounced);
      setContractorCooked(officeAnnounced);
      setReceivedInRestaurant(Math.floor(officeAnnounced * 0.95));
      setForgottenTicket(2);
      setTakeaways(10);
      setSystemOutput(Math.floor(officeAnnounced * 0.95) + 12); // sum of received + forgotten + takeaways approx.
    } else {
      alert('لطفاً ابتدا "آمار اعلام شده اداری" را وارد کنید تا مقادیر حدودی بر مبنای آن پر شوند.');
    }
  };

  // Submit form
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;

    const logKey = `${selectedDate}_${selectedMealId}`;
    const newLog: DailyLog = {
      id: logKey,
      date: selectedDate,
      mealId: selectedMealId,
      workshopPersonnel: Number(workshopPersonnel),
      officeAnnounced: Number(officeAnnounced),
      cookingInstruction: Number(cookingInstruction),
      contractorCooked: Number(contractorCooked),
      receivedInRestaurant: Number(receivedInRestaurant),
      forgottenTicket: Number(forgottenTicket),
      takeaways: Number(takeaways),
      systemOutput: Number(systemOutput),
      customValues,
      note: note.trim() || undefined,
      updatedAt: new Date().toISOString(),
    };

    onSaveLog(newLog);
    setSaveStatus('saved');
    setTimeout(() => setSaveStatus('idle'), 3000);
  };

  // Handle custom fields change
  const handleCustomValueChange = (name: string, val: string | number) => {
    if (isReadOnly) return;
    setCustomValues(prev => ({
      ...prev,
      [name]: val,
    }));
  };

  // Statistics summaries/discrepancies for instant UX warning
  const computedWastage = contractorCooked - (receivedInRestaurant + forgottenTicket + takeaways);
  const complianceGap = officeAnnounced - (receivedInRestaurant + forgottenTicket + takeaways);

  // Export current daily log data to Excel (CSV)
  const handleExportExcel = () => {
    const mealName = meals.find((m) => m.id === selectedMealId)?.name || selectedMealId;
    const shamsi = formatToJalali(selectedDate);
    const headers = [
      'تاریخ شمسی',
      'وعده غذایی',
      'غذای منو',
      'پرسنل حاضر کارگاه',
      'آمار اداری',
      'دستور پخت',
      'پخت پیمانکار',
      'دریافت رستوران',
      'فیش فراموشی',
      'بیرون‌بر',
      'خروجی سیستم',
      'پرت غذا',
      'مغایرت اداری',
      'یادداشت'
    ];
    
    const row = [
      shamsi,
      mealName,
      currentFood,
      workshopPersonnel,
      officeAnnounced,
      cookingInstruction,
      contractorCooked,
      receivedInRestaurant,
      forgottenTicket,
      takeaways,
      systemOutput,
      computedWastage,
      complianceGap,
      note || 'بدون یادداشت'
    ];

    exportToCSV(`آمار_رستوران_روز_${shamsi}_${mealName}`, headers, [row]);
  };

  // Export current daily log data to printable PDF layout
  const handleExportPDF = () => {
    const mealName = meals.find((m) => m.id === selectedMealId)?.name || selectedMealId;
    const shamsi = formatToJalali(selectedDate);
    
    const headers = ['ردیف', 'پارامتر آماری رستوران بوشهر', 'مقدار (پرس/نفر)', 'دسته بندی پارامتر'];
    const baseRows = [
      ['۱', 'کل پرسنل حاضر کارگاه', workshopPersonnel, 'ظرفیت کارگاه'],
      ['۲', 'آمار روزانه اعلام شده اداری', officeAnnounced, 'اداری'],
      ['۳', 'آمار دستور پخت روزانه به پیمانکار', cookingInstruction, 'پیمانکار'],
      ['۴', 'آمار پخت غذا توسط پیمانکار', contractorCooked, 'پیمانکار'],
      ['۵', 'آمار دریافت غذا در رستوران (کارت)', receivedInRestaurant, 'رستوران'],
      ['۶', 'آمار دریافت غذا با فیش فراموشی', forgottenTicket, 'رستوران'],
      ['۷', 'آمار دریافت غذا بیرون بر (ثبت گروهی)', takeaways, 'رستوران'],
      ['۸', 'آمار خروجی سامانه', systemOutput, 'سیستم'],
    ];

    let counter = 9;
    customFields.forEach(field => {
      const val = customValues[field.name] !== undefined ? customValues[field.name] : 0;
      baseRows.push([
        String(counter++),
        field.label,
        val,
        field.category === 'input' ? 'ورودی سفارشی' : field.category === 'output' ? 'خروجی سفارشی' : 'اطلاعات سفارشی'
      ]);
    });

    baseRows.push([
      String(counter++),
      'میزان پرت غذا (پخت منهای دریافت واقعی)',
      computedWastage,
      computedWastage > 0 ? 'پرت غذا (بستانکار کارگاه)' : 'صرفه‌جویی (بستانکار پیمانکار)'
    ]);

    baseRows.push([
      String(counter++),
      'مغایرت آمار اداری با مصرف واقعی',
      complianceGap,
      complianceGap > 0 ? 'کسری مصرف اداری' : 'مازاد مصرف اداری'
    ]);

    if (note) {
      baseRows.push([
        String(counter++),
        'یادداشت‌ها و جزئیات ثبت شده',
        note,
        'توضیحات روز'
      ]);
    }

    const summaries = [
      { label: 'کل مصرف واقعی', value: receivedInRestaurant + forgottenTicket + takeaways },
      { label: 'پرت پیمانکار', value: computedWastage },
      { label: 'مغایرت اداری', value: Math.abs(complianceGap) },
      { label: 'پرسنل حاضر', value: workshopPersonnel }
    ];

    printToPDF(
      `گزارش آماری روزانه آمار رستوران کارگاهی بوشهر`,
      `تاریخ: ${shamsi} | وعده: ${mealName} | منوی روز: ${currentFood}`,
      headers,
      baseRows,
      summaries
    );
  };

  return (
    <div className="bg-[#0f172a] rounded-2xl border border-slate-800 shadow-xl overflow-hidden" id="daily-log-form">
      {/* Form Header */}
      <div className="bg-slate-900/60 border-b border-slate-800 px-6 py-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <ClipboardEdit className="h-5 w-5 text-emerald-500" />
          <h2 className="font-bold text-slate-50 text-lg">بخش اول: ثبت فعالیت و آمار روزانه</h2>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {/* Export buttons for Daily Log */}
          <button
            type="button"
            onClick={handleExportExcel}
            className="bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 font-bold text-xs px-3 py-2 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
            title="خروجی اکسل این فرم"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-400" />
            <span>خروجی اکسل روز جاری</span>
          </button>
          
          <button
            type="button"
            onClick={handleExportPDF}
            className="bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 font-bold text-xs px-3 py-2 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
            title="چاپ نسخه PDF این فرم"
          >
            <Printer className="h-4 w-4 text-amber-400" />
            <span>خروجی PDF روز جاری</span>
          </button>

          {/* Helper Food Badge */}
          <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold px-3 py-1.5 rounded-xl">
            <Calendar className="h-4 w-4" />
            <span>برنامه غذا:</span>
            <span className="font-bold text-emerald-200">{currentFood}</span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-400 font-mono">({getDayNameInPersian(currentDayOfWeek)})</span>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-6">
        
        {/* Step 1: Select Date, Meal & Workshop Capacity */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-6 bg-slate-950/40 p-4 rounded-xl border border-slate-800/80">
          
          <div>
            <label className="block text-slate-300 text-xs font-semibold mb-2">۱. انتخاب تاریخ ثبت</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-800 bg-slate-950 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none font-mono text-slate-100"
              required
            />
          </div>

          <div>
            <label className="block text-slate-300 text-xs font-semibold mb-2">۲. انتخاب وعده غذایی</label>
            <div className="grid grid-cols-3 gap-1 bg-slate-950 p-1 rounded-xl h-[38px] items-center border border-slate-850">
              {activeMeals.map(meal => (
                <button
                  key={meal.id}
                  type="button"
                  onClick={() => setSelectedMealId(meal.id)}
                  className={`text-xs font-bold py-1 px-1.5 rounded-lg text-center transition-all cursor-pointer truncate ${
                    selectedMealId === meal.id
                      ? 'bg-slate-800 text-emerald-400 border border-slate-700 shadow-sm'
                      : 'text-slate-400 hover:text-slate-100'
                  }`}
                >
                  {meal.name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-slate-300 text-xs font-semibold mb-2">۳. تعداد کل نفرات حاضر کارگاه</label>
            <input
              type="number"
              min="0"
              value={workshopPersonnel || ''}
              onChange={(e) => setWorkshopPersonnel(Number(e.target.value))}
              placeholder="مثال: ۲۴۰"
              disabled={isReadOnly}
              className="w-full px-3 py-2 border border-slate-800 bg-slate-950 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none font-semibold text-slate-100 font-mono disabled:opacity-60 disabled:cursor-not-allowed"
              required
            />
          </div>

        </div>

        {/* Step 2: Standard Stat Parameters */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-slate-50 text-sm flex items-center gap-1.5">
              <span>پارامترهای آماری وعده {activeMeals.find(m => m.id === selectedMealId)?.name}</span>
            </h3>
            
            {/* Smart Fill button */}
            {!isReadOnly && (
              <button
                type="button"
                onClick={handleSmartAutofill}
                className="text-xs bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 transition-all cursor-pointer"
                title="پر کردن خودکار مقادیر مشابه جهت تسریع ثبت"
              >
                <Zap className="h-3.5 w-3.5" />
                تکمیل هوشمند مقادیر مشابه
              </button>
            )}
          </div>

          {/* Stat Fields Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            
            {/* 1. Office Announced */}
            <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-3 shadow-sm hover:border-slate-700 transition-all flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-full">اداری</span>
                <label className="block text-slate-300 text-xs font-semibold mt-1.5 mb-1">آمار اعلام شده اداری</label>
              </div>
              <input
                type="number"
                min="0"
                value={officeAnnounced || ''}
                onChange={(e) => setOfficeAnnounced(Number(e.target.value))}
                disabled={isReadOnly}
                className="w-full px-3 py-1.5 border border-slate-800 bg-slate-950 text-slate-100 rounded-lg text-sm font-mono focus:ring-2 focus:ring-emerald-500 outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                placeholder="0"
                required
              />
            </div>

            {/* 2. Cooking Instruction */}
            <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-3 shadow-sm hover:border-slate-700 transition-all flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">پیمانکار</span>
                <label className="block text-slate-300 text-xs font-semibold mt-1.5 mb-1">دستور پخت روزانه به پیمانکار</label>
              </div>
              <input
                type="number"
                min="0"
                value={cookingInstruction || ''}
                onChange={(e) => setCookingInstruction(Number(e.target.value))}
                disabled={isReadOnly}
                className="w-full px-3 py-1.5 border border-slate-800 bg-slate-950 text-slate-100 rounded-lg text-sm font-mono focus:ring-2 focus:ring-emerald-500 outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                placeholder="0"
                required
              />
            </div>

            {/* 3. Contractor Cooked */}
            <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-3 shadow-sm hover:border-slate-700 transition-all flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">پیمانکار</span>
                <label className="block text-slate-300 text-xs font-semibold mt-1.5 mb-1">آمار پخت غذا توسط پیمانکار</label>
              </div>
              <input
                type="number"
                min="0"
                value={contractorCooked || ''}
                onChange={(e) => setContractorCooked(Number(e.target.value))}
                disabled={isReadOnly}
                className="w-full px-3 py-1.5 border border-slate-800 bg-slate-950 text-slate-100 rounded-lg text-sm font-mono focus:ring-2 focus:ring-emerald-500 outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                placeholder="0"
                required
              />
            </div>

            {/* 4. Received in Restaurant */}
            <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-3 shadow-sm hover:border-slate-700 transition-all flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">رستوران</span>
                <label className="block text-slate-300 text-xs font-semibold mt-1.5 mb-1">آمار دریافت غذا در رستوران</label>
              </div>
              <input
                type="number"
                min="0"
                value={receivedInRestaurant || ''}
                onChange={(e) => setReceivedInRestaurant(Number(e.target.value))}
                disabled={isReadOnly}
                className="w-full px-3 py-1.5 border border-slate-800 bg-slate-950 text-slate-100 rounded-lg text-sm font-mono focus:ring-2 focus:ring-emerald-500 outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                placeholder="0"
                required
              />
            </div>

            {/* 5. Forgotten Ticket */}
            <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-3 shadow-sm hover:border-slate-700 transition-all flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-full">فیش فراموشی</span>
                <label className="block text-slate-300 text-xs font-semibold mt-1.5 mb-1">آمار دریافت با فیش فراموشی</label>
              </div>
              <input
                type="number"
                min="0"
                value={forgottenTicket || ''}
                onChange={(e) => setForgottenTicket(Number(e.target.value))}
                disabled={isReadOnly}
                className="w-full px-3 py-1.5 border border-slate-800 bg-slate-950 text-slate-100 rounded-lg text-sm font-mono focus:ring-2 focus:ring-rose-500 outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                placeholder="0"
                required
              />
            </div>

            {/* 6. Takeaways */}
            <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-3 shadow-sm hover:border-slate-700 transition-all flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold text-sky-400 bg-sky-500/10 border border-sky-500/20 px-2 py-0.5 rounded-full">بیرون‌بر</span>
                <label className="block text-slate-300 text-xs font-semibold mt-1.5 mb-1">آمار غذا بیرون‌بر (ثبت گروهی)</label>
              </div>
              <input
                type="number"
                min="0"
                value={takeaways || ''}
                onChange={(e) => setTakeaways(Number(e.target.value))}
                disabled={isReadOnly}
                className="w-full px-3 py-1.5 border border-slate-800 bg-slate-950 text-slate-100 rounded-lg text-sm font-mono focus:ring-2 focus:ring-sky-500 outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                placeholder="0"
                required
              />
            </div>

            {/* 7. System Output */}
            <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-3 shadow-sm hover:border-slate-700 transition-all flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded-full">سیستم</span>
                <label className="block text-slate-300 text-xs font-semibold mt-1.5 mb-1">آمار خروجی سامانه</label>
              </div>
              <input
                type="number"
                min="0"
                value={systemOutput || ''}
                onChange={(e) => setSystemOutput(Number(e.target.value))}
                disabled={isReadOnly}
                className="w-full px-3 py-1.5 border border-slate-800 bg-slate-950 text-slate-100 rounded-lg text-sm font-mono focus:ring-2 focus:ring-purple-500 outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                placeholder="0"
                required
              />
            </div>

          </div>
        </div>

        {/* Step 3: Custom fields (if any added) */}
        {customFields.length > 0 && (
          <div className="mb-6 bg-[#0f172a] border border-slate-800 rounded-2xl p-4">
            <h4 className="font-bold text-slate-300 text-xs sm:text-sm mb-3">پارامترهای سفارشی اضافه شده</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {customFields.map(field => {
                const val = customValues[field.name] !== undefined ? customValues[field.name] : '';
                return (
                  <div key={field.id} className="bg-slate-950/40 p-3 rounded-xl border border-slate-800">
                    <label className="block text-slate-300 text-xs font-semibold mb-1.5">
                      {field.label}
                    </label>
                    {field.type === 'number' ? (
                      <input
                        type="number"
                        min="0"
                        value={val}
                        onChange={(e) => handleCustomValueChange(field.name, Number(e.target.value))}
                        disabled={isReadOnly}
                        className="w-full px-3 py-1.5 border border-slate-800 bg-slate-950 text-slate-100 rounded-lg text-sm font-mono focus:ring-2 focus:ring-emerald-500 outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                        placeholder="0"
                      />
                    ) : (
                      <input
                        type="text"
                        value={val}
                        onChange={(e) => handleCustomValueChange(field.name, e.target.value)}
                        disabled={isReadOnly}
                        className="w-full px-3 py-1.5 border border-slate-800 bg-slate-950 text-slate-100 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                        placeholder="ثبت توضیح..."
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Notes & Calculations */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6 items-start">
          
          {/* Notes field */}
          <div className="lg:col-span-2">
            <label className="block text-slate-300 text-xs font-semibold mb-1.5">توضیحات و یادداشت‌های روز جاری</label>
            <div className="relative">
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                disabled={isReadOnly}
                placeholder={isReadOnly ? "یادداشتی ثبت نشده است..." : "هرگونه یادداشت آماری، ناهماهنگی، تاخیر در توزیع یا مشکلات را در این بخش یادداشت کنید..."}
                rows={3}
                className="w-full px-3 py-2 border border-slate-800 bg-slate-950 text-slate-100 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none resize-none disabled:opacity-60 disabled:cursor-not-allowed"
              />
              <FileText className="absolute left-3 bottom-3 h-4 w-4 text-slate-500" />
            </div>
          </div>

          {/* Quick Realtime Analytics Widget */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs space-y-2.5 h-full flex flex-col justify-center">
            <h4 className="font-bold text-slate-200 text-xs border-b border-slate-800 pb-1.5">تحلیل زنده آمار ثبت شده</h4>
            
            <div className="flex justify-between items-center">
              <span className="text-slate-400">پخت نسبت به توزیع (پرت غذا):</span>
              <span className={`font-mono font-bold ${computedWastage > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                {toPersianDigits(computedWastage)} پرس
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-400">تطابق آمار اداری با مصرف واقعی:</span>
              <span className={`font-mono font-bold ${complianceGap !== 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                {toPersianDigits(Math.abs(complianceGap))} پرس {complianceGap > 0 ? 'کمتر مصرف شد' : 'بیشتر مصرف شد'}
              </span>
            </div>

            {computedWastage > 10 && (
              <div className="flex items-center gap-1.5 text-[10px] text-amber-400 bg-amber-500/10 p-2 rounded-lg border border-amber-500/20">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                <span>توجه: پرت غدای پیمانکار بیش از حد معمول است.</span>
              </div>
            )}
          </div>

        </div>

        {/* Action Button Section */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-t border-slate-800 pt-5">
          <div className="text-xs text-slate-400">
            {isReadOnly ? (
              <span className="text-amber-400 flex items-center gap-1.5 font-bold">
                <AlertTriangle className="h-4 w-4" />
                شما در حالت مشاهده «مهمان» هستید. ثبت و تغییر اطلاعات غیرفعال است.
              </span>
            ) : saveStatus === 'saved' ? (
              <span className="text-emerald-400 flex items-center gap-1 font-bold">
                <CheckCircle2 className="h-4 w-4" />
                آمار با موفقیت ثبت و ذخیره گردید.
              </span>
            ) : (
              <span>آخرین بروزرسانی در لوکال استوریج مرورگر ذخیره خواهد شد.</span>
            )}
          </div>
          
          {!isReadOnly && (
            <button
              type="submit"
              className="bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-slate-950 font-extrabold px-6 py-2.5 rounded-xl cursor-pointer shadow-md shadow-emerald-500/15 transition-all text-sm flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${saveStatus === 'saved' ? 'animate-spin' : ''}`} />
              ثبت و ذخیره نهایی آمار روزانه
            </button>
          )}
        </div>

      </form>
    </div>
  );
}
