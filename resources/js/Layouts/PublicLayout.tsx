import { Head, Link, usePage } from '@inertiajs/react';
import { Menu, X } from 'lucide-react';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { Flash, LinkButton } from '@/Components/ui';
import { Logo } from '@/Components/shell/Logo';
import { LanguageSwitcher, ThemeToggle } from '@/Components/shell/Preferences';
import { cn } from '@/lib/cn';
import { useT } from '@/lib/i18n';
import type { SharedProps } from '@/types';

export type Seo = { title: string; description?: string; canonical?: string; image?: string; type?: string; jsonLd?: Record<string, unknown> | Record<string, unknown>[] };

export default function PublicLayout({ seo, children }: { seo: Seo; children: ReactNode }) {
    const t = useT();
    const { auth, app } = usePage<SharedProps>().props;
    const [open, setOpen] = useState(false);
    const nav = [
        { label: 'Find a Lawyer', href: route('lawyers.index') },
        { label: 'Law Firms', href: route('firms.index') },
        { label: 'Practice Areas', href: route('specializations.index') },
        { label: 'Legal Articles', href: route('articles.index') },
        { label: 'Pricing', href: route('pricing') },
    ];
    const home = auth.user ? route(auth.user.account_type === 'client' ? 'portal.dashboard' : auth.user.account_type === 'platform' ? 'admin.dashboard' : 'dashboard') : null;

    return (
        <>
            <Head title={seo.title}>
                {seo.description && <meta name="description" content={seo.description} />}
                {seo.canonical && <link rel="canonical" href={seo.canonical} />}
                <meta property="og:title" content={seo.title} />
                {seo.description && <meta property="og:description" content={seo.description} />}
                <meta property="og:type" content={seo.type ?? 'website'} />
                {seo.canonical && <meta property="og:url" content={seo.canonical} />}
                {seo.image && <meta property="og:image" content={seo.image} />}
                <meta property="og:locale" content={app.locale === 'ur' ? 'ur_PK' : 'en_PK'} />
                <meta name="twitter:card" content="summary_large_image" />
                {seo.jsonLd && <script type="application/ld+json">{JSON.stringify(seo.jsonLd)}</script>}
            </Head>
            <div className="flex min-h-dvh flex-col bg-ivory dark:bg-navy-950">
                <header className="sticky top-0 z-40 border-b border-navy-100/80 bg-ivory/95 backdrop-blur dark:border-navy-800 dark:bg-navy-950/95">
                    <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6">
                        <Link href={route('home')} aria-label={app.name}>
                            <Logo />
                        </Link>
                        <nav className="ms-6 hidden items-center gap-1 lg:flex" aria-label={t('Primary')}>
                            {nav.map((item) => (
                                <Link key={item.href} href={item.href} className="rounded-md px-3 py-2 text-sm font-medium whitespace-nowrap text-navy-700 hover:bg-navy-100/70 hover:text-navy-900 dark:text-navy-200 dark:hover:bg-navy-800">
                                    {t(item.label)}
                                </Link>
                            ))}
                        </nav>
                        <div className="flex-1" />
                        <LanguageSwitcher className="hidden text-navy-700 sm:inline-flex dark:text-navy-200" />
                        <ThemeToggle className="hidden text-navy-700 sm:inline-flex dark:text-navy-200" />
                        {home ? (
                            <LinkButton href={home} size="sm">
                                {t('My Dashboard')}
                            </LinkButton>
                        ) : (
                            <div className="hidden items-center gap-2 sm:flex">
                                <LinkButton href={route('login')} variant="ghost" size="sm">
                                    {t('Sign in')}
                                </LinkButton>
                                <LinkButton href={route('register', { type: 'lawyer' })} size="sm">
                                    {t('Join as a Lawyer')}
                                </LinkButton>
                            </div>
                        )}
                        <button type="button" className="rounded-md p-2 lg:hidden" onClick={() => setOpen(!open)} aria-label={t('Open menu')} aria-expanded={open}>
                            {open ? <X className="size-5" /> : <Menu className="size-5" />}
                        </button>
                    </div>
                    {open && (
                        <div className="border-t border-navy-100 px-4 py-3 lg:hidden dark:border-navy-800">
                            <nav className="grid gap-1">
                                {nav.map((item) => (
                                    <Link key={item.href} href={item.href} className="rounded-md px-3 py-2.5 text-sm font-medium text-navy-800 hover:bg-navy-100 dark:text-navy-100 dark:hover:bg-navy-800">
                                        {t(item.label)}
                                    </Link>
                                ))}
                            </nav>
                            <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-navy-100 pt-3 dark:border-navy-800">
                                <LanguageSwitcher />
                                <ThemeToggle />
                                {!auth.user && (
                                    <>
                                        <LinkButton href={route('login')} variant="secondary" size="sm">
                                            {t('Sign in')}
                                        </LinkButton>
                                        <LinkButton href={route('register', { type: 'lawyer' })} size="sm">
                                            {t('Join as a Lawyer')}
                                        </LinkButton>
                                    </>
                                )}
                            </div>
                        </div>
                    )}
                </header>
                <main className="flex-1">{children}</main>
                <Footer />
            </div>
            <Flash />
        </>
    );
}

function Footer() {
    const t = useT();
    const columns = [
        { title: 'For Clients', links: [['Find a Lawyer', route('lawyers.index')], ['Law Firms', route('firms.index')], ['Practice Areas', route('specializations.index')], ['Legal Resources', route('resources')]] },
        { title: 'For Lawyers', links: [['Join as a Lawyer', route('register', { type: 'lawyer' })], ['Register a Law Firm', route('register', { type: 'firm' })], ['Pricing', route('pricing')], ['Legal Articles', route('articles.index')]] },
        { title: 'Company', links: [['About', route('about')], ['Contact', route('contact')], ['FAQs', route('faqs')], ['Terms of Service', route('terms')], ['Privacy Policy', route('privacy')]] },
    ];
    return (
        <footer className="bg-navy-950 text-navy-300">
            <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-4">
                <div>
                    <Logo inverted />
                    <p className="mt-4 text-sm leading-relaxed text-navy-400">{t('Practice management, court diary and lawyer directory built for Pakistan’s legal profession.')}</p>
                </div>
                {columns.map((column) => (
                    <div key={column.title}>
                        <p className="text-sm font-semibold text-white">{t(column.title)}</p>
                        <ul className="mt-3 space-y-2 text-sm">
                            {column.links.map(([label, href]) => (
                                <li key={href}>
                                    <Link href={href} className="hover:text-gold-300">
                                        {t(label)}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
            </div>
            <div className={cn('border-t border-navy-800 py-5 text-center text-xs text-navy-400')}>
                © {new Date().getFullYear()} Wakeel Diary. {t('Information on this site is not legal advice.')}
            </div>
        </footer>
    );
}
