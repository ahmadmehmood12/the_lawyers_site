import { AnimatePresence, motion, useInView, useReducedMotion } from 'framer-motion';
import {
    Bell, BookOpen, Briefcase, CalendarDays, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, Clock, FileText,
    Gavel, LayoutDashboard, MapPin, MousePointerClick, Plus, Receipt, Scale, Search, Users,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { useT } from '@/lib/i18n';

/**
 * Homepage demo (docs/Features/Home-Page.md): a drawn copy of the workspace where a cursor opens a case,
 * schedules a hearing (date, time, court, judge, district, practice area), then opens the calendar and
 * the new entry. Hovering pauses the script so visitors can scroll inside the screen. All data is sample.
 */

type View = 'cases' | 'case' | 'calendar';
type Field = 'date' | 'time' | 'court' | 'judge' | 'district' | 'area';
type Values = Partial<Record<Field, string>>;

const SELECTS: Record<'court' | 'judge' | 'district' | 'area', string[]> = {
    court: ['Civil Courts, Lahore', 'Sessions Court, Lahore', 'Lahore High Court'],
    judge: ['Mr. Faisal Rauf, Civil Judge', 'Mr. Kamran Aziz, ASJ', 'Ms. Sadia Noor, ASJ'],
    district: ['Kasur', 'Lahore', 'Sheikhupura'],
    area: ['Civil law', 'Criminal law', 'Family law'],
};
const CHOICE = 1;

const CASES = [
    ['Nadia Bibi vs. Imran Ali', 'Family Court, Lahore', 'Suit for maintenance', 'Active'],
    ['State vs. Muhammad Arshad', 'Sessions Court, Lahore', 'Post-arrest bail · 497 CrPC', 'Active'],
    ['Zahid Hussain vs. WAPDA', 'Civil Courts, Lahore', 'Declaration and injunction', 'Active'],
    ['Saima Akhtar vs. Federation', 'Lahore High Court', 'Writ petition · Art. 199', 'Reserved'],
    ['State vs. Bilal Ahmed', 'Sessions Court, Kasur', 'Pre-arrest bail · 498 CrPC', 'Active'],
    ['Rehman Textiles vs. Habib Traders', 'Banking Court, Lahore', 'Recovery suit', 'Active'],
    ['Khalid Mehmood vs. Tariq Javed', 'Rent Tribunal, Lahore', 'Ejectment petition', 'Adjourned'],
    ['Asma Shafiq vs. Naveed Iqbal', 'Family Court, Sheikhupura', 'Custody of minors', 'Active'],
    ['State vs. Usman Ghani', 'ATC, Lahore', 'Trial · 7 ATA', 'Evidence'],
    ['Shahid Latif vs. LDA', 'Lahore High Court', 'Writ petition', 'Active'],
    ['Farah Naz vs. Kashif Riaz', 'Family Court, Lahore', 'Dissolution of marriage', 'Disposed'],
    ['Punjab Cotton vs. Ali Steel', 'Civil Courts, Lahore', 'Specific performance', 'Active'],
];

const statusTone: Record<string, string> = {
    Active: 'bg-verdant-50 text-verdant-700 ring-verdant-200',
    Reserved: 'bg-gold-50 text-gold-700 ring-gold-200',
    Adjourned: 'bg-navy-50 text-navy-600 ring-navy-200',
    Evidence: 'bg-sky-50 text-sky-700 ring-sky-200',
    Disposed: 'bg-navy-100 text-navy-500 ring-navy-200',
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const CANCELLED = Symbol('cancelled');

function addDays(date: Date, days: number): Date {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return next;
}

export function CaseDemo() {
    const t = useT();
    const reduce = useReducedMotion();
    const frameRef = useRef<HTMLDivElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const inView = useInView(frameRef, { amount: 0.35 });

    const target = useMemo(() => addDays(new Date(), 6), []);
    const dateLabel = target.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const FINAL: Required<Values> = { date: dateLabel, time: '09:30 AM', court: SELECTS.court[CHOICE], judge: SELECTS.judge[CHOICE], district: SELECTS.district[CHOICE], area: SELECTS.area[CHOICE] };

    const [view, setView] = useState<View>('cases');
    const [modal, setModal] = useState(false);
    const [values, setValues] = useState<Values>({});
    const [focused, setFocused] = useState<Field | null>(null);
    const [openSelect, setOpenSelect] = useState<keyof typeof SELECTS | null>(null);
    const [toast, setToast] = useState(false);
    const [scheduled, setScheduled] = useState(false);
    const [popover, setPopover] = useState(false);
    const [cursor, setCursor] = useState({ x: 420, y: 300, visible: false });
    const [pressed, setPressed] = useState(false);
    const [ripple, setRipple] = useState<{ id: number; x: number; y: number } | null>(null);
    const [hovered, setHovered] = useState(false);

    const paused = useRef(false);
    const running = useRef(true);
    const cursorRef = useRef(cursor);
    cursorRef.current = cursor;
    paused.current = hovered || !inView;

    useEffect(() => {
        if (reduce) return;
        running.current = true;

        async function wait(ms: number) {
            let left = ms;
            while (left > 0) {
                if (!running.current) throw CANCELLED;
                await sleep(40);
                if (!paused.current) left -= 40;
            }
        }

        function find(name: string): HTMLElement | null {
            const matches = Array.from(frameRef.current?.querySelectorAll<HTMLElement>(`[data-demo="${name}"]`) ?? []);
            return matches.find((element) => element.getBoundingClientRect().width > 0) ?? null;
        }

        async function moveTo(name: string, duration = 750) {
            await wait(60);
            const element = find(name);
            const frame = frameRef.current;
            const scroller = scrollRef.current;
            if (!element || !frame) return;

            if (scroller && scroller.contains(element)) {
                const box = element.getBoundingClientRect();
                const area = scroller.getBoundingClientRect();
                if (box.top < area.top + 8 || box.bottom > area.bottom - 8) {
                    scroller.scrollTo({ top: scroller.scrollTop + (box.top - area.top) - area.height / 3, behavior: 'smooth' });
                    await wait(550);
                }
            }

            const box = element.getBoundingClientRect();
            const origin = frame.getBoundingClientRect();
            setCursor({ x: box.left - origin.left + Math.min(box.width / 2, 60), y: box.top - origin.top + box.height / 2, visible: true });
            await wait(duration);
        }

        async function click() {
            setPressed(true);
            setRipple({ id: Date.now(), x: cursorRef.current.x, y: cursorRef.current.y });
            await wait(130);
            setPressed(false);
            await wait(160);
        }

        async function type(field: Field, text: string) {
            setFocused(field);
            for (let i = 1; i <= text.length; i++) {
                setValues((current) => ({ ...current, [field]: text.slice(0, i) }));
                await wait(55);
            }
            await wait(200);
        }

        async function choose(field: keyof typeof SELECTS) {
            await moveTo(`field-${field}`, 600);
            await click();
            setFocused(field);
            setOpenSelect(field);
            await wait(350);
            await moveTo(`opt-${field}-${CHOICE}`, 500);
            await click();
            setValues((current) => ({ ...current, [field]: SELECTS[field][CHOICE] }));
            setOpenSelect(null);
            await wait(250);
        }

        function reset() {
            setView('cases');
            setModal(false);
            setValues({});
            setFocused(null);
            setOpenSelect(null);
            setToast(false);
            setScheduled(false);
            setPopover(false);
            scrollRef.current?.scrollTo({ top: 0 });
        }

        async function script() {
            reset();
            await wait(900);
            await moveTo('case-target', 1000);
            await click();
            setView('case');
            scrollRef.current?.scrollTo({ top: 0 });
            await wait(900);
            await moveTo('btn-schedule');
            await click();
            setModal(true);
            await wait(500);
            await moveTo('field-date', 600);
            await click();
            await type('date', FINAL.date);
            await moveTo('field-time', 500);
            await click();
            await type('time', FINAL.time);
            await choose('court');
            await choose('judge');
            await choose('district');
            await choose('area');
            setFocused(null);
            await moveTo('btn-save', 700);
            await click();
            setModal(false);
            setScheduled(true);
            setToast(true);
            await wait(700);
            await moveTo('hearing-new', 700);
            await wait(900);
            await moveTo('nav-calendar', 900);
            await click();
            setToast(false);
            setView('calendar');
            scrollRef.current?.scrollTo({ top: 0 });
            await wait(1100);
            await moveTo('event-new', 900);
            await click();
            setPopover(true);
            await wait(3800);
        }

        (async () => {
            try {
                while (running.current) {
                    await script();
                }
            } catch (error) {
                if (error !== CANCELLED) throw error;
            }
        })();

        return () => {
            running.current = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [reduce]);

    const nav: [string, ReactNode, View | null][] = [
        [t('Dashboard'), <LayoutDashboard key="d" className="size-3.5" />, null],
        [t('Court diary'), <BookOpen key="b" className="size-3.5" />, null],
        [t('Cases'), <Briefcase key="c" className="size-3.5" />, 'cases'],
        [t('Calendar'), <CalendarDays key="ca" className="size-3.5" />, 'calendar'],
        [t('Clients'), <Users key="u" className="size-3.5" />, null],
        [t('Documents'), <FileText key="f" className="size-3.5" />, null],
        [t('Drafting'), <Scale key="s" className="size-3.5" />, null],
        [t('Invoices'), <Receipt key="r" className="size-3.5" />, null],
    ];
    const activeNav: View = view === 'case' ? 'cases' : view;

    return (
        <div
            ref={frameRef}
            dir="ltr"
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            className="relative h-[30rem] select-none overflow-hidden rounded-xl border border-navy-200 bg-white text-[11px] leading-snug text-navy-900 shadow-[0_30px_60px_-30px_rgba(15,30,54,0.45)] sm:h-[34rem] dark:border-navy-700 dark:bg-navy-950 dark:text-navy-50"
            role="img"
            aria-label={t('Animated demo: a lawyer schedules a hearing from a case and it appears on the calendar')}
        >
            {/* Browser chrome */}
            <div className="flex h-8 items-center gap-2 border-b border-navy-100 bg-navy-50 px-3 dark:border-navy-800 dark:bg-navy-900">
                <span className="size-2.5 rounded-full bg-red-400" /><span className="size-2.5 rounded-full bg-gold-400" /><span className="size-2.5 rounded-full bg-verdant-400" />
                <div className="mx-auto flex h-5 w-1/2 items-center justify-center rounded bg-white px-2 text-[10px] text-navy-400 ring-1 ring-navy-100 dark:bg-navy-950 dark:ring-navy-800">
                    {view === 'calendar' ? '/calendar' : view === 'case' ? '/cases/1842-b-2026' : '/cases'}
                </div>
            </div>

            <div className="flex h-[calc(100%-2rem)]">
                {/* Sidebar */}
                <aside className="hidden w-36 shrink-0 flex-col bg-navy-900 p-2 text-navy-200 sm:flex">
                    <div className="mb-3 flex items-center gap-1.5 px-1.5 pt-1 text-[12px] font-semibold text-white">
                        <span className="grid size-5 place-items-center rounded bg-gold-500 text-[10px] text-navy-950">W</span> Wakeel Diary
                    </div>
                    {nav.map(([label, icon, key]) => (
                        <div key={label} data-demo={key === 'calendar' ? 'nav-calendar' : undefined} className={cn('mb-0.5 flex items-center gap-2 rounded-md px-2 py-1.5', key === activeNav ? 'bg-white/10 font-medium text-white' : 'opacity-80')}>
                            {icon}{label}
                        </div>
                    ))}
                    <div className="mt-auto rounded-md bg-white/5 p-2 text-[10px]">
                        <p className="font-medium text-white">{t('Tomorrow')}</p>
                        <p className="opacity-80">{t('4 hearings, 2 tasks')}</p>
                    </div>
                </aside>

                <div className="flex min-w-0 flex-1 flex-col">
                    {/* App top bar */}
                    <div className="flex h-10 shrink-0 items-center gap-2 border-b border-navy-100 px-3 dark:border-navy-800">
                        <div className="flex h-6 flex-1 items-center gap-1.5 rounded-md bg-navy-50 px-2 text-navy-400 dark:bg-navy-900"><Search className="size-3" />{t('Search cases, clients, FIRs')}</div>
                        <span data-demo="nav-calendar" className={cn('grid size-6 place-items-center rounded-md sm:hidden', activeNav === 'calendar' ? 'bg-navy-900 text-white' : 'text-navy-400')}><CalendarDays className="size-3.5" /></span>
                        <Bell className="size-3.5 text-navy-400" />
                        <div className="flex items-center gap-1.5">
                            <span className="grid size-6 place-items-center rounded-full bg-gold-100 text-[10px] font-semibold text-gold-700">AR</span>
                            <span className="hidden font-medium md:inline">Adv. Ayesha Rana</span>
                        </div>
                    </div>

                    <div ref={scrollRef} className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain bg-navy-50/50 p-3 dark:bg-navy-950 [scrollbar-width:thin]">
                        <AnimatePresence mode="wait" initial={false}>
                            <motion.div key={view} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
                                {view === 'cases' && <CasesView />}
                                {view === 'case' && <CaseView scheduled={scheduled} values={FINAL} />}
                                {view === 'calendar' && <CalendarView target={target} scheduled={scheduled} popover={popover} values={FINAL} />}
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </div>
            </div>

            {/* Schedule hearing dialog */}
            <AnimatePresence>
                {modal && (
                    <motion.div className="absolute inset-0 z-20 grid place-items-center bg-navy-950/40 p-3 backdrop-blur-[1px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        <motion.div initial={{ scale: 0.96, y: 8 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.97, opacity: 0 }} transition={{ duration: 0.22 }} className="w-full max-w-sm rounded-xl bg-white p-4 shadow-2xl ring-1 ring-navy-100 dark:bg-navy-900 dark:ring-navy-700">
                            <div className="mb-3 flex items-center gap-2">
                                <span className="grid size-7 place-items-center rounded-lg bg-gold-50 text-gold-700"><Gavel className="size-3.5" /></span>
                                <div>
                                    <p className="text-[13px] font-semibold">{t('Schedule hearing')}</p>
                                    <p className="text-[10px] text-navy-500">State vs. Muhammad Arshad</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <DemoInput name="date" label={t('Date')} value={values.date} focused={focused === 'date'} icon={<CalendarDays className="size-3" />} />
                                <DemoInput name="time" label={t('Time')} value={values.time} focused={focused === 'time'} icon={<Clock className="size-3" />} />
                                {(['court', 'judge', 'district', 'area'] as const).map((field) => (
                                    <DemoSelect key={field} name={field} wide={field === 'court' || field === 'judge'}
                                        label={{ court: t('Court'), judge: t('Judge'), district: t('District'), area: t('Practice area') }[field]}
                                        value={values[field]} focused={focused === field} open={openSelect === field} options={SELECTS[field]} />
                                ))}
                                <div className="col-span-2">
                                    <p className="mb-0.5 text-[10px] font-medium text-navy-500">{t('Purpose')}</p>
                                    <div className="rounded-md border border-navy-200 px-2 py-1.5 dark:border-navy-700">{t('Arguments on bail')}</div>
                                </div>
                            </div>
                            <div className="mt-3 flex justify-end gap-2">
                                <span className="rounded-md px-3 py-1.5 font-medium text-navy-600 ring-1 ring-navy-200 dark:text-navy-200 dark:ring-navy-700">{t('Cancel')}</span>
                                <span data-demo="btn-save" className="rounded-md bg-navy-900 px-3 py-1.5 font-medium text-white dark:bg-gold-500 dark:text-navy-950">{t('Save hearing')}</span>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Toast */}
            <AnimatePresence>
                {toast && (
                    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} className="absolute bottom-3 right-3 z-30 flex items-center gap-2 rounded-lg bg-navy-900 px-3 py-2 text-white shadow-lg">
                        <CheckCircle2 className="size-3.5 text-verdant-300" />
                        <span>{t('Hearing scheduled')} · {FINAL.date}, {FINAL.time}</span>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Paused hint */}
            <AnimatePresence>
                {hovered && !reduce && (
                    <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="pointer-events-none absolute right-3 top-10 z-40 flex items-center gap-1.5 rounded-full bg-navy-900/85 px-2.5 py-1 text-[10px] text-white shadow">
                        <MousePointerClick className="size-3" /> {t('Paused · scroll to explore')}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Cursor and click ripple */}
            {!reduce && (
                <>
                    <AnimatePresence>
                        {ripple && (
                            <motion.span key={ripple.id} className="pointer-events-none absolute z-50 size-8 rounded-full bg-gold-400/40" style={{ left: ripple.x - 16, top: ripple.y - 16 }}
                                initial={{ scale: 0.2, opacity: 0.9 }} animate={{ scale: 1.4, opacity: 0 }} transition={{ duration: 0.5 }} onAnimationComplete={() => setRipple(null)} />
                        )}
                    </AnimatePresence>
                    <motion.div className="pointer-events-none absolute left-0 top-0 z-50" initial={false}
                        animate={{ x: cursor.x - 3, y: cursor.y - 2, opacity: cursor.visible ? 1 : 0, scale: pressed ? 0.85 : 1 }}
                        transition={{ x: { duration: 0.7, ease: [0.45, 0, 0.2, 1] }, y: { duration: 0.7, ease: [0.45, 0, 0.2, 1] }, scale: { duration: 0.1 } }}>
                        <svg width="20" height="22" viewBox="0 0 20 22" className="drop-shadow-md">
                            <path d="M2 1.5 L2 17.5 L6.4 13.4 L9.3 20 L12.2 18.7 L9.4 12.2 L15.5 12.2 Z" fill="#0f1e36" stroke="#fff" strokeWidth="1.4" strokeLinejoin="round" />
                        </svg>
                    </motion.div>
                </>
            )}
        </div>
    );
}

function CasesView() {
    const t = useT();
    return (
        <div>
            <div className="mb-3 flex items-center justify-between">
                <div>
                    <p className="text-[14px] font-semibold">{t('Cases')}</p>
                    <p className="text-[10px] text-navy-500">{t('48 cases · 31 active')}</p>
                </div>
                <span className="flex items-center gap-1 rounded-md bg-navy-900 px-2.5 py-1.5 font-medium text-white dark:bg-gold-500 dark:text-navy-950"><Plus className="size-3" />{t('New case')}</span>
            </div>
            <div className="mb-2 flex gap-1.5">
                {[t('All 48'), t('Active 31'), t('Reserved 4'), t('Disposed 13')].map((tab, i) => (
                    <span key={tab} className={cn('rounded-full px-2.5 py-1', i === 0 ? 'bg-navy-900 text-white dark:bg-white dark:text-navy-950' : 'bg-white ring-1 ring-navy-100 dark:bg-navy-900 dark:ring-navy-800')}>{tab}</span>
                ))}
            </div>
            <div className="overflow-hidden rounded-lg bg-white ring-1 ring-navy-100 dark:bg-navy-900 dark:ring-navy-800">
                <div className="grid grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_auto] gap-2 border-b border-navy-100 px-3 py-2 text-[10px] font-medium uppercase tracking-wide text-navy-400 sm:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_5rem_auto] dark:border-navy-800">
                    <span>{t('Case')}</span><span>{t('Court')}</span><span className="hidden sm:block">{t('Next date')}</span><span>{t('Status')}</span>
                </div>
                {CASES.map(([title, court, kind, status], i) => (
                    <div key={title} data-demo={i === 1 ? 'case-target' : undefined} className={cn('grid grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_auto] items-center gap-2 border-b border-navy-50 px-3 py-2 last:border-0 sm:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_5rem_auto] dark:border-navy-800/60', i === 1 && 'bg-gold-50/40 dark:bg-gold-500/5')}>
                        <div className="min-w-0">
                            <p className="truncate font-medium">{title}</p>
                            <p className="truncate text-[10px] text-navy-500">{kind}</p>
                        </div>
                        <span className="truncate text-navy-600 dark:text-navy-300">{court}</span>
                        <span className="hidden tabular-nums text-navy-500 sm:block">{`${(i * 3 + 14) % 28 + 1} Nov`}</span>
                        <span className={cn('rounded-full px-2 py-0.5 text-[10px] ring-1 ring-inset', statusTone[status])}>{status}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

function CaseView({ scheduled, values }: { scheduled: boolean; values: Required<Values> }) {
    const t = useT();
    const past = [
        ['28 Oct 2026', t('Notice issued to the State; report and record called')],
        ['14 Oct 2026', t('Petition filed; fixed for preliminary hearing')],
    ];
    return (
        <div className="space-y-3">
            <div className="flex items-center gap-1 text-[10px] text-navy-500"><ChevronLeft className="size-3" />{t('Cases')}</div>
            <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                    <p className="text-[15px] font-semibold">State vs. Muhammad Arshad</p>
                    <p className="text-[10px] text-navy-500">Crl. Misc. 1842-B/2026 · {t('Post-arrest bail')}</p>
                    <div className="mt-1.5 flex gap-1">
                        <span className="rounded-full bg-verdant-50 px-2 py-0.5 text-[10px] text-verdant-700 ring-1 ring-verdant-200">{t('Active')}</span>
                        <span className="rounded-full bg-navy-50 px-2 py-0.5 text-[10px] text-navy-600 ring-1 ring-navy-200 dark:bg-navy-900 dark:text-navy-300">{t('Criminal law')}</span>
                    </div>
                </div>
                <div className="flex gap-1.5">
                    <span className="rounded-md px-2.5 py-1.5 font-medium ring-1 ring-navy-200 dark:ring-navy-700">{t('Add task')}</span>
                    <span data-demo="btn-schedule" className="flex items-center gap-1 rounded-md bg-navy-900 px-2.5 py-1.5 font-medium text-white dark:bg-gold-500 dark:text-navy-950"><Gavel className="size-3" />{t('Schedule hearing')}</span>
                </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
                <DemoCard title={t('Parties, FIR and sections')}>
                    <Row k={t('Petitioner')} v="Muhammad Arshad s/o Ghulam Rasool" />
                    <Row k={t('Respondent')} v={t('The State')} />
                    <Row k={t('FIR')} v="412/2026 · PS Civil Lines" />
                    <Row k={t('Sections')} v="324, 34 PPC" />
                </DemoCard>
                <DemoCard title={t('Court and judge')}>
                    <Row k={t('Court')} v={values.court} />
                    <Row k={t('Judge')} v={values.judge} />
                    <Row k={t('District')} v={values.district} />
                    <Row k={t('Room')} v={t('Court No. 6, first floor')} />
                </DemoCard>
            </div>

            <DemoCard title={t('Hearings')}>
                <ol className="space-y-2">
                    <AnimatePresence>
                        {scheduled && (
                            <motion.li data-demo="hearing-new" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="overflow-hidden">
                                <div className="flex items-start gap-2 rounded-md bg-gold-50 p-2 ring-1 ring-gold-200 dark:bg-gold-500/10 dark:ring-gold-500/30">
                                    <span className="mt-1 size-1.5 shrink-0 rounded-full bg-gold-500" />
                                    <div className="min-w-0 flex-1">
                                        <p className="font-medium">{values.date} · {values.time} <span className="ms-1 rounded bg-gold-500 px-1 text-[9px] text-navy-950">{t('New')}</span></p>
                                        <p className="text-[10px] text-navy-500">{t('Arguments on bail')} · {values.court} · {values.judge}</p>
                                    </div>
                                </div>
                            </motion.li>
                        )}
                    </AnimatePresence>
                    {past.map(([date, note]) => (
                        <li key={date} className="flex items-start gap-2 p-2">
                            <span className="mt-1 size-1.5 shrink-0 rounded-full bg-navy-300" />
                            <div><p className="font-medium">{date}</p><p className="text-[10px] text-navy-500">{note}</p></div>
                        </li>
                    ))}
                </ol>
            </DemoCard>

            <div className="grid gap-3 md:grid-cols-2">
                <DemoCard title={t('Orders and judgments')}>
                    <Row k="28 Oct" v={t('Notice to the State for the next date')} />
                    <Row k="14 Oct" v={t('Admitted for regular hearing')} />
                </DemoCard>
                <DemoCard title={t('Tasks, fees and expenses')}>
                    <Row k={t('Task')} v={t('Get certified copy of FIR · Bilal')} />
                    <Row k={t('Fee')} v="Rs 80,000 · Rs 50,000 paid" />
                    <Row k={t('Expense')} v="Rs 1,500 · copying fee" />
                </DemoCard>
            </div>
        </div>
    );
}

function CalendarView({ target, scheduled, popover, values }: { target: Date; scheduled: boolean; popover: boolean; values: Required<Values> }) {
    const t = useT();
    const year = target.getFullYear();
    const month = target.getMonth();
    const days = new Date(year, month + 1, 0).getDate();
    const lead = (new Date(year, month, 1).getDay() + 6) % 7;
    const today = new Date();
    const sample: Record<number, [string, string][]> = {};
    [[3, '10:00', 'Bail · Kasur'], [5, '09:00', 'Rent · LHR'], [9, '11:30', 'Custody'], [12, '09:30', 'Writ · LHC'], [16, '10:00', 'Recovery'], [21, '12:00', 'Evidence · ATC'], [24, '09:00', 'Maintenance'], [27, '11:00', 'Injunction']]
        .forEach(([day, time, label]) => {
            const d = Number(day);
            if (d <= days && d !== target.getDate()) (sample[d] ??= []).push([String(time), String(label)]);
        });

    return (
        <div>
            <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <p className="text-[14px] font-semibold">{target.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</p>
                    <span className="flex gap-0.5 text-navy-400"><ChevronLeft className="size-3.5" /><ChevronRight className="size-3.5" /></span>
                </div>
                <div className="flex rounded-md bg-white p-0.5 ring-1 ring-navy-100 dark:bg-navy-900 dark:ring-navy-800">
                    {[t('Month'), t('Week'), t('List')].map((label, i) => <span key={label} className={cn('rounded px-2 py-0.5', i === 0 && 'bg-navy-900 text-white dark:bg-white dark:text-navy-950')}>{label}</span>)}
                </div>
            </div>
            <div className="relative overflow-visible rounded-lg bg-white ring-1 ring-navy-100 dark:bg-navy-900 dark:ring-navy-800">
                <div className="grid grid-cols-7 border-b border-navy-100 text-center text-[10px] font-medium text-navy-400 dark:border-navy-800">
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => <span key={d} className="py-1.5">{d}</span>)}
                </div>
                <div className="grid grid-cols-7">
                    {Array.from({ length: lead }).map((_, i) => <div key={`l${i}`} className="min-h-16 border-b border-r border-navy-50 bg-navy-50/40 dark:border-navy-800/60 dark:bg-navy-950/40" />)}
                    {Array.from({ length: days }, (_, i) => i + 1).map((day) => {
                        const isTarget = day === target.getDate();
                        const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
                        const column = (lead + day - 1) % 7;
                        return (
                            <div key={day} className="relative min-h-16 border-b border-r border-navy-50 p-1 dark:border-navy-800/60">
                                <span className={cn('inline-grid size-4 place-items-center rounded-full text-[10px]', isToday ? 'bg-navy-900 font-semibold text-white dark:bg-white dark:text-navy-950' : 'text-navy-500')}>{day}</span>
                                <div className="mt-0.5 space-y-0.5">
                                    {(sample[day] ?? []).map(([time, label]) => (
                                        <p key={label} className="truncate rounded bg-navy-50 px-1 text-[9px] text-navy-700 dark:bg-navy-800 dark:text-navy-200">{time} {label}</p>
                                    ))}
                                    {isTarget && scheduled && (
                                        <motion.p data-demo="event-new" initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 380, damping: 18, delay: 0.35 }}
                                            className="truncate rounded bg-gold-500 px-1 text-[9px] font-medium text-navy-950 ring-2 ring-gold-300/60">
                                            09:30 State vs. Arshad
                                        </motion.p>
                                    )}
                                </div>
                                <AnimatePresence>
                                    {isTarget && popover && (
                                        <motion.div initial={{ opacity: 0, y: 6, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0 }}
                                            className={cn('absolute top-full z-10 mt-1 w-52 rounded-lg bg-white p-3 text-left shadow-xl ring-1 ring-navy-100 dark:bg-navy-900 dark:ring-navy-700', column > 3 ? 'right-0' : 'left-0')}>
                                            <p className="text-[12px] font-semibold">State vs. Muhammad Arshad</p>
                                            <p className="mb-2 text-[10px] text-navy-500">{t('Arguments on bail')}</p>
                                            <div className="space-y-1">
                                                <PopRow icon={<Clock className="size-3" />} text={`${values.date}, ${values.time}`} />
                                                <PopRow icon={<Gavel className="size-3" />} text={values.court} />
                                                <PopRow icon={<Scale className="size-3" />} text={values.judge} />
                                                <PopRow icon={<MapPin className="size-3" />} text={values.district} />
                                                <PopRow icon={<Briefcase className="size-3" />} text={values.area} />
                                            </div>
                                            <p className="mt-2 rounded-md bg-navy-900 py-1 text-center font-medium text-white dark:bg-gold-500 dark:text-navy-950">{t('Open case')}</p>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        );
                    })}
                </div>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
                {[[t('This week'), '7'], [t('This month'), '23'], [t('Reminders sent'), '41']].map(([label, value]) => (
                    <div key={label} className="rounded-lg bg-white p-2 ring-1 ring-navy-100 dark:bg-navy-900 dark:ring-navy-800">
                        <p className="text-[10px] text-navy-500">{label}</p><p className="text-[14px] font-semibold">{value}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}

function DemoCard({ title, children }: { title: string; children: ReactNode }) {
    return (
        <div className="rounded-lg bg-white p-3 ring-1 ring-navy-100 dark:bg-navy-900 dark:ring-navy-800">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-navy-400">{title}</p>
            <div className="space-y-1.5">{children}</div>
        </div>
    );
}

function Row({ k, v }: { k: string; v: string }) {
    return <div className="flex gap-2"><span className="w-16 shrink-0 text-navy-500">{k}</span><span className="min-w-0 truncate font-medium">{v}</span></div>;
}

function PopRow({ icon, text }: { icon: ReactNode; text: string }) {
    return <p className="flex items-center gap-1.5 text-[10px] text-navy-600 dark:text-navy-300"><span className="text-gold-600">{icon}</span><span className="truncate">{text}</span></p>;
}

function DemoInput({ name, label, value, focused, icon }: { name: Field; label: string; value?: string; focused: boolean; icon: ReactNode }) {
    return (
        <div data-demo={`field-${name}`}>
            <p className="mb-0.5 text-[10px] font-medium text-navy-500">{label}</p>
            <div className={cn('flex h-7 items-center gap-1.5 rounded-md border px-2 transition', focused ? 'border-gold-500 ring-2 ring-gold-500/25' : 'border-navy-200 dark:border-navy-700')}>
                <span className="text-navy-400">{icon}</span>
                <span className={cn('truncate', !value && 'text-navy-300')}>{value || label}</span>
                {focused && <motion.span className="h-3 w-px bg-navy-900 dark:bg-white" animate={{ opacity: [1, 0] }} transition={{ repeat: Infinity, duration: 0.6 }} />}
            </div>
        </div>
    );
}

function DemoSelect({ name, label, value, focused, open, options, wide }: { name: string; label: string; value?: string; focused: boolean; open: boolean; options: string[]; wide: boolean }) {
    return (
        <div className={cn('relative', wide && 'col-span-2')}>
            <p className="mb-0.5 text-[10px] font-medium text-navy-500">{label}</p>
            <div data-demo={`field-${name}`} className={cn('flex h-7 items-center justify-between rounded-md border px-2 transition', focused ? 'border-gold-500 ring-2 ring-gold-500/25' : 'border-navy-200 dark:border-navy-700')}>
                <span className={cn('truncate', !value && 'text-navy-300')}>{value || `${label}…`}</span>
                <ChevronDown className="size-3 text-navy-400" />
            </div>
            <AnimatePresence>
                {open && (
                    <motion.ul initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="absolute inset-x-0 top-full z-10 mt-1 rounded-md bg-white p-1 shadow-lg ring-1 ring-navy-100 dark:bg-navy-800 dark:ring-navy-700">
                        {options.map((option, i) => (
                            <li key={option} data-demo={`opt-${name}-${i}`} className={cn('rounded px-2 py-1', i === CHOICE && 'bg-navy-50 dark:bg-navy-700')}>{option}</li>
                        ))}
                    </motion.ul>
                )}
            </AnimatePresence>
        </div>
    );
}
