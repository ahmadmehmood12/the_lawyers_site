import { AnimatePresence, animate, motion, useMotionValue, useMotionValueEvent, useReducedMotion, type MotionValue } from 'framer-motion';
import { ArrowLeft, BatteryFull, Camera, Flashlight, CheckCheck, CheckCircle2, ChevronRight, Clock, Gavel, History, MapPin, MessageCircle, Phone, Signal, Video, Wifi } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { BrandMark, BrandName, PersonaAvatar, useBrand, usePersona } from '@/Components/demo/engine';
import { cn } from '@/lib/cn';
import { useT } from '@/lib/i18n';

/**
 * Phone-sized story of one hearing (docs/Features/Home-Page.md#demos), driven by a 0→1 progress value:
 * the cause list, the order recorded at the bench, saving, the case history growing, then the client's
 * phone receiving the WhatsApp reminder in English and Urdu. On the homepage progress is the scroll
 * position (so scrolling up rewinds); elsewhere useAutoProgress() plays it on a loop.
 */

export const PHONE_STAGES = { list: [0, 0.16], order: [0.16, 0.4], save: [0.4, 0.48], history: [0.48, 0.62], lock: [0.62, 0.78], chat: [0.78, 1] } as const;
type Stage = keyof typeof PHONE_STAGES;

const clamp = (v: number) => Math.min(1, Math.max(0, v));
export const stageProgress = (p: number, [a, b]: readonly [number, number]) => clamp((p - a) / (b - a));

const ORDER_TEXT = 'Arguments on bail heard in part. Learned DDPP seeks time to produce the police record. Adjourned for remaining arguments.';
const NEXT_DATE = '25 Nov 2026';

/** Loops 0→1 over `duration` seconds for places without a scroll story (sign-in pages). */
export function useAutoProgress(duration = 22): MotionValue<number> {
    const value = useMotionValue(0);
    const reduce = useReducedMotion();
    useEffect(() => {
        if (reduce) {
            value.set(0.9);
            return;
        }
        const controls = animate(value, [0, 1], { duration, ease: 'linear', repeat: Infinity, repeatDelay: 2.5 });
        return () => controls.stop();
    }, [duration, reduce, value]);
    return value;
}

export function useProgressState(progress: MotionValue<number>): number {
    const [p, setP] = useState(progress.get());
    useMotionValueEvent(progress, 'change', (v) => setP(Math.round(v * 500) / 500));
    return p;
}

export function HearingPhone({ progress, className }: { progress: MotionValue<number>; className?: string }) {
    const t = useT();
    const p = useProgressState(progress);
    const stage = (Object.keys(PHONE_STAGES) as Stage[]).find((key) => p <= PHONE_STAGES[key][1]) ?? 'chat';
    const local = stageProgress(p, PHONE_STAGES[stage]);
    const client = stage === 'lock' || stage === 'chat';

    return (
        <div className={cn('relative', className)}>
            <div className="absolute inset-x-0 -top-9 z-10 flex justify-center">
                <AnimatePresence mode="wait">
                    <motion.p key={client ? 'client' : 'lawyer'} initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        className="whitespace-nowrap rounded-full bg-navy-900 px-3 py-1 text-[11px] font-medium text-white shadow dark:bg-gold-500 dark:text-navy-950">
                        {client ? t('Client’s phone · Muhammad Arshad') : t('Advocate’s phone, in court')}
                    </motion.p>
                </AnimatePresence>
            </div>
            {/* Device: titanium frame, side buttons, dynamic island */}
            <div className="relative mx-auto aspect-[430/932] h-full rounded-[3.1rem] bg-gradient-to-b from-[#3a3a3c] via-[#1c1c1e] to-[#3a3a3c] p-[7px] shadow-[0_40px_80px_-30px_rgba(0,0,0,0.6)]" role="img" aria-label={t('Animated phone: recording an order in court and the client receiving the WhatsApp reminder')}>
                <span className="absolute -left-[3px] top-[18%] h-[6%] w-[3px] rounded-l bg-[#2c2c2e]" />
                <span className="absolute -left-[3px] top-[27%] h-[9%] w-[3px] rounded-l bg-[#2c2c2e]" />
                <span className="absolute -right-[3px] top-[24%] h-[12%] w-[3px] rounded-r bg-[#2c2c2e]" />
                <div dir="ltr" className="relative size-full overflow-hidden rounded-[2.65rem] bg-white text-[12px] text-navy-900 dark:bg-navy-950 dark:text-navy-50">
                    <span className="absolute left-1/2 top-2 z-30 h-[26px] w-[32%] -translate-x-1/2 rounded-full bg-black" />
                    <StatusBar light={stage === 'lock'} />
                    <AnimatePresence mode="popLayout" initial={false}>
                        <motion.div key={stage === 'save' ? 'order' : stage} className="absolute inset-0" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.3 }}>
                            {stage === 'list' && <CauseList local={local} />}
                            {(stage === 'order' || stage === 'save') && <OrderSheet stage={stage} local={local} />}
                            {stage === 'history' && <HistoryScreen local={local} />}
                            {stage === 'lock' && <LockScreen local={local} />}
                            {stage === 'chat' && <WhatsAppChat local={local} />}
                        </motion.div>
                    </AnimatePresence>
                    <span className={cn('absolute bottom-1.5 left-1/2 z-30 h-1 w-1/3 -translate-x-1/2 rounded-full', stage === 'lock' ? 'bg-white/80' : 'bg-navy-900/80 dark:bg-white/70')} />
                </div>
            </div>
        </div>
    );
}

