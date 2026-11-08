import { router, usePage } from '@inertiajs/react';
import { Languages, Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/cn';
import type { SharedProps } from '@/types';

/** Switches UI language. Persists on the account when signed in, otherwise in session. Full reload so <html dir> flips. */
export function LanguageSwitcher({ className }: { className?: string }) {
    const { app } = usePage<SharedProps>().props;
    const next = app.locale === 'ur' ? 'en' : 'ur';
    return (
        <button
            type="button"
            onClick={() => router.post(route('locale.update'), { locale: next }, { onSuccess: () => window.location.reload() })}
            className={cn('inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm hover:bg-navy-100 dark:hover:bg-navy-800', className)}
            aria-label="Change language"
        >
            <Languages className="size-4" />
            <span className={next === 'ur' ? 'font-urdu' : ''}>{app.locales[next]}</span>
        </button>
    );
}

export function ThemeToggle({ className }: { className?: string }) {
    const { auth } = usePage<SharedProps>().props;
    const [dark, setDark] = useState(false);
    useEffect(() => setDark(document.documentElement.classList.contains('dark')), []);

    function toggle() {
        const value = dark ? 'light' : 'dark';
        document.documentElement.classList.toggle('dark', !dark);
        setDark(!dark);
        try {
            localStorage.setItem('theme', value);
        } catch {
            /* storage unavailable */
        }
        if (auth.user) router.post(route('theme.update'), { theme: value }, { preserveScroll: true, preserveState: true });
    }

    return (
        <button type="button" onClick={toggle} className={cn('rounded-md p-2 hover:bg-navy-100 dark:hover:bg-navy-800', className)} aria-label="Toggle dark mode">
            {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </button>
    );
}
