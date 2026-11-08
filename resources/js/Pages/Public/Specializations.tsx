import { Link } from '@inertiajs/react';
import PublicLayout from '@/Layouts/PublicLayout';
import { useT } from '@/lib/i18n';

export default function Specializations({ specializations, canonical }: { specializations: { slug: string; name: string; description: string | null; count: number }[]; canonical: string }) {
    const t = useT();
    return (
        <PublicLayout seo={{ title: t('Legal practice areas'), description: t('Find advocates by area of law in Pakistan.'), canonical }}>
            <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
                <h1 className="mb-2 text-3xl font-semibold">{t('Practice areas')}</h1>
                <p className="mb-8 text-navy-600 dark:text-navy-300">{t('Choose the area of law that matches your matter.')}</p>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {specializations.map((s) => (
                        <Link key={s.slug} href={route('lawyers.index', { specialization: s.slug })} className="rounded-card border border-navy-100 bg-white p-5 hover:border-gold-400 dark:border-navy-800 dark:bg-navy-900">
                            <p className="font-serif text-xl font-semibold">{s.name}</p>
                            {s.description && <p className="mt-1 text-sm text-navy-600 dark:text-navy-300">{s.description}</p>}
                            <p className="mt-3 text-xs font-medium text-gold-600">{t(':count lawyers', { count: s.count })}</p>
                        </Link>
                    ))}
                </div>
            </div>
        </PublicLayout>
    );
}
