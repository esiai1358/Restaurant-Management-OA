/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Meal, WeeklyMenu, DayOfWeek, CustomField } from '../types';
import { DAYS_ORDERED, getDayNameInPersian, toPersianDigits } from '../utils/farsi';
import { Plus, Trash2, Edit2, Check, Clock, Save, Coffee, Settings2, PlusCircle, AlertCircle } from 'lucide-react';

interface ConfigurationPanelProps {
  meals: Meal[];
  setMeals: React.Dispatch<React.SetStateAction<Meal[]>>;
  weeklyMenu: WeeklyMenu[];
  setWeeklyMenu: React.Dispatch<React.SetStateAction<WeeklyMenu[]>>;
  customFields: CustomField[];
  setCustomFields: React.Dispatch<React.SetStateAction<CustomField[]>>;
  currentRole?: 'admin' | 'supervisor' | 'guest';
}

export default function ConfigurationPanel({
  meals,
  setMeals,
  weeklyMenu,
  setWeeklyMenu,
  customFields,
  setCustomFields,
  currentRole = 'admin',
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

  const isReadOnly = currentRole !== 'admin';

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
        </div>
      </div>

      <div className="p-6">
        
        {isReadOnly && (
          <div className="flex items-start gap-3 bg-amber-500/10 border border-amber-500/20 text-amber-400 p-4 rounded-xl text-xs sm:text-sm mb-6 shadow-sm">
            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5 text-amber-500" />
            <div>
              <p className="font-bold mb-1">دسترسی محدود (فقط خواندنی)</p>
              <p className="leading-relaxed text-slate-300">
                شما با نقش <span className="font-extrabold text-amber-300">«{currentRole === 'supervisor' ? 'سرپرست خدمات' : 'مهمان'}»</span> وارد شده‌اید. تغییرات در پیکربندی پایه رستوران (برنامه غذایی هفتگی، وعده‌ها و پارامترها) منحصراً متعلق به نقش <span className="font-extrabold text-slate-100">«مدیر سیستم»</span> می‌باشد.
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

      </div>
    </div>
  );
}
