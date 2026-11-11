import { AnimatePresence, motion, useInView, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/cn';
import { useT } from '@/lib/i18n';

type Chip = [string, string, string];

/**
 * "The law your diary speaks": statute citations flowing past in three rows (opposite
 * directions, each nudged further by the scroll), and a spotlight that walks through the
 * sections an advocate meets from FIR to the High Court. Headings are the statutes' own
 * (PPC 1860, CrPC 1898, Constitution 1973, CPC 1908); explanations are plain summaries,
 * not legal advice. Rows pause on hover; everything is still with reduced motion.
 */
export function CitationStream() {
    const t = useT();
    const ref = useRef<HTMLElement>(null);
    const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
    const reduce = useReducedMotion();
    const shiftA = useTransform(scrollYProgress, [0, 1], [-120, 120]);
    const shiftB = useTransform(scrollYProgress, [0, 1], [120, -120]);

    const rows: Chip[][] = [
        [
            ['PPC', '302', t('Qatl i amd')], ['PPC', '324', t('Attempt to commit qatl i amd')], ['PPC', '337A', t('Shajjah')], ['PPC', '354', t('Assault on a woman')],
            ['PPC', '379', t('Theft')], ['PPC', '392', t('Robbery')], ['PPC', '395', t('Dacoity')], ['PPC', '406', t('Criminal breach of trust')],
            ['PPC', '420', t('Cheating')], ['PPC', '468', t('Forgery for cheating')], ['PPC', '489F', t('Dishonoured cheque')], ['PPC', '506', t('Criminal intimidation')],
        ],
        [
            ['CrPC', '22A', t('Justice of Peace')], ['CrPC', '154', t('First information report')], ['CrPC', '161', t('Police statements')], ['CrPC', '164', t('Confession before magistrate')],
            ['CrPC', '173', t('Police report (challan)')], ['CrPC', '249A', t('Acquittal at any stage')], ['CrPC', '265K', t('Acquittal by Sessions Court')], ['CrPC', '342', t('Examination of accused')],
            ['CrPC', '426', t('Suspension of sentence')], ['CrPC', '497', t('Bail')], ['CrPC', '498', t('Pre arrest bail')], ['CrPC', '561A', t('Inherent powers of High Court')],
        ],
        [
            ['Art.', '4', t('Right to be dealt with in accordance with law')], ['Art.', '10A', t('Fair trial')], ['Art.', '25', t('Equality of citizens')], ['Art.', '184(3)', t('Supreme Court original jurisdiction')],
            ['Art.', '199', t('Writ jurisdiction')], ['CPC', 'O. VII R. 11', t('Rejection of plaint')], ['CPC', 'O. XXXIX', t('Temporary injunction')], ['CPC', '12(2)', t('Decree obtained by fraud')],
            ['SRA', '42', t('Declaration of title')], ['SRA', '12', t('Specific performance')], ['MFLO', '7', t('Talaq')], ['GWA', '25', t('Custody of a minor')],
        ],
    ];

    return (
        <section ref={ref} className="relative overflow-hidden border-y border-navy-800 bg-navy-950 py-20 text-white lg:py-28" aria-labelledby="hm-citations">
            <div className="hm-wrap">
                <div className="grid items-end gap-6 lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)]">
                    <div>
                        <h2 id="hm-citations" className="text-4xl font-semibold sm:text-5xl">{t('The law your diary speaks')}</h2>
                        <p className="mt-3 max-w-xl text-lg text-navy-200">{t('Sections are tagged on every case, so the file, the drafts and the cause list all speak the same citation.')}</p>
                    </div>
                </div>
            </div>

            <div className="mt-12 space-y-4" aria-hidden>
                {rows.map((row, i) => (
                    <motion.div key={i} style={reduce ? undefined : { x: i === 1 ? shiftB : shiftA }}>
                        <div className={cn('hm-marquee', i === 1 && 'hm-marquee-reverse')} style={{ ['--hm-marquee-duration' as string]: `${[52, 64, 58][i]}s` }}>
                            {[0, 1].map((copy) => (
                                <ul key={copy} className="hm-marquee-track">
                                    {row.map(([code, section, label]) => (
                                        <li key={code + section} className="flex shrink-0 items-baseline gap-2.5 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2">
                                            <span className="ltr-nums font-semibold text-gold-300 tabular-nums">{code} {section}</span>
                                            <span className="text-sm text-navy-200">{label}</span>
                                        </li>
                                    ))}
                                </ul>
                            ))}
                        </div>
                    </motion.div>
                ))}
            </div>

            <div className="hm-wrap mt-14">
                <Spotlight />
            </div>
        </section>
    );
}

function Spotlight() {
    const t = useT();
    const reduce = useReducedMotion();
    const ref = useRef<HTMLDivElement>(null);
    const inView = useInView(ref, { margin: '-15% 0px' });
    const [index, setIndex] = useState(0);
    const [paused, setPaused] = useState(false);

    const stages = [t('FIR'), t('Bail'), t('Trial'), t('High Court')];
    const items = [
        { code: 'CrPC', section: '154', title: t('Information in cognizable cases'), stage: 0, body: t('The officer in charge of the police station must write down information about a cognizable offence. This is the FIR, and the case file starts from its number and date.') },
        { code: 'CrPC', section: '22A', title: t('Powers of the Justice of Peace'), stage: 0, body: t('When police refuse to register a case, the Sessions Judge acting as Justice of Peace can be moved to direct them to record the FIR.') },
        { code: 'PPC', section: '302', title: t('Punishment of qatl i amd'), stage: 2, body: t('Intentional murder: death as qisas, or death or imprisonment for life as tazir where qisas is not applicable. Tried by the Court of Session.') },
        { code: 'PPC', section: '324', title: t('Attempt to commit qatl i amd'), stage: 2, body: t('An act done with intent to cause death, punishable with up to ten years and fine; any hurt caused is punished as well.') },
        { code: 'CrPC', section: '497', title: t('Bail in non bailable offences'), stage: 1, body: t('Bail after arrest. Where there are grounds for further inquiry into guilt, bail becomes the right of the accused.') },
        { code: 'CrPC', section: '498', title: t('Bail by the High Court or Court of Session'), stage: 1, body: t('The higher courts may grant bail, including bail before arrest where the arrest is shown to be mala fide.') },
        { code: 'CrPC', section: '342', title: t('Examination of the accused'), stage: 2, body: t('After the prosecution evidence the court puts every incriminating circumstance to the accused, who may answer it.') },
        { code: 'Art.', section: '199', title: t('Jurisdiction of the High Court'), stage: 3, body: t('Writ petitions against unlawful orders of public authorities, where no other adequate remedy is provided by law.') },
    ];
    const item = items[index];

    useEffect(() => {
        if (reduce || paused || !inView) return;
        const id = window.setTimeout(() => setIndex((i) => (i + 1) % items.length), 4200);
        return () => window.clearTimeout(id);
    }, [index, paused, inView, reduce, items.length]);

    return (
        <div ref={ref} className="grid gap-8 rounded-2xl border border-white/10 bg-white/[0.03] p-6 sm:p-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
            <div className="relative min-h-[260px] overflow-hidden">
                <AnimatePresence mode="wait" initial={false}>
                    <motion.div key={item.code + item.section} initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -28 }} transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}>
                        <p className="text-sm text-gold-300">{item.code === 'Art.' ? t('Constitution of Pakistan 1973') : item.code === 'PPC' ? t('Pakistan Penal Code 1860') : t('Code of Criminal Procedure 1898')}</p>
                        <p className="ltr-nums mt-2 font-serif text-[clamp(4rem,9vw,7.5rem)] leading-none font-semibold tabular-nums">
                            <span className="text-navy-400">{item.code === 'Art.' ? 'Art. ' : '§ '}</span>{item.section}
                        </p>
                        <p className="mt-4 text-2xl font-semibold">{item.title}</p>
                        <p className="mt-3 max-w-md text-navy-200">{item.body}</p>
                    </motion.div>
                </AnimatePresence>
            </div>

            <div className="flex flex-col justify-between gap-8">
                <FlowPath stages={stages} active={item.stage} />
                <div className="flex flex-wrap gap-2" role="tablist" aria-label={t('Sections')}>
                    {items.map((entry, i) => (
                        <button
                            key={entry.code + entry.section}
                            type="button"
                            role="tab"
                            aria-selected={i === index}
                            onClick={() => setIndex(i)}
                            className={cn('ltr-nums relative overflow-hidden rounded-full px-3.5 py-1.5 text-sm tabular-nums ring-1 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-300', i === index ? 'bg-gold-500 text-navy-950 ring-gold-500' : 'text-navy-200 ring-white/15 hover:bg-white/10')}
                        >
                            {entry.code} {entry.section}
                            {i === index && !reduce && !paused && inView && (
                                <motion.span key={index} className="absolute inset-x-0 bottom-0 h-0.5 origin-left bg-navy-950/60" initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 4.2, ease: 'linear' }} aria-hidden />
                            )}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}

