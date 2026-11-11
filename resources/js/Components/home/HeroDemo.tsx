import { AnimatePresence, animate, motion, useMotionValue, useTransform } from 'framer-motion';
import {
    BellRing, BookOpen, Briefcase, CalendarCheck, CalendarDays, Check, CheckCircle2, ChevronDown, Clock, FileText, Gavel,
    LayoutDashboard, MessageCircle, Receipt, Scale, Users, Wallet,
} from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { DemoShell, DemoToast, PersonaAvatar, useDemoEngine, usePersona } from '@/Components/demo/engine';
import { cn } from '@/lib/cn';
import { useT } from '@/lib/i18n';

/**
 * Hero demo (docs/Features/Home-Page.md#demos): the advocate's dashboard, then a cursor accepts a
 * consultation, ticks a task, records "Adjourned" in the court diary, records a part payment that
 * issues a receipt, and opens the notifications. Sample matters; the advocate is DemoPersona.
 */

type View = 'dashboard' | 'diary' | 'invoices';
const OUTCOMES = ['Arguments heard', 'Adjourned', 'Order reserved', 'Disposed'];

export function HeroDemo({ className }: { className?: string }) {
    const t = useT();
    const [view, setView] = useState<View>('dashboard');
    const [accepted, setAccepted] = useState(false);
    const [taskDone, setTaskDone] = useState(false);
    const [outcomeOpen, setOutcomeOpen] = useState(false);
    const [outcome, setOutcome] = useState<string | null>(null);
    const [nextDate, setNextDate] = useState('');
    const [diarySaved, setDiarySaved] = useState(false);
    const [payment, setPayment] = useState(false);
    const [amount, setAmount] = useState('');
    const [receipt, setReceipt] = useState(false);
    const [bell, setBell] = useState(false);
    const [toast, setToast] = useState<string | null>(null);

    const engine = useDemoEngine(async ({ wait, moveTo, click, type, scrollTop }) => {
        setView('dashboard'); setAccepted(false); setTaskDone(false); setOutcomeOpen(false); setOutcome(null); setNextDate('');
        setDiarySaved(false); setPayment(false); setAmount(''); setReceipt(false); setBell(false); setToast(null); scrollTop();
        await wait(1600);
        await moveTo('accept', 900);
        await click();
        setAccepted(true);
        setToast(t('Consultation confirmed · Zainab notified on WhatsApp'));
        await wait(1300);
        await moveTo('task-1', 700);
        await click();
        setTaskDone(true);
        await wait(700);
        setToast(null);
        await moveTo('nav-diary', 900);
        await click();
        setView('diary');
        scrollTop();
        await wait(900);
        await moveTo('outcome-btn', 800);
        await click();
        setOutcomeOpen(true);
        await wait(400);
        await moveTo('outcome-1', 500);
        await click();
        setOutcome(OUTCOMES[1]);
        setOutcomeOpen(false);
        await moveTo('next-date', 500);
        await click();
        await type('26 Nov 2026', setNextDate, 60);
        await moveTo('diary-save', 600);
        await click();
        setDiarySaved(true);
        setToast(t('Saved to history · next date sent to the client'));
        await wait(1500);
        setToast(null);
        await moveTo('nav-invoices', 900);
        await click();
        setView('invoices');
        scrollTop();
        await wait(800);
        await moveTo('record-payment', 800);
        await click();
        setPayment(true);
        await wait(400);
        await moveTo('amount', 500);
        await click();
        await type('40,000', setAmount, 90);
        await moveTo('pay-save', 600);
        await click();
        setPayment(false);
        setReceipt(true);
        setToast(t('Receipt RCPT-0142 issued as PDF'));
        await wait(1600);
        setToast(null);
        await moveTo('bell', 800);
        await click();
        setBell(true);
        await wait(3600);
    });

    const nav = [
        { key: 'dashboard', label: t('Dashboard'), icon: <LayoutDashboard className="size-3.5" />, demo: 'nav-dashboard' },
        { key: 'diary', label: t('Court diary'), icon: <BookOpen className="size-3.5" />, demo: 'nav-diary' },
        { key: 'cases', label: t('Cases'), icon: <Briefcase className="size-3.5" /> },
        { key: 'calendar', label: t('Calendar'), icon: <CalendarDays className="size-3.5" /> },
        { key: 'clients', label: t('Clients'), icon: <Users className="size-3.5" /> },
        { key: 'drafting', label: t('Drafting'), icon: <Scale className="size-3.5" /> },
        { key: 'invoices', label: t('Invoices'), icon: <Receipt className="size-3.5" />, demo: 'nav-invoices' },
    ];

    const overlay = (
        <>
            <AnimatePresence>
                {payment && (
                    <motion.div className="absolute inset-0 z-20 grid place-items-center bg-navy-950/40 p-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        <motion.div initial={{ scale: 0.96, y: 8 }} animate={{ scale: 1, y: 0 }} exit={{ opacity: 0 }} className="w-full max-w-xs rounded-xl bg-white p-4 shadow-2xl ring-1 ring-navy-100 dark:bg-navy-900 dark:ring-navy-700">
                            <p className="text-[13px] font-semibold">{t('Record payment')}</p>
                            <p className="mb-3 text-[10px] text-navy-500">INV-0217 · Zahid Hussain · {t('Balance')} Rs 80,000</p>
                            <p className="mb-0.5 text-[10px] font-medium text-navy-500">{t('Amount')}</p>
                            <div data-demo="amount" className="mb-2 flex h-7 items-center gap-1 rounded-md border border-gold-500 px-2 ring-2 ring-gold-500/25">Rs <span className="font-medium tabular-nums">{amount}</span><motion.span className="h-3 w-px bg-navy-900 dark:bg-white" animate={{ opacity: [1, 0] }} transition={{ repeat: Infinity, duration: 0.6 }} /></div>
                            <p className="mb-0.5 text-[10px] font-medium text-navy-500">{t('Method')}</p>
                            <div className="mb-3 flex h-7 items-center justify-between rounded-md border border-navy-200 px-2 dark:border-navy-700">{t('Bank transfer')}<ChevronDown className="size-3 text-navy-400" /></div>
                            <div className="flex justify-end gap-2">
                                <span className="rounded-md px-3 py-1.5 ring-1 ring-navy-200 dark:ring-navy-700">{t('Cancel')}</span>
                                <span data-demo="pay-save" className="rounded-md bg-navy-900 px-3 py-1.5 font-medium text-white dark:bg-gold-500 dark:text-navy-950">{t('Save and issue receipt')}</span>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
            <AnimatePresence>
                {bell && (
                    <motion.div initial={{ opacity: 0, y: -6, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0 }} className="absolute right-3 top-[4.6rem] z-30 w-64 rounded-xl bg-white p-2 shadow-2xl ring-1 ring-navy-100 dark:bg-navy-900 dark:ring-navy-700">
                        <p className="px-2 py-1 text-[11px] font-semibold">{t('Notifications')}</p>
                        {[
                            [<BellRing key="a" className="size-3.5 text-gold-600" />, t('Reminders sent to 12 clients for tomorrow’s hearings')],
                            [<CalendarCheck key="b" className="size-3.5 text-verdant-600" />, t('Zainab Hussain’s consultation is confirmed for 3:00 PM')],
                            [<Gavel key="c" className="size-3.5 text-navy-500" />, t('State vs. Bilal Ahmed adjourned to 26 Nov')],
                            [<Wallet key="d" className="size-3.5 text-verdant-600" />, t('Rs 40,000 received from Zahid Hussain')],
                        ].map(([icon, text], i) => (
                            <motion.div key={i} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.12 }} className="flex items-start gap-2 rounded-md px-2 py-1.5 hover:bg-navy-50 dark:hover:bg-navy-800">
                                <span className="mt-0.5">{icon}</span><span className="text-[10px] leading-snug">{text}</span>
                            </motion.div>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
            <DemoToast show={Boolean(toast)}><CheckCircle2 className="size-3.5 shrink-0 text-verdant-300" /><span>{toast}</span></DemoToast>
        </>
    );

    return (
        <DemoShell engine={engine} className={className} nav={nav} active={view} overlay={overlay}
            path={view === 'dashboard' ? '/dashboard' : view === 'diary' ? '/diary' : '/invoices'}
            label={t('Animated demo: an advocate’s dashboard, court diary and invoices')}>
            <AnimatePresence mode="wait" initial={false}>
                <motion.div key={view} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
                    {view === 'dashboard' && <Dashboard accepted={accepted} taskDone={taskDone} />}
                    {view === 'diary' && <Diary outcomeOpen={outcomeOpen} outcome={outcome} nextDate={nextDate} saved={diarySaved} />}
                    {view === 'invoices' && <Invoices receipt={receipt} />}
                </motion.div>
            </AnimatePresence>
        </DemoShell>
    );
}

function CountUp({ to, prefix = '', suffix = '' }: { to: number; prefix?: string; suffix?: string }) {
    const value = useMotionValue(0);
    const text = useTransform(value, (v) => `${prefix}${Math.round(v).toLocaleString('en-US')}${suffix}`);
    useEffect(() => {
        const controls = animate(value, to, { duration: 1.4, ease: [0.16, 1, 0.3, 1] });
        return () => controls.stop();
    }, [to, value]);
    return <motion.span className="tabular-nums">{text}</motion.span>;
}

function Panel({ title, action, children, className }: { title: string; action?: ReactNode; children: ReactNode; className?: string }) {
    return (
        <div className={cn('rounded-lg bg-white p-3 ring-1 ring-navy-100 dark:bg-navy-900 dark:ring-navy-800', className)}>
            <div className="mb-2 flex items-center justify-between"><p className="text-[10px] font-semibold uppercase tracking-wide text-navy-400">{title}</p>{action}</div>
            {children}
        </div>
    );
}

function Dashboard({ accepted, taskDone }: { accepted: boolean; taskDone: boolean }) {
    const t = useT();
    const persona = usePersona();
    const kpis: [string, number, string, ReactNode][] = [
        [t('Active cases'), 148, '', <Briefcase key="a" className="size-3.5" />],
        [t('Hearings this week'), 23, '', <Gavel key="b" className="size-3.5" />],
        [t('Clients'), 96, '', <Users key="c" className="size-3.5" />],
        [t('Fees received'), 320, 'K', <Wallet key="d" className="size-3.5" />],
    ];
    const hearings = [
        ['09:30', 'State vs. Muhammad Arshad', 'Sessions Court · Room 6', 'Bail'],
        ['10:15', 'State vs. Bilal Ahmed', 'Sessions Court, Kasur', 'Evidence'],
        ['11:00', 'Saima Akhtar vs. Federation', 'Lahore High Court · 14', 'Writ'],
        ['12:30', 'Nadia Bibi vs. Imran Ali', 'Family Court · Room 2', 'Maintenance'],
    ];
    const bars = [6, 9, 4, 8, 11, 3, 7];

    return (
        <div className="space-y-3">
            <div className="flex items-center gap-2.5">
                <PersonaAvatar className="size-9 text-[12px]" />
                <div className="min-w-0">
                    <p className="text-[14px] font-semibold">{t('Good morning')}, {persona.first_name}</p>
                    <p className="text-[10px] text-navy-500">{t('4 hearings today · 2 consultation requests · 5 tasks due')}</p>
                </div>
            </div>
            <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                {kpis.map(([label, value, suffix, icon], i) => (
                    <motion.div key={label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }} className="rounded-lg bg-white p-2.5 ring-1 ring-navy-100 dark:bg-navy-900 dark:ring-navy-800">
                        <p className="flex items-center gap-1 text-[10px] text-navy-500"><span className="text-gold-600">{icon}</span>{label}</p>
                        <p className="mt-1 text-[16px] font-semibold"><CountUp to={value} prefix={suffix ? 'Rs ' : ''} suffix={suffix} /></p>
                    </motion.div>
                ))}
            </div>
            <div className="grid gap-3 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
                <Panel title={t('Today in court')}>
                    <ul className="space-y-1.5">
                        {hearings.map(([time, title, court, kind], i) => (
                            <motion.li key={title} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 + i * 0.08 }} className="flex items-center gap-2 rounded-md p-1.5 hover:bg-navy-50 dark:hover:bg-navy-800">
                                <span className="w-9 shrink-0 font-semibold tabular-nums">{time}</span>
                                <div className="min-w-0 flex-1"><p className="truncate font-medium">{title}</p><p className="truncate text-[10px] text-navy-500">{court}</p></div>
                                <span className="rounded-full bg-navy-50 px-1.5 py-0.5 text-[9px] text-navy-600 dark:bg-navy-800 dark:text-navy-300">{kind}</span>
                            </motion.li>
                        ))}
                    </ul>
                </Panel>
                <div className="space-y-3">
                    <Panel title={t('Consultation requests')}>
                        {[['Zainab Hussain', t('Tomorrow, 3:00 PM · Online'), true], ['Hamza Rauf', t('Sat, 11:00 AM · Chamber'), false]].map(([name, when, target]) => (
                            <div key={String(name)} className="mb-2 flex items-center gap-2 last:mb-0">
                                <PersonaAvatar src={null} name={String(name)} className="size-6 bg-navy-100 text-navy-700" />
                                <div className="min-w-0 flex-1"><p className="truncate font-medium">{name}</p><p className="truncate text-[10px] text-navy-500">{when}</p></div>
                                {target && accepted
                                    ? <motion.span initial={{ scale: 0.6 }} animate={{ scale: 1 }} className="inline-flex items-center gap-1 rounded-full bg-verdant-50 px-2 py-0.5 text-[10px] font-medium text-verdant-700 ring-1 ring-verdant-200"><Check className="size-3" />{t('Confirmed')}</motion.span>
                                    : <span data-demo={target ? 'accept' : undefined} className="rounded-md bg-navy-900 px-2 py-1 text-[10px] font-medium text-white dark:bg-gold-500 dark:text-navy-950">{t('Accept')}</span>}
                            </div>
                        ))}
                    </Panel>
                    <Panel title={t('Tasks')}>
                        {[[t('Certified copy of FIR · Bilal'), 'task-1'], [t('File vakalatnama · Hira'), undefined], [t('Call client about fee · Usman'), undefined]].map(([label, id], i) => {
                            const done = i === 0 && taskDone;
                            return (
                                <div key={String(label)} className="flex items-center gap-2 py-0.5">
                                    <span data-demo={id} className={cn('grid size-3.5 place-items-center rounded border', done ? 'border-verdant-600 bg-verdant-600 text-white' : 'border-navy-300')}>{done && <Check className="size-2.5" />}</span>
                                    <span className={cn('truncate', done && 'text-navy-400 line-through')}>{label}</span>
                                </div>
                            );
                        })}
                    </Panel>
                </div>
            </div>
            <Panel title={t('Hearings per day')}>
                <div className="flex h-16 items-end gap-2">
                    {bars.map((height, i) => (
                        <div key={i} className="flex flex-1 flex-col items-center gap-1">
                            <motion.div className={cn('w-full rounded-t', i === 4 ? 'bg-gold-500' : 'bg-navy-200 dark:bg-navy-700')} initial={{ height: 0 }} animate={{ height: `${height * 4}px` }} transition={{ delay: 0.3 + i * 0.06, duration: 0.6 }} />
                            <span className="text-[9px] text-navy-400">{['M', 'T', 'W', 'T', 'F', 'S', 'S'][i]}</span>
                        </div>
                    ))}
                </div>
            </Panel>
        </div>
    );
}

function Diary({ outcomeOpen, outcome, nextDate, saved }: { outcomeOpen: boolean; outcome: string | null; nextDate: string; saved: boolean }) {
    const t = useT();
    const groups = [
        [t('Sessions Court, Lahore · Room 6'), [['09:30', 'State vs. Muhammad Arshad', 'Bail arguments', 'Item 14']]],
        [t('Sessions Court, Kasur · Room 3'), [['10:15', 'State vs. Bilal Ahmed', 'Prosecution evidence', 'Item 7', 'target']]],
        [t('Lahore High Court · Court 14'), [['11:00', 'Saima Akhtar vs. Federation', 'Writ petition', 'Item 22'], ['11:40', 'Shahid Latif vs. LDA', 'Reply of respondents', 'Item 31']]],
    ] as const;
    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <div><p className="text-[14px] font-semibold">{t('Court diary')}</p><p className="text-[10px] text-navy-500">{new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })} · {t('5 matters')}</p></div>
                <span className="rounded-md px-2.5 py-1.5 ring-1 ring-navy-200 dark:ring-navy-700">{t('Print cause list')}</span>
            </div>
            {groups.map(([court, rows]) => (
                <div key={court} className="rounded-lg bg-white ring-1 ring-navy-100 dark:bg-navy-900 dark:ring-navy-800">
                    <p className="border-b border-navy-100 px-3 py-1.5 text-[10px] font-semibold text-navy-500 dark:border-navy-800">{court}</p>
                    {rows.map((row) => {
                        const [time, title, purpose, item] = row;
                        const isTarget = row.length > 4;
                        return (
                            <div key={title} className={cn('relative px-3 py-2', isTarget && 'bg-gold-50/40 dark:bg-gold-500/5')}>
                                <div className="flex items-center gap-2">
                                    <span className="w-9 shrink-0 font-semibold tabular-nums">{time}</span>
                                    <div className="min-w-0 flex-1"><p className="truncate font-medium">{title}</p><p className="truncate text-[10px] text-navy-500">{purpose} · {item}</p></div>
                                    {isTarget && saved
                                        ? <motion.span initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex items-center gap-1.5"><span className="rounded-full bg-gold-100 px-2 py-0.5 text-[10px] font-medium text-gold-700">{t('Adjourned')} → 26 Nov</span><span className="inline-flex items-center gap-0.5 rounded-full bg-verdant-50 px-1.5 py-0.5 text-[9px] text-verdant-700 ring-1 ring-verdant-200"><MessageCircle className="size-2.5" />{t('Client told')}</span></motion.span>
                                        : isTarget ? <span data-demo="outcome-btn" className="rounded-md bg-navy-900 px-2 py-1 text-[10px] font-medium text-white dark:bg-gold-500 dark:text-navy-950">{t('Record outcome')}</span>
                                            : <span className="text-[10px] text-navy-400">{t('Pending')}</span>}
                                </div>
                                {isTarget && !saved && (outcomeOpen || outcome) && (
                                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-2 grid grid-cols-2 gap-2 overflow-visible">
                                        <div className="relative">
                                            <p className="mb-0.5 text-[10px] text-navy-500">{t('Outcome')}</p>
                                            <div className="flex h-7 items-center justify-between rounded-md border border-navy-200 px-2 dark:border-navy-700">{outcome ?? t('Choose…')}<ChevronDown className="size-3 text-navy-400" /></div>
                                            {outcomeOpen && (
                                                <ul className="absolute inset-x-0 top-full z-10 mt-1 rounded-md bg-white p-1 shadow-lg ring-1 ring-navy-100 dark:bg-navy-800 dark:ring-navy-700">
                                                    {OUTCOMES.map((option, i) => <li key={option} data-demo={`outcome-${i}`} className={cn('rounded px-2 py-1', i === 1 && 'bg-navy-50 dark:bg-navy-700')}>{option}</li>)}
                                                </ul>
                                            )}
                                        </div>
                                        <div>
                                            <p className="mb-0.5 text-[10px] text-navy-500">{t('Next date')}</p>
                                            <div data-demo="next-date" className="flex h-7 items-center gap-1 rounded-md border border-navy-200 px-2 dark:border-navy-700"><Clock className="size-3 text-navy-400" />{nextDate || <span className="text-navy-300">dd MMM yyyy</span>}</div>
                                        </div>
                                        <div className="col-span-2 flex justify-end"><span data-demo="diary-save" className="rounded-md bg-verdant-700 px-3 py-1 font-medium text-white">{t('Save to history')}</span></div>
                                    </motion.div>
                                )}
                            </div>
                        );
                    })}
                </div>
            ))}
        </div>
    );
}

