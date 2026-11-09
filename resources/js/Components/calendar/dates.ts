/** Small date helpers on local "YYYY-MM-DD" strings (no timezone shifting; the server sends Asia/Karachi local times). */
const pad = (n: number) => String(n).padStart(2, '0');

export const toIso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const parseIso = (iso: string) => {
    const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
    return new Date(y, m - 1, d);
};
export const addDays = (iso: string, days: number) => {
    const d = parseIso(iso);
    d.setDate(d.getDate() + days);
    return toIso(d);
};
export const addMonths = (iso: string, months: number) => {
    const d = parseIso(iso);
    const day = d.getDate();
    d.setDate(1);
    d.setMonth(d.getMonth() + months);
    d.setDate(Math.min(day, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()));
    return toIso(d);
};
/** Weeks start on Monday, like the court diary. */
export const startOfWeek = (iso: string) => {
    const d = parseIso(iso);
    return addDays(iso, -((d.getDay() + 6) % 7));
};
export const startOfMonth = (iso: string) => `${iso.slice(0, 7)}-01`;
export const endOfMonth = (iso: string) => {
    const d = parseIso(startOfMonth(iso));
    return toIso(new Date(d.getFullYear(), d.getMonth() + 1, 0));
};
export const minutesOf = (dateTime: string) => {
    const [h, m] = dateTime.slice(11, 16).split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
};
export const dayOf = (dateTime: string) => dateTime.slice(0, 10);

/** Visible range for each view; the month grid shows whole weeks. */
export function rangeFor(view: string, date: string): { start: string; end: string } {
    switch (view) {
        case 'day':
            return { start: date, end: date };
        case 'week':
            return { start: startOfWeek(date), end: addDays(startOfWeek(date), 6) };
        case 'agenda':
            return { start: date, end: addDays(date, 30) };
        default: {
            const start = startOfWeek(startOfMonth(date));
            return { start, end: addDays(start, 41) };
        }
    }
}

export function step(view: string, date: string, direction: 1 | -1): string {
    if (view === 'day') return addDays(date, direction);
    if (view === 'week') return addDays(date, 7 * direction);
    if (view === 'agenda') return addDays(date, 30 * direction);
    return addMonths(date, direction);
}

const intl = (locale: string) => (locale === 'ur' ? 'ur-PK-u-nu-latn' : 'en-PK');
export const fmt = (iso: string, locale: string, options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(intl(locale), options).format(iso.length > 10 ? new Date(iso) : parseIso(iso));
export const fmtTime = (dateTime: string, locale: string) => fmt(dateTime, locale, { hour: 'numeric', minute: '2-digit' });
/** "Mon 3 Nov, 9:30 am" or "Mon 3 Nov" for all-day items. */
export const fmtWhen = (dateTime: string, locale: string, allDay = false) =>
    fmt(dateTime, locale, allDay ? { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' } : { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
