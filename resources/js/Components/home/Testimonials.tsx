import { BadgeCheck, ChevronLeft, ChevronRight, Quote, Star } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Reveal } from '@/Components/motion';
import { cn } from '@/lib/cn';
import { useT } from '@/lib/i18n';

export type TestimonialItem = { id: number; name: string; designation: string | null; body: string | null; rating: number | null; photo_url: string | null; thumbnail_url: string | null; video_url: string | null; verified: boolean; featured: boolean };

const initials = (name: string) => name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('');

/**
 * Client reviews from Admin, Testimonials (only active ones reach the page). A scroll-snap
 * carousel: native swipe on touch, previous/next buttons on desktop, keyboard arrows when focused.
 * Renders nothing until there is real data.
 */
export function Testimonials({ items }: { items: TestimonialItem[] | undefined }) {
    const t = useT();
    const track = useRef<HTMLDivElement>(null);
    const [edges, setEdges] = useState({ start: true, end: false });

    const update = useCallback(() => {
        const el = track.current;
        if (!el) return;
        const scrolled = Math.abs(el.scrollLeft);
        setEdges({ start: scrolled < 8, end: scrolled + el.clientWidth >= el.scrollWidth - 8 });
    }, []);

    useEffect(() => {
        update();
        const el = track.current;
        el?.addEventListener('scroll', update, { passive: true });
        window.addEventListener('resize', update);
        return () => {
            el?.removeEventListener('scroll', update);
            window.removeEventListener('resize', update);
        };
    }, [update, items?.length]);

    if (!items || items.length === 0) return null;

    const move = (direction: 1 | -1) => {
        const el = track.current;
        if (!el) return;
        const card = el.querySelector<HTMLElement>('[data-card]');
        const step = (card?.offsetWidth ?? el.clientWidth) + 24;
        const rtl = getComputedStyle(el).direction === 'rtl';
        el.scrollBy({ left: direction * step * (rtl ? -1 : 1), behavior: 'smooth' });
    };

    return (
        <section className="overflow-hidden border-t border-navy-100 bg-white py-20 lg:py-28 dark:border-navy-800 dark:bg-navy-900/40" aria-labelledby="hm-testimonials">
            <div className="hm-wrap">
                <Reveal className="flex flex-wrap items-end justify-between gap-6">
                    <div>
                        <h2 id="hm-testimonials" className="text-4xl font-semibold sm:text-5xl">{t('What clients say')}</h2>
                        <p className="mt-3 max-w-xl text-lg text-navy-600 dark:text-navy-300">{t('In their own words, from people who used the platform with their advocate.')}</p>
                    </div>
                    <div className="flex gap-2">
                        <button type="button" onClick={() => move(-1)} disabled={edges.start} aria-label={t('Previous')} className="flex size-11 items-center justify-center rounded-full border border-navy-200 text-navy-800 transition-colors hover:border-navy-900 hover:bg-navy-900 hover:text-white disabled:pointer-events-none disabled:opacity-35 dark:border-navy-700 dark:text-navy-100 dark:hover:border-gold-400 dark:hover:bg-gold-400 dark:hover:text-navy-950"><ChevronLeft className="size-5 rtl:rotate-180" /></button>
                        <button type="button" onClick={() => move(1)} disabled={edges.end} aria-label={t('Next')} className="flex size-11 items-center justify-center rounded-full border border-navy-200 text-navy-800 transition-colors hover:border-navy-900 hover:bg-navy-900 hover:text-white disabled:pointer-events-none disabled:opacity-35 dark:border-navy-700 dark:text-navy-100 dark:hover:border-gold-400 dark:hover:bg-gold-400 dark:hover:text-navy-950"><ChevronRight className="size-5 rtl:rotate-180" /></button>
                    </div>
                </Reveal>
                <div
                    ref={track}
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'ArrowRight') move(1); if (e.key === 'ArrowLeft') move(-1); }}
                    className="-mx-4 mt-10 flex snap-x snap-mandatory gap-6 overflow-x-auto scroll-smooth px-4 pb-4 [scrollbar-width:none] focus-visible:outline-offset-4 [&::-webkit-scrollbar]:hidden"
                    aria-label={t('Client testimonials')}
                    role="region"
                >
                    {items.map((item, index) => (
                        <figure key={item.id} data-card className="group relative flex w-[min(30rem,86vw)] shrink-0 snap-start flex-col overflow-hidden rounded-2xl border border-navy-100 bg-ivory p-8 transition-colors hover:border-navy-300 dark:border-navy-800 dark:bg-navy-950 dark:hover:border-navy-600">
                            <Quote className="size-9 text-gold-400/70" aria-hidden />
                            {item.rating && (
                                <p className="mt-4 flex gap-0.5" aria-label={t(':count out of 5 stars', { count: item.rating })}>
                                    {Array.from({ length: 5 }, (_, i) => <Star key={i} className={cn('size-4', i < item.rating! ? 'fill-gold-400 text-gold-400' : 'text-navy-200 dark:text-navy-700')} aria-hidden />)}
                                </p>
                            )}
                            <blockquote className="mt-4 flex-1 font-serif text-xl leading-relaxed text-navy-900 dark:text-navy-50">
                                <p className="max-w-[44ch]">“{item.body}”</p>
                            </blockquote>
                            <figcaption className="mt-8 flex items-center gap-4 border-t border-navy-100 pt-6 dark:border-navy-800">
                                <span className="relative size-14 shrink-0 overflow-hidden rounded-full bg-navy-900 ring-2 ring-white dark:ring-navy-800">
                                    {item.photo_url
                                        ? <img src={item.photo_url} alt="" loading={index < 2 ? 'eager' : 'lazy'} className="size-full object-cover transition-transform duration-500 group-hover:scale-105" />
                                        : <span className="flex size-full items-center justify-center font-serif text-lg font-semibold text-gold-300">{initials(item.name)}</span>}
                                </span>
                                <span className="min-w-0">
                                    <span className="flex items-center gap-1.5 font-semibold text-navy-900 dark:text-white">
                                        {item.name}
                                        {item.verified && <BadgeCheck className="size-4 text-verdant-600" aria-label={t('Verified client')} />}
                                    </span>
                                    {item.designation && <span className="block text-sm text-navy-500 dark:text-navy-400">{item.designation}</span>}
                                </span>
                            </figcaption>
                        </figure>
                    ))}
                </div>
            </div>
        </section>
    );
}
