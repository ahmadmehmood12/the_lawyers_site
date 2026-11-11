import { Pause, Play, Volume2 } from 'lucide-react';
import { useRef, useState } from 'react';
import { Reveal } from '@/Components/motion';
import { cn } from '@/lib/cn';
import { useT } from '@/lib/i18n';
import type { TestimonialItem } from './Testimonials';

/**
 * Video testimonials from Admin, Testimonials (videos). Lazy: no video bytes load until a card is
 * hovered or tapped (preload="none", the src is set on first interaction), only the thumbnail.
 * Hover plays muted and leaving pauses (pointer devices); click toggles play with sound and
 * shows native controls; touch devices get a visible play button.
 */
export function VideoTestimonials({ items }: { items: TestimonialItem[] | undefined }) {
    const t = useT();
    if (!items || items.length === 0) return null;

    return (
        <section className="py-20 lg:py-28" aria-labelledby="hm-videos">
            <div className="hm-wrap">
                <Reveal>
                    <h2 id="hm-videos" className="text-4xl font-semibold sm:text-5xl">{t('Video reviews')}</h2>
                    <p className="mt-3 max-w-xl text-lg text-navy-600 dark:text-navy-300">{t('Short videos from clients and advocates who use the platform. Hover to preview, click to play with sound.')}</p>
                </Reveal>
                <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {items.map((item, i) => (
                        <Reveal key={item.id} delay={i * 0.06}>
                            <VideoCard item={item} />
                        </Reveal>
                    ))}
                </div>
            </div>
        </section>
    );
}

function VideoCard({ item }: { item: TestimonialItem }) {
    const t = useT();
    const video = useRef<HTMLVideoElement>(null);
    const [loaded, setLoaded] = useState(false);
    const [playing, setPlaying] = useState(false);
    const [withSound, setWithSound] = useState(false);
    const hoverCapable = typeof window !== 'undefined' && window.matchMedia('(hover: hover) and (pointer: fine)').matches;

    function ensureSource() {
        if (!loaded && item.video_url && video.current) {
            video.current.src = item.video_url;
            setLoaded(true);
        }
    }

    function play(muted: boolean) {
        ensureSource();
        const el = video.current;
        if (!el) return;
        el.muted = muted;
        setWithSound(!muted);
        el.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    }

    function pause() {
        video.current?.pause();
        setPlaying(false);
    }

    return (
        <article
            className="group overflow-hidden rounded-2xl border border-navy-100 bg-white transition-colors hover:border-navy-300 dark:border-navy-800 dark:bg-navy-900 dark:hover:border-navy-600"
            onMouseEnter={() => hoverCapable && !withSound && play(true)}
            onMouseLeave={() => hoverCapable && !withSound && pause()}
        >
            <div className="relative aspect-[4/5] bg-navy-950 sm:aspect-[3/4]">
                <video
                    ref={video}
                    poster={item.thumbnail_url ?? undefined}
                    preload="none"
                    playsInline
                    loop={!withSound}
                    controls={withSound}
                    onPause={() => setPlaying(false)}
                    onPlay={() => setPlaying(true)}
                    className="absolute inset-0 size-full object-cover"
                    aria-label={t('Video testimonial from :name', { name: item.name })}
                />
                {!withSound && (
                    <button
                        type="button"
                        onClick={() => (playing && withSound ? pause() : play(false))}
                        className="absolute inset-0 flex items-end bg-gradient-to-t from-navy-950/80 via-navy-950/10 to-transparent p-5 text-start text-white"
                        aria-label={t('Play video with sound')}
                    >
                        <span className={cn('flex size-12 items-center justify-center rounded-full bg-white/90 text-navy-950 shadow-lg transition-transform duration-200 group-hover:scale-105', playing && 'opacity-0 sm:group-hover:opacity-100')}>
                            {playing ? <Volume2 className="size-5" /> : <Play className="size-5 translate-x-0.5" />}
                        </span>
                    </button>
                )}
                {withSound && playing && (
                    <button type="button" onClick={pause} className="absolute end-3 top-3 rounded-full bg-navy-950/70 p-2 text-white" aria-label={t('Pause')}><Pause className="size-4" /></button>
                )}
            </div>
            <div className="p-5">
                <p className="font-semibold text-navy-900 dark:text-white">{item.name}</p>
                {item.designation && <p className="text-sm text-navy-500 dark:text-navy-400">{item.designation}</p>}
                {item.body && <p className="mt-2 line-clamp-3 text-sm text-navy-600 dark:text-navy-300">{item.body}</p>}
            </div>
        </article>
    );
}
