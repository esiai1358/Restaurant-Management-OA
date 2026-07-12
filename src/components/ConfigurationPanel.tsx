/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Meal, WeeklyMenu, DayOfWeek, CustomField, SystemSettings, SignatureConfig } from '../types';
import { DAYS_ORDERED, getDayNameInPersian, toPersianDigits } from '../utils/farsi';
import { Plus, Trash2, Edit2, Check, Clock, Save, Coffee, Settings2, PlusCircle, AlertCircle, UserCheck, Shield, ToggleLeft, ToggleRight, FileText, Upload } from 'lucide-react';

interface ConfigurationPanelProps {
  meals: Meal[];
  setMeals: React.Dispatch<React.SetStateAction<Meal[]>>;
  weeklyMenu: WeeklyMenu[];
  setWeeklyMenu: React.Dispatch<React.SetStateAction<WeeklyMenu[]>>;
  customFields: CustomField[];
  setCustomFields: React.Dispatch<React.SetStateAction<CustomField[]>>;
  currentRole?: 'admin' | 'supervisor' | 'operator' | 'guest';
  systemSettings: SystemSettings;
  onUpdateSystemSettings: (newSettings: SystemSettings, detail: string) => void;
}

export default function ConfigurationPanel({
  meals,
  setMeals,
  weeklyMenu,
  setWeeklyMenu,
  customFields,
  setCustomFields,
  currentRole = 'admin',
  systemSettings,
  onUpdateSystemSettings,
}: ConfigurationPanelProps) {
  // Tabs: 0 = Weekly Menu, 1 = Meals, 2 = Custom Fields
  const [activeSubTab, setActiveSubTab] = useState<number>(0);

  // Meal states
  const [newMealName, setNewMealName] = useState('');
  const [newMealStart, setNewMealStart] = useState('12:00');
  const [newMealEnd, setNewMealEnd] = useState('13:00');

  // Custom Fields states
  const [fieldName, setFieldName] = useState('');
  const [fieldLabel, setFieldLabel] = useState('');
  const [fieldType, setFieldType] = useState<'number' | 'text'>('number');
  const [fieldCategory, setFieldCategory] = useState<'input' | 'output' | 'info'>('input');

  // Menu editing states
  const [editingMenuId, setEditingMenuId] = useState<string | null>(null);
  const [editingFoodName, setEditingFoodName] = useState('');

  // Meal editing states
  const [editingMealTimeId, setEditingMealTimeId] = useState<string | null>(null);
  const [editingMealName, setEditingMealName] = useState('');
  const [editingMealStart, setEditingMealStart] = useState('12:00');
  const [editingMealEnd, setEditingMealEnd] = useState('13:00');

  // Signature States
  const [newSigTitle, setNewSigTitle] = useState('');
  const [newSigName, setNewSigName] = useState('');

  const isReadOnly = currentRole !== 'admin' && currentRole !== 'supervisor';

  const handleUpdateContractorName = (name: string) => {
    const updatedSigs = systemSettings.signatures.map(sig => 
      sig.id === 'sig_2' || sig.title === 'پیمانکار رستوران' ? { ...sig, name } : sig
    );
    onUpdateSystemSettings({
      ...systemSettings,
      contractorName: name,
      signatures: updatedSigs
    }, `تغییر نام پیمانکار به: ${name}`);
  };

  const handleUpdateSupervisorName = (name: string) => {
    const updatedSigs = systemSettings.signatures.map(sig => 
      sig.id === 'sig_1' || sig.title === 'سرپرست خدمات' ? { ...sig, name } : sig
    );
    onUpdateSystemSettings({
      ...systemSettings,
      supervisorName: name,
      signatures: updatedSigs
    }, `تغییر نام سرپرست خدمات به: ${name}`);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isReadOnly) return;
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size limit (500KB)
    if (file.size > 500 * 1024) {
      alert('خطا: حجم لوگو نباید بیشتر از ۵۰۰ کیلوبایت باشد!');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64String = event.target?.result as string;
      onUpdateSystemSettings({
        ...systemSettings,
        companyLogo: base64String
      }, 'لوگوی جدید شرکت به صورت دستی آپلود و در سیستم درج گردید.');
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    if (isReadOnly) return;
    onUpdateSystemSettings({
      ...systemSettings,
      companyLogo: undefined
    }, 'لوگوی شرکت از سیستم حذف گردید و به حالت پیش‌فرض بازگشت.');
  };

  const handleToggleSignatureVisibility = (id: string) => {
    const updatedSigs = systemSettings.signatures.map(sig => 
      sig.id === id ? { ...sig, isVisible: !sig.isVisible } : sig
    );
    const targetSig = systemSettings.signatures.find(s => s.id === id);
    onUpdateSystemSettings({
      ...systemSettings,
      signatures: updatedSigs
    }, `تغییر وضعیت نمایش امضای ${targetSig?.title} به ${!targetSig?.isVisible ? 'نمایان' : 'مخفی'}`);
  };

  const handleDeleteSignature = (id: string) => {
    const targetSig = systemSettings.signatures.find(s => s.id === id);
    if (!targetSig) return;
    if (id === 'sig_1' || id === 'sig_2' || ['سرپرست خدمات', 'پیمانکار رستوران'].includes(targetSig.title)) {
      alert('باکس‌های امضای پیش‌فرض (سرپرست خدمات و پیمانکار) قابل حذف نیستند اما می‌توانید آن‌ها را غیرفعال کنید.');
      return;
    }
    const updatedSigs = systemSettings.signatures.filter(sig => sig.id !== id);
    onUpdateSystemSettings({
      ...systemSettings,
      signatures: updatedSigs
    }, `حذف باکس امضای ${targetSig.title}`);
  };

  const handleAddSignature = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSigTitle.trim() || !newSigName.trim()) return;

    const newSig: SignatureConfig = {
      id: `sig_${Date.now()}`,
      title: newSigTitle.trim(),
      name: newSigName.trim(),
      isVisible: true
    };

    onUpdateSystemSettings({
      ...systemSettings,
      signatures: [...systemSettings.signatures, newSig]
    }, `افزودن باکس امضای جدید: ${newSig.title} (${newSig.name})`);

    setNewSigTitle('');
    setNewSigName('');
  };

  // Add new meal
  const handleAddMeal = (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;
    if (!newMealName.trim()) return;

    const newId = `meal_${Date.now()}`;
    const newMeal: Meal = {
      id: newId,
      name: newMealName,
      startTime: newMealStart,
      endTime: newMealEnd,
      isActive: true,
    };

    setMeals([...meals, newMeal]);
    setNewMealName('');
    
    // Seed default blank weekly menu for this new meal
    const newMenuSeeds: WeeklyMenu[] = DAYS_ORDERED.map((day, idx) => ({
      id: `menu_${newId}_${day}_${idx}`,
      day,
      mealId: newId,
      foodName: 'تعریف نشده (برای ویرایش کلیک کنید)',
    }));
    setWeeklyMenu([...weeklyMenu, ...newMenuSeeds]);
  };

  // Toggle meal active
  const handleToggleMeal = (id: string) => {
    if (isReadOnly) return;
    setMeals(meals.map(m => m.id === id ? { ...m, isActive: !m.isActive } : m));
  };

  // Delete custom meal
  const handleDeleteMeal = (id: string) => {
    if (isReadOnly) return;
    // Prevent deleting default standard meals
    if (['breakfast', 'lunch', 'dinner'].includes(id)) {
      alert('وعده‌های پیش‌فرض اصلی (صبحانه، ناهار، شام) قابل حذف نیستند، اما می‌توانید آن‌ها را غیرفعال کنید.');
      return;
    }
    setMeals(meals.filter(m => m.id !== id));
    setWeeklyMenu(weeklyMenu.filter(m => m.mealId !== id));
  };

  const startEditingMeal = (meal: Meal) => {
    if (isReadOnly) return;
    setEditingMealTimeId(meal.id);
    setEditingMealName(meal.name);
    setEditingMealStart(meal.startTime);
    setEditingMealEnd(meal.endTime);
  };

  const saveMealEdit = (id: string) => {
    if (isReadOnly) return;
    if (!editingMealName.trim()) return;
    setMeals(meals.map(m => m.id === id ? { 
      ...m, 
      name: editingMealName.trim(), 
      startTime: editingMealStart, 
      endTime: editingMealEnd 
    } : m));
    setEditingMealTimeId(null);
  };

  // Add custom dynamic field
  const handleAddCustomField = (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;
    if (!fieldName.trim() || !fieldLabel.trim()) return;

    // Convert label to a neat camelCase key
    const cleanKey = fieldName.trim().replace(/\s+/g, '_').toLowerCase();

    if (customFields.some(f => f.name === cleanKey)) {
      alert('این نام شناسه قبلاً اضافه شده است. لطفاً از شناسه دیگری استفاده کنید.');
      return;
    }

    const newField: CustomField = {
      id: `field_${Date.now()}`,
      name: cleanKey,
      label: fieldLabel.trim(),
      type: fieldType,
      category: fieldCategory,
    };

    setCustomFields([...customFields, newField]);
    setFieldName('');
    setFieldLabel('');
  };

  // Delete custom field
  const handleDeleteCustomField = (id: string) => {
    if (isReadOnly) return;
    setCustomFields(customFields.filter(f => f.id !== id));
  };

  // Save weekly menu food edit
  const startEditingMenu = (item: WeeklyMenu) => {
    if (isReadOnly) return;
    setEditingMenuId(item.id);
    setEditingFoodName(item.foodName);
  };

  const saveMenuEdit = (id: string) => {
    if (isReadOnly) return;
    setWeeklyMenu(weeklyMenu.map(item => item.id === id ? { ...item, foodName: editingFoodName } : item));
    setEditingMenuId(null);
    setEditingFoodName('');
  };

  return (
    <div className="bg-[#0f172a] rounded-2xl border border-slate-800 shadow-xl overflow-hidden" id="config-panel">
      
      {/* Configuration Header */}
      <div className="bg-slate-900/60 border-b border-slate-800 px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Settings2 className="h-5 w-5 text-emerald-500" />
          <h2 className="font-bold text-slate-50 text-lg">بخش اول: تعاریف پایه و تنظیمات ورودی</h2>
        </div>
        
        {/* Subtabs Navigation */}
        <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-850">
          <button
            onClick={() => setActiveSubTab(0)}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeSubTab === 0
                ? 'bg-slate-800 text-emerald-400 border border-slate-700 shadow-sm'
                : 'text-slate-400 hover:text-slate-100'
            }`}
          >
            برنامه غذایی هفتگی
          </button>
          <button
            onClick={() => setActiveSubTab(1)}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeSubTab === 1
                ? 'bg-slate-800 text-emerald-400 border border-slate-700 shadow-sm'
                : 'text-slate-400 hover:text-slate-100'
            }`}
          >
            مدیریت وعده‌های غذایی
          </button>
          <button
            onClick={() => setActiveSubTab(2)}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeSubTab === 2
                ? 'bg-slate-800 text-emerald-400 border border-slate-700 shadow-sm'
                : 'text-slate-400 hover:text-slate-100'
            }`}
          >
            افزودن پارامتر ورودی جدید
          </button>
          <button
            onClick={() => setActiveSubTab(3)}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeSubTab === 3
                ? 'bg-slate-800 text-emerald-400 border border-slate-700 shadow-sm'
                : 'text-slate-400 hover:text-slate-100'
            }`}
          >
            تنظیمات قرارداد و امضاها
          </button>
        </div>
      </div>

      <div className="p-6">
        
        {isReadOnly && (
          <div className="flex items-start gap-3 bg-amber-500/10 border border-amber-500/20 text-amber-400 p-4 rounded-xl text-xs sm:text-sm mb-6 shadow-sm">
            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5 text-amber-500" />
            <div>
              <p className="font-bold mb-1">دسترسی محدود (فقط خواندنی)</p>
              <p className="leading-relaxed text-slate-300">
                شما با نقش <span className="font-extrabold text-amber-300">«{currentRole === 'operator' ? 'مسئول خدمات (اپراتور)' : 'مهمان (ناظر)'}»</span> وارد شده‌اید. تغییرات در پیکربندی پایه رستوران (برنامه غذایی هفتگی، وعده‌ها و پارامترها) منحصراً متعلق به نقش‌های <span className="font-extrabold text-slate-100">«مدیر سیستم»</span> و <span className="font-extrabold text-slate-100">«سرپرست خدمات»</span> می‌باشد.
              </p>
            </div>
          </div>
        )}
        
        {/* SUBTAB 0: WEEKLY MENU */}
        {activeSubTab === 0 && (
          <div className="space-y-6">
            <div className="bg-emerald-500/10 border border-emerald-500/20 text-slate-300 p-4 rounded-xl text-xs sm:text-sm flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-emerald-400 mb-1">راهنمای برنامه غذایی روزهای هفته</p>
                <p className="leading-relaxed text-slate-300">
                  در این قسمت، نام غذای هر یک از روزهای هفته را به تفکیک وعده‌های غذایی ثبت کنید. این نام‌ها به عنوان برنامه غذایی پیش‌فرض در بخش ثبت آمار روزانه نمایش داده می‌شوند. برای ویرایش هر کدام کافیست روی دکمه ویرایش روبروی آن کلیک کنید.
                </p>
              </div>
            </div>

            {/* Menu Grid */}
            <div className="overflow-x-auto border border-slate-800 rounded-xl">
              <table className="w-full text-right text-xs sm:text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-950/60 text-slate-300 font-bold border-b border-slate-800">
                    <th className="px-4 py-3 w-32">روز هفته</th>
                    {meals.filter(m => m.isActive).map(meal => (
                      <th key={meal.id} className="px-4 py-3">{meal.name}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850">
                  {DAYS_ORDERED.map(day => (
                    <tr key={day} className="hover:bg-slate-900/30 transition-colors">
                      <td className="px-4 py-3 font-bold text-slate-100 bg-slate-950/20 border-l border-slate-800">
                        {getDayNameInPersian(day)}
                      </td>
                      {meals.filter(m => m.isActive).map(meal => {
                        const menuItem = weeklyMenu.find(item => item.day === day && item.mealId === meal.id) || {
                          id: `temp_${day}_${meal.id}`,
                          day,
                          mealId: meal.id,
                          foodName: 'تعریف نشده'
                        };

                        const isEditing = editingMenuId === menuItem.id;

                        return (
                          <td key={meal.id} className="px-4 py-2.5">
                            {isEditing ? (
                              <div className="flex items-center gap-1.5">
                                <input
                                  type="text"
                                  value={editingFoodName}
                                  onChange={(e) => setEditingFoodName(e.target.value)}
                                  className="w-full px-2 py-1 border border-emerald-500 bg-slate-950 text-slate-100 rounded-lg text-xs focus:ring-1 focus:ring-emerald-500 outline-none"
                                  placeholder="نام غذا را بنویسید..."
                                  autoFocus
                                />
                                <button
                                  onClick={() => saveMenuEdit(menuItem.id)}
                                  className="p-1 text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors cursor-pointer"
                                  title="ذخیره"
                                >
                                  <Check className="h-4 w-4" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-between gap-2 group">
                                <span className="text-slate-300 font-medium">{menuItem.foodName}</span>
                                {!isReadOnly && (
                                  <button
                                    onClick={() => startEditingMenu(menuItem)}
                                    className="p-1 text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg opacity-85 sm:opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                                    title="ویرایش غذا"
                                  >
                                    <Edit2 className="h-3.5 w-3.5" />
                                  </button>
                                )}
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* SUBTAB 1: MEAL MANAGEMENT */}
        {activeSubTab === 1 && (
          <div className="space-y-6">
            {/* Meal creation form */}
            <form onSubmit={handleAddMeal} className="bg-slate-950/40 p-4 rounded-xl border border-slate-800 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div>
                <label className="block text-slate-300 text-xs font-semibold mb-1.5">نام وعده غذایی جدید</label>
                <input
                  type="text"
                  placeholder="مثال: عصرانه، میان وعده"
                  value={newMealName}
                  onChange={(e) => setNewMealName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-800 bg-slate-950 text-slate-100 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-slate-300 text-xs font-semibold mb-1.5">ساعت شروع توزیع</label>
                <input
                  type="time"
                  value={newMealStart}
                  onChange={(e) => setNewMealStart(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-800 bg-slate-950 text-slate-100 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none font-mono"
                />
              </div>
              <div>
                <label className="block text-slate-300 text-xs font-semibold mb-1.5">ساعت پایان توزیع</label>
                <input
                  type="time"
                  value={newMealEnd}
                  onChange={(e) => setNewMealEnd(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-800 bg-slate-950 text-slate-100 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none font-mono"
                />
              </div>
              <button
                type="submit"
                className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-extrabold py-2 px-4 rounded-xl text-sm flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md shadow-emerald-500/15"
              >
                <Plus className="h-4 w-4" />
                افزودن وعده غذایی
              </button>
            </form>

            {/* List of meals */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {meals.map(meal => {
                const isDefault = ['breakfast', 'lunch', 'dinner'].includes(meal.id);
                const isEditing = editingMealTimeId === meal.id;

                if (isEditing) {
                  return (
                    <div
                      key={meal.id}
                      className="p-4 rounded-xl border border-emerald-500/50 bg-slate-950 shadow-xl flex flex-col justify-between"
                    >
                      <div className="space-y-3">
                        <div>
                          <label className="block text-slate-400 text-[10px] mb-1 font-bold">نام وعده</label>
                          <input
                            type="text"
                            value={editingMealName}
                            onChange={(e) => setEditingMealName(e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-100 text-xs focus:ring-1 focus:ring-emerald-500 outline-none font-bold"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-slate-400 text-[10px] mb-1 font-bold">ساعت شروع</label>
                            <input
                              type="time"
                              value={editingMealStart}
                              onChange={(e) => setEditingMealStart(e.target.value)}
                              className="w-full px-2 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-100 text-xs focus:ring-1 focus:ring-emerald-500 outline-none font-mono text-center font-bold"
                            />
                          </div>
                          <div>
                            <label className="block text-slate-400 text-[10px] mb-1 font-bold">ساعت پایان</label>
                            <input
                              type="time"
                              value={editingMealEnd}
                              onChange={(e) => setEditingMealEnd(e.target.value)}
                              className="w-full px-2 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-100 text-xs focus:ring-1 focus:ring-emerald-500 outline-none font-mono text-center font-bold"
                            />
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-slate-900">
                        <button
                          type="button"
                          onClick={() => setEditingMealTimeId(null)}
                          className="px-2.5 py-1 text-slate-400 hover:text-slate-200 bg-slate-900 border border-slate-800 rounded-lg text-xs font-bold transition-all cursor-pointer"
                        >
                          انصراف
                        </button>
                        <button
                          type="button"
                          onClick={() => saveMealEdit(meal.id)}
                          className="px-3 py-1 bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-slate-950 rounded-lg text-xs font-extrabold flex items-center gap-1 transition-all cursor-pointer"
                        >
                          <Check className="h-3.5 w-3.5 stroke-[3px]" />
                          <span>ذخیره</span>
                        </button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={meal.id}
                    className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${
                      meal.isActive
                        ? 'bg-slate-950/60 border-slate-800 hover:border-slate-700 shadow-xl'
                        : 'bg-slate-950/20 border-slate-900 opacity-40'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2">
                        <div className={`p-2 rounded-lg ${meal.isActive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-500'}`}>
                          <Coffee className="h-4 w-4" />
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-100 text-sm">{meal.name}</h4>
                          <span className="text-[10px] text-slate-500">
                            {isDefault ? 'پیش‌فرض سیستم' : 'تعریف‌شده توسط کاربر'}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1.5">
                        {!isReadOnly && (
                          <button
                            type="button"
                            onClick={() => startEditingMeal(meal)}
                            className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg cursor-pointer transition-all"
                            title="ویرایش وعده"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                        )}

                        {!isReadOnly && (
                          <button
                            type="button"
                            onClick={() => handleToggleMeal(meal.id)}
                            className={`text-xs px-2 py-1 rounded-md font-semibold cursor-pointer transition-all ${
                              meal.isActive
                                ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                                : 'bg-slate-850 text-slate-400 hover:bg-slate-800'
                            }`}
                          >
                            {meal.isActive ? 'فعال' : 'غیرفعال'}
                          </button>
                        )}
                        
                        {isReadOnly && (
                          <span className={`text-xs px-2 py-1 rounded-md font-bold ${meal.isActive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-900 text-slate-500'}`}>
                            {meal.isActive ? 'فعال' : 'غیرفعال'}
                          </span>
                        )}
                        
                        {!isDefault && !isReadOnly && (
                          <button
                            type="button"
                            onClick={() => handleDeleteMeal(meal.id)}
                            className="p-1.5 text-rose-400 hover:bg-rose-500/10 rounded-lg cursor-pointer transition-all"
                            title="حذف وعده"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono">
                      <Clock className="h-3.5 w-3.5 text-slate-500" />
                      <span>ساعات توزیع:</span>
                      <span>{toPersianDigits(meal.startTime)}</span>
                      <span>تا</span>
                      <span>{toPersianDigits(meal.endTime)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* SUBTAB 2: CUSTOM FIELDS */}
        {activeSubTab === 2 && (
          <div className="space-y-6">
            <div className="bg-indigo-500/10 border border-indigo-500/20 text-slate-300 p-4 rounded-xl text-xs sm:text-sm flex items-start gap-3">
              <PlusCircle className="h-5 w-5 text-indigo-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-indigo-400 mb-1">امکان تعریف مورد ورودی جدید (انعطاف‌پذیری سیستم)</p>
                <p className="leading-relaxed text-slate-300">
                  اگر مایلید آمار روزانه دیگری (به جز ۷ آمار استاندارد مثل آمار اداری، دستور پخت، بیرون‌بر و ...) را ثبت و پیگیری کنید، در این بخش آن را تعریف کنید. این پارامتر فوراً به فرم ثبت فعالیت روزانه افزوده شده و در گزارشات درج می‌گردد.
                </p>
              </div>
            </div>

            {/* Custom Field Creation Form */}
            <form onSubmit={handleAddCustomField} className="bg-slate-950/40 p-4 rounded-xl border border-slate-800 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div>
                <label className="block text-slate-300 text-xs font-semibold mb-1.5">عنوان فارسی فیلد</label>
                <input
                  type="text"
                  placeholder="مثال: پرسنل کارفرما، میهمان ویژه"
                  value={fieldLabel}
                  onChange={(e) => setFieldLabel(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-800 bg-slate-950 text-slate-100 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-slate-300 text-xs font-semibold mb-1.5">شناسه انگلیسی (یکتا)</label>
                <input
                  type="text"
                  placeholder="مثال: employer_staff"
                  value={fieldName}
                  onChange={(e) => setFieldName(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                  className="w-full px-3 py-2 border border-slate-800 bg-slate-950 text-slate-100 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none font-mono"
                  required
                />
              </div>
              <div>
                <label className="block text-slate-300 text-xs font-semibold mb-1.5">نوع داده ورودی</label>
                <select
                  value={fieldType}
                  onChange={(e) => setFieldType(e.target.value as 'number' | 'text')}
                  className="w-full px-3 py-2 border border-slate-800 bg-slate-950 text-slate-100 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                >
                  <option value="number" className="bg-slate-950 text-slate-100">عددی (برای محاسبات آماری)</option>
                  <option value="text" className="bg-slate-950 text-slate-100">متنی (توضیحی)</option>
                </select>
              </div>
              <button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold py-2 px-4 rounded-xl text-sm flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md shadow-indigo-600/15"
              >
                <Plus className="h-4 w-4" />
                افزودن پارامتر جدید
              </button>
            </form>

            {/* List of Custom Fields */}
            <div className="space-y-3">
              <h4 className="font-bold text-slate-200 text-sm">پارامترهای اضافه شده فعلی:</h4>
              
              {customFields.length === 0 ? (
                <p className="text-slate-500 text-xs italic">هنوز پارامتر شخصی‌سازی شده‌ای تعریف نشده است.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {customFields.map(field => (
                    <div key={field.id} className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 shadow-sm flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="bg-indigo-500/10 text-indigo-400 text-xs font-bold px-2 py-1 rounded-lg border border-indigo-500/20">
                          {field.type === 'number' ? 'عددی' : 'متنی'}
                        </span>
                        <div>
                          <p className="font-bold text-slate-100 text-sm">{field.label}</p>
                          <p className="text-[10px] text-slate-500 font-mono mt-0.5">کلید ذخیره‌سازی: {field.name}</p>
                        </div>
                      </div>

                      {!isReadOnly && (
                        <button
                          onClick={() => handleDeleteCustomField(field.id)}
                          className="p-1.5 text-rose-400 hover:bg-rose-500/10 rounded-lg cursor-pointer transition-all"
                          title="حذف پارامتر"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 3: Contract settings and signature boxes */}
        {activeSubTab === 3 && (
          <div className="space-y-6" id="signatures-settings-tab">
            
            {/* Contractor & Supervisor Information Card */}
            <div className="bg-[#111a2e] border border-slate-800 rounded-2xl p-6 shadow-sm">
              <h3 className="font-bold text-slate-100 text-sm mb-4 flex items-center gap-2">
                <Shield className="h-4 w-4 text-emerald-500" />
                تعریف اطلاعات پایه قرارداد پروژه
              </h3>
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div>
                  <label className="block text-slate-300 text-xs font-semibold mb-2">نام پیمانکار محترم رستوران</label>
                  <input
                    type="text"
                    value={systemSettings.contractorName}
                    onChange={(e) => handleUpdateContractorName(e.target.value)}
                    disabled={isReadOnly}
                    placeholder="مثال: شرکت کترینگ خلیج فارس"
                    className="w-full px-3 py-2 border border-slate-850 bg-slate-950 text-slate-100 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">نام شخص حقوقی یا حقیقی طرف قرارداد که غذا را طبخ و تحویل می‌نماید.</p>
                </div>

                <div>
                  <label className="block text-slate-300 text-xs font-semibold mb-2">نام سرپرست خدمات کارگاه</label>
                  <input
                    type="text"
                    value={systemSettings.supervisorName}
                    onChange={(e) => handleUpdateSupervisorName(e.target.value)}
                    disabled={isReadOnly}
                    placeholder="مثال: مهندس رضوانی"
                    className="w-full px-3 py-2 border border-slate-850 bg-slate-950 text-slate-100 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">نام ناظر مقیم کارفرما که آمار روزانه را تایید نهایی می‌کند.</p>
                </div>

                <div className="lg:border-r lg:border-slate-800/40 lg:pr-6">
                  <label className="block text-slate-300 text-xs font-semibold mb-2">لوگوی اختصاصی شرکت</label>
                  
                  {systemSettings.companyLogo ? (
                    <div className="flex flex-col items-center gap-3 bg-slate-950 p-4 rounded-xl border border-slate-850">
                      <div className="w-24 h-16 bg-white p-1.5 rounded-lg flex items-center justify-center overflow-hidden">
                        <img
                          src={systemSettings.companyLogo}
                          alt="Company Logo Preview"
                          className="max-w-full max-h-full object-contain"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      {!isReadOnly ? (
                        <button
                          type="button"
                          onClick={handleRemoveLogo}
                          className="px-3 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-[11px] font-bold rounded-lg border border-rose-500/20 cursor-pointer transition-all flex items-center gap-1"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span>حذف لوگو</span>
                        </button>
                      ) : (
                        <span className="text-[10px] text-slate-500 font-bold">نمای کلی لوگو</span>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-800 hover:border-slate-700 bg-slate-950/40 p-4 rounded-xl h-24 transition-all relative">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        disabled={isReadOnly}
                        className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed"
                        id="logo-file-input"
                      />
                      <Upload className="h-5 w-5 text-slate-500 mb-1" />
                      <span className="text-[10px] text-slate-400 font-bold">آپلود دستی لوگو (PNG, JPG)</span>
                      <span className="text-[8px] text-slate-500">حداکثر حجم مجاز: ۵۰۰ کیلوبایت</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Signature Management Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Add New Signature Form */}
              <div className="bg-slate-950/40 p-5 rounded-2xl border border-slate-800">
                <h3 className="font-bold text-slate-100 text-xs sm:text-sm mb-4 flex items-center gap-1.5">
                  <PlusCircle className="h-4 w-4 text-emerald-500" />
                  تعریف باکس امضای جدید
                </h3>

                <form onSubmit={handleAddSignature} className="space-y-4">
                  <div>
                    <label className="block text-slate-300 text-xs font-semibold mb-1.5">سمت / عنوان امضا کننده</label>
                    <input
                      type="text"
                      value={newSigTitle}
                      onChange={(e) => setNewSigTitle(e.target.value)}
                      disabled={isReadOnly}
                      placeholder="مثال: سرپرست کارگاه"
                      className="w-full px-3 py-2 border border-slate-800 bg-slate-950 text-slate-100 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 text-xs font-semibold mb-1.5">نام و نام خانوادگی امضا کننده</label>
                    <input
                      type="text"
                      value={newSigName}
                      onChange={(e) => setNewSigName(e.target.value)}
                      disabled={isReadOnly}
                      placeholder="مثال: مهندس حسینی"
                      className="w-full px-3 py-2 border border-slate-800 bg-slate-950 text-slate-100 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isReadOnly}
                    className="w-full bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 disabled:opacity-50 text-slate-950 font-extrabold text-xs py-2.5 rounded-xl transition-all shadow-md shadow-emerald-500/10 cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Plus className="h-4 w-4" />
                    <span>افزودن باکس امضا</span>
                  </button>
                </form>
              </div>

              {/* Existing Signatures List */}
              <div className="lg:col-span-2 space-y-4">
                <h4 className="font-bold text-slate-100 text-xs sm:text-sm mb-1">باکس‌های امضا جهت درج در پایین گزارشات</h4>
                <p className="text-[11px] text-slate-400">باکس‌های فعال ذیل، به ترتیب در انتهای فایل‌های خروجی PDF و اکسل به عنوان محل امضا چاپ خواهند شد.</p>
                
                <div className="space-y-3">
                  {systemSettings.signatures.map((sig) => {
                    const isDefault = ['sig_1', 'sig_2'].includes(sig.id) || ['سرپرست خدمات', 'پیمانکار رستوران'].includes(sig.title);
                    return (
                      <div
                        key={sig.id}
                        className={`p-4 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                          sig.isVisible
                            ? 'bg-slate-900/60 border-slate-800'
                            : 'bg-slate-950/20 border-slate-900 opacity-60'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg bg-slate-950 text-slate-400 border border-slate-850 shrink-0`}>
                            <UserCheck className="h-4 w-4 text-emerald-500" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-100 text-xs sm:text-sm">
                                {sig.title}
                              </span>
                              {isDefault && (
                                <span className="bg-emerald-500/15 text-emerald-400 text-[9px] font-bold px-1.5 py-0.5 rounded border border-emerald-500/30">
                                  سیستمی
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-400 block mt-0.5 font-semibold">
                              نام امضاکننده: {sig.name}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 sm:mr-auto">
                          {/* Toggle visibility */}
                          <button
                            type="button"
                            onClick={() => handleToggleSignatureVisibility(sig.id)}
                            disabled={isReadOnly}
                            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                              sig.isVisible
                                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20'
                                : 'bg-slate-950 border-slate-850 text-slate-500 hover:text-slate-400'
                            }`}
                          >
                            {sig.isVisible ? (
                              <>
                                <ToggleRight className="h-4.5 w-4.5" />
                                <span>نمایش فعال</span>
                              </>
                            ) : (
                              <>
                                <ToggleLeft className="h-4.5 w-4.5" />
                                <span>غیرفعال (عدم نمایش)</span>
                              </>
                            )}
                          </button>

                          {/* Delete custom signatures */}
                          {!isDefault && !isReadOnly && (
                            <button
                              type="button"
                              onClick={() => handleDeleteSignature(sig.id)}
                              className="p-1.5 rounded-lg border bg-rose-500/5 hover:bg-rose-500/15 border-rose-500/20 hover:border-rose-500/40 text-rose-400 cursor-pointer transition-all"
                              title="حذف دائمی باکس امضا"
                            >
                              <Trash2 className="h-4.5 w-4.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>

            {/* Desktop App Download Card */}
            <div className="bg-gradient-to-br from-indigo-950 to-slate-950 border border-indigo-500/20 rounded-2xl p-6 shadow-lg shadow-indigo-500/5 mt-6">
              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="space-y-2 text-right">
                  <span className="bg-indigo-500/20 text-indigo-300 text-[10px] font-bold px-2.5 py-1 rounded-full border border-indigo-500/30">
                    نسخه دسکتاپ آفلاین (تک‌کلیک)
                  </span>
                  <h3 className="font-extrabold text-slate-100 text-base flex items-center gap-2">
                    دانلود برنامه آماده نصب و اجرای آفلاین ویندوز
                  </h3>
                  <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
                    با دانلود این فایل اجرایی (EXE)، می‌توانید کل سیستم کترینگ بوشهر را بدون نیاز به اینترنت و به صورت کاملاً مستقل روی سیستم‌های کارگاه یا کانکس کترینگ اجرا کنید. تمامی اطلاعات به صورت آفلاین بر روی سیستم شما محفوظ خواهند ماند.
                  </p>
                  <p className="text-[10px] text-slate-500 font-semibold">
                    حجم فایل: حدود ۳۷ مگابایت | نسخه مستقل ویندوز ۶۴ بیتی بدون نیاز به پیش‌نیاز یا نصب ملزومات اضافه
                  </p>
                </div>
                
                <a
                  href="/boushehr_catering.exe"
                  download="boushehr_catering.exe"
                  className="bg-indigo-500 hover:bg-indigo-600 active:bg-indigo-700 text-slate-950 font-extrabold text-xs px-6 py-3 rounded-xl transition-all shadow-md shadow-indigo-500/20 cursor-pointer flex items-center gap-2 shrink-0 select-none"
                >
                  <Upload className="h-4.5 w-4.5 rotate-180" />
                  <span>دانلود نسخه ویندوز (boushehr_catering.exe)</span>
                </a>
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