/** FIR to High Court as a drawn path; the active stage lights up and the line draws to it. */
function FlowPath({ stages, active }: { stages: string[]; active: number }) {
    const reduce = useReducedMotion();
    const progress = stages.length > 1 ? active / (stages.length - 1) : 0;

    return (
        <div>
            <div className="relative h-14">
                <svg viewBox="0 0 300 20" preserveAspectRatio="none" className="absolute start-[12.5%] top-1/2 h-5 w-[75%] -translate-y-1/2 rtl:-scale-x-100" aria-hidden>
                    <path d="M0 10 C 50 0, 100 20, 150 10 S 250 0, 300 10" className="fill-none stroke-white/15" strokeWidth="2" vectorEffect="non-scaling-stroke" />
                    <motion.path d="M0 10 C 50 0, 100 20, 150 10 S 250 0, 300 10" className="fill-none stroke-gold-300" strokeWidth="2" vectorEffect="non-scaling-stroke" initial={false} animate={{ pathLength: Math.max(0.02, progress) }} transition={reduce ? { duration: 0 } : { duration: 0.8, ease: [0.16, 1, 0.3, 1] }} />
                </svg>
                <ol className="relative grid h-full grid-cols-4 items-center justify-items-center">
                    {stages.map((stage, i) => (
                        <li key={stage} className="flex flex-col items-center">
                            <motion.span className={cn('block size-4 rounded-full ring-4 ring-navy-950', i <= active ? 'bg-gold-300' : 'bg-navy-700')} animate={reduce ? undefined : { scale: i === active ? [1, 1.35, 1] : 1 }} transition={{ duration: 0.6 }} />
                        </li>
                    ))}
                </ol>
            </div>
            <ol className="mt-2 grid grid-cols-4 text-sm">
                {stages.map((stage, i) => (
                    <li key={stage} className={cn('text-center transition-colors', i === active ? 'font-semibold text-white' : 'text-navy-400')}>{stage}</li>
                ))}
            </ol>
        </div>
    );
}
