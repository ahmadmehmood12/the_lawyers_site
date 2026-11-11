import { usePage } from '@inertiajs/react';
import { AnimatePresence, motion, useInView, useReducedMotion } from 'framer-motion';
import { MousePointerClick, Scale } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { splitBrand } from '@/lib/brand';
import { cn } from '@/lib/cn';
import { useT } from '@/lib/i18n';
import type { DemoPersona, SharedProps } from '@/types';

/**
 * Shared engine for the drawn product demos (docs/Features/Home-Page.md#demos).
 * A script moves a cursor to `data-demo` targets measured live, clicks and types. Hovering
 * (or leaving the viewport) pauses it so visitors can scroll the inner screen. Colours use the
 * navy/gold tokens, so the green site theme recolours the sidebar and buttons automatically.
 */

export const CANCELLED = Symbol('cancelled');
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export type DemoTools = {
    wait: (ms: number) => Promise<void>;
    moveTo: (name: string, duration?: number) => Promise<void>;
    click: () => Promise<void>;
    type: (text: string, set: (value: string) => void, speed?: number, chunk?: number) => Promise<void>;
    scrollTop: () => void;
};

export function useDemoEngine(script: (tools: DemoTools) => Promise<void>) {
    const reduce = useReducedMotion();
    const frameRef = useRef<HTMLDivElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const inView = useInView(frameRef, { amount: 0.3 });
    const [cursor, setCursor] = useState({ x: 380, y: 260, visible: false });
    const [pressed, setPressed] = useState(false);
    const [ripple, setRipple] = useState<{ id: number; x: number; y: number } | null>(null);
    const [hovered, setHovered] = useState(false);
    const paused = useRef(false);
    const running = useRef(true);
    const cursorRef = useRef(cursor);
    const scriptRef = useRef(script);
    cursorRef.current = cursor;
    scriptRef.current = script;
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

        async function type(text: string, set: (value: string) => void, speed = 55, chunk = 1) {
            for (let i = chunk; i < text.length + chunk; i += chunk) {
                set(text.slice(0, Math.min(i, text.length)));
                await wait(speed);
            }
            await wait(200);
        }

        const tools: DemoTools = { wait, moveTo, click, type, scrollTop: () => scrollRef.current?.scrollTo({ top: 0 }) };

        (async () => {
            try {
                while (running.current) {
                    await scriptRef.current(tools);
                }
            } catch (error) {
                if (error !== CANCELLED) throw error;
            }
        })();

        return () => {
            running.current = false;
        };
    }, [reduce]);

    return { reduce: Boolean(reduce), frameRef, scrollRef, cursor, pressed, ripple, setRipple, hovered, setHovered };
}

export type DemoEngine = ReturnType<typeof useDemoEngine>;

/** Arrow cursor, click ripple and the "paused" hint. Render inside the frame. */
export function DemoCursor({ engine }: { engine: DemoEngine }) {
    const t = useT();
    if (engine.reduce) return null;
    const { cursor, pressed, ripple, setRipple, hovered } = engine;
    return (
        <>
            <AnimatePresence>
                {hovered && (
                    <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="pointer-events-none absolute right-3 top-10 z-40 flex items-center gap-1.5 rounded-full bg-navy-900/85 px-2.5 py-1 text-[10px] text-white shadow">
                        <MousePointerClick className="size-3" /> {t('Paused · scroll to explore')}
                    </motion.div>
                )}
            </AnimatePresence>
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
                    <path d="M2 1.5 L2 17.5 L6.4 13.4 L9.3 20 L12.2 18.7 L9.4 12.2 L15.5 12.2 Z" className="fill-navy-900" stroke="#fff" strokeWidth="1.4" strokeLinejoin="round" />
                </svg>
            </motion.div>
        </>
    );
}

/** The site's name and mark from Admin, Settings, Branding. */
export function useBrand() {
    const { app } = usePage<SharedProps>().props;
    const name = app?.name || 'Da Barrister';
    const [first, rest] = splitBrand(name);
    return { name, first, rest, logoUrl: app?.logo_url ?? null, spaced: name.includes(' ') };
}

export function BrandMark({ className, inverted = true }: { className?: string; inverted?: boolean }) {
    const brand = useBrand();
    return brand.logoUrl
        ? <img src={brand.logoUrl} alt="" className={cn('rounded object-contain', className)} />
        : <span className={cn('grid place-items-center rounded', inverted ? 'bg-gold-500 text-navy-950' : 'bg-navy-900 text-gold-300', className)}><Scale className="size-[60%]" strokeWidth={2.3} /></span>;
}

export function BrandName({ className, inverted = true }: { className?: string; inverted?: boolean }) {
    const brand = useBrand();
    return (
        <span className={cn('font-serif font-semibold', inverted ? 'text-white' : 'text-navy-900 dark:text-white', className)}>
            {brand.first}{brand.rest && <>{brand.spaced ? ' ' : ''}<span className="text-gold-400">{brand.rest}</span></>}
        </span>
    );
}

/** The advocate the demos are about (real name and photo from DemoPersona, else a sample). */
export function usePersona(): DemoPersona & { initials: string; title: string } {
    const { demoPersona } = usePage<SharedProps>().props;
    const persona: DemoPersona = demoPersona ?? { name: 'Mahnoor Siddiqui', first_name: 'Mahnoor', photo_url: null, city: 'Lahore', counts: { cases: 0, hearings: 0, appointments: 0, tasks: 0, drafts: 0, clients: 0 } };
    const initials = persona.name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('');
    return { ...persona, initials, title: `Adv. ${persona.name}` };
}

