import { Link } from '@inertiajs/react';
import { BadgeCheck, Building2, Globe, Mail, MapPin, Phone } from 'lucide-react';
import { Avatar, Card, CardBody, CardHeader } from '@/Components/ui';
import PublicLayout from '@/Layouts/PublicLayout';
import { useT } from '@/lib/i18n';

export default function FirmShow({ firm, lawyers, canonical }: { firm: Record<string, any>; lawyers: { slug: string; name: string; headline: string | null; verified: boolean; photo_url: string | null; specializations: string[] }[]; canonical: string }) {
    const t = useT();
    return (
        <PublicLayout seo={{ title: firm.name, description: firm.excerpt, canonical, jsonLd: { '@context': 'https://schema.org', '@type': 'LegalService', name: firm.name, url: canonical, telephone: firm.phone, address: firm.city ? { '@type': 'PostalAddress', addressLocality: firm.city, addressCountry: 'PK' } : undefined } }}>
            <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
                <nav aria-label="Breadcrumb" className="mb-4 text-xs text-navy-500"><Link href={route('firms.index')}>{t('Law firms')}</Link> / {firm.name}</nav>
                <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
                    <div className="space-y-6">
                        <div className="flex items-center gap-4">{firm.logo_url ? <img src={firm.logo_url} alt="" className="size-16 rounded object-cover" /> : <span className="flex size-16 items-center justify-center rounded bg-navy-900 text-gold-300"><Building2 className="size-8" /></span>}<div><h1 className="text-3xl font-semibold">{firm.name}</h1><p className="text-sm text-navy-500">{firm.city}{firm.founded_year ? `, ${t('Since :year', { year: firm.founded_year })}` : ''}</p></div></div>
                        {firm.description && <Card><CardBody><p className="text-sm leading-relaxed whitespace-pre-line">{firm.description}</p></CardBody></Card>}
                        <Card>
                            <CardHeader title={t('Lawyers')} />
                            <ul className="divide-y divide-navy-100 dark:divide-navy-800">
                                {lawyers.length === 0 && <li className="px-5 py-4 text-sm text-navy-500">—</li>}
                                {lawyers.map((l) => <li key={l.slug}><Link href={route('lawyers.show', l.slug)} className="flex items-center gap-3 px-5 py-3 hover:bg-navy-50/60 dark:hover:bg-navy-800/40"><Avatar name={l.name} src={l.photo_url} /><div><p className="flex items-center gap-1 font-medium">{l.name}{l.verified && <BadgeCheck className="size-4 text-verdant-600" />}</p><p className="text-xs text-navy-500">{l.headline ?? l.specializations.join(', ')}</p></div></Link></li>)}
                            </ul>
                        </Card>
                    </div>
                    <Card className="self-start"><CardBody className="space-y-2 text-sm">
                        {firm.address && <p className="flex gap-2"><MapPin className="size-4 shrink-0 text-navy-400" />{firm.address}</p>}
                        {firm.phone && <p className="flex gap-2"><Phone className="size-4 text-navy-400" /><a href={`tel:${firm.phone}`} className="ltr-nums underline">{firm.phone}</a></p>}
                        {firm.email && <p className="flex gap-2"><Mail className="size-4 text-navy-400" /><a href={`mailto:${firm.email}`} className="underline">{firm.email}</a></p>}
                        {firm.website && <p className="flex gap-2"><Globe className="size-4 text-navy-400" /><a href={firm.website} rel="nofollow noopener" target="_blank" className="underline">{firm.website}</a></p>}
                    </CardBody></Card>
                </div>
            </div>
        </PublicLayout>
    );
}
