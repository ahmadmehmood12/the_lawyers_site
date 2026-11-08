import { PracticeAreaCard, type PracticeAreaCardData } from '@/Components/domain/PracticeAreaCard';
import PublicLayout from '@/Layouts/PublicLayout';
import { useT } from '@/lib/i18n';

export default function Specializations({ specializations, canonical }: { specializations: PracticeAreaCardData[]; canonical: string }) {
    const t = useT();
    return (
        <PublicLayout seo={{ title: t('Legal practice areas'), description: t('Find advocates by area of law in Pakistan.'), canonical }}>
            <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
                <nav aria-label="Breadcrumb" className="mb-2 text-xs text-navy-500"><a href={route('home')}>{t('Home')}</a> / {t('Practice areas')}</nav>
                <h1 className="mb-2 text-3xl font-semibold">{t('Practice areas')}</h1>
                <p className="mb-8 text-navy-600 dark:text-navy-300">{t('Choose the area of law that matches your matter.')}</p>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {specializations.map((s) => <PracticeAreaCard key={s.slug} area={s} />)}
                </div>
            </div>
        </PublicLayout>
    );
}