function StatusBar({ light }: { light: boolean }) {
    return (
        <div className={cn('absolute inset-x-0 top-0 z-20 flex h-11 items-center justify-between px-7 pt-1 text-[12px] font-semibold', light ? 'text-white' : 'text-navy-900 dark:text-white')}>
            <span>10:24</span>
            <span className="flex items-center gap-1"><Signal className="size-3.5" /><Wifi className="size-3.5" /><BatteryFull className="size-4" /></span>
        </div>
    );
}

function AppHeader({ title, back }: { title: string; back?: boolean }) {
    return (
        <div className="flex items-center gap-2 bg-navy-900 px-4 pb-3 pt-12 text-white">
            {back ? <ArrowLeft className="size-4" /> : <BrandMark className="size-6" />}
            <div className="min-w-0 flex-1">
                <p className="text-[10px] opacity-70"><BrandName className="text-[10px]" /></p>
                <p className="truncate text-[14px] font-semibold">{title}</p>
            </div>
            <PersonaAvatar className="size-8 ring-white/30" />
        </div>
    );
}

function Tap({ show }: { show: boolean }) {
    return (
        <AnimatePresence>
            {show && <motion.span initial={{ scale: 0.3, opacity: 0.8 }} animate={{ scale: 1.6, opacity: 0 }} transition={{ duration: 0.6, repeat: Infinity }} className="pointer-events-none absolute right-6 top-1/2 size-10 -translate-y-1/2 rounded-full bg-gold-400/50" />}
        </AnimatePresence>
    );
}

