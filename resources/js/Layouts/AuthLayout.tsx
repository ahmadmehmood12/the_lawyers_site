import { Head, Link } from '@inertiajs/react';
import type { ReactNode } from 'react';
import { Flash } from '@/Components/ui';
import { Logo } from '@/Components/shell/Logo';
import { LanguageSwitcher, ThemeToggle } from '@/Components/shell/Preferences';
import { useT } from '@/lib/i18n';

export default function AuthLayout({ title, description, children, wide }: { title: string; description?: string; children: ReactNode; wide?: boolean }) {
    const t = useT();
    return (
        <>
            <Head title={title}>
                <meta name="robots" content="noindex" />
            </Head>
            <div className="flex min-h-dvh flex-col bg-ivory dark:bg-navy-950">
                <header className="flex items-center justify-between px-4 py-4 sm:px-8">
                    <Link href={route('home')}>
                        <Logo />
                    </Link>
                    <div className="flex items-center gap-1 text-navy-700 dark:text-navy-200">
                        <LanguageSwitcher />
                        <ThemeToggle />
                    </div>
                </header>
                <main className="flex flex-1 items-start justify-center px-4 pt-6 pb-16 sm:items-center sm:pt-0">
                    <div className={wide ? 'w-full max-w-3xl' : 'w-full max-w-md'}>
                        <div className="mb-6 text-center">
                            <h1 className="text-2xl font-semibold text-navy-900 sm:text-3xl dark:text-white">{title}</h1>
                            {description && <p className="mt-2 text-sm text-navy-600 dark:text-navy-400">{description}</p>}
                        </div>
                        <div className="rounded-2xl border border-navy-100 bg-white p-6 shadow-card sm:p-8 dark:border-navy-800 dark:bg-navy-900">{children}</div>
                        <p className="mt-6 text-center text-xs text-navy-500">{t('Your information is encrypted and kept confidential.')}</p>
                    </div>
                </main>
            </div>
            <Flash />
        </>
    );
}
