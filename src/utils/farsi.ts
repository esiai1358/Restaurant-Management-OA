/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { toJalaali, toGregorian, jalaaliMonthLength } from 'jalaali-js';
import { DayOfWeek, Meal, WeeklyMenu, DailyLog } from '../types';

// Convert Gregorian Date to Jalali (Shamsi) Date
export function gregorianToJalali(gy: number, gm: number, gd: number): { jy: number; jm: number; jd: number } {
  return toJalaali(gy, gm, gd);
}

// Convert Jalali (Shamsi) Date to Gregorian Date
export function jalaliToGregorian(jy: number, jm: number, jd: number): { gy: number; gm: number; gd: number } {
  return toGregorian(jy, jm, jd);
}

// Get number of days in a Jalaali month
export function getJalaaliMonthLength(jy: number, jm: number): number {
  return jalaaliMonthLength(jy, jm);
}

// Get current date string (YYYY-MM-DD) in Iran timezone (Asia/Tehran)
export function getIranLocalDateStr(): string {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Tehran',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour12: false
  });
  const parts = formatter.formatToParts(new Date());
  const year = parts.find(p => p.type === 'year')?.value || '2026';
  const month = parts.find(p => p.type === 'month')?.value || '07';
  const day = parts.find(p => p.type === 'day')?.value || '10';
  return `${year}-${month}-${day}`;
}

// Format date string (YYYY-MM-DD) to Jalali string (e.g. 1405/04/18)
export function formatToJalali(dateStr: string, withMonthName = false): string {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  if (isNaN(y) || isNaN(m) || isNaN(d)) return dateStr;
  const { jy, jm, jd } = gregorianToJalali(y, m, d);
  
  if (withMonthName) {
    return `${jd} ${getJalaliMonthName(jm)} ${jy}`;
  }
  
  return `${jy}/${String(jm).padStart(2, '0')}/${String(jd).padStart(2, '0')}`;
}

export function getJalaliMonthName(monthNum: number): string {
  const months = [
    'فروردین', 'اردیبهشت', 'خرداد',
    'تیر', 'مرداد', 'شهریور',
    'مهر', 'آبان', 'آذر',
    'دی', 'بهمن', 'اسفند'
  ];
  return months[monthNum - 1] || '';
}

// Convert English numbers to Persian/Farsi numbers
export function toPersianDigits(num: number | string): string {
  if (num === null || num === undefined) return '';
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return String(num).replace(/[0-9]/g, (w) => persianDigits[parseInt(w)]);
}

// Days of week mapping and helper
export const DAYS_OF_WEEK_MAP: Record<DayOfWeek, { name: string; index: number }> = {
  saturday: { name: 'شنبه', index: 0 },
  sunday: { name: 'یکشنبه', index: 1 },
  monday: { name: 'دوشنبه', index: 2 },
  tuesday: { name: 'سه شنبه', index: 3 },
  wednesday: { name: 'چهارشنبه', index: 4 },
  thursday: { name: 'پنجشنبه', index: 5 },
  friday: { name: 'جمعه', index: 6 },
};

export const DAYS_ORDERED: DayOfWeek[] = ['saturday', 'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday'];

export function getDayNameInPersian(day: DayOfWeek): string {
  return DAYS_OF_WEEK_MAP[day]?.name || day;
}