function CauseList({ local }: { local: number }) {
    const t = useT();
    const items = [
        ['7', 'Nadia Bibi vs. Imran Ali', 'Family Court · Room 2', '09:00', 'Done'],
        ['14', 'State vs. Muhammad Arshad', 'Sessions Court · Room 6', '09:30', 'Called'],
        ['22', 'Saima Akhtar vs. Federation', 'High Court · Court 14', '11:00', 'Waiting'],
        ['31', 'Shahid Latif vs. LDA', 'High Court · Court 14', '11:40', 'Waiting'],
        ['9', 'Zahid Hussain vs. WAPDA', 'Civil Courts · Room 11', '12:30', 'Waiting'],
    ];
    return (
        <div className="flex h-full flex-col bg-navy-50/60 dark:bg-navy-950">
            <AppHeader title={t('Cause list · Today')} />
            <div className="flex gap-1.5 px-4 py-3 text-[10px]">
                {[t('All 5'), t('Lahore'), t('High Court')].map((chip, i) => <span key={chip} className={cn('rounded-full px-2.5 py-1', i === 0 ? 'bg-navy-900 text-white' : 'bg-white ring-1 ring-navy-100 dark:bg-navy-900 dark:ring-navy-800')}>{chip}</span>)}
            </div>
            <div className="space-y-2 px-3">
                {items.map(([item, title, court, time, status], i) => {
                    const target = i === 1;
                    return (
                        <motion.div key={title} initial={{ opacity: 0, y: 10 }} animate={{ opacity: local > i * 0.08 ? 1 : 0, y: local > i * 0.08 ? 0 : 10 }}
                            className={cn('relative flex items-center gap-2.5 rounded-xl bg-white p-2.5 ring-1 ring-navy-100 dark:bg-navy-900 dark:ring-navy-800', target && local > 0.45 && 'ring-2 ring-gold-400')}>
                            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-navy-50 text-[11px] font-bold tabular-nums dark:bg-navy-800">#{item}</span>
                            <div className="min-w-0 flex-1">
                                <p className="truncate font-semibold">{title}</p>
                                <p className="truncate text-[10px] text-navy-500">{court} · {time}</p>
                            </div>
                            {target && local > 0.45
                                ? <motion.span animate={{ scale: [1, 1.08, 1] }} transition={{ repeat: Infinity, duration: 1 }} className="rounded-full bg-gold-500 px-2 py-0.5 text-[9px] font-bold text-navy-950">{t('Now')}</motion.span>
                                : <span className={cn('text-[9px]', status === 'Done' ? 'text-verdant-600' : 'text-navy-400')}>{status}</span>}
                            {target && <Tap show={local > 0.8} />}
                        </motion.div>
                    );
                })}
            </div>
            <p className="mt-3 px-4 text-[10px] text-navy-500">{t('Bring: police file copy, surety bonds.')}</p>
        </div>
    );
}

