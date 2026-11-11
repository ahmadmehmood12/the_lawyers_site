import { motion } from 'framer-motion';
import { ArrowUpRight, Briefcase, GraduationCap } from 'lucide-react';
import { Reveal, Stagger, StaggerItem } from '@/Components/motion';
import { useT } from '@/lib/i18n';

export type TeamGroup = { designation: string; members: { id: number; name: string; designation: string | null; photo_url: string | null; bio: string | null; qualifications: string | null; experience: string | null; linkedin_url: string | null; profile_url: string | null }[] };

const initials = (name: string) => name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('');

/**
 * Founders, patrons and legal team from Admin, Team, grouped by designation in the admin's order.
 * Large portrait cards: the photo eases in on hover, the bio rises from the bottom edge.
 */
export function TeamSection({ groups }: { groups: TeamGroup[] | undefined }) {
    const t = useT();
    if (!groups || groups.length === 0) return null;

    return (
        <section className="border-t border-navy-100 bg-navy-950 py-20 text-white lg:py-28 dark:border-navy-800" aria-labelledby="hm-team">
            <div className="hm-wrap">
                <Reveal>
                    <h2 id="hm-team" className="text-4xl font-semibold sm:text-5xl">{t('The people behind it')}</h2>
                    <p className="mt-3 max-w-xl text-lg text-navy-200">{t('Advocates and builders who know the court corridor as well as the code.')}</p>
                </Reveal>
                <div className="mt-12 space-y-14">
                    {groups.map((group) => (
                        <div key={group.designation}>
                            <h3 className="mb-6 flex items-center gap-3 font-sans text-sm font-semibold text-gold-300">
                                {group.designation}
                                <span className="h-px flex-1 bg-white/10" aria-hidden />
                            </h3>
                            <Stagger className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                                {group.members.map((member) => (
                                    <StaggerItem key={member.id} as="article">
                                        <motion.div whileHover="hover" initial="rest" className="group relative overflow-hidden rounded-2xl bg-navy-900 ring-1 ring-white/10">
                                            <div className="relative aspect-[4/5] overflow-hidden">
                                                {member.photo_url ? (
                                                    <motion.img src={member.photo_url} alt={member.name} loading="lazy" className="size-full object-cover" variants={{ rest: { scale: 1 }, hover: { scale: 1.04 } }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }} />
                                                ) : (
                                                    <span className="flex size-full items-center justify-center bg-navy-800 font-serif text-6xl font-semibold text-gold-300/80">{initials(member.name)}</span>
                                                )}
                                                <div className="absolute inset-0 bg-gradient-to-t from-navy-950 via-navy-950/40 to-transparent" aria-hidden />
                                                {member.bio && (
                                                    <motion.p
                                                        className="absolute inset-x-0 bottom-0 line-clamp-5 bg-navy-950/90 p-5 text-sm leading-relaxed text-navy-100"
                                                        variants={{ rest: { y: '100%', opacity: 0 }, hover: { y: 0, opacity: 1 } }}
                                                        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                                                    >
                                                        {member.bio}
                                                    </motion.p>
                                                )}
                                            </div>
                                            <div className="space-y-1.5 p-5">
                                                <p className="font-serif text-2xl font-semibold">{member.name}</p>
                                                {member.designation && <p className="text-sm text-gold-300">{member.designation}</p>}
                                                {member.qualifications && <p className="flex items-start gap-1.5 text-sm text-navy-200"><GraduationCap className="mt-0.5 size-4 shrink-0" aria-hidden />{member.qualifications}</p>}
                                                {member.experience && <p className="flex items-start gap-1.5 text-sm text-navy-200"><Briefcase className="mt-0.5 size-4 shrink-0" aria-hidden />{member.experience}</p>}
                                                {(member.linkedin_url || member.profile_url) && (
                                                    <div className="flex gap-3 pt-2 text-sm">
                                                        {member.linkedin_url && <a href={member.linkedin_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-white underline-offset-4 hover:text-gold-300 hover:underline">LinkedIn<ArrowUpRight className="size-3.5" /></a>}
                                                        {member.profile_url && <a href={member.profile_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-white underline-offset-4 hover:text-gold-300 hover:underline">{t('Profile')}<ArrowUpRight className="size-3.5" /></a>}
                                                    </div>
                                                )}
                                            </div>
                                        </motion.div>
                                    </StaggerItem>
                                ))}
                            </Stagger>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
