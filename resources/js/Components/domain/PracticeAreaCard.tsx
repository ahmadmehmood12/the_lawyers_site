import { Link } from '@inertiajs/react';
import { ArrowRight, BookOpen, Briefcase, Gavel, Handshake, Home, IdCard, Key, Lightbulb, Plane, Receipt, Scale, Shield, ShoppingBag, type LucideIcon } from 'lucide-react';
import { useT } from '@/lib/i18n';

const icons: Record<string, LucideIcon> = {
    scale: Scale,
    home: Home,
    briefcase: Briefcase,
    'id-card': IdCard,
    shield: Shield,
    lightbulb: Lightbulb,
    key: Key,
    'shopping-bag': ShoppingBag,
    plane: Plane,
    handshake: Handshake,
    receipt: Receipt,
    book: BookOpen,
    gavel: Gavel,
};

export type PracticeAreaCardData = { slug: string; name: string; description: string | null; icon: string | null; count: number };

export function PracticeAreaCard({ area }: { area: PracticeAreaCardData }) {
    const t = useT();
    const Icon = icons[area.icon ?? ''] ?? Scale;

    return (
        <Link href={route('lawyers.index', { specialization: area.slug })} className="group flex h-full flex-col rounded-card border border-navy-100 bg-white p-5 shadow-card transition hover:border-gold-400 hover:shadow-pop dark:border-navy-800 dark:bg-navy-900">
            <span className="flex size-10 items-center justify-center rounded-lg bg-navy-50 text-navy-700 group-hover:bg-gold-50 group-hover:text-gold-700 dark:bg-navy-800 dark:text-gold-300 dark:group-hover:bg-gold-700/20">
                <Icon className="size-5" aria-hidden />
            </span>
            <p className="mt-3 font-serif text-lg font-semibold text-navy-900 dark:text-white">{area.name}</p>
            {area.description && <p className="mt-1 line-clamp-3 text-sm text-navy-600 dark:text-navy-300">{area.description}</p>}
            <span className="mt-auto flex items-center justify-between gap-2 pt-4 text-xs font-medium">
                <span className="text-gold-700 dark:text-gold-300">{t(':count lawyers', { count: area.count })}</span>
                <span className="inline-flex items-center gap-1 text-navy-500 group-hover:text-navy-800 dark:group-hover:text-navy-200">
                    {t('Browse')}
                    <ArrowRight className="size-3.5 rtl:rotate-180" aria-hidden />
                </span>
            </span>
        </Link>
    );
}
