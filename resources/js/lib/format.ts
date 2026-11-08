/** Locale-aware formatting helpers. Urdu uses ur-PK with Latin digits for legal clarity. */
const intlLocale = (locale: string) => (locale === 'ur' ? 'ur-PK-u-nu-latn' : 'en-PK');

export function formatMoney(amount: number | string | null | undefined, locale = 'en'): string {
    const value = Number(amount ?? 0);
    return new Intl.NumberFormat(intlLocale(locale), { style: 'currency', currency: 'PKR', maximumFractionDigits: 0 }).format(value);
}

export function formatNumber(value: number | string | null | undefined, locale = 'en'): string {
    return new Intl.NumberFormat(intlLocale(locale)).format(Number(value ?? 0));
}

export function formatDate(value: string | null | undefined, locale = 'en', options?: Intl.DateTimeFormatOptions): string {
    if (!value) return '—';
    const date = value.length === 10 ? new Date(`${value}T00:00:00`) : new Date(value);
    return new Intl.DateTimeFormat(intlLocale(locale), options ?? { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
}

export function formatDateTime(value: string | null | undefined, locale = 'en'): string {
    return formatDate(value, locale, { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export function formatTime(value: string | null | undefined, locale = 'en'): string {
    if (!value) return '';
    const [h, m] = value.split(':').map(Number);
    const date = new Date();
    date.setHours(h, m, 0, 0);
    return new Intl.DateTimeFormat(intlLocale(locale), { hour: 'numeric', minute: '2-digit' }).format(date);
}

export function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function todayIso(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