/** Round photo, always centred and cropped to the circle; initials when there is no photo. */
export function PersonaAvatar({ className, src, name }: { className?: string; src?: string | null; name?: string }) {
    const persona = usePersona();
    const photo = src === undefined ? persona.photo_url : src;
    const label = name ?? persona.name;
    const initials = label.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('');
    return (
        <span className={cn('grid size-6 shrink-0 place-items-center overflow-hidden rounded-full bg-gold-100 text-[10px] font-semibold text-gold-700 ring-2 ring-white dark:ring-navy-900', className)}>
            {photo ? <img src={photo} alt="" className="size-full object-cover object-center" /> : initials}
        </span>
    );
}

/** Browser window with the workspace sidebar and top bar. */
export function DemoShell({ engine, path, nav, active, children, overlay, className, label }: {
    engine: DemoEngine;
    path: string;
    nav: { key: string; label: string; icon: ReactNode; demo?: string }[];
    active: string;
    children: ReactNode;
    overlay?: ReactNode;
    className?: string;
    label: string;
}) {
    const t = useT();
    const persona = usePersona();
    const host = useHost();
    return (
        <div
            ref={engine.frameRef as RefObject<HTMLDivElement>}
            dir="ltr"
            onMouseEnter={() => engine.setHovered(true)}
            onMouseLeave={() => engine.setHovered(false)}
            className={cn('relative h-[30rem] select-none overflow-hidden rounded-xl border border-navy-200 bg-white text-[11px] leading-snug text-navy-900 shadow-[0_30px_60px_-30px_rgba(0,0,0,0.45)] sm:h-[34rem] dark:border-navy-700 dark:bg-navy-950 dark:text-navy-50', className)}
            role="img"
            aria-label={label}
        >
            <div className="flex h-8 items-center gap-2 border-b border-navy-100 bg-navy-50 px-3 dark:border-navy-800 dark:bg-navy-900">
                <span className="size-2.5 rounded-full bg-red-400" /><span className="size-2.5 rounded-full bg-gold-400" /><span className="size-2.5 rounded-full bg-verdant-400" />
                <div className="mx-auto flex h-5 w-1/2 items-center justify-center truncate rounded bg-white px-2 text-[10px] text-navy-400 ring-1 ring-navy-100 dark:bg-navy-950 dark:ring-navy-800">{host}{path}</div>
            </div>
            <div className="flex h-[calc(100%-2rem)]">
                <aside className="hidden w-36 shrink-0 flex-col bg-navy-900 p-2 text-navy-200 sm:flex">
                    <div className="mb-3 flex items-center gap-1.5 px-1.5 pt-1 text-[12px]">
                        <BrandMark className="size-5" />
                        <BrandName className="truncate" />
                    </div>
                    {nav.map((item) => (
                        <div key={item.key} data-demo={item.demo} className={cn('mb-0.5 flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors', item.key === active ? 'bg-white/10 font-medium text-white' : 'opacity-80')}>
                            {item.icon}{item.label}
                        </div>
                    ))}
                    <div className="mt-auto flex items-center gap-2 rounded-md bg-white/5 p-2 text-[10px]">
                        <PersonaAvatar className="size-6 ring-white/20" />
                        <div className="min-w-0"><p className="truncate font-medium text-white">{persona.name}</p><p className="truncate opacity-80">{t('Advocate High Court')}</p></div>
                    </div>
                </aside>
                <div className="flex min-w-0 flex-1 flex-col">
                    <TopBar mobileNav={nav} active={active} />
                    <div ref={engine.scrollRef as RefObject<HTMLDivElement>} className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain bg-navy-50/50 p-3 dark:bg-navy-950 [scrollbar-width:thin]">
                        {children}
                    </div>
                </div>
            </div>
            {overlay}
            <DemoCursor engine={engine} />
        </div>
    );
}

function TopBar({ mobileNav, active }: { mobileNav: { key: string; icon: ReactNode; demo?: string }[]; active: string }) {
    const t = useT();
    const persona = usePersona();
    return (
        <div className="flex h-10 shrink-0 items-center gap-2 border-b border-navy-100 px-3 dark:border-navy-800">
            <div className="flex h-6 flex-1 items-center gap-1.5 truncate rounded-md bg-navy-50 px-2 text-navy-400 dark:bg-navy-900">{t('Search cases, clients, FIRs')}</div>
            <div className="flex gap-0.5 sm:hidden">
                {mobileNav.filter((item) => item.demo).map((item) => (
                    <span key={item.key} data-demo={item.demo} className={cn('grid size-6 place-items-center rounded-md', item.key === active ? 'bg-navy-900 text-white' : 'text-navy-400')}>{item.icon}</span>
                ))}
            </div>
            <span data-demo="bell" className="relative grid size-6 place-items-center text-navy-400">
                <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></svg>
                <span className="absolute right-0.5 top-0.5 size-1.5 rounded-full bg-red-500" />
            </span>
            <div className="flex items-center gap-1.5">
                <PersonaAvatar className="size-6" />
                <span className="hidden max-w-28 truncate font-medium md:inline">{persona.title}</span>
            </div>
        </div>
    );
}

function useHost(): string {
    const [host, setHost] = useState('');
    useEffect(() => setHost(window.location.host), []);
    return host;
}

/** Small round tick toast inside a demo frame. */
export function DemoToast({ show, children }: { show: boolean; children: ReactNode }) {
    return (
        <AnimatePresence>
            {show && (
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} className="absolute bottom-3 right-3 z-30 flex max-w-[85%] items-center gap-2 rounded-lg bg-navy-900 px-3 py-2 text-white shadow-lg">
                    {children}
                </motion.div>
            )}
        </AnimatePresence>
    );
}
