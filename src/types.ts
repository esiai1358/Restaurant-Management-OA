/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type DayOfWeek = 'saturday' | 'sunday' | 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday';

export interface Meal {
  id: string;
  name: string; // e.g. "صبحانه", "ناهار", "شام"
  startTime: string;
  endTime: string;
  isActive: boolean;
}

export interface WeeklyMenu {
  id: string;
  day: DayOfWeek;
  mealId: string;
  foodName: string;
}

export interface CustomField {
  id: string;
  name: string; // Unique identifier (camelCase)
  label: string; // Persian label
  type: 'number' | 'text';
  category: 'input' | 'output' | 'info';
}

export interface DailyLog {
  id: string; // date_mealId
  date: string; // YYYY-MM-DD
  mealId: string;
  workshopPersonnel: number;
  
  // Base Statistics
  officeAnnounced: number;      // آمار روزانه اعلام شده اداری
  cookingInstruction: number;   // آمار دستور پخت روزانه به پیمانکار
  contractorCooked: number;     // آمار پخت غذا توسط پیمانکار
  receivedInRestaurant: number; // آمار دریافت غذا در رستوران
  forgottenTicket: number;      // آمار دریافت غذا با فیش فراموشی
  takeaways: number;            // آمار دریافت غذا بیرون بر (ثبت گروهی)
  systemOutput: number;         // آمار خروجی سامانه
  
  // Custom Fields (Dynamic Inputs)
  customValues: Record<string, number | string>;
  
  note?: string;
  updatedAt: string;
}

export interface AppUser {
  id: string;
  name: string;
  role: 'admin' | 'supervisor' | 'guest';
  createdAt: string;
  password?: string; // Optional password for users, especially admin
}

export interface SignatureConfig {
  id: string;
  title: string; // e.g. "سرپرست خدمات"
  name: string;  // e.g. "مهندس رضایی"
  isVisible: boolean;
}

export interface SystemSettings {
  contractorName: string;
  supervisorName: string;
  signatures: SignatureConfig[];
  companyLogo?: string; // Base64 representation of the manually uploaded company logo
}

export interface AuditLog {
  id: string;
  timestamp: string; // Shamsi Date and Time (e.g. ۱۴۰۵/۰۴/۱۸ ۱۵:۳۰)
  userId: string;
  userName: string;
  userRole: string;
  action: string; // e.g. "ورود", "خروج", "ثبت داده", "ویرایش داده", "تغییر تنظیمات"
  details: string; // Descriptive details
}

