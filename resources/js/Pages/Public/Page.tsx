import PublicLayout from '@/Layouts/PublicLayout';
import { formatDate } from '@/lib/format';
import { useLocale, useT } from '@/lib/i18n';

export default function Page({ page, canonical }: { page: { slug: string; title: string; body: string; meta_description: string | null; updated_at: string }; canonical: string }) {
    const t = useT();
    const { locale } = useLocale();
    return (
        <PublicLayout seo={{ title: page.title, description: page.meta_description ?? undefined, canonical }}>
            <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
                <h1 className="text-4xl font-semibold">{page.title}</h1>
                <p className="mt-2 text-xs text-navy-500">{t('Last updated :date', { date: formatDate(page.updated_at, locale) })}</p>
                <div className="prose-legal mt-8 [&_a]:underline" dangerouslySetInnerHTML={{ __html: page.body }} />
            </div>
        </PublicLayout>
    );
}