function OrderSheet({ stage, local }: { stage: Stage; local: number }) {
    const t = useT();
    const sheet = stage === 'save' ? 1 : clamp(local * 5);
    const typed = stage === 'save' ? ORDER_TEXT : ORDER_TEXT.slice(0, Math.round(ORDER_TEXT.length * clamp((local - 0.2) / 0.45)));
    const outcome = stage === 'save' || local > 0.7;
    const date = stage === 'save' || local > 0.8;
    const purpose = stage === 'save' || local > 0.9;
    const saving = stage === 'save' && local < 0.55;
    const saved = stage === 'save' && local >= 0.55;
    return (
        <div className="relative h-full bg-navy-50/60 dark:bg-navy-950">
            <AppHeader title="State vs. Muhammad Arshad" back />
            <div className="space-y-2 p-3 text-[10px] text-navy-600 dark:text-navy-300">
                <p className="flex items-center gap-1"><Gavel className="size-3" /> Sessions Court, Lahore · Room 6</p>
                <p className="flex items-center gap-1"><MapPin className="size-3" /> Mr. Kamran Aziz, ASJ</p>
            </div>
            <motion.div className="absolute inset-x-0 bottom-0 rounded-t-3xl bg-white p-4 shadow-[0_-12px_30px_-10px_rgba(0,0,0,0.25)] dark:bg-navy-900" style={{ y: `${(1 - sheet) * 100}%` }}>
                <span className="mx-auto mb-3 block h-1 w-10 rounded-full bg-navy-200" />
                <p className="mb-2 text-[14px] font-semibold">{t('Record the order')}</p>
                <p className="mb-1 text-[10px] font-medium text-navy-500">{t('Proceedings')}</p>
                <div className="mb-2 min-h-[4.5rem] rounded-xl border border-gold-400 p-2 text-[11px] leading-snug ring-2 ring-gold-400/20">
                    {typed}{!saved && typed.length < ORDER_TEXT.length && <motion.span className="ms-px inline-block h-3 w-px translate-y-0.5 bg-navy-900 dark:bg-white" animate={{ opacity: [1, 0] }} transition={{ repeat: Infinity, duration: 0.5 }} />}
                </div>
                <p className="mb-1 text-[10px] font-medium text-navy-500">{t('Outcome')}</p>
                <div className="mb-2 flex flex-wrap gap-1.5">
                    {[t('Arguments heard'), t('Adjourned'), t('Order reserved')].map((chip, i) => (
                        <span key={chip} className={cn('rounded-full px-2.5 py-1 text-[10px] ring-1 ring-inset transition', i === 1 && outcome ? 'bg-navy-900 text-white ring-navy-900 dark:bg-gold-500 dark:text-navy-950' : 'ring-navy-200 dark:ring-navy-700')}>{chip}</span>
                    ))}
                </div>
                <div className="mb-3 grid grid-cols-2 gap-2">
                    <div><p className="mb-1 text-[10px] font-medium text-navy-500">{t('Next date')}</p><div className="flex h-8 items-center gap-1 rounded-lg border border-navy-200 px-2 dark:border-navy-700"><Clock className="size-3 text-navy-400" />{date ? <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }}>{NEXT_DATE}</motion.span> : ''}</div></div>
                    <div><p className="mb-1 text-[10px] font-medium text-navy-500">{t('For')}</p><div className="flex h-8 items-center rounded-lg border border-navy-200 px-2 dark:border-navy-700">{purpose ? t('Arguments') : ''}</div></div>
                </div>
                <motion.div animate={{ scale: stage === 'save' && local < 0.2 ? 0.96 : 1 }} className={cn('flex h-10 items-center justify-center gap-2 rounded-xl font-semibold text-white', saved ? 'bg-verdant-600' : 'bg-navy-900 dark:bg-gold-500 dark:text-navy-950')}>
                    {saving && <motion.span className="size-4 rounded-full border-2 border-white/40 border-t-white" animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.7, ease: 'linear' }} />}
                    {saved ? <><CheckCircle2 className="size-4" />{t('Order saved')}</> : saving ? t('Saving…') : t('Save order and next date')}
                </motion.div>
            </motion.div>
        </div>
    );
}

