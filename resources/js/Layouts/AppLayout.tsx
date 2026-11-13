import { Head, Link, router, usePage } from '@inertiajs/react';
import { Bell, Building2, ChevronDown, LogOut, Menu, MessageSquareHeart, MoreHorizontal, User as UserIcon, X } from 'lucide-react';
import { motion, MotionConfig } from 'framer-motion';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { UpgradeModal } from '@/Components/domain/UpgradeModal';
import { Avatar, Dropdown, Flash } from '@/Components/ui';
import { ActivityBell } from '@/Components/shell/ActivityBell';
import { AppointmentsMenu } from '@/Components/shell/AppointmentsMenu';
import { Logo } from '@/Components/shell/Logo';
import { MessagesMenu } from '@/Components/shell/MessagesMenu';
import { adminNav, portalNav, workspaceNav, type NavGroup, type NavItem } from '@/Components/shell/navigation';
import { LanguageSwitcher, ThemeToggle } from '@/Components/shell/Preferences';
import { usePermissions } from '@/hooks/usePermissions';
import { cn } from '@/lib/cn';
import { pageTransition } from '@/lib/motion';
import { useT } from '@/lib/i18n';
import type { SharedProps } from '@/types';

type Area = 'workspace' | 'portal' | 'admin';

const navFor: Record<Area, NavGroup[]> = { workspace: workspaceNav, portal: portalNav, admin: adminNav };