function Invoices({ receipt }: { receipt: boolean }) {
    const t = useT();
    const rows = [
        ['INV-0217', 'Zahid Hussain', 'Rs 120,000', receipt ? 'Rs 80,000' : 'Rs 40,000', t('Part paid'), true],
        ['INV-0216', 'Rehman Textiles', 'Rs 250,000', 'Rs 250,000', t('Paid'), false],
        ['INV-0215', 'Asma Shafiq', 'Rs 60,000', 'Rs 0', t('Due'), false],
        ['INV-0214', 'Khalid Mehmood', 'Rs 45,000', 'Rs 45,000', t('Paid'), false],
    ] as const;
    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <div><p className="text-[14px] font-semibold">{t('Invoices')}</p><p className="text-[10px] text-navy-500">{t('Fees, part payments and numbered receipts')}</p></div>
                <span className="rounded-md bg-navy-900 px-2.5 py-1.5 font-medium text-white dark:bg-gold-500 dark:text-navy-950">{t('New invoice')}</span>
            </div>
            <div className="overflow-hidden rounded-lg bg-white ring-1 ring-navy-100 dark:bg-navy-900 dark:ring-navy-800">
                {rows.map(([number, client, total, paid, status, target]) => (
                    <div key={number} className={cn('flex items-center gap-2 border-b border-navy-50 px-3 py-2 last:border-0 dark:border-navy-800/60', target && 'bg-gold-50/40 dark:bg-gold-500/5')}>
                        <div className="min-w-0 flex-1"><p className="font-medium">{number} · {client}</p><p className="text-[10px] text-navy-500">{t('Total')} {total} · {t('Paid')} <span className={cn('tabular-nums', target && receipt && 'font-semibold text-verdant-700 dark:text-verdant-300')}>{paid}</span></p></div>
                        <span className={cn('rounded-full px-2 py-0.5 text-[10px] ring-1 ring-inset', status === t('Paid') ? 'bg-verdant-50 text-verdant-700 ring-verdant-200' : status === t('Due') ? 'bg-red-50 text-red-700 ring-red-200' : 'bg-gold-50 text-gold-700 ring-gold-200')}>{status}</span>
                        {target && <span data-demo="record-payment" className="rounded-md px-2 py-1 text-[10px] font-medium ring-1 ring-navy-200 dark:ring-navy-700">{t('Record payment')}</span>}
                    </div>
                ))}
            </div>
            <AnimatePresence>
                {receipt && (
                    <motion.div initial={{ opacity: 0, y: 10, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} className="flex items-center gap-3 rounded-lg bg-white p-3 ring-1 ring-verdant-200 dark:bg-navy-900 dark:ring-verdant-700">
                        <div className="relative grid h-14 w-11 shrink-0 place-items-center rounded-sm bg-navy-50 ring-1 ring-navy-200 dark:bg-navy-800 dark:ring-navy-700">
                            <FileText className="size-5 text-red-500" /><span className="absolute bottom-1 text-[8px] font-bold text-red-600">PDF</span>
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="font-semibold">{t('Receipt')} RCPT-0142</p>
                            <p className="text-[10px] text-navy-500">Rs 40,000 · {t('Bank transfer')} · Zahid Hussain</p>
                            <motion.div className="mt-1.5 h-1 overflow-hidden rounded-full bg-navy-100 dark:bg-navy-800"><motion.div className="h-full bg-verdant-500" initial={{ width: 0 }} animate={{ width: '100%' }} transition={{ duration: 1 }} /></motion.div>
                        </div>
                        <span className="rounded-md bg-navy-900 px-2 py-1 text-[10px] font-medium text-white dark:bg-gold-500 dark:text-navy-950">{t('Download')}</span>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
