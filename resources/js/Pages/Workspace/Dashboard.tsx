import { Link, usePage } from '@inertiajs/react';
import type { LucideIcon } from 'lucide-react';
import {
    AlertTriangle, BadgeCheck, BarChart3, Briefcase, CalendarCheck, CalendarClock, CalendarDays, ClipboardList, FilePlus2, FileSignature, FileText, Gavel, MessageSquare, Plus, Printer, Receipt, Sparkles, UserPlus, Users, Wallet,
} from 'lucide-react';
import { HearingCard } from '@/Components/domain/HearingCard';
import { Alert, BarList, Card, CardBody, CardHeader, EmptyState, LinkButton, PageHeader, Skeleton, Stat, StatusBadge } from '@/Components/ui';
import AppLayout from '@/Layouts/AppLayout';
import { usePermissions } from '@/hooks/usePermissions';
import { formatDate, formatDateTime, formatMoney } from '@/lib/format';
import { useLocale, useT } from '@/lib/i18n';
import type { SharedProps } from '@/types';
import type { HearingSummary, TaskItem } from '@/types/domain';

type Props = {
    stats: Record<string, number | null>;
    todayHearings: HearingSummary[];
    upcoming?: HearingSummary[];
    tasks?: TaskItem[];
    breakdown?: { bySpecialization: { label: string; value: number }[]; byCourt: { label: string; value: number }[] };
    activity?: { id: number; description: string; log: string; subject_type: string; causer: string | null; created_at: string }[];
    index?: { documents: number | null; draftsInReview: number | null; appointmentsUpcoming: number; invoicesOverdue: number | null; ordersThisMonth: number };
    profile: { verification_status: string; verification_label: string; is_public: boolean; onboarding_complete: boolean } | null;
    can: Record<string, boolean>;
};

type IndexRow = { label: string; fact: string; href: string; icon: LucideIcon; show: boolean };

/**
 * Workspace home. The signature object is today's cause list; everything else
 * is one click from the practice index (every module the member may use).
 */
