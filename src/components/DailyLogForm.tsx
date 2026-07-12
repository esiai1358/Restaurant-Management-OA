/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Meal, WeeklyMenu, CustomField, DailyLog, DayOfWeek, SystemSettings } from '../types';
import { getDayOfWeekFromGregorian, getDayNameInPersian, formatToJalali, toPersianDigits, getIranLocalDateStr, getJalaliMonthName, jalaliToGregorian, getJalaaliMonthLength, gregorianToJalali } from '../utils/farsi';
import { exportToCSV, printToPDF } from '../utils/exportHelpers';
import ExportSelectionModal from './ExportSelectionModal';
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
  currentRole?: 'admin' | 'supervisor' | 'operator' | 'guest';
  systemSettings: SystemSettings;
}

export default function DailyLogForm({
  meals,
  weeklyMenu,
  customFields,
  logs,
  onSaveLog,
  currentRole = 'admin',
  systemSettings,
}: DailyLogFormProps) {
  // Current date & meal selection
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return getIranLocalDateStr();
  });
  const [selectedMealId, setSelectedMealId] = useState<string>('lunch');

  // Export selection modal states
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportModalType, setExportModalType] = useState<'excel' | 'pdf'>('excel');

  // Convert selectedDate (Gregorian YYYY-MM-DD) to Jalaali
  const { jy, jm, jd } = (() => {
    if (!selectedDate) return { jy: 1405, jm: 4, jd: 18 };
    const [y, m, d] = selectedDate.split('-').map(Number);
    if (isNaN(y) || isNaN(m) || isNaN(d)) return { jy: 1405, jm: 4, jd: 18 };
    return gregorianToJalali(y, m, d);
  })();

  const handleShamsiDateChange = (newJy: number, newJm: number, newJd: number) => {
    const maxDays = getJalaaliMonthLength(newJy, newJm);
    const validatedJd = Math.min(newJd, maxDays);
    const { gy, gm, gd } = jalaliToGregorian(newJy, newJm, validatedJd);
    const dateString = `${gy}-${String(gm).padStart(2, '0')}-${String(gd).padStart(2, '0')}`;
    setSelectedDate(dateString);
  };

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

  // Auto-calculate system output based on: receivedInRestaurant + forgottenTicket + takeaways
  useEffect(() => {
    setSystemOutput((receivedInRestaurant || 0) + (forgottenTicket || 0) + (takeaways || 0));
  }, [receivedInRestaurant, forgottenTicket, takeaways]);

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

  // Return list of available fields to export
  const getDailyLogExportItems = () => {
    const items = [
      { key: 'workshopPersonnel', label: 'آمار کل کارگاه', category: 'ظرفیت کارگاه' },
      { key: 'officeAnnounced', label: 'آمار حضور روزانه ( اعلام شده اداری )', category: 'اداری' },
      { key: 'cookingInstruction', label: 'دستور پخت روزانه به پیمانکار', category: 'پیمانکار' },
      { key: 'contractorCooked', label: 'آمار پخت غذا توسط پیمانکار', category: 'پیمانکار' },
      { key: 'receivedInRestaurant', label: 'دریافت غذا در رستوران (کارت)', category: 'رستوران' },
      { key: 'forgottenTicket', label: 'دریافت غذا با فیش فراموشی', category: 'رستوران' },
      { key: 'takeaways', label: 'دریافت غذا بیرون بر (ثبت گروهی)', category: 'رستوران' },
      { key: 'systemOutput', label: 'آمار خروجی سامانه', category: 'سیستم' },
      { key: 'wastage', label: 'میزان پرت غذا (مغایرت پخت/مصرف)', category: 'محاسباتی' },
      { key: 'complianceGap', label: 'مغایرت آمار اداری با مصرف واقعی', category: 'محاسباتی' },
    ];

    customFields.forEach(field => {
      items.push({
        key: `custom_${field.name}`,
        label: field.label,
        category: field.category === 'input' ? 'ورودی سفارشی' : field.category === 'output' ? 'خروجی سفارشی' : 'اطلاعات سفارشی'
      });
    });

    items.push({ key: 'note', label: 'یادداشت‌ها و توضیحات روز', category: 'توضیحات' });
    return items;
  };

  const handleExportExcelClick = () => {
    setExportModalType('excel');
    setIsExportModalOpen(true);
  };

  const handleExportPDFClick = () => {
    setExportModalType('pdf');
    setIsExportModalOpen(true);
  };

  const executeDailyLogExport = (selectedKeys: string[], selectedMealIds?: string[]) => {
    const shamsi = formatToJalali(selectedDate);
    const targetMealIds = selectedMealIds && selectedMealIds.length > 0 ? selectedMealIds : [selectedMealId];

    if (exportModalType === 'excel') {
      const headers: string[] = ['تاریخ شمسی', 'وعده غذایی', 'غذای منو'];
      
      if (selectedKeys.includes('workshopPersonnel')) headers.push('آمار کل کارگاه');
      if (selectedKeys.includes('officeAnnounced')) headers.push('آمار حضور روزانه ( اعلام شده اداری )');
      if (selectedKeys.includes('cookingInstruction')) headers.push('دستور پخت');
      if (selectedKeys.includes('contractorCooked')) headers.push('پخت پیمانکار');
      if (selectedKeys.includes('receivedInRestaurant')) headers.push('دریافت رستوران');
      if (selectedKeys.includes('forgottenTicket')) headers.push('فیش فراموشی');
      if (selectedKeys.includes('takeaways')) headers.push('بیرون‌بر');
      if (selectedKeys.includes('systemOutput')) headers.push('خروجی سیستم');

      customFields.forEach(field => {
        if (selectedKeys.includes(`custom_${field.name}`)) {
          headers.push(field.label);
        }
      });

      if (selectedKeys.includes('wastage')) headers.push('پرت غذا');
      if (selectedKeys.includes('complianceGap')) headers.push('مغایرت اداری');
      if (selectedKeys.includes('note')) headers.push('یادداشت');

      const rowsData: (string | number)[][] = [];

      targetMealIds.forEach((mId) => {
        const isCurrentActive = mId === selectedMealId;
        
        let mWorkshopPersonnel = workshopPersonnel;
        let mOfficeAnnounced = officeAnnounced;
        let mCookingInstruction = cookingInstruction;
        let mContractorCooked = contractorCooked;
        let mReceivedInRestaurant = receivedInRestaurant;
        let mForgottenTicket = forgottenTicket;
        let mTakeaways = takeaways;
        let mSystemOutput = systemOutput;
        let mCustomValues = customValues;
        let mComputedWastage = computedWastage;
        let mComplianceGap = complianceGap;
        let mNote = note;

        if (!isCurrentActive) {
          const existingLog = logs.find(l => l.date === selectedDate && l.mealId === mId);
          if (existingLog) {
            mWorkshopPersonnel = existingLog.workshopPersonnel;
            mOfficeAnnounced = existingLog.officeAnnounced;
            mCookingInstruction = existingLog.cookingInstruction;
            mContractorCooked = existingLog.contractorCooked;
            mReceivedInRestaurant = existingLog.receivedInRestaurant;
            mForgottenTicket = existingLog.forgottenTicket;
            mTakeaways = existingLog.takeaways;
            mSystemOutput = existingLog.systemOutput;
            mCustomValues = existingLog.customValues || {};
            mComputedWastage = mContractorCooked - (mReceivedInRestaurant + mForgottenTicket + mTakeaways);
            mComplianceGap = mOfficeAnnounced - (mReceivedInRestaurant + mForgottenTicket + mTakeaways);
            mNote = existingLog.note || '';
          } else {
            mWorkshopPersonnel = workshopPersonnel;
            mOfficeAnnounced = 0;
            mCookingInstruction = 0;
            mContractorCooked = 0;
            mReceivedInRestaurant = 0;
            mForgottenTicket = 0;
            mTakeaways = 0;
            mSystemOutput = 0;
            mCustomValues = {};
            mComputedWastage = 0;
            mComplianceGap = 0;
            mNote = '';
          }
        }

        const mealName = meals.find((m) => m.id === mId)?.name || mId;
        const foodName = weeklyMenu.find(
          item => item.day === currentDayOfWeek && item.mealId === mId
        )?.foodName || 'تعریف نشده در برنامه غذایی';

        const row: (string | number)[] = [shamsi, mealName, foodName];
        if (selectedKeys.includes('workshopPersonnel')) row.push(mWorkshopPersonnel);
        if (selectedKeys.includes('officeAnnounced')) row.push(mOfficeAnnounced);
        if (selectedKeys.includes('cookingInstruction')) row.push(mCookingInstruction);
        if (selectedKeys.includes('contractorCooked')) row.push(mContractorCooked);
        if (selectedKeys.includes('receivedInRestaurant')) row.push(mReceivedInRestaurant);
        if (selectedKeys.includes('forgottenTicket')) row.push(mForgottenTicket);
        if (selectedKeys.includes('takeaways')) row.push(mTakeaways);
        if (selectedKeys.includes('systemOutput')) row.push(mSystemOutput);

        customFields.forEach(field => {
          if (selectedKeys.includes(`custom_${field.name}`)) {
            row.push(mCustomValues[field.name] !== undefined ? mCustomValues[field.name] : 0);
          }
        });

        if (selectedKeys.includes('wastage')) row.push(mComputedWastage);
        if (selectedKeys.includes('complianceGap')) row.push(mComplianceGap);
        if (selectedKeys.includes('note')) row.push(mNote || 'بدون یادداشت');

        rowsData.push(row);
      });

      if (systemSettings && systemSettings.signatures) {
        rowsData.push([]); // blank row
        systemSettings.signatures.filter(s => s.isVisible).forEach(s => {
          rowsData.push([`امضای ${s.title}:`, s.name]);
        });
      }

      const fileLabel = targetMealIds.length > 1 ? 'تجمیعی' : (meals.find(m => m.id === targetMealIds[0])?.name || targetMealIds[0]);
      exportToCSV(`آمار_رستوران_روز_${shamsi}_${fileLabel}`, headers, rowsData, !!systemSettings.companyLogo);
    } else {
      // PDF Export
      // Let's retrieve all selected meals data
      const mealsData = targetMealIds.map(mId => {
        const isCurrentActive = mId === selectedMealId;
        let mWorkshopPersonnel = workshopPersonnel;
        let mOfficeAnnounced = officeAnnounced;
        let mCookingInstruction = cookingInstruction;
        let mContractorCooked = contractorCooked;
        let mReceivedInRestaurant = receivedInRestaurant;
        let mForgottenTicket = forgottenTicket;
        let mTakeaways = takeaways;
        let mSystemOutput = systemOutput;
        let mCustomValues = customValues;
        let mComputedWastage = computedWastage;
        let mComplianceGap = complianceGap;
        let mNote = note;

        if (!isCurrentActive) {
          const existingLog = logs.find(l => l.date === selectedDate && l.mealId === mId);
          if (existingLog) {
            mWorkshopPersonnel = existingLog.workshopPersonnel;
            mOfficeAnnounced = existingLog.officeAnnounced;
            mCookingInstruction = existingLog.cookingInstruction;
            mContractorCooked = existingLog.contractorCooked;
            mReceivedInRestaurant = existingLog.receivedInRestaurant;
            mForgottenTicket = existingLog.forgottenTicket;
            mTakeaways = existingLog.takeaways;
            mSystemOutput = existingLog.systemOutput;
            mCustomValues = existingLog.customValues || {};
            mComputedWastage = mContractorCooked - (mReceivedInRestaurant + mForgottenTicket + mTakeaways);
            mComplianceGap = mOfficeAnnounced - (mReceivedInRestaurant + mForgottenTicket + mTakeaways);
            mNote = existingLog.note || '';
          } else {
            mWorkshopPersonnel = workshopPersonnel;
            mOfficeAnnounced = 0;
            mCookingInstruction = 0;
            mContractorCooked = 0;
            mReceivedInRestaurant = 0;
            mForgottenTicket = 0;
            mTakeaways = 0;
            mSystemOutput = 0;
            mCustomValues = {};
            mComputedWastage = 0;
            mComplianceGap = 0;
            mNote = '';
          }
        }

        return {
          id: mId,
          name: meals.find(m => m.id === mId)?.name || mId,
          foodName: weeklyMenu.find(item => item.day === currentDayOfWeek && item.mealId === mId)?.foodName || 'تعریف نشده',
          workshopPersonnel: mWorkshopPersonnel,
          officeAnnounced: mOfficeAnnounced,
          cookingInstruction: mCookingInstruction,
          contractorCooked: mContractorCooked,
          receivedInRestaurant: mReceivedInRestaurant,
          forgottenTicket: mForgottenTicket,
          takeaways: mTakeaways,
          systemOutput: mSystemOutput,
          customValues: mCustomValues,
          computedWastage: mComputedWastage,
          complianceGap: mComplianceGap,
          note: mNote
        };
      });

      // Build headers
      let headers: string[];
      if (targetMealIds.length === 1) {
        headers = ['ردیف', 'پارامتر آماری رستوران بوشهر', 'مقدار (پرس/نفر)', 'دسته بندی پارامتر'];
      } else {
        headers = ['ردیف', 'پارامتر آماری رستوران بوشهر', ...mealsData.map(m => m.name), 'دسته بندی پارامتر'];
      }

      const baseRows: (string | number)[][] = [];
      let counter = 1;

      // 1. Menu Food Name Row
      if (targetMealIds.length === 1) {
        baseRows.push([String(counter++), 'برنامه غذایی منوی روز', mealsData[0].foodName, 'منوی غذا']);
      } else {
        baseRows.push([
          String(counter++), 
          'برنامه غذایی منوی روز', 
          ...mealsData.map(m => m.foodName), 
          'منوی غذا'
        ]);
      }

      // 2. Workshop Personnel
      if (selectedKeys.includes('workshopPersonnel')) {
        if (targetMealIds.length === 1) {
          baseRows.push([String(counter++), 'آمار کل کارگاه', mealsData[0].workshopPersonnel, 'ظرفیت کارگاه']);
        } else {
          baseRows.push([String(counter++), 'آمار کل کارگاه', ...mealsData.map(m => m.workshopPersonnel), 'ظرفیت کارگاه']);
        }
      }

      // 3. Office Announced
      if (selectedKeys.includes('officeAnnounced')) {
        if (targetMealIds.length === 1) {
          baseRows.push([String(counter++), 'آمار حضور روزانه ( اعلام شده اداری )', mealsData[0].officeAnnounced, 'اداری']);
        } else {
          baseRows.push([String(counter++), 'آمار حضور روزانه ( اعلام شده اداری )', ...mealsData.map(m => m.officeAnnounced), 'اداری']);
        }
      }

      // 4. Cooking Instruction
      if (selectedKeys.includes('cookingInstruction')) {
        if (targetMealIds.length === 1) {
          baseRows.push([String(counter++), 'آمار دستور پخت روزانه به پیمانکار', mealsData[0].cookingInstruction, 'پیمانکار']);
        } else {
          baseRows.push([String(counter++), 'آمار دستور پخت روزانه به پیمانکار', ...mealsData.map(m => m.cookingInstruction), 'پیمانکار']);
        }
      }

      // 5. Contractor Cooked
      if (selectedKeys.includes('contractorCooked')) {
        if (targetMealIds.length === 1) {
          baseRows.push([String(counter++), 'آمار پخت غذا توسط پیمانکار', mealsData[0].contractorCooked, 'پیمانکار']);
        } else {
          baseRows.push([String(counter++), 'آمار پخت غذا توسط پیمانکار', ...mealsData.map(m => m.contractorCooked), 'پیمانکار']);
        }
      }

      // 6. Received in Restaurant
      if (selectedKeys.includes('receivedInRestaurant')) {
        if (targetMealIds.length === 1) {
          baseRows.push([String(counter++), 'آمار دریافت غذا در رستوران (کارت)', mealsData[0].receivedInRestaurant, 'رستوران']);
        } else {
          baseRows.push([String(counter++), 'آمار دریافت غذا در رستوران (کارت)', ...mealsData.map(m => m.receivedInRestaurant), 'رستوران']);
        }
      }

      // 7. Forgotten Ticket
      if (selectedKeys.includes('forgottenTicket')) {
        if (targetMealIds.length === 1) {
          baseRows.push([String(counter++), 'آمار دریافت غذا با فیش فراموشی', mealsData[0].forgottenTicket, 'رستوران']);
        } else {
          baseRows.push([String(counter++), 'آمار دریافت غذا با فیش فراموشی', ...mealsData.map(m => m.forgottenTicket), 'رستوران']);
        }
      }

      // 8. Takeaways
      if (selectedKeys.includes('takeaways')) {
        if (targetMealIds.length === 1) {
          baseRows.push([String(counter++), 'آمار دریافت غذا بیرون بر (ثبت گروهی)', mealsData[0].takeaways, 'رستوران']);
        } else {
          baseRows.push([String(counter++), 'آمار دریافت غذا بیرون بر (ثبت گروهی)', ...mealsData.map(m => m.takeaways), 'رستوران']);
        }
      }

      // 9. System Output
      if (selectedKeys.includes('systemOutput')) {
        if (targetMealIds.length === 1) {
          baseRows.push([String(counter++), 'آمار خروجی سامانه', mealsData[0].systemOutput, 'سیستم']);
        } else {
          baseRows.push([String(counter++), 'آمار خروجی سامانه', ...mealsData.map(m => m.systemOutput), 'سیستم']);
        }
      }

      // Custom fields
      customFields.forEach(field => {
        if (selectedKeys.includes(`custom_${field.name}`)) {
          const catLabel = field.category === 'input' ? 'ورودی سفارشی' : field.category === 'output' ? 'خروجی سفارشی' : 'اطلاعات سفارشی';
          if (targetMealIds.length === 1) {
            const val = mealsData[0].customValues[field.name] !== undefined ? mealsData[0].customValues[field.name] : 0;
            baseRows.push([String(counter++), field.label, val, catLabel]);
          } else {
            const vals = mealsData.map(m => m.customValues[field.name] !== undefined ? m.customValues[field.name] : 0);
            baseRows.push([String(counter++), field.label, ...vals, catLabel]);
          }
        }
      });

      // Wastage
      if (selectedKeys.includes('wastage')) {
        if (targetMealIds.length === 1) {
          baseRows.push([
            String(counter++),
            'میزان پرت غذا (پخت منهای دریافت واقعی)',
            mealsData[0].computedWastage,
            mealsData[0].computedWastage > 0 ? 'پرت غذا (بستانکار کارگاه)' : 'صرفه‌جویی (بستانکار پیمانکار)'
          ]);
        } else {
          baseRows.push([
            String(counter++),
            'میزان پرت غذا (پخت منهای دریافت واقعی)',
            ...mealsData.map(m => m.computedWastage),
            'پرت غذا'
          ]);
        }
      }

      // Compliance Gap
      if (selectedKeys.includes('complianceGap')) {
        if (targetMealIds.length === 1) {
          baseRows.push([
            String(counter++),
            'مغایرت آمار اداری با مصرف واقعی',
            mealsData[0].complianceGap,
            mealsData[0].complianceGap > 0 ? 'کسری مصرف اداری' : 'مازاد مصرف اداری'
          ]);
        } else {
          baseRows.push([
            String(counter++),
            'مغایرت آمار اداری با مصرف واقعی',
            ...mealsData.map(m => m.complianceGap),
            'مغایرت آماری'
          ]);
        }
      }

      // Note
      if (selectedKeys.includes('note')) {
        const hasAnyNote = mealsData.some(m => m.note);
        if (hasAnyNote) {
          if (targetMealIds.length === 1) {
            baseRows.push([String(counter++), 'یادداشت‌ها و جزئیات ثبت شده', mealsData[0].note || '-', 'توضیحات روز']);
          } else {
            baseRows.push([String(counter++), 'یادداشت‌ها و جزئیات ثبت شده', ...mealsData.map(m => m.note || '-'), 'توضیحات روز']);
          }
        }
      }

      // Build summaries card
      const summaries = [];
      if (targetMealIds.length === 1) {
        const mData = mealsData[0];
        const realCons = mData.receivedInRestaurant + mData.forgottenTicket + mData.takeaways;
        if (selectedKeys.includes('receivedInRestaurant') || selectedKeys.includes('forgottenTicket') || selectedKeys.includes('takeaways')) {
          summaries.push({ label: 'کل مصرف واقعی', value: realCons });
        }
        if (selectedKeys.includes('wastage')) {
          summaries.push({ label: 'پرت پیمانکار', value: mData.computedWastage });
        }
        if (selectedKeys.includes('complianceGap')) {
          summaries.push({ label: 'مغایرت اداری', value: Math.abs(mData.complianceGap) });
        }
        if (selectedKeys.includes('workshopPersonnel')) {
          summaries.push({ label: 'پرسنل حاضر', value: mData.workshopPersonnel });
        }
      } else {
        const totalRealCons = mealsData.reduce((acc, m) => acc + m.receivedInRestaurant + m.forgottenTicket + m.takeaways, 0);
        const totalWastage = mealsData.reduce((acc, m) => acc + m.computedWastage, 0);
        const totalOffice = mealsData.reduce((acc, m) => acc + m.officeAnnounced, 0);
        
        if (selectedKeys.includes('receivedInRestaurant') || selectedKeys.includes('forgottenTicket') || selectedKeys.includes('takeaways')) {
          summaries.push({ label: 'مجموع مصرف واقعی روز', value: totalRealCons });
        }
        if (selectedKeys.includes('wastage')) {
          summaries.push({ label: 'مجموع پرت غذای روز', value: totalWastage });
        }
        if (selectedKeys.includes('officeAnnounced')) {
          summaries.push({ label: 'مجموع اعلام اداری روز', value: totalOffice });
        }
      }

      const reportTitle = targetMealIds.length === 1 
        ? `گزارش آماری روزانه آمار رستوران کارگاهی بوشهر`
        : `گزارش آماری تجمیعی روزانه آمار رستوران کارگاهی بوشهر`;

      const reportSubtitle = targetMealIds.length === 1
        ? `تاریخ: ${shamsi} | وعده: ${mealsData[0].name}`
        : `تاریخ: ${shamsi} | وعده‌های انتخابی: ${mealsData.map(m => m.name).join(' و ')}`;

      printToPDF(
        reportTitle,
        reportSubtitle,
        headers,
        baseRows,
        summaries,
        systemSettings.signatures,
        systemSettings.companyLogo
      );
    }
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
            onClick={handleExportExcelClick}
            className="bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 font-bold text-xs px-3 py-2 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
            title="خروجی اکسل این فرم"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-400" />
            <span>خروجی اکسل روز جاری</span>
          </button>
          
          <button
            type="button"
            onClick={handleExportPDFClick}
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
            <label className="block text-slate-300 text-xs font-semibold mb-2 flex justify-between items-center">
              <span>۱. تاریخ ثبت (شمسی)</span>
              <button
                type="button"
                onClick={() => setSelectedDate(getIranLocalDateStr())}
                className="text-[10px] text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer font-bold"
                title="رفتن به تاریخ امروز ایران"
              >
                برو به امروز
              </button>
            </label>
            <div className="grid grid-cols-3 gap-1.5 h-[38px] items-center">
              {/* Day Selector */}
              <select
                value={jd}
                onChange={(e) => handleShamsiDateChange(jy, jm, Number(e.target.value))}
                className="h-full px-2 py-1 border border-slate-800 bg-slate-950 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500 outline-none font-mono text-slate-100 text-center"
              >
                {Array.from({ length: getJalaaliMonthLength(jy, jm) }, (_, i) => i + 1).map(dayNum => (
                  <option key={dayNum} value={dayNum}>
                    {toPersianDigits(dayNum)}
                  </option>
                ))}
              </select>

              {/* Month Selector */}
              <select
                value={jm}
                onChange={(e) => handleShamsiDateChange(jy, Number(e.target.value), jd)}
                className="h-full px-1 py-1 border border-slate-800 bg-slate-950 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500 outline-none font-sans text-slate-100 text-center"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map(monthNum => (
                  <option key={monthNum} value={monthNum}>
                    {getJalaliMonthName(monthNum)}
                  </option>
                ))}
              </select>

              {/* Year Selector */}
              <select
                value={jy}
                onChange={(e) => handleShamsiDateChange(Number(e.target.value), jm, jd)}
                className="h-full px-2 py-1 border border-slate-800 bg-slate-950 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500 outline-none font-mono text-slate-100 text-center"
              >
                {[1403, 1404, 1405, 1406, 1407, 1408].map(yearNum => (
                  <option key={yearNum} value={yearNum}>
                    {toPersianDigits(yearNum)}
                  </option>
                ))}
              </select>
            </div>
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
            <label className="block text-slate-300 text-xs font-semibold mb-2">۳. آمار کل کارگاه</label>
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
                <label className="block text-slate-300 text-xs font-semibold mt-1.5 mb-1">آمار حضور روزانه ( اعلام شده اداری )</label>
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
              />
            </div>

            {/* 7. System Output */}
            <div className="bg-[#1e1b4b]/30 border border-indigo-950 rounded-xl p-3 shadow-sm hover:border-indigo-900 transition-all flex flex-col justify-between" title="محاسبه خودکار سیستم (دریافت رستوران + فیش فراموشی + بیرون بر)">
              <div>
                <span className="text-[10px] font-bold text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded-full">محاسبه خودکار سیستم</span>
                <label className="block text-slate-300 text-xs font-semibold mt-1.5 mb-1">آمار خروجی سامانه</label>
              </div>
              <input
                type="number"
                min="0"
                value={systemOutput || 0}
                onChange={(e) => setSystemOutput(Number(e.target.value))}
                disabled={true}
                className="w-full px-3 py-1.5 border border-indigo-950 bg-slate-950 text-indigo-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-purple-500 outline-none disabled:opacity-80 disabled:cursor-not-allowed font-bold"
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

      <ExportSelectionModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        onConfirm={executeDailyLogExport}
        availableItems={getDailyLogExportItems()}
        title={exportModalType === 'excel' ? 'انتخاب آیتم‌های آماری برای خروجی اکسل' : 'انتخاب آیتم‌های آماری برای خروجی PDF'}
        subtitle="لطفاً آیتم‌های آماری مورد نظر خود را جهت قرارگیری در فایل خروجی تیک بزنید."
        exportType={exportModalType}
        meals={activeMeals}
        defaultSelectedMealId={selectedMealId}
      />
    </div>
  );
}
