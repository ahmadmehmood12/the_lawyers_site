import { Link, router, usePage } from '@inertiajs/react';
import { BadgeCheck, Building2, CalendarClock, GraduationCap, Heart, Mail, MapPin, Phone, Share2, Star, Video } from 'lucide-react';
import { useState } from 'react';
import { Alert, Avatar, Badge, Button, Card, CardBody, CardHeader, LinkButton, Provenance } from '@/Components/ui';
import PublicLayout from '@/Layouts/PublicLayout';
import { formatDate, formatMoney } from '@/lib/format';
import { useLocale, useT } from '@/lib/i18n';
import type { SharedProps } from '@/types';
import type { LawyerCardData } from '@/Components/domain/LawyerCard';

type Lawyer = LawyerCardData & { bio: string | null; enrollment_number: string | null; enrollment_date: string | null; chamber_address: string | null; public_phone: string | null; public_email: string | null; bar_council: string | null; district: string | null; province: string | null; courts: string[]; languages: string[]; offers_in_person: boolean; fee_max: number | null; educations: { degree: string; institution: string; year: number | null }[]; experiences: { position: string; organization: string; start_year: number | null; end_year: number | null; description: string | null }[]; credentials: { type: string; title: string; issuer: string | null; year: number | null; url: string | null }[]; verified_at: string | null; firms: { name: string; slug: string }[]; reviews: { id: number; rating: number; title: string | null; comment: string | null; author: string; response: string | null; created_at: string }[] };

