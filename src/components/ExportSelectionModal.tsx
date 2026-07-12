/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Check, Square, CheckSquare, Download, Info } from 'lucide-react';

import { Meal } from '../types';

interface ExportSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle: string;
  exportType: 'excel' | 'pdf';
  availableItems: { key: string; label: string; category?: string }[];
  onConfirm: (selectedKeys: string[], selectedMealIds?: string[]) => void;
  meals?: Meal[];
  defaultSelectedMealId?: string;
}

export default function ExportSelectionModal({
  isOpen,
  onClose,
  title,
  subtitle,
  exportType,
  availableItems,
  onConfirm,
  meals,
  defaultSelectedMealId,
}: ExportSelectionModalProps) {
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [selectedMealIds, setSelectedMealIds] = useState<string[]>([]);

  // Set all items selected by default when opened
  useEffect(() => {
    if (isOpen) {
      setSelectedKeys(availableItems.map((item) => item.key));
      if (meals) {
        // Default to the currently active/selected meal if provided, otherwise all
        if (defaultSelectedMealId) {
          setSelectedMealIds([defaultSelectedMealId]);
        } else {
          setSelectedMealIds(meals.filter(m => m.isActive).map(m => m.id));
        }
      }
    }
  }, [isOpen, availableItems, meals, defaultSelectedMealId]);

  if (!isOpen) return null;

  const handleToggle = (key: string) => {
    setSelectedKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const handleSelectAll = () => {
    setSelectedKeys(availableItems.map((item) => item.key));
  };

  const handleDeselectAll = () => {
    setSelectedKeys([]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedKeys.length === 0) {
      alert('لطفاً حداقل یک مورد را جهت درج در گزارش انتخاب کنید.');
      return;
    }
    if (meals && selectedMealIds.length === 0) {
      alert('لطفاً حداقل یک وعده غذایی را جهت گزارش‌گیری انتخاب کنید.');
      return;
    }
    onConfirm(selectedKeys, selectedMealIds);
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" id="export-modal-overlay">
        {/* Backdrop overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
        />

        {/* Modal Box */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 15 }}
          transition={{ type: 'spring', duration: 0.4 }}
          className="relative bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden text-right flex flex-col z-10"
          id="export-modal-box"
          dir="rtl"
        >
          {/* Header */}
          <div className="px-6 py-4 bg-slate-950/60 border-b border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-100 text-base flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${exportType === 'excel' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                {title}
              </h3>
              <p className="text-slate-400 text-xs mt-1">{subtitle}</p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex-1 flex flex-col">
            {/* Info Badge */}
            <div className="px-6 pt-4">
              <div className="bg-slate-950/40 border border-slate-800/80 rounded-xl p-3 flex items-start gap-2.5 text-xs text-slate-400">
                <Info className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                <p>
                  شما می‌توانید انتخاب کنید کدام ستون‌ها یا آیتم‌های آماری در فایل خروجی{' '}
                  <span className="font-bold text-slate-200">
                    {exportType === 'excel' ? 'اکسل (CSV)' : 'گزارش چاپی (PDF)'}
                  </span>{' '}
                  درج شوند. موارد غیرفعال در فایل نهایی اعمال نخواهند شد.
                </p>
              </div>
            </div>

            {/* Meal Selector Section */}
            {meals && meals.length > 0 && (
              <div className="px-6 pt-4">
                <div className="bg-slate-950/20 border border-slate-800 rounded-xl p-4">
                  <label className="block text-slate-300 text-xs font-bold mb-3">
                    وعده‌های غذایی مورد نظر جهت درج در گزارش:
                  </label>
                  <div className="flex flex-wrap gap-2.5">
                    {meals.map((meal) => {
                      const isMealChecked = selectedMealIds.includes(meal.id);
                      return (
                        <button
                          key={meal.id}
                          type="button"
                          onClick={() => {
                            setSelectedMealIds(prev =>
                              prev.includes(meal.id)
                                ? prev.length > 1 ? prev.filter(id => id !== meal.id) : prev
                                : [...prev, meal.id]
                            );
                          }}
                          className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border text-xs font-extrabold transition-all cursor-pointer ${
                            isMealChecked
                              ? 'bg-amber-500/10 border-amber-500/30 text-amber-300 shadow-sm'
                              : 'bg-slate-950/40 border-slate-850 text-slate-400 hover:border-slate-800 hover:text-slate-300'
                          }`}
                        >
                          <div className="shrink-0">
                            {isMealChecked ? (
                              <div className="w-4 h-4 rounded bg-amber-500 flex items-center justify-center">
                                <Check className="h-3 w-3 text-slate-950 stroke-[3px]" />
                              </div>
                            ) : (
                              <div className="w-4 h-4 rounded border-2 border-slate-700 bg-transparent" />
                            )}
                          </div>
                          <span>{meal.name}</span>
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[10px] text-slate-500 mt-2 font-medium">
                    * می‌توانید همزمان یک وعده خاص یا چند وعده (مثلاً ناهار و شام یا هر سه وعده) را تیک بزنید تا به صورت یکجا و ادغام شده گزارش شوند.
                  </p>
                </div>
              </div>
            )}

            {/* Content Area with Checkboxes */}
            <div className="p-6 overflow-y-auto max-h-[350px] space-y-4">
              {/* Quick Select Buttons */}
              <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="text-xs bg-slate-850 hover:bg-slate-850/80 text-emerald-400 font-bold px-3 py-1.5 rounded-lg border border-slate-800 transition-colors cursor-pointer"
                >
                  انتخاب همه گزینه‌ها
                </button>
                <button
                  type="button"
                  onClick={handleDeselectAll}
                  className="text-xs bg-slate-850 hover:bg-slate-850/80 text-slate-400 font-bold px-3 py-1.5 rounded-lg border border-slate-800 transition-colors cursor-pointer"
                >
                  لغو انتخاب همه
                </button>
                <span className="text-[10px] text-slate-500 mr-auto">
                  {selectedKeys.length} از {availableItems.length} مورد انتخاب شده
                </span>
              </div>

              {/* Items Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                {availableItems.map((item) => {
                  const isChecked = selectedKeys.includes(item.key);
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => handleToggle(item.key)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-right transition-all cursor-pointer ${
                        isChecked
                          ? 'bg-emerald-500/5 border-emerald-500/30 text-emerald-300'
                          : 'bg-slate-950/20 border-slate-850 text-slate-400 hover:border-slate-800 hover:text-slate-300'
                      }`}
                    >
                      <div className="shrink-0">
                        {isChecked ? (
                          <div className="w-5.5 h-5.5 rounded-md bg-emerald-500 flex items-center justify-center">
                            <Check className="h-3.5 w-3.5 text-slate-950 stroke-[3px]" />
                          </div>
                        ) : (
                          <div className="w-5.5 h-5.5 rounded-md border-2 border-slate-700 bg-transparent" />
                        )}
                      </div>
                      <div className="text-xs font-bold leading-tight flex-1">
                        {item.label}
                        {item.category && (
                          <span className="block text-[9px] text-slate-500 font-normal mt-0.5">
                            {item.category}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Action Buttons Footer */}
            <div className="px-6 py-4 bg-slate-950/60 border-t border-slate-800 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-slate-800 bg-slate-900 hover:bg-slate-850 text-slate-300 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                انصراف
              </button>
              <button
                type="submit"
                className={`px-5 py-2.5 text-slate-950 font-extrabold rounded-xl text-xs flex items-center gap-1.5 shadow-md transition-all cursor-pointer ${
                  exportType === 'excel'
                    ? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/10'
                    : 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/10'
                }`}
              >
                <Download className="h-4 w-4" />
                <span>تایید و دریافت خروجی</span>
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
