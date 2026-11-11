import { Head, Link, usePage } from '@inertiajs/react';
import { Mail, MapPin, Menu, Phone, X } from 'lucide-react';
import { MotionConfig } from 'framer-motion';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { Flash, LinkButton } from '@/Components/ui';
import { Logo } from '@/Components/shell/Logo';
import { LanguageSwitcher, ThemeToggle } from '@/Components/shell/Preferences';
import { SocialLinks } from '@/Components/shell/SocialLinks';
import { cn } from '@/lib/cn';
import { useT } from '@/lib/i18n';
import type { SharedProps } from '@/types';

export type Seo = { title: string; description?: string; canonical?: string; image?: string; type?: string; jsonLd?: Record<string, unknown> | Record<string, unknown>[] };

export default function PublicLayout({ seo, children }: { seo: Seo; children: ReactNode }) {
    const t = useT();
    const { auth, app } = usePage<SharedProps>().props;
    const currentUrl = usePage().url;
    /** Active when the current path is the link's path or below it (e.g. /lawyers/ayesha under /lawyers). */
    const isActive = (href: string) => {
        const path = new URL(href, window.location.origin).pathname;
        const here = currentUrl.split('?')[0];
        return path === '/' ? here === '/' : here === path || here.startsWith(path + '/');
    };
    /*
     * Header links: in dark mode the old hover set navy-900 text on a navy-800 background,
     * so the label vanished. Hover and active now use white/gold on dark, navy on light.
     */
    const navLink =
        'rounded-md text-sm font-medium text-navy-700 transition-colors hover:bg-navy-100/70 hover:text-navy-950 aria-[current=page]:bg-navy-100 aria-[current=page]:text-navy-950 ' +
        'dark:text-navy-200 dark:hover:bg-white/10 dark:hover:text-gold-300 dark:aria-[current=page]:bg-white/10 dark:aria-[current=page]:text-gold-300';
    const [open, setOpen] = useState(false);
    const nav = [
        { label: 'Find a Lawyer', href: route('lawyers.index') },
        { label: 'Law Firms', href: route('firms.index') },
        { label: 'Practice Areas', href: route('specializations.index') },
        { label: 'User Guide', href: route('guide') },
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
                                <Link key={item.href} href={item.href} aria-current={isActive(item.href) ? 'page' : undefined} className={cn(navLink, 'px-3 py-2 whitespace-nowrap')}>
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
                                    <Link key={item.href} href={item.href} aria-current={isActive(item.href) ? 'page' : undefined} className={cn(navLink, 'px-3 py-2.5')}>
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
                <MotionConfig reducedMotion="user"><main className="flex-1">{children}</main></MotionConfig>
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
        { title: 'For Lawyers', links: [['Join as a Lawyer', route('register', { type: 'lawyer' })], ['Register a Law Firm', route('register', { type: 'firm' })], ['User Guide', route('guide')], ['Pricing', route('pricing')], ['Legal Articles', route('articles.index')]] },
        { title: 'Company', links: [['About', route('about')], ['Contact', route('contact')], ['FAQs', route('faqs')], ['Terms of Service', route('terms')], ['Privacy Policy', route('privacy')]] },
    ];
    const { app } = usePage<SharedProps>().props;
    const name = app.name || 'WakeelDiary';
    return (
        <footer className="overflow-hidden bg-navy-950 text-navy-300">
            <div className="mx-auto max-w-7xl px-4 pt-16 sm:px-6 lg:pt-20">
                <div className="grid gap-12 md:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))]">
                    <div className="max-w-sm">
                        <Logo inverted />
                        <p className="mt-4 text-sm leading-relaxed text-navy-300">{app.tagline || t('Practice management, court diary and lawyer directory built for Pakistan’s legal profession.')}</p>
                        <SocialLinks links={app.social ?? {}} className="mt-6" />
                        {(app.contact?.email || app.contact?.phone || app.contact?.address) && (
                            <ul className="mt-5 space-y-2 text-sm">
                                {app.contact.email && <li><a href={`mailto:${app.contact.email}`} className="inline-flex items-center gap-2 transition-colors hover:text-gold-300"><Mail className="size-4 shrink-0 text-gold-400" aria-hidden /><span dir="ltr" className="break-all">{app.contact.email}</span></a></li>}
                                {app.contact.phone && <li><a href={`tel:${app.contact.phone.replace(/[^\d+]/g, '')}`} className="inline-flex items-center gap-2 transition-colors hover:text-gold-300"><Phone className="size-4 shrink-0 text-gold-400" aria-hidden /><span dir="ltr">{app.contact.phone}</span></a></li>}
                                {app.contact.address && <li className="flex items-start gap-2"><MapPin className="mt-0.5 size-4 shrink-0 text-gold-400" aria-hidden /><span>{app.contact.address}</span></li>}
                            </ul>
                        )}
                    </div>
                    {columns.map((column) => (
                        <nav key={column.title} aria-label={t(column.title)}>
                            <p className="text-sm font-semibold text-white">{t(column.title)}</p>
                            <ul className="mt-4 space-y-2.5 text-sm">
                                {column.links.map(([label, href]) => (
                                    <li key={href}>
                                        <Link href={href} className="transition-colors hover:text-gold-300">
                                            {t(label)}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </nav>
                    ))}
                </div>
                <div className="mt-14 flex flex-col gap-3 border-t border-white/10 py-6 text-xs text-navy-400 sm:flex-row sm:items-center sm:justify-between">
                    <p>© {new Date().getFullYear()} {name}. {t('Information on this site is not legal advice.')}</p>
                    <p className="flex flex-wrap gap-4">
                        <Link href={route('terms')} className="hover:text-gold-300">{t('Terms of Service')}</Link>
                        <Link href={route('privacy')} className="hover:text-gold-300">{t('Privacy Policy')}</Link>
                        <Link href={route('contact')} className="hover:text-gold-300">{t('Contact')}</Link>
                    </p>
                </div>
            </div>
            <p aria-hidden className="pointer-events-none -mb-[0.18em] select-none text-center font-serif text-[clamp(3.5rem,15.5vw,15rem)] leading-none font-semibold tracking-tight whitespace-nowrap text-white/[0.06]">
                {name}
            </p>
        </footer>
    );
}
