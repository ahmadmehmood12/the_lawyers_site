import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export type SocialNetwork = 'facebook' | 'instagram' | 'youtube' | 'linkedin' | 'x' | 'whatsapp';

/** Line icons in the Lucide style (Lucide 1.x ships no brand logos). */
const icons: Record<SocialNetwork, ReactNode> = {
    facebook: <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />,
    instagram: (
        <>
            <rect x="2" y="2" width="20" height="20" rx="5" />
            <circle cx="12" cy="12" r="4" />
            <path d="M17.5 6.5h.01" />
        </>
    ),
    youtube: (
        <>
            <rect x="2" y="5" width="20" height="14" rx="4" />
            <path d="m10 9 5 3-5 3z" />
        </>
    ),
    linkedin: (
        <>
            <rect x="2" y="2" width="20" height="20" rx="3" />
            <path d="M7 10v7M7 7v.01M11 17v-7M11 13a2.5 2.5 0 0 1 5 0v4" />
        </>
    ),
    x: <path d="M4 4l11.7 16H20L8.3 4zM4 20l6.8-7.8M20 4l-6.8 7.8" />,
    whatsapp: (
        <>
            <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22z" />
            <path d="M9 10a.5.5 0 0 0 1 0V9a.5.5 0 0 0-1 0v1a5 5 0 0 0 5 5h1a.5.5 0 0 0 0-1h-1a.5.5 0 0 0 0 1" />
        </>
    ),
};

const labels: Record<SocialNetwork, string> = { facebook: 'Facebook', instagram: 'Instagram', youtube: 'YouTube', linkedin: 'LinkedIn', x: 'X', whatsapp: 'WhatsApp' };

/** Renders only the networks an admin filled in under Admin, Settings, Branding. */
export function SocialLinks({ links, className }: { links: Partial<Record<SocialNetwork, string | null>>; className?: string }) {
    const filled = (Object.keys(icons) as SocialNetwork[]).filter((network) => links[network]);
    if (filled.length === 0) {
        return null;
    }

    return (
        <ul className={cn('flex flex-wrap gap-2', className)}>
            {filled.map((network) => (
                <li key={network}>
                    <a
                        href={links[network] as string}
                        target="_blank"
                        rel="noopener noreferrer me"
                        aria-label={labels[network]}
                        className="flex size-10 items-center justify-center rounded-full border border-white/15 text-navy-200 transition-colors hover:border-gold-400 hover:text-gold-300"
                    >
                        <svg viewBox="0 0 24 24" className="size-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                            {icons[network]}
                        </svg>
                    </a>
                </li>
            ))}
        </ul>
    );
}