export function getDayOfWeekFromGregorian(dateStr: string): DayOfWeek {
  const date = new Date(dateStr);
  const dayIndex = date.getDay(); // 0 is Sunday, 6 is Saturday
  // Convert standard JS getDay() [0=Sun, 1=Mon, ..., 6=Sat] to DayOfWeek string
  const jsDays: DayOfWeek[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  return jsDays[dayIndex];
}

// Default meals
export const DEFAULT_MEALS: Meal[] = [
  { id: 'breakfast', name: 'صبحانه', startTime: '06:00', endTime: '08:30', isActive: true },
  { id: 'lunch', name: 'ناهار', startTime: '12:00', endTime: '14:30', isActive: true },
  { id: 'dinner', name: 'شام', startTime: '19:30', endTime: '22:00', isActive: true },
];

// Default weekly menu (typical Iranian workshop menu)
export const DEFAULT_WEEKLY_MENU: WeeklyMenu[] = [
  // Saturday
  { id: 'm1', day: 'saturday', mealId: 'breakfast', foodName: 'نیمرو با پنیر و چای' },
  { id: 'm2', day: 'saturday', mealId: 'lunch', foodName: 'چلو کباب کوبیده با گوجه' },
  { id: 'm3', day: 'saturday', mealId: 'dinner', foodName: 'خوراک مرغ و قارچ' },
  
  // Sunday
  { id: 'm4', day: 'sunday', mealId: 'breakfast', foodName: 'املت گوجه فرنگی با نان تازه' },
  { id: 'm5', day: 'sunday', mealId: 'lunch', foodName: 'قرمه سبزی با برنج ایرانی' },
  { id: 'm6', day: 'sunday', mealId: 'dinner', foodName: 'عدس پلو با کشمش و خرما' },

  // Monday
  { id: 'm7', day: 'monday', mealId: 'breakfast', foodName: 'لوبیا گرم با قارچ' },
  { id: 'm8', day: 'monday', mealId: 'lunch', foodName: 'زرشک پلو با مرغ مجلسی' },
  { id: 'm9', day: 'monday', mealId: 'dinner', foodName: 'خوراک لوبیا سبز با گوشت چرخکرده' },

  // Tuesday
  { id: 'm10', day: 'tuesday', mealId: 'breakfast', foodName: 'تخم مرغ آبپز با کره و عسل' },
  { id: 'm11', day: 'tuesday', mealId: 'lunch', foodName: 'قیمه بادمجان با برنج' },
  { id: 'm12', day: 'tuesday', mealId: 'dinner', foodName: 'دمپختک با گوشت چرخ کرده' },

  // Wednesday
  { id: 'm13', day: 'wednesday', mealId: 'breakfast', foodName: 'حلیم معجون با شکر و دارچین' },
  { id: 'm14', day: 'wednesday', mealId: 'lunch', foodName: 'چلو جوجه کباب زعفرانی' },
  { id: 'm15', day: 'wednesday', mealId: 'dinner', foodName: 'ماکارونی با گوشت و ته دیگ سیب زمینی' },

  // Thursday
  { id: 'm16', day: 'thursday', mealId: 'breakfast', foodName: 'پنیر، گردو، کره و مربای آلبالو' },
  { id: 'm17', day: 'thursday', mealId: 'lunch', foodName: 'چلو ماهی سرخ شده با سبزی پلو' },
  { id: 'm18', day: 'thursday', mealId: 'dinner', foodName: 'سوپ جو غلیظ با کتلت گوشت' },

  // Friday
  { id: 'm19', day: 'friday', mealId: 'breakfast', foodName: 'املت قارچ و ژامبون' },
  { id: 'm20', day: 'friday', mealId: 'lunch', foodName: 'کرفس پلو با گوشت گوسفندی' },
  { id: 'm21', day: 'friday', mealId: 'dinner', foodName: 'سالاد الویه با نان باگت' },
];

// Generates simulated daily logs for testing monthly reports
export function generateSampleDailyLogs(): DailyLog[] {
  const logs: DailyLog[] = [];
  const today = new Date(getIranLocalDateStr()); // Anchor date from current Iran Local Time
  
  // Create logs for the past 45 days for all active meals
  for (let i = 45; i >= 0; i--) {
    const logDate = new Date(today);
    logDate.setDate(today.getDate() - i);
    const dateStr = logDate.toISOString().split('T')[0];
    
    // Skip Fridays for lunch/dinner sometimes (weekend lower counts)
    const dayName = getDayOfWeekFromGregorian(dateStr);
    const isFriday = dayName === 'friday';
    
    DEFAULT_MEALS.forEach((meal) => {
      // Create some variance based on meal type
      let basePersonnel = 240; // Default project personnel count
      if (isFriday) {
        basePersonnel = 80; // Fewer people on Fridays
      }
      
      const workshopPersonnel = basePersonnel + Math.floor(Math.sin(i / 3) * 15) + Math.floor(Math.random() * 8);
      
      let officeAnnounced = 0;
      let cookingInstruction = 0;
      let contractorCooked = 0;
      let receivedInRestaurant = 0;
      let forgottenTicket = 0;
      let takeaways = 0;
      let systemOutput = 0;
      
      if (meal.id === 'breakfast') {
        officeAnnounced = Math.floor(workshopPersonnel * 0.85);
        cookingInstruction = officeAnnounced + 5;
        contractorCooked = cookingInstruction;
        receivedInRestaurant = Math.floor(officeAnnounced * 0.9);
        forgottenTicket = Math.floor(Math.random() * 6);
        takeaways = Math.floor(Math.random() * 10) + 5;
        systemOutput = receivedInRestaurant + forgottenTicket + takeaways - Math.floor(Math.random() * 3);
      } else if (meal.id === 'lunch') {
        officeAnnounced = Math.floor(workshopPersonnel * 0.95);
        cookingInstruction = officeAnnounced + 8;
        contractorCooked = cookingInstruction + (Math.random() > 0.8 ? 5 : 0);
        receivedInRestaurant = Math.floor(officeAnnounced * 0.94);
        forgottenTicket = Math.floor(Math.random() * 12) + 2;
        takeaways = Math.floor(Math.random() * 15) + 12;
        systemOutput = receivedInRestaurant + forgottenTicket + takeaways - Math.floor(Math.random() * 4);
      } else { // dinner
        officeAnnounced = Math.floor(workshopPersonnel * 0.75);
        cookingInstruction = officeAnnounced + 5;
        contractorCooked = cookingInstruction - (Math.random() > 0.9 ? 3 : 0);
        receivedInRestaurant = Math.floor(officeAnnounced * 0.88);
        forgottenTicket = Math.floor(Math.random() * 4);
        takeaways = Math.floor(Math.random() * 8) + 2;
        systemOutput = receivedInRestaurant + forgottenTicket + takeaways;
      }
      
      logs.push({
        id: `${dateStr}_${meal.id}`,
        date: dateStr,
        mealId: meal.id,
        workshopPersonnel,
        officeAnnounced,
        cookingInstruction,
        contractorCooked,
        receivedInRestaurant,
        forgottenTicket,
        takeaways,
        systemOutput,
        customValues: {},
        note: i === 0 ? 'ثبت روز جاری بدون مشکل فنی انجام گردید.' : undefined,
        updatedAt: new Date().toISOString()
      });
    });
  }
  
  return logs;
}
