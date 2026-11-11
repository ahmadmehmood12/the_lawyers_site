import { AnimatePresence, motion } from 'framer-motion';
import {
    AlignLeft, Bold, BookOpen, Briefcase, CalendarDays, CheckCircle2, ChevronDown, Download, FileText, Italic,
    LayoutDashboard, List, Receipt, Scale, Share2, Underline, Users,
} from 'lucide-react';
import { useState } from 'react';
import { BrandName, DemoShell, DemoToast, PersonaAvatar, useDemoEngine, usePersona } from '@/Components/demo/engine';
import { cn } from '@/lib/cn';
import { useT } from '@/lib/i18n';

/**
 * Drafting demo (docs/Features/Home-Page.md#demos): pick the post-arrest bail template, the case
 * fills the parties, FIR and sections, the grounds are typed, then the draft is saved as PDF and
 * shared with the client's portal. Sample matter; the advocate is DemoPersona.
 */

type View = 'templates' | 'editor' | 'pdf';

const GROUNDS = [
    'That the petitioner is innocent and has been falsely implicated in this case with mala fide intention and ulterior motives.',
    'That the alleged recovery is foisted upon the petitioner and no independent witness of the locality has been associated.',
    'That the case of the petitioner calls for further inquiry within the meaning of section 497(2) Cr.P.C.',
    'That the petitioner is no more required for investigation and is ready to furnish surety to the satisfaction of this Honourable Court.',
];

