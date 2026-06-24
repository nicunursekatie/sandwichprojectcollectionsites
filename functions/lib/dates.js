/** @typedef {import('firebase-admin/firestore').Firestore} Firestore */

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function formatDateYYYYMMDD(date) {
  const pad = (value) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function getUpcomingWednesday(referenceDate = new Date()) {
  const today = new Date(referenceDate);
  today.setHours(0, 0, 0, 0);
  const dayOfWeek = today.getDay();
  const daysUntilWednesday = (3 - dayOfWeek + 7) % 7;
  const upcoming = new Date(today);
  upcoming.setDate(today.getDate() + daysUntilWednesday);
  return upcoming;
}

function getWednesdaysInMonth(referenceDate = new Date()) {
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth();
  const wednesdays = [];
  const cursor = new Date(year, month, 1);
  while (cursor.getMonth() === month) {
    if (cursor.getDay() === 3) {
      wednesdays.push(formatDateYYYYMMDD(cursor));
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return wednesdays;
}

function getWednesdaysInUpcomingMonth(referenceDate = new Date()) {
  const nextMonth = new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, 1);
  return getWednesdaysInMonth(nextMonth);
}

function formatDisplayDate(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'America/New_York',
  });
}

function getMonthLabel(referenceDate = new Date()) {
  const nextMonth = new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, 1);
  return nextMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'America/New_York' });
}

module.exports = {
  formatDateYYYYMMDD,
  formatDisplayDate,
  getMonthLabel,
  getUpcomingWednesday,
  getWednesdaysInMonth,
  getWednesdaysInUpcomingMonth,
  MS_PER_DAY,
};