export default function LawyerShow({ lawyer: l, stats, isFavourite, canBook, canonical }: { lawyer: Lawyer; stats: { cases_recorded: number; active_cases: number; courts_represented: number }; isFavourite: boolean; canBook: boolean; canonical: string }) {
    const t = useT();
    const { locale } = useLocale();
    const { auth } = usePage<SharedProps>().props;
    const [copied, setCopied] = useState(false);
    const isClient = auth.user?.account_type === 'client';

    const share = async () => {
        try {
            if (navigator.share) await navigator.share({ title: l.name, url: canonical });
            else { await navigator.clipboard.writeText(canonical); setCopied(true); }
        } catch { /* cancelled */ }
    };

    return (
        <PublicLayout seo={{ title: `${l.name} — ${l.specializations[0]?.name ?? t('Advocate')}${l.city ? `, ${l.city}` : ''}`, description: l.headline ?? l.bio?.slice(0, 155) ?? undefined, canonical, image: l.photo_url ?? undefined, type: 'profile', jsonLd: { '@context': 'https://schema.org', '@type': 'Attorney', name: l.name, url: canonical, image: l.photo_url ?? undefined, address: l.city ? { '@type': 'PostalAddress', addressLocality: l.city, addressRegion: l.province, addressCountry: 'PK' } : undefined, knowsLanguage: l.languages, ...(l.rating ? { aggregateRating: { '@type': 'AggregateRating', ratingValue: l.rating, reviewCount: l.rating_count } } : {}) } }}>
            <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
                <nav aria-label="Breadcrumb" className="mb-4 text-xs text-navy-500"><Link href={route('home')}>{t('Home')}</Link> / <Link href={route('lawyers.index')}>{t('Find a Lawyer')}</Link> / {l.name}</nav>
                <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
                    <div className="space-y-6">
                        <Card>
                            <CardBody className="flex flex-col gap-5 sm:flex-row">
                                <Avatar name={l.name} src={l.photo_url} size="xl" />
                                <div className="min-w-0 flex-1">
                                    <h1 className="flex flex-wrap items-center gap-2 text-3xl font-semibold">{l.name}{l.verified && <Badge tone="green" icon={<BadgeCheck className="size-3.5" />}>{t('Verified')}</Badge>}</h1>
                                    {l.headline && <p className="mt-1 text-navy-600 dark:text-navy-300">{l.headline}</p>}
                                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-navy-600 dark:text-navy-300">
                                        {l.city && <span className="inline-flex items-center gap-1"><MapPin className="size-4" />{[l.city, l.province].filter(Boolean).join(', ')}</span>}
                                        {l.years_experience !== null && <span>{t(':count years in practice', { count: l.years_experience })}</span>}
                                        {l.rating !== null && <span className="inline-flex items-center gap-1"><Star className="size-4 fill-gold-400 text-gold-400" />{l.rating.toFixed(1)}, {t(':count reviews', { count: l.rating_count })}</span>}
                                    </div>
                                    <div className="mt-3 flex flex-wrap gap-1.5">{l.specializations.map((s) => <Link key={s.slug} href={route('lawyers.index', { specialization: s.slug })}><Badge>{s.name}</Badge></Link>)}</div>
                                </div>
                            </CardBody>
                        </Card>

                        <Card>
                            <CardHeader title={t('Credentials')} />
                            <CardBody className="space-y-4">
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div><Provenance kind={l.verified ? 'verified' : 'reported'} label={l.verified ? t('Verified by our team') : t('Self-reported')} /><p className="mt-1 text-sm"><span className="font-medium">{l.category_label ?? t('Advocate')}</span>{l.bar_council ? `, ${l.bar_council}` : ''}</p>{l.enrollment_number && <p className="ltr-nums text-xs text-navy-500">{t('Enrollment')}: {l.enrollment_number}</p>}{l.verified_at && <p className="text-xs text-navy-500">{t('Verified on :date', { date: formatDate(l.verified_at, locale) })}</p>}</div>
                                    <div><Provenance kind="platform" label={t('Platform records')} /><p className="mt-1 text-sm">{t(':count cases managed on the platform', { count: stats.cases_recorded })}</p><p className="text-xs text-navy-500">{t(':active active, :courts courts', { active: stats.active_cases, courts: stats.courts_represented })}</p></div>
                                </div>
                                {!l.verified && <Alert tone="info">{t('This lawyer’s Bar enrollment has not yet been verified by our team. Details below are as reported by the lawyer.')}</Alert>}
                                <p className="text-xs text-navy-500">{t('Platform statistics count only cases recorded in Wakeel Diary. They are not a measure of skill or outcomes.')}</p>
                            </CardBody>
                        </Card>

                        {l.bio && <Card><CardHeader title={t('About')} /><CardBody><p className="text-sm leading-relaxed whitespace-pre-line">{l.bio}</p></CardBody></Card>}

                        {(l.courts.length > 0 || l.languages.length > 0) && (
                            <Card>
                                <CardHeader title={t('Practice')} actions={<Provenance kind="reported" label={t('Self-reported')} />} />
                                <CardBody className="grid gap-4 sm:grid-cols-2 text-sm">
                                    {l.courts.length > 0 && <div><p className="mb-1 font-medium">{t('Courts of practice')}</p><ul className="list-disc space-y-0.5 ps-4">{l.courts.map((c) => <li key={c}>{c}</li>)}</ul></div>}
                                    {l.languages.length > 0 && <div><p className="mb-1 font-medium">{t('Languages')}</p><p>{l.languages.map((x) => t(x)).join(', ')}</p></div>}
                                </CardBody>
                            </Card>
                        )}

                        {(l.educations.length > 0 || l.experiences.length > 0 || l.credentials.length > 0) && (
                            <Card>
                                <CardHeader title={t('Education & experience')} actions={<Provenance kind="reported" label={t('Self-reported')} />} />
                                <CardBody className="space-y-4 text-sm">
                                    {l.educations.map((e, i) => <p key={i} className="flex gap-2"><GraduationCap className="size-4 shrink-0 text-navy-400" /><span><span className="font-medium">{e.degree}</span>, {e.institution}{e.year ? ` (${e.year})` : ''}</span></p>)}
                                    {l.experiences.map((e, i) => <div key={i}><p className="font-medium">{e.position}, {e.organization}</p><p className="text-xs text-navy-500">{e.start_year ?? ''}{e.start_year ? '–' : ''}{e.end_year ?? (e.start_year ? t('present') : '')}</p>{e.description && <p className="text-navy-600 dark:text-navy-300">{e.description}</p>}</div>)}
                                    {l.credentials.map((c, i) => <p key={i}><Badge>{t(c.type.charAt(0).toUpperCase() + c.type.slice(1))}</Badge> {c.url ? <a href={c.url} rel="nofollow noopener" target="_blank" className="underline">{c.title}</a> : c.title}{c.issuer ? `, ${c.issuer}` : ''}{c.year ? ` (${c.year})` : ''}</p>)}
                                </CardBody>
                            </Card>
                        )}

                        <Card>
                            <CardHeader title={t('Client reviews')} description={t('Only clients with a completed consultation or case can review. Reviews are moderated.')} />
                            <ul className="divide-y divide-navy-100 dark:divide-navy-800">
                                {l.reviews.length === 0 && <li className="px-5 py-5 text-sm text-navy-500">{t('No reviews yet.')}</li>}
                                {l.reviews.map((r) => (
                                    <li key={r.id} className="space-y-1 px-5 py-4 text-sm">
                                        <p className="flex items-center gap-0.5">{Array.from({ length: 5 }, (_, i) => <Star key={i} className={`size-3.5 ${i < r.rating ? 'fill-gold-400 text-gold-400' : 'text-navy-200'}`} />)}<span className="ms-2 font-medium">{r.title}</span></p>
                                        {r.comment && <p>{r.comment}</p>}
                                        <p className="text-xs text-navy-500">{r.author}, {formatDate(r.created_at, locale)}</p>
                                        {r.response && <p className="mt-2 rounded bg-navy-50 p-2 text-xs dark:bg-navy-800"><span className="font-semibold">{t('Response from the lawyer')}:</span> {r.response}</p>}
                                    </li>
                                ))}
                            </ul>
                        </Card>
                    </div>

                    <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
                        <Card>
                            <CardBody className="space-y-3">
                                <p className="text-sm text-navy-600 dark:text-navy-300">{t('Consultation')}</p>
                                <p className="text-2xl font-semibold">{l.fee_min ? `${formatMoney(l.fee_min, locale)}${l.fee_max && l.fee_max !== l.fee_min ? ` – ${formatMoney(l.fee_max, locale)}` : ''}` : t('Fee on request')}</p>
                                <p className="flex flex-wrap gap-3 text-xs text-navy-500">{l.offers_in_person && <span>{t('In person')}</span>}{l.offers_online && <span className="inline-flex items-center gap-1"><Video className="size-3.5" />{t('Online')}</span>}</p>
                                {canBook ? (
                                    isClient ? <LinkButton href={route('portal.book', l.slug)} className="w-full" icon={<CalendarClock className="size-4" />}>{t('Book a consultation')}</LinkButton>
                                    : !auth.user ? <LinkButton href={route('register', { type: 'client' })} className="w-full" icon={<CalendarClock className="size-4" />}>{t('Sign up to book')}</LinkButton> : null
                                ) : <Alert tone="warning">{t('Not accepting new clients right now.')}</Alert>}
                                <div className="flex gap-2">
                                    {auth.user && <Button variant="secondary" className="flex-1" icon={<Heart className={`size-4 ${isFavourite ? 'fill-red-500 text-red-500' : ''}`} />} onClick={() => router.post(route('lawyers.favourite', l.slug), {}, { preserveScroll: true })}>{isFavourite ? t('Saved') : t('Save')}</Button>}
                                    <Button variant="secondary" className="flex-1" icon={<Share2 className="size-4" />} onClick={share}>{copied ? t('Link copied') : t('Share')}</Button>
                                </div>
                            </CardBody>
                        </Card>
                        <Card>
                            <CardHeader title={t('Chambers')} />
                            <CardBody className="space-y-2 text-sm">
                                {l.chamber_address && <p className="flex gap-2"><MapPin className="size-4 shrink-0 text-navy-400" />{l.chamber_address}</p>}
                                {l.public_phone && <p className="flex gap-2"><Phone className="size-4 text-navy-400" /><a href={`tel:${l.public_phone}`} className="ltr-nums underline">{l.public_phone}</a></p>}
                                {l.public_email && <p className="flex gap-2"><Mail className="size-4 text-navy-400" /><a href={`mailto:${l.public_email}`} className="underline">{l.public_email}</a></p>}
                                {l.firms.map((f) => <Link key={f.slug} href={route('firms.show', f.slug)} className="flex gap-2 font-medium hover:underline"><Building2 className="size-4 text-navy-400" />{f.name}</Link>)}
                            </CardBody>
                        </Card>
                        <p className="text-xs text-navy-500">{t('Information here is provided for finding a lawyer and is not legal advice.')}</p>
                    </aside>
                </div>
            </div>
        </PublicLayout>
    );
}