export function DraftDemo({ className }: { className?: string }) {
    const t = useT();
    const persona = usePersona();
    const [view, setView] = useState<View>('templates');
    const [dialog, setDialog] = useState(false);
    const [filled, setFilled] = useState(false);
    const [grounds, setGrounds] = useState<string[]>([]);
    const [exportOpen, setExportOpen] = useState(false);
    const [progress, setProgress] = useState(0);
    const [toast, setToast] = useState<string | null>(null);
    const [shared, setShared] = useState(false);

    const engine = useDemoEngine(async ({ wait, moveTo, click, type, scrollTop }) => {
        setView('templates'); setDialog(false); setFilled(false); setGrounds([]); setExportOpen(false); setProgress(0); setToast(null); setShared(false); scrollTop();
        await wait(1000);
        await moveTo('tpl-bail', 900);
        await click();
        setDialog(true);
        await wait(600);
        await moveTo('create-draft', 900);
        await click();
        setDialog(false);
        setView('editor');
        scrollTop();
        await wait(500);
        setFilled(true);
        await wait(1200);
        for (let i = 0; i < GROUNDS.length; i++) {
            await moveTo(`ground-${i}`, 400);
            await type(GROUNDS[i], (value) => setGrounds((current) => { const next = current.slice(); next[i] = value; return next; }), 22, 3);
        }
        await wait(500);
        await moveTo('btn-export', 800);
        await click();
        setExportOpen(true);
        await wait(400);
        await moveTo('export-pdf', 500);
        await click();
        setExportOpen(false);
        for (let p = 0; p <= 100; p += 10) {
            setProgress(p);
            await wait(90);
        }
        setView('pdf');
        scrollTop();
        setToast(t('Saved as PDF · Bail-Petition-Arshad.pdf'));
        await wait(1400);
        await moveTo('btn-share', 800);
        await click();
        setShared(true);
        setToast(t('Shared with Muhammad Arshad’s portal'));
        await wait(3200);
    });

    const nav = [
        { key: 'dashboard', label: t('Dashboard'), icon: <LayoutDashboard className="size-3.5" /> },
        { key: 'diary', label: t('Court diary'), icon: <BookOpen className="size-3.5" /> },
        { key: 'cases', label: t('Cases'), icon: <Briefcase className="size-3.5" /> },
        { key: 'calendar', label: t('Calendar'), icon: <CalendarDays className="size-3.5" /> },
        { key: 'clients', label: t('Clients'), icon: <Users className="size-3.5" /> },
        { key: 'drafting', label: t('Drafting'), icon: <Scale className="size-3.5" />, demo: 'nav-drafting' },
        { key: 'documents', label: t('Documents'), icon: <FileText className="size-3.5" /> },
        { key: 'invoices', label: t('Invoices'), icon: <Receipt className="size-3.5" /> },
    ];

    const overlay = (
        <>
            <AnimatePresence>
                {dialog && (
                    <motion.div className="absolute inset-0 z-20 grid place-items-center bg-navy-950/40 p-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        <motion.div initial={{ scale: 0.96, y: 8 }} animate={{ scale: 1, y: 0 }} exit={{ opacity: 0 }} className="w-full max-w-xs rounded-xl bg-white p-4 shadow-2xl ring-1 ring-navy-100 dark:bg-navy-900 dark:ring-navy-700">
                            <p className="text-[13px] font-semibold">{t('New draft from template')}</p>
                            <p className="mb-3 text-[10px] text-navy-500">{t('Post-arrest bail · s. 497 Cr.P.C.')}</p>
                            {[[t('Case'), 'State vs. Muhammad Arshad'], [t('Client'), 'Muhammad Arshad s/o Ghulam Rasool'], [t('Language'), 'English']].map(([label, value]) => (
                                <div key={label} className="mb-2">
                                    <p className="mb-0.5 text-[10px] font-medium text-navy-500">{label}</p>
                                    <div className="flex h-7 items-center justify-between rounded-md border border-navy-200 px-2 dark:border-navy-700"><span className="truncate">{value}</span><ChevronDown className="size-3 text-navy-400" /></div>
                                </div>
                            ))}
                            <div className="mt-3 flex justify-end gap-2">
                                <span className="rounded-md px-3 py-1.5 ring-1 ring-navy-200 dark:ring-navy-700">{t('Cancel')}</span>
                                <span data-demo="create-draft" className="rounded-md bg-navy-900 px-3 py-1.5 font-medium text-white dark:bg-gold-500 dark:text-navy-950">{t('Create draft')}</span>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
            <AnimatePresence>
                {progress > 0 && progress < 100 && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-x-0 bottom-0 z-20 bg-white/95 px-4 py-3 ring-1 ring-navy-100 dark:bg-navy-900/95 dark:ring-navy-800">
                        <p className="mb-1.5 flex items-center gap-1.5 font-medium"><FileText className="size-3.5 text-red-500" />{t('Generating PDF…')} {progress}%</p>
                        <div className="h-1.5 overflow-hidden rounded-full bg-navy-100 dark:bg-navy-800"><motion.div className="h-full bg-gold-500" animate={{ width: `${progress}%` }} /></div>
                    </motion.div>
                )}
            </AnimatePresence>
            <DemoToast show={Boolean(toast)}><CheckCircle2 className="size-3.5 shrink-0 text-verdant-300" /><span>{toast}</span></DemoToast>
        </>
    );

    return (
        <DemoShell engine={engine} className={className} nav={nav} active="drafting" overlay={overlay}
            path={view === 'templates' ? '/drafts/templates' : view === 'editor' ? '/drafts/212/edit' : '/drafts/212/pdf'}
            label={t('Animated demo: drafting a post-arrest bail petition and saving it as PDF for the client')}>
            <AnimatePresence mode="wait" initial={false}>
                <motion.div key={view} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
                    {view === 'templates' && <Templates />}
                    {view === 'editor' && <Editor filled={filled} grounds={grounds} exportOpen={exportOpen} advocate={persona.title} />}
                    {view === 'pdf' && <PdfPreview shared={shared} advocate={persona.title} />}
                </motion.div>
            </AnimatePresence>
        </DemoShell>
    );
}

function Templates() {
    const t = useT();
    const templates = [
        ['Post-arrest bail', 's. 497 Cr.P.C.', 'Criminal', 'tpl-bail'],
        ['Pre-arrest bail', 's. 498 Cr.P.C.', 'Criminal'],
        ['Suit for maintenance', 'Family Courts Act 1964', 'Family'],
        ['Legal notice', 'General', 'Civil'],
        ['Writ petition', 'Art. 199', 'Constitutional'],
        ['Application for adjournment', 'O. XVII CPC', 'Civil'],
    ];
    return (
        <div>
            <div className="mb-3 flex items-center justify-between">
                <div><p className="text-[14px] font-semibold">{t('Drafting')}</p><p className="text-[10px] text-navy-500">{t('Start from a template; the case fills the details')}</p></div>
                <span className="rounded-md px-2.5 py-1.5 ring-1 ring-navy-200 dark:ring-navy-700">{t('My drafts · 37')}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                {templates.map(([name, law, area, id], i) => (
                    <motion.div key={name} data-demo={id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                        className={cn('rounded-lg bg-white p-3 ring-1 ring-navy-100 dark:bg-navy-900 dark:ring-navy-800', id && 'ring-2 ring-gold-400')}>
                        <FileText className="mb-2 size-4 text-gold-600" />
                        <p className="font-semibold">{name}</p>
                        <p className="text-[10px] text-navy-500">{law}</p>
                        <span className="mt-2 inline-block rounded-full bg-navy-50 px-2 py-0.5 text-[9px] text-navy-600 dark:bg-navy-800 dark:text-navy-300">{area}</span>
                    </motion.div>
                ))}
            </div>
        </div>
    );
}

function Fill({ on, children }: { on: boolean; children: string }) {
    return (
        <motion.span initial={false} animate={on ? { backgroundColor: ['rgba(220,187,95,0.6)', 'rgba(220,187,95,0)'] } : {}} transition={{ duration: 1.4 }} className="rounded px-0.5 font-semibold">
            {on ? children : '[ … ]'}
        </motion.span>
    );
}

function Editor({ filled, grounds, exportOpen, advocate }: { filled: boolean; grounds: string[]; exportOpen: boolean; advocate: string }) {
    const t = useT();
    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
                <div className="min-w-0"><p className="truncate text-[13px] font-semibold">Bail petition · State vs. Muhammad Arshad</p><p className="text-[10px] text-navy-500">{t('Autosaved')} · v3</p></div>
                <div className="relative flex gap-1.5">
                    <span className="hidden rounded-md px-2.5 py-1.5 ring-1 ring-navy-200 sm:inline dark:ring-navy-700">{t('Preview')}</span>
                    <span data-demo="btn-export" className="flex items-center gap-1 rounded-md bg-navy-900 px-2.5 py-1.5 font-medium text-white dark:bg-gold-500 dark:text-navy-950"><Download className="size-3" />{t('Export')}</span>
                    <AnimatePresence>
                        {exportOpen && (
                            <motion.ul initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="absolute right-0 top-full z-10 mt-1 w-36 rounded-md bg-white p-1 shadow-lg ring-1 ring-navy-100 dark:bg-navy-800 dark:ring-navy-700">
                                <li data-demo="export-pdf" className="rounded bg-navy-50 px-2 py-1 dark:bg-navy-700">{t('Save as PDF')}</li>
                                <li className="px-2 py-1">{t('Word (.docx)')}</li>
                            </motion.ul>
                        )}
                    </AnimatePresence>
                </div>
            </div>
            <div className="flex gap-1 rounded-md bg-white p-1 ring-1 ring-navy-100 dark:bg-navy-900 dark:ring-navy-800">
                {[Bold, Italic, Underline, AlignLeft, List].map((Icon, i) => <span key={i} className="grid size-6 place-items-center rounded text-navy-500 hover:bg-navy-50"><Icon className="size-3.5" /></span>)}
                <span className="ms-auto flex items-center px-2 text-[10px] text-navy-400">Times New Roman · 12</span>
            </div>
            <div className="mx-auto max-w-[34rem] rounded-sm bg-white px-6 py-5 font-serif text-[10.5px] leading-relaxed text-navy-950 shadow-md ring-1 ring-navy-100 dark:bg-navy-50">
                <p className="text-center font-bold uppercase">In the Court of Sessions Judge, Lahore</p>
                <p className="mt-2 text-center"><Fill on={filled}>Muhammad Arshad s/o Ghulam Rasool</Fill> … Petitioner</p>
                <p className="text-center">Versus</p>
                <p className="text-center">The State … Respondent</p>
                <p className="mt-2 text-center font-bold underline">Petition for post-arrest bail under section 497 Cr.P.C.</p>
                <p className="mt-2">FIR No. <Fill on={filled}>412/2026</Fill> dated <Fill on={filled}>02.10.2026</Fill>, Police Station <Fill on={filled}>Civil Lines</Fill>, offences under sections <Fill on={filled}>324, 34 PPC</Fill>.</p>
                <p className="mt-2">Respectfully sheweth:</p>
                <ol className="mt-1 list-decimal space-y-1 ps-4">
                    {GROUNDS.map((_, i) => (
                        <li key={i} data-demo={`ground-${i}`} className="min-h-[1.2em]">
                            {grounds[i] ?? ''}
                            {grounds[i] !== undefined && grounds[i].length < GROUNDS[i].length && <motion.span className="ms-px inline-block h-3 w-px translate-y-0.5 bg-navy-900" animate={{ opacity: [1, 0] }} transition={{ repeat: Infinity, duration: 0.5 }} />}
                        </li>
                    ))}
                </ol>
                <p className="mt-2">It is, therefore, respectfully prayed that the petitioner may kindly be released on bail.</p>
                <p className="mt-3 text-right font-semibold">{advocate}<br /><span className="font-normal">Advocate High Court</span></p>
            </div>
        </div>
    );
}

function PdfPreview({ shared, advocate }: { shared: boolean; advocate: string }) {
    const t = useT();
    return (
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_14rem]">
            <motion.div initial={{ rotateX: 8, opacity: 0, y: 10 }} animate={{ rotateX: 0, opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="relative mx-auto w-full max-w-[22rem] rounded-sm bg-white p-5 font-serif text-[9px] leading-relaxed text-navy-950 shadow-xl ring-1 ring-navy-100">
                <span className="absolute right-2 top-2 rounded bg-red-600 px-1.5 py-0.5 font-sans text-[8px] font-bold text-white">PDF</span>
                <p className="text-center font-bold uppercase">In the Court of Sessions Judge, Lahore</p>
                <p className="mt-1 text-center font-bold underline">Petition for post-arrest bail u/s 497 Cr.P.C.</p>
                {GROUNDS.map((ground, i) => <p key={i} className="mt-1">{i + 1}. {ground}</p>)}
                <p className="mt-2 text-right font-semibold">{advocate}</p>
                <div className="mt-3 flex items-center justify-between border-t border-navy-100 pt-1 font-sans text-[8px] text-navy-400"><BrandName inverted={false} className="text-[8px]" /><span>Page 1 of 2</span></div>
            </motion.div>
            <div className="space-y-2">
                <div className="rounded-lg bg-white p-3 ring-1 ring-navy-100 dark:bg-navy-900 dark:ring-navy-800">
                    <p className="font-semibold">Bail-Petition-Arshad.pdf</p>
                    <p className="text-[10px] text-navy-500">2 {t('pages')} · 148 KB</p>
                    <div className="mt-2 flex items-center gap-1.5 text-[10px] text-navy-500"><PersonaAvatar className="size-5" />{t('Prepared by')} {advocate}</div>
                </div>
                <div className="rounded-lg bg-white p-3 ring-1 ring-navy-100 dark:bg-navy-900 dark:ring-navy-800">
                    <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-navy-400">{t('Client')}</p>
                    <div className="flex items-center gap-2"><PersonaAvatar src={null} name="Muhammad Arshad" className="size-7 bg-navy-100 text-navy-700" /><div><p className="font-medium">Muhammad Arshad</p><p className="text-[10px] text-navy-500">+92 300 •••• 412</p></div></div>
                    {shared
                        ? <motion.p initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="mt-2 flex items-center justify-center gap-1 rounded-md bg-verdant-50 py-1.5 font-medium text-verdant-700 ring-1 ring-verdant-200"><CheckCircle2 className="size-3.5" />{t('Shared to portal')}</motion.p>
                        : <span data-demo="btn-share" className="mt-2 flex items-center justify-center gap-1 rounded-md bg-navy-900 py-1.5 font-medium text-white dark:bg-gold-500 dark:text-navy-950"><Share2 className="size-3" />{t('Share with client')}</span>}
                </div>
            </div>
        </div>
    );
}
