import { Head, Link, usePage } from '@inertiajs/react';
import { ArrowLeft, Home, LayoutDashboard, Scale } from 'lucide-react';
import { useT } from '@/lib/i18n';
import type { SharedProps } from '@/types';

type Props = { status: number; siteName?: string | null };

const copy: Record<number, { title: string; message: string }> = {
    400: { title: 'Bad request', message: 'The request could not be understood. Please check the link and try again.' },
    401: { title: 'Sign in required', message: 'You need to sign in to open this page.' },
    403: { title: 'Access denied', message: 'Your account does not have permission to view this page.' },
    404: { title: 'Page not found', message: 'The page you are looking for may have moved, been renamed, or no longer exists.' },
    405: { title: 'Method not allowed', message: 'That action is not available from this page.' },
    419: { title: 'Session expired', message: 'Your session has expired for security reasons. Refresh the page and try again.' },
    429: { title: 'Too many requests', message: 'You have made too many requests. Please wait a moment and try again.' },
    500: { title: 'Something went wrong', message: 'We could not complete that request. If it keeps happening, contact support.' },
    503: { title: 'Temporarily unavailable', message: 'The service is being updated. Please try again shortly.' },
};

function fallback(status: number) {
    return status >= 500
        ? { title: 'Something went wrong', message: 'We could not complete that request. Please try again shortly.' }
        : { title: 'Request could not be completed', message: 'Please check the address and try again.' };
}

export default function ErrorShow({ status, siteName }: Props) {
    const t = useT();
    const { auth, app } = usePage().props as unknown as Partial<SharedProps>;
    const name = siteName ?? app?.name ?? 'WakeelDiary';
    const { title, message } = copy[status] ?? fallback(status);
    const dashboard = auth?.user
        ? route(auth.user.account_type === 'client' ? 'portal.dashboard' : auth.user.account_type === 'platform' ? 'admin.dashboard' : 'dashboard')
        : null;

    return (
        <>
            <Head title={`${status}, ${t(title)}`}>
                <meta name="robots" content="noindex, nofollow" />
            </Head>
            <main className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-ivory px-4 py-16 dark:bg-navy-950">
                <div className="pointer-events-none absolute inset-0" aria-hidden>
                    <div className="absolute -top-24 end-[-10%] size-[28rem] rounded-full bg-gold-200/30 blur-3xl dark:bg-gold-700/10" />
                    <div className="absolute -bottom-32 start-[-10%] size-[32rem] rounded-full bg-navy-200/40 blur-3xl dark:bg-navy-800/40" />
                </div>
                <div className="relative w-full max-w-xl text-center">
                    <Link href={route('home')} className="inline-flex items-center gap-2 text-navy-900 dark:text-white" aria-label={name}>
                        <span className="flex size-10 items-center justify-center rounded-lg bg-navy-900 text-gold-300 dark:bg-gold-500 dark:text-navy-950">
                            <Scale className="size-5" strokeWidth={2.2} />
                        </span>
                        <span className="font-serif text-xl font-semibold tracking-tight">{name}</span>
                    </Link>

                    <p className="mt-10 text-7xl font-semibold tracking-tight text-navy-900 tabular-nums sm:text-8xl dark:text-white">{status}</p>
                    <h1 className="mt-3 text-2xl font-semibold text-navy-900 dark:text-white">{t(title)}</h1>
                    <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-navy-600 dark:text-navy-300">{t(message)}</p>

                    <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                        <button
                            type="button"
                            onClick={() => window.history.back()}
                            className="inline-flex h-10 items-center gap-2 rounded-lg bg-white px-4 text-sm font-medium text-navy-800 ring-1 ring-inset ring-navy-200 hover:bg-navy-50 dark:bg-navy-900 dark:text-navy-100 dark:ring-navy-700 dark:hover:bg-navy-800"
                        >
                            <ArrowLeft className="size-4" />
                            {t('Go back')}
                        </button>
                        <Link
                            href={route('home')}
                            className="inline-flex h-10 items-center gap-2 rounded-lg bg-navy-900 px-4 text-sm font-medium text-white hover:bg-navy-800 dark:bg-gold-500 dark:text-navy-950 dark:hover:bg-gold-400"
                        >
                            <Home className="size-4" />
                            {t('Home')}
                        </Link>
                        {dashboard && (
                            <Link
                                href={dashboard}
                                className="inline-flex h-10 items-center gap-2 rounded-lg bg-white px-4 text-sm font-medium text-navy-800 ring-1 ring-inset ring-navy-200 hover:bg-navy-50 dark:bg-navy-900 dark:text-navy-100 dark:ring-navy-700 dark:hover:bg-navy-800"
                            >
                                <LayoutDashboard className="size-4" />
                                {t('Dashboard')}
                            </Link>
                        )}
                    </div>

                    <p className="mt-10 text-xs text-navy-500 dark:text-navy-400">
                        {t('Need help?')} <Link href={route('contact')} className="font-medium text-navy-700 underline underline-offset-2 dark:text-navy-200">{t('Contact support')}</Link>
                    </p>
                </div>
            </main>
        </>
    );
}