function HistoryScreen({ local }: { local: number }) {
    const t = useT();
    const persona = usePersona();
    const fresh: [number, ReactNode, string, string][] = [
        [0.1, <Gavel key="g" className="size-3.5" />, t('Order recorded · Adjourned'), t('Arguments heard in part. Record to be produced.')],
        [0.35, <Clock key="c" className="size-3.5" />, `${t('Next date')} · ${NEXT_DATE}, 9:30 AM`, t('Remaining arguments on bail')],
        [0.6, <MessageCircle key="m" className="size-3.5" />, t('Client told on WhatsApp'), t('English and Urdu · delivered')],
    ];
    const older = [['28 Oct 2026', t('Notice to the State; record called')], ['14 Oct 2026', t('Petition filed; fixed for hearing')]];
    return (
        <div className="h-full bg-navy-50/60 dark:bg-navy-950">
            <AppHeader title={t('Case history')} back />
            <div className="px-4 py-3">
                <p className="mb-3 flex items-center gap-1.5 text-[10px] text-navy-500"><History className="size-3.5" />{t('Every entry is kept. A correction never overwrites the original.')}</p>
                <ol className="relative space-y-2.5 border-s-2 border-navy-200 ps-4 dark:border-navy-700">
                    {fresh.map(([at, icon, title, body]) => (
                        <AnimatePresence key={title}>
                            {local > at && (
                                <motion.li initial={{ opacity: 0, x: 14, height: 0 }} animate={{ opacity: 1, x: 0, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="relative">
                                    <span className="absolute -start-[1.45rem] top-2 grid size-5 place-items-center rounded-full bg-gold-500 text-navy-950 ring-4 ring-navy-50 dark:ring-navy-950">{icon}</span>
                                    <div className="rounded-xl bg-white p-2.5 ring-1 ring-gold-200 dark:bg-navy-900 dark:ring-gold-500/30">
                                        <p className="font-semibold">{title} <span className="ms-1 rounded bg-gold-100 px-1 text-[9px] text-gold-700">{t('New')}</span></p>
                                        <p className="text-[10px] text-navy-500">{body}</p>
                                        <p className="mt-1 flex items-center gap-1 text-[9px] text-navy-400"><PersonaAvatar className="size-4 ring-0" />{persona.name} · {t('just now')}</p>
                                    </div>
                                </motion.li>
                            )}
                        </AnimatePresence>
                    ))}
                    {older.map(([date, body]) => (
                        <li key={date} className="relative">
                            <span className="absolute -start-[1.3rem] top-2 size-3 rounded-full bg-navy-300 ring-4 ring-navy-50 dark:ring-navy-950" />
                            <div className="rounded-xl bg-white p-2.5 ring-1 ring-navy-100 dark:bg-navy-900 dark:ring-navy-800"><p className="font-semibold">{date}</p><p className="text-[10px] text-navy-500">{body}</p></div>
                        </li>
                    ))}
                </ol>
            </div>
        </div>
    );
}

function WhatsAppGlyph({ className }: { className?: string }) {
    return <span className={cn('grid place-items-center rounded-full bg-[#25d366] text-white', className)}><MessageCircle className="size-[58%]" fill="currentColor" strokeWidth={0} /></span>;
}

function LockScreen({ local }: { local: number }) {
    const t = useT();
    const brand = useBrand();
    const shown = local > 0.18;
    const now = new Date();
    return (
        <div className="relative h-full bg-gradient-to-b from-navy-700 via-navy-900 to-navy-950 text-white">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(220,187,95,0.35),transparent_45%)]" />
            <div className="relative pt-16 text-center">
                <p className="text-[12px] opacity-80">{now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                <p className="font-sans text-[64px] font-semibold leading-none tracking-tight">11:42</p>
            </div>
            <AnimatePresence>
                {shown && (
                    <motion.div initial={{ y: -120, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -120, opacity: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 24 }}
                        className="relative mx-3 mt-6 rounded-2xl bg-white/85 p-3 text-navy-900 shadow-xl backdrop-blur">
                        <div className="mb-1 flex items-center gap-1.5 text-[10px] text-navy-500"><WhatsAppGlyph className="size-4" />WhatsApp<span className="ms-auto">{t('now')}</span></div>
                        <p className="text-[12px] font-semibold">{brand.name}</p>
                        <p className="line-clamp-2 text-[11px] leading-snug">{t('Your hearing in State vs. Muhammad Arshad is scheduled for :date at 9:30 AM.', { date: NEXT_DATE })}</p>
                        {local > 0.75 && <motion.span initial={{ scale: 0.3, opacity: 0.8 }} animate={{ scale: 1.5, opacity: 0 }} transition={{ duration: 0.6, repeat: Infinity }} className="absolute right-6 top-1/2 size-10 -translate-y-1/2 rounded-full bg-white/70" />}
                    </motion.div>
                )}
            </AnimatePresence>
            <div className="absolute inset-x-0 bottom-8 flex justify-between px-10 opacity-80"><span className="grid size-10 place-items-center rounded-full bg-white/15"><Flashlight className="size-4" /></span><span className="grid size-10 place-items-center rounded-full bg-white/15"><Camera className="size-4" /></span></div>
        </div>
    );
}

function WhatsAppChat({ local }: { local: number }) {
    const t = useT();
    const brand = useBrand();
    const persona = usePersona();
    const english = local > 0.1;
    const typing = local > 0.3 && local <= 0.48;
    const urdu = local > 0.48;
    const read = local > 0.75;
    const reply = local > 0.88;
    return (
        <div className="flex h-full flex-col bg-[#efe7dd] dark:bg-[#0b141a]">
            <div className="flex items-center gap-2 bg-[#008069] px-3 pb-2.5 pt-12 text-white dark:bg-[#1f2c34]">
                <ArrowLeft className="size-4" />
                <BrandMark className="size-8 rounded-full" />
                <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1 truncate text-[13px] font-semibold">{brand.name}<CheckCircle2 className="size-3.5 text-[#25d366]" fill="white" /></p>
                    <p className="text-[10px] opacity-80">{t('Business account')}</p>
                </div>
                <Video className="size-4" /><Phone className="size-4" />
            </div>
            <div className="flex-1 space-y-2 overflow-hidden px-3 py-3">
                <p className="mx-auto w-fit rounded-md bg-white/80 px-2 py-0.5 text-[9px] text-navy-500 dark:bg-[#182229] dark:text-navy-300">{t('Today')}</p>
                <AnimatePresence>
                    {english && (
                        <Bubble key="en" read={read}>
                            <p className="font-semibold">{t('Hearing scheduled')}</p>
                            <p>Dear Muhammad Arshad, your hearing in <b>State vs. Muhammad Arshad</b> (Crl. Misc. 1842-B/2026) is scheduled for <b>{NEXT_DATE} at 9:30 AM</b> before Mr. Kamran Aziz, ASJ, Sessions Court Lahore, Room 6.</p>
                            <p className="mt-1 text-[10px] opacity-70">{t('Your advocate')}: {persona.title}</p>
                        </Bubble>
                    )}
                    {typing && (
                        <motion.div key="typing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex w-fit gap-1 rounded-xl rounded-tl-none bg-white px-3 py-2.5 dark:bg-[#202c33]">
                            {[0, 1, 2].map((i) => <motion.span key={i} className="size-1.5 rounded-full bg-navy-400" animate={{ y: [0, -3, 0] }} transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.15 }} />)}
                        </motion.div>
                    )}
                    {urdu && (
                        <Bubble key="ur" read={read} rtl>
                            <p className="font-semibold">سماعت مقرر ہو گئی</p>
                            <p>محترم محمد ارشد، آپ کے مقدمہ <b>سرکار بنام محمد ارشد</b> کی اگلی سماعت <b>۲۵ نومبر ۲۰۲۶، صبح ساڑھے نو بجے</b> سیشن کورٹ لاہور، کمرہ نمبر ۶ میں مقرر ہے۔</p>
                        </Bubble>
                    )}
                    {reply && (
                        <motion.div key="reply" initial={{ opacity: 0, y: 8, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0 }} className="ms-auto w-fit max-w-[75%] rounded-xl rounded-tr-none bg-[#d9fdd3] px-2.5 py-1.5 text-[11px] dark:bg-[#005c4b] dark:text-white">
                            {t('Thank you, I will be there.')} <span className="ms-1 inline-flex items-center gap-0.5 text-[9px] opacity-60">10:43 <CheckCheck className="size-3 text-sky-500" /></span>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
            <div className="flex items-center gap-2 px-2 pb-6 pt-1">
                <div className="flex h-9 flex-1 items-center rounded-full bg-white px-3 text-[11px] text-navy-400 dark:bg-[#202c33]">{t('Message')}</div>
                <span className="grid size-9 place-items-center rounded-full bg-[#008069] text-white"><ChevronRight className="size-4" /></span>
            </div>
        </div>
    );
}

function Bubble({ children, read, rtl }: { children: ReactNode; read: boolean; rtl?: boolean }) {
    return (
        <motion.div initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 6 }} transition={{ type: 'spring', stiffness: 320, damping: 26 }}
            dir={rtl ? 'rtl' : 'ltr'} className={cn('relative w-fit max-w-[88%] rounded-xl rounded-tl-none bg-white px-2.5 py-1.5 text-[11px] leading-snug shadow-sm dark:bg-[#202c33] dark:text-white', rtl && 'font-urdu text-[12px] leading-[1.9]')}>
            {children}
            <span dir="ltr" className="mt-0.5 flex items-center justify-end gap-0.5 text-[9px] opacity-60">10:42 <CheckCheck className={cn('size-3', read ? 'text-sky-500' : 'text-navy-400')} /></span>
        </motion.div>
    );
}