export default function AppLayout({ title, children, area = 'workspace', wide = false }: { title: string; children: ReactNode; area?: Area; wide?: boolean }) {
    const t = useT();
    const { auth, unread } = usePage<SharedProps>().props;
    const { can, canPlatform } = usePermissions();
    const [drawer, setDrawer] = useState(false);

    useEffect(() => router.on('navigate', () => setDrawer(false)), []);

    const visible = (item: NavItem) =>
        route().has(item.route) &&
        (!item.permission || can(item.permission)) &&
        (!item.platform || canPlatform(item.platform)) &&
        (!item.lawyerOnly || auth.user?.account_type === 'lawyer');

    const groups = navFor[area].map((group) => ({ ...group, items: group.items.filter(visible) })).filter((group) => group.items.length > 0);
    const mobileItems = groups.flatMap((group) => group.items).filter((item) => item.mobile).slice(0, 4);
    const isActive = (item: NavItem) => route().current(item.match ?? item.route);

    const sidebar = (
        <nav className="flex h-full flex-col gap-6 overflow-y-auto px-3 py-4" aria-label={t('Main navigation')}>
            {groups.map((group, index) => (
                <div key={index}>
                    {group.label && <p className="mb-1.5 px-3 text-xs font-medium text-navy-400">{t(group.label)}</p>}
                    <ul className="space-y-0.5">
                        {group.items.map((item) => (
                            <li key={item.route}>
                                <Link
                                    href={route(item.route)}
                                    prefetch
                                    className={cn(
                                        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                                        isActive(item) ? 'bg-navy-800 text-white' : 'text-navy-200 hover:bg-navy-800/60 hover:text-white',
                                    )}
                                >
                                    <item.icon className={cn('size-4 shrink-0', isActive(item) ? 'text-gold-300' : 'text-navy-400')} />
                                    {t(item.label)}
                                </Link>
                            </li>
                        ))}
                    </ul>
                </div>
            ))}
        </nav>
    );

    return (
        <>
            <Head title={title}>
                <meta name="robots" content="noindex, nofollow" />
            </Head>
            <div className="min-h-dvh lg:flex">
                {/* Desktop sidebar */}
                <aside className="no-print sticky top-0 hidden h-dvh w-64 shrink-0 flex-col bg-navy-900 lg:flex dark:bg-navy-950 dark:ring-1 dark:ring-navy-800">
                    <div className="flex h-16 items-center px-5">
                        <Link href={route(area === 'admin' ? 'admin.dashboard' : area === 'portal' ? 'portal.dashboard' : 'dashboard')}>
                            <Logo inverted />
                        </Link>
                    </div>
                    {area === 'workspace' && <OrganizationSwitcher />}
                    {sidebar}
                </aside>

                {/* Mobile drawer */}
                {drawer && (
                    <div className="fixed inset-0 z-50 lg:hidden">
                        <div className="absolute inset-0 bg-navy-950/60" onClick={() => setDrawer(false)} />
                        <aside className="absolute inset-y-0 start-0 flex w-72 max-w-[85vw] flex-col bg-navy-900">
                            <div className="flex h-14 items-center justify-between px-4">
                                <Logo inverted />
                                <button type="button" onClick={() => setDrawer(false)} className="rounded-md p-1.5 text-navy-200" aria-label={t('Close menu')}>
                                    <X className="size-5" />
                                </button>
                            </div>
                            {area === 'workspace' && <OrganizationSwitcher />}
                            {sidebar}
                        </aside>
                    </div>
                )}

                <div className="flex min-w-0 flex-1 flex-col">
                    <header className="no-print sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-navy-100 bg-white/90 px-3 backdrop-blur sm:px-6 lg:h-16 dark:border-navy-800 dark:bg-navy-900/90">
                        <button type="button" onClick={() => setDrawer(true)} className="rounded-md p-2 text-navy-700 hover:bg-navy-100 lg:hidden dark:text-navy-200 dark:hover:bg-navy-800" aria-label={t('Open menu')}>
                            <Menu className="size-5" />
                        </button>
                        <div className="lg:hidden">
                            <Logo className="[&>span:last-child]:hidden sm:[&>span:last-child]:inline" />
                        </div>
                        <div className="flex-1" />
                        <LanguageSwitcher className="text-navy-700 dark:text-navy-200" />
                        <ThemeToggle className="text-navy-700 dark:text-navy-200" />
                        {area === 'workspace' && auth.organization && route().has('appointments.recent') && (auth.user?.account_type === 'lawyer' || auth.organization.permissions.includes('appointments.manage')) && <AppointmentsMenu />}
                        {area !== 'admin' && auth.user && <MessagesMenu />}
                        {area === 'workspace' && auth.organization && route().has('activity.recent') && <ActivityBell />}
                        {route().has('notifications.index') && (
                            <Link href={route('notifications.index')} className="relative rounded-md p-2 text-navy-700 hover:bg-navy-100 dark:text-navy-200 dark:hover:bg-navy-800" aria-label={t('Notifications')}>
                                <Bell className="size-4" />
                                {(unread?.notifications ?? 0) > 0 && (
                                    <span className="absolute end-1 top-1 flex min-w-4 items-center justify-center rounded-full bg-gold-500 px-1 text-[10px] font-bold text-navy-950">{unread?.notifications}</span>
                                )}
                            </Link>
                        )}
                        {auth.user && (
                            <Dropdown
                                trigger={
                                    <span className="flex items-center gap-2 rounded-md p-1 hover:bg-navy-100 dark:hover:bg-navy-800">
                                        <Avatar name={auth.user.name} src={auth.user.avatar_url} size="sm" />
                                        <span className="hidden max-w-36 truncate text-sm font-medium text-navy-800 md:inline dark:text-navy-100">{auth.user.name}</span>
                                        <ChevronDown className="hidden size-4 text-navy-400 md:inline" />
                                    </span>
                                }
                                items={[
                                    { label: t('Account settings'), href: route('account.edit'), icon: <UserIcon className="size-4" /> },
                                    { label: t('Send feedback'), href: route('feedback.create'), icon: <MessageSquareHeart className="size-4" /> },
                                    'divider',
                                    { label: t('Sign out'), href: route('logout'), method: 'post', icon: <LogOut className="size-4" />, danger: true },
                                ]}
                            />
                        )}
                    </header>

                    <MotionConfig reducedMotion="user">
                        <motion.main initial="hidden" animate="show" variants={pageTransition} className={cn('mx-auto w-full flex-1 px-3 pt-5 pb-24 sm:px-6 lg:pb-10', wide ? 'max-w-[1600px]' : 'max-w-7xl')}>{children}</motion.main>
                    </MotionConfig>
                </div>

                {/* Mobile bottom navigation */}
                <nav className="no-print fixed inset-x-0 bottom-0 z-40 border-t border-navy-100 bg-white pb-[env(safe-area-inset-bottom)] lg:hidden dark:border-navy-800 dark:bg-navy-900" aria-label={t('Quick navigation')}>
                    <ul className="grid grid-cols-5">
                        {mobileItems.map((item) => (
                            <li key={item.route}>
                                <Link href={route(item.route)} className={cn('flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium', isActive(item) ? 'text-navy-900 dark:text-gold-300' : 'text-navy-500 dark:text-navy-400')}>
                                    <item.icon className="size-5" />
                                    <span className="max-w-full truncate px-1">{t(item.label)}</span>
                                </Link>
                            </li>
                        ))}
                        <li>
                            <button type="button" onClick={() => setDrawer(true)} className="flex w-full flex-col items-center gap-0.5 py-2 text-[11px] font-medium text-navy-500 dark:text-navy-400">
                                <MoreHorizontal className="size-5" />
                                {t('More')}
                            </button>
                        </li>
                    </ul>
                </nav>
            </div>
            <Flash />
            <UpgradeModal />
        </>
    );
}

function OrganizationSwitcher() {
    const t = useT();
    const { auth } = usePage<SharedProps>().props;
    if (!auth.organization) return null;
    const others = auth.organizations.filter((o) => o.id !== auth.organization?.id);

    return (
        <div className="mx-3 mb-1 rounded-lg bg-navy-800/60 p-2.5">
            <div className="flex items-center gap-2.5">
                <Building2 className="size-4 shrink-0 text-gold-300" />
                <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-white">{auth.organization.name}</p>
                    <p className="text-[11px] text-navy-300">{t(auth.organization.type === 'firm' ? 'Law firm' : 'Individual practice')}</p>
                </div>
            </div>
            {others.length > 0 && (
                <select
                    className="mt-2 w-full rounded-md border-0 bg-navy-900 px-2 py-1 text-xs text-navy-100 ring-1 ring-navy-700"
                    value=""
                    onChange={(event) => event.target.value && router.post(route('organizations.switch', Number(event.target.value)))}
                    aria-label={t('Switch organization')}
                >
                    <option value="">{t('Switch organization…')}</option>
                    {others.map((o) => (
                        <option key={o.id} value={o.id}>
                            {o.name}
                        </option>
                    ))}
                </select>
            )}
        </div>
    );
}