export default function Dashboard({ stats, todayHearings, upcoming, tasks, breakdown, activity, index, profile, can }: Props) {
    const t = useT();
    const { locale } = useLocale();
    const { auth } = usePage<SharedProps>().props;
    const perms = usePermissions();
    const loading = (
        <div className="space-y-2 p-1" aria-busy="true">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-2/3" />
        </div>
    );
    const firstName = auth.user?.name.split(' ')[0] ?? '';
    const n = (value: number | null | undefined) => (value === null || value === undefined ? '…' : String(value));

    const rows: IndexRow[] = [
        { label: t('Court Diary'), fact: t(':count hearings today', { count: stats.todayHearings ?? 0 }), href: route('diary.index'), icon: CalendarDays, show: perms.can('hearings.view') },
        { label: t('Cases'), fact: t(':count active', { count: stats.activeCases ?? 0 }), href: route('cases.index', { status: 'open' }), icon: Briefcase, show: true },
        { label: t('Clients'), fact: t(':count on file', { count: stats.clients ?? 0 }), href: route('clients.index'), icon: Users, show: perms.can('clients.view') },
        { label: t('Orders recorded'), fact: t(':count this month', { count: n(index?.ordersThisMonth) }), href: route('diary.index', { view: 'agenda' }), icon: Gavel, show: perms.can('hearings.view') },
        { label: t('Tasks'), fact: t(':count open for you', { count: stats.pendingTasks ?? 0 }), href: route('tasks.index'), icon: ClipboardList, show: true },
        { label: t('Document Vault'), fact: t(':count files', { count: n(index?.documents) }), href: route('documents.index'), icon: FileText, show: perms.can('documents.view') },
        { label: t('Legal Drafting'), fact: t(':count awaiting review', { count: n(index?.draftsInReview) }), href: route('drafts.index'), icon: FileSignature, show: perms.can('drafts.manage') },
        { label: t('Appointments'), fact: t(':count upcoming', { count: n(index?.appointmentsUpcoming) }), href: route('appointments.index'), icon: CalendarClock, show: perms.can('appointments.manage') || auth.user?.account_type === 'lawyer' },
        { label: t('Messages'), fact: t(':count unread', { count: stats.unreadMessages ?? 0 }), href: route('messages.index'), icon: MessageSquare, show: perms.can('messages.client') },
        { label: t('Invoices & Payments'), fact: t(':count overdue', { count: n(index?.invoicesOverdue) }), href: route('invoices.index', { status: 'overdue' }), icon: Wallet, show: perms.can('finance.view') },
        { label: t('Analytics'), fact: t('Workload and revenue'), href: route('analytics.index'), icon: BarChart3, show: perms.can('analytics.view') },
        { label: t('AI Assistant'), fact: t('Drafting and summaries'), href: route('ai.index'), icon: Sparkles, show: perms.can('ai.use') },
    ];

    const actions = [
        can.createCase && { label: t('Open a case file'), href: route('cases.create'), icon: Briefcase },
        can.createClient && { label: t('Add a client'), href: route('clients.create'), icon: UserPlus },
        { label: t('Write a diary note'), href: route('diary.index', { add: 'note' }), icon: CalendarDays },
        can.upload && { label: t('Upload a document'), href: route('documents.index', { upload: 1 }), icon: FilePlus2 },
        can.draft && { label: t('Start a draft'), href: route('drafts.create'), icon: FileSignature },
        can.invoice && { label: t('Raise an invoice'), href: route('invoices.create'), icon: Receipt },
    ].filter((item): item is { label: string; href: string; icon: LucideIcon } => Boolean(item));

    return (
        <AppLayout title={t('Dashboard')}>
            <PageHeader
                title={t('Good day, :name', { name: firstName })}
                description={formatDate(new Date().toISOString(), locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                actions={
                    <>
                        {can.createCase && <LinkButton href={route('cases.create')} icon={<Plus className="size-4" />}>{t('New case')}</LinkButton>}
                        <LinkButton href={route('diary.index', { view: 'day' })} variant="secondary" icon={<CalendarDays className="size-4" />}>{t('Court mode')}</LinkButton>
                    </>
                }
            />

            {profile && !profile.onboarding_complete && (
                <Alert tone="warning" className="mb-5" title={t('Complete your professional profile')} action={<LinkButton href={route('lawyer.profile.edit')} size="sm" variant="secondary">{t('Continue')}</LinkButton>}>
                    {t('Clients can find you in the directory once your profile is complete and published.')}
                </Alert>
            )}
            {profile && profile.onboarding_complete && profile.verification_status === 'unverified' && (
                <Alert tone="info" className="mb-5" title={t('Get the verified badge')} action={<LinkButton href={route('lawyer.verification.show')} size="sm" variant="secondary">{t('Verify')}</LinkButton>}>
                    {t('Submit your Bar enrollment evidence for review by our verification team.')}
                </Alert>
            )}

            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <Stat label={t('Today’s hearings')} value={stats.todayHearings} icon={<CalendarCheck />} tone="gold" href={route('diary.index')} />
                <Stat label={t('Active cases')} value={stats.activeCases} hint={t(':count total', { count: stats.totalCases ?? 0 })} icon={<Briefcase />} href={route('cases.index', { status: 'open' })} />
                <Stat label={t('Next 7 days')} value={stats.upcomingHearings} hint={t('upcoming hearings')} icon={<CalendarDays />} href={route('diary.index', { view: 'agenda' })} />
                {stats.outstanding !== null ? (
                    <Stat label={t('Outstanding fees')} value={formatMoney(stats.outstanding, locale)} hint={t('This month: :amount', { amount: formatMoney(stats.monthRevenue, locale) })} icon={<Wallet />} tone="green" href={route('invoices.index')} />
                ) : (
                    <Stat label={t('My open tasks')} value={stats.pendingTasks} icon={<ClipboardList />} href={route('tasks.index')} />
                )}
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-3">
                <div className="space-y-6 lg:col-span-2">
                    <Card>
                        <CardHeader
                            title={t('Today in court')}
                            description={todayHearings.length ? t(':count hearings', { count: todayHearings.length }) : undefined}
                            actions={<LinkButton href={route('diary.pdf')} variant="ghost" size="sm" icon={<Printer className="size-4" />} target="_blank">{t('Print cause list')}</LinkButton>}
                        />
                        <CardBody className="space-y-2.5">
                            {todayHearings.length === 0 ? (
                                <EmptyState icon={<CalendarCheck className="size-5" />} title={t('No hearings today')} description={t('Hearings you schedule on cases appear here.')} action={can.createCase && <LinkButton href={route('cases.index')} variant="secondary" size="sm">{t('Open your cases')}</LinkButton>} />
                            ) : (
                                todayHearings.map((hearing) => <HearingCard key={hearing.id} hearing={hearing} actions={<LinkButton href={route('cases.show', { case: hearing.case?.id, tab: 'hearings' })} size="sm" variant="success">{t('Record proceedings')}</LinkButton>} />)
                            )}
                        </CardBody>
                    </Card>

                    <Card>
                        <CardHeader title={t('Your practice')} description={t('Every part of the workspace, with what needs you.')} />
                        <ul className="grid divide-y divide-navy-100 sm:grid-cols-2 sm:divide-y-0 dark:divide-navy-800">
                            {rows.filter((row) => row.show).map((row) => (
                                <li key={row.href} className="sm:border-b sm:border-navy-100 sm:odd:border-e dark:sm:border-navy-800">
                                    <Link href={row.href} className="flex items-center gap-3 px-5 py-3 hover:bg-navy-50/70 dark:hover:bg-navy-800/50">
                                        <row.icon className="size-4 shrink-0 text-navy-400" aria-hidden />
                                        <span className="min-w-0 flex-1 truncate text-sm font-medium">{row.label}</span>
                                        <span className="shrink-0 text-[13px] text-navy-500 tabular-nums dark:text-navy-400">{row.fact}</span>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </Card>

                    <Card>
                        <CardHeader title={t('Coming up')} description={t('Next 14 days')} actions={<LinkButton href={route('diary.index', { view: 'agenda' })} variant="ghost" size="sm">{t('Agenda')}</LinkButton>} />
                        <CardBody className="space-y-2.5">
                            {!upcoming ? loading : upcoming.length === 0 ? <p className="py-4 text-center text-sm text-navy-500">{t('No upcoming hearings.')}</p> : upcoming.map((hearing) => <HearingCard key={hearing.id} hearing={hearing} showDate />)}
                        </CardBody>
                    </Card>
                </div>

                <div className="space-y-6">
                    <Card>
                        <CardHeader title={t('Start something')} />
                        <ul className="divide-y divide-navy-100 dark:divide-navy-800">
                            {actions.map((item) => (
                                <li key={item.href}>
                                    <Link href={item.href} className="flex items-center gap-3 px-5 py-2.5 text-sm font-medium text-navy-800 hover:bg-navy-50/70 dark:text-navy-100 dark:hover:bg-navy-800/50">
                                        <item.icon className="size-4 shrink-0 text-navy-400" aria-hidden />
                                        {item.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </Card>
                    <Card>
                        <CardHeader title={t('My tasks')} actions={<LinkButton href={route('tasks.index')} variant="ghost" size="sm">{t('All')}</LinkButton>} />
                        <CardBody>
                            {!tasks ? loading : tasks.length === 0 ? <p className="py-3 text-center text-sm text-navy-500">{t('Nothing pending.')}</p> : (
                                <ul className="divide-y divide-navy-100 dark:divide-navy-800">
                                    {tasks.map((task) => (
                                        <li key={task.id} className="py-2.5">
                                            <div className="flex items-start justify-between gap-2">
                                                <p className="text-sm font-medium">{task.title}</p>
                                                <StatusBadge value={task.priority} label={task.priority_label} />
                                            </div>
                                            <p className={`mt-0.5 text-xs ${task.overdue ? 'font-semibold text-red-600' : 'text-navy-500'}`}>
                                                {task.overdue && <AlertTriangle className="me-1 inline size-3" aria-hidden />}
                                                {task.due_date ? formatDate(task.due_date, locale) : t('No due date')}
                                                {task.case && <span className="ltr-nums ms-2">{task.case.reference}</span>}
                                            </p>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </CardBody>
                    </Card>
                    <Card>
                        <CardHeader title={t('Recent activity')} />
                        <CardBody>
                            {!activity ? loading : activity.length === 0 ? <p className="py-3 text-center text-sm text-navy-500">{t('Nothing yet.')}</p> : (
                                <ul className="space-y-3">
                                    {activity.map((item) => (
                                        <li key={item.id} className="text-sm">
                                            <p><span className="font-medium">{item.causer ?? t('System')}</span> <span className="text-navy-600 dark:text-navy-300">{t(item.description)} {t(item.subject_type === 'Hearing' ? 'hearing' : 'case')}</span></p>
                                            <p className="text-xs text-navy-500">{formatDateTime(item.created_at, locale)}</p>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </CardBody>
                    </Card>
                    {profile && profile.verification_status === 'approved' && (
                        <p className="flex items-center justify-center gap-1.5 text-xs font-medium text-verdant-700 dark:text-verdant-300"><BadgeCheck className="size-4" aria-hidden />{t('Your profile is verified')}</p>
                    )}
                </div>
            </div>

            <div className="mt-6 grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader title={t('Active cases by practice area')} />
                    <CardBody>{!breakdown ? loading : <BarList data={breakdown.bySpecialization} />}</CardBody>
                </Card>
                <Card>
                    <CardHeader title={t('Active cases by court')} />
                    <CardBody>{!breakdown ? loading : <BarList data={breakdown.byCourt} />}</CardBody>
                </Card>
            </div>
        </AppLayout>
    );
}
