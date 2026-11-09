import { Link, router, usePage, usePoll } from '@inertiajs/react';
import { AlertCircle, Archive, ArrowLeft, Check, CheckCheck, Clock3, MailCheck, MessageSquare, Paperclip, Plus, Send, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Avatar, Button, Card, Modal, Select } from '@/Components/ui';
import { controlClasses } from '@/Components/ui/Field';
import AppLayout from '@/Layouts/AppLayout';
import { cn } from '@/lib/cn';
import { formatBytes, formatDate } from '@/lib/format';
import { useLocale, useT } from '@/lib/i18n';
import type { SelectOption } from '@/types/domain';

type Conversation = { id: number; subject: string | null; with: string; with_avatar: string | null; organization: string; last_message_at: string | null; preview: string | null; unread: number };
type Status = 'sent' | 'delivered' | 'read';
type Message = { id: number; body: string | null; mine: boolean; sender: string; sender_id: number; sender_avatar: string | null; status: Status | null; attachment: { name: string; size: number; url: string } | null; created_at: string };
type Pending = { key: string; body: string; attachment: string | null; failed: boolean; created_at: string };
type Props = {
    area: 'workspace' | 'portal';
    routePrefix: string;
    me: { id: number; name: string; avatar: string | null };
    conversations: Conversation[];
    active: { id: number; subject: string | null; with: string; with_avatar: string | null; case: { id: number; title: string } | null; archived: boolean; messages: Message[] } | null;
    starters: { client_id: number; lawyer_id: number; label: string }[] | null;
    clients: SelectOption[] | null;
    filters: { archived: boolean; search: string };
};

/** Only the chat data is reloaded on poll, send and conversation switch, so the page never blanks. */
const PARTIAL = ['conversations', 'active', 'me'];

const timeOf = (iso: string, locale: string) => new Intl.DateTimeFormat(locale === 'ur' ? 'ur-PK-u-nu-latn' : 'en-PK', { hour: 'numeric', minute: '2-digit' }).format(new Date(iso));
const dayKey = (iso: string) => iso.slice(0, 10);

/** Single tick = sent, grey double = delivered (they signed in / opened the app), blue double = read. */
function Ticks({ status, pending, failed }: { status: Status | null; pending?: boolean; failed?: boolean }) {
    const t = useT();
    if (failed) return <AlertCircle className="size-3.5 text-red-300" aria-label={t('Not sent')} />;
    if (pending) return <Clock3 className="size-3 opacity-80" aria-label={t('Sending')} />;
    if (status === 'read') return <CheckCheck className="size-3.5 text-sky-400" aria-label={t('Seen')} />;
    if (status === 'delivered') return <CheckCheck className="size-3.5 opacity-80" aria-label={t('Delivered')} />;
    return <Check className="size-3.5 opacity-80" aria-label={t('Sent')} />;
}

export default function Messages({ area, routePrefix, me, conversations, active, starters, clients, filters }: Props) {
    const t = useT();
    const { locale } = useLocale();
    const { errors } = usePage().props as { errors: Record<string, string> };
    const [startOpen, setStartOpen] = useState(false);
    const [body, setBody] = useState('');
    const [attachment, setAttachment] = useState<File | null>(null);
    const [pending, setPending] = useState<Pending[]>([]);
    const [switching, setSwitching] = useState(false);
    const scroller = useRef<HTMLDivElement>(null);
    const textarea = useRef<HTMLTextAreaElement>(null);

    usePoll(8000, { only: PARTIAL }, { keepAlive: false });

    // Show a skeleton (not a blank pane) while another conversation loads.
    useEffect(() => {
        const off = [
            router.on('start', (e) => setSwitching(e.detail.visit.method === 'get' && e.detail.visit.url.pathname.includes('/messages/') && !e.detail.visit.prefetch)),
            router.on('finish', () => setSwitching(false)),
        ];
        return () => off.forEach((stop) => stop());
    }, []);

    useEffect(() => {
        setPending([]);
    }, [active?.id]);

    useEffect(() => {
        scroller.current?.scrollTo({ top: scroller.current.scrollHeight });
    }, [active?.messages.length, active?.id, pending.length]);

    function autosize() {
        const el = textarea.current;
        if (!el) return;
        el.style.height = 'auto';
        el.style.height = `${Math.min(el.scrollHeight, 128)}px`;
    }

    function send(e?: React.FormEvent) {
        e?.preventDefault();
        if (!active || (!body.trim() && !attachment)) return;
        const item: Pending = { key: `p${Date.now()}`, body: body.trim(), attachment: attachment?.name ?? null, failed: false, created_at: new Date().toISOString() };
        const data = attachment ? { body: item.body, attachment } : { body: item.body };
        setPending((p) => [...p, item]);
        setBody('');
        setAttachment(null);
        requestAnimationFrame(autosize);
        router.post(route(`${routePrefix}.send`, active.id), data, {
            forceFormData: !!attachment,
            preserveScroll: true,
            preserveState: true,
            only: PARTIAL,
            onSuccess: () => setPending((p) => p.filter((x) => x.key !== item.key)),
            onError: () => setPending((p) => p.map((x) => (x.key === item.key ? { ...x, failed: true } : x))),
        });
    }

    const grouped = useMemo(() => {
        const list = active?.messages ?? [];
        return list.map((m, i) => ({
            message: m,
            newDay: i === 0 || dayKey(list[i - 1].created_at) !== dayKey(m.created_at),
            lastOfGroup: i === list.length - 1 || list[i + 1].sender_id !== m.sender_id || dayKey(list[i + 1].created_at) !== dayKey(m.created_at),
        }));
    }, [active?.messages]);

    const totalUnread = conversations.reduce((sum, c) => sum + c.unread, 0);
    const visit = (url: string) => router.visit(url, { only: PARTIAL, preserveState: true, preserveScroll: true });

    return (
        <AppLayout title={t('Messages')} area={area} wide>
            <div className="grid h-[calc(100dvh-9rem)] gap-4 lg:h-[calc(100dvh-7rem)] lg:grid-cols-[340px_minmax(0,1fr)]">
                {/* Conversation list */}
                <Card className={cn('flex min-h-0 flex-col', active && 'hidden lg:flex')}>
                    <div className="flex items-center gap-2 border-b border-navy-100 p-3 dark:border-navy-800">
                        <input type="search" defaultValue={filters.search} placeholder={t('Search…')} className={controlClasses(false)} onKeyDown={(e) => e.key === 'Enter' && router.get(route(`${routePrefix}.index`), { search: (e.target as HTMLInputElement).value || undefined, archived: filters.archived ? 1 : undefined }, { preserveState: true })} aria-label={t('Search')} />
                        <Button size="sm" icon={<Plus className="size-4" />} onClick={() => setStartOpen(true)} aria-label={t('New conversation')} />
                    </div>
                    <div className="flex items-center gap-1 border-b border-navy-100 px-3 py-2 text-xs dark:border-navy-800">
                        <Link href={route(`${routePrefix}.index`)} className={cn('rounded px-2 py-1', !filters.archived && 'bg-navy-100 font-semibold dark:bg-navy-800')}>{t('Inbox')}</Link>
                        <Link href={route(`${routePrefix}.index`, { archived: 1 })} className={cn('rounded px-2 py-1', filters.archived && 'bg-navy-100 font-semibold dark:bg-navy-800')}>{t('Archived')}</Link>
                        {totalUnread > 0 && (
                            <button type="button" onClick={() => router.post(route(`${routePrefix}.read-all`), {}, { preserveScroll: true, preserveState: true, only: PARTIAL })} className="ms-auto inline-flex items-center gap-1 rounded px-2 py-1 font-medium text-navy-600 hover:bg-navy-100 dark:text-navy-300 dark:hover:bg-white/10">
                                <MailCheck className="size-3.5" />{t('Mark all read')}
                            </button>
                        )}
                    </div>
                    <ul className="flex-1 overflow-y-auto">
                        {conversations.length === 0 && <li className="p-6 text-center text-sm text-navy-500">{t('No conversations.')}</li>}
                        {conversations.map((c) => (
                            <li key={c.id} className="group relative">
                                <button type="button" onClick={() => visit(route(`${routePrefix}.show`, c.id))} className={cn('flex w-full items-center gap-3 border-b border-navy-50 px-4 py-3 text-start hover:bg-navy-50 dark:border-navy-800 dark:hover:bg-navy-800', active?.id === c.id && 'bg-navy-50 dark:bg-navy-800')}>
                                    <Avatar name={c.with || '?'} src={c.with_avatar} />
                                    <span className="min-w-0 flex-1">
                                        <span className="flex items-center justify-between gap-2">
                                            <span className={cn('truncate text-sm', c.unread > 0 ? 'font-semibold text-navy-900 dark:text-white' : 'font-medium')}>{c.with}</span>
                                            {c.last_message_at && <span className={cn('shrink-0 text-[11px]', c.unread > 0 ? 'font-semibold text-verdant-700 dark:text-verdant-300' : 'text-navy-400')}>{dayKey(c.last_message_at) === dayKey(new Date().toISOString()) ? timeOf(c.last_message_at, locale) : formatDate(c.last_message_at, locale, { day: 'numeric', month: 'short' })}</span>}
                                        </span>
                                        <span className="flex items-center justify-between gap-2">
                                            <span className={cn('truncate text-xs', c.unread > 0 ? 'text-navy-700 dark:text-navy-200' : 'text-navy-500')}>{c.preview ?? c.subject}</span>
                                            {c.unread > 0 && <span className="shrink-0 rounded-full bg-verdant-600 px-1.5 text-[11px] font-bold text-white">{c.unread}</span>}
                                        </span>
                                    </span>
                                </button>
                                {c.unread > 0 && (
                                    <button type="button" onClick={() => router.post(route(`${routePrefix}.read`, c.id), {}, { preserveScroll: true, preserveState: true, only: PARTIAL })} className="absolute end-3 top-1 hidden rounded bg-white px-1.5 py-0.5 text-[10px] font-medium text-navy-600 shadow-sm group-hover:block group-focus-within:block dark:bg-navy-900 dark:text-navy-200" title={t('Mark as read')}>
                                        {t('Mark as read')}
                                    </button>
                                )}
                            </li>
                        ))}
                    </ul>
                </Card>

                {/* Chat */}
                <Card className={cn('relative flex min-h-0 flex-col overflow-hidden', !active && 'hidden lg:flex')}>
                    {switching && (
                        <div className="absolute inset-0 z-20 flex flex-col gap-3 bg-navy-50/80 p-6 backdrop-blur-sm dark:bg-navy-950/70" aria-busy>
                            {[60, 40, 70, 30].map((w, i) => <div key={i} className={cn('h-10 animate-pulse rounded-2xl bg-white dark:bg-navy-800', i % 2 ? 'ms-auto' : '')} style={{ width: `${w}%` }} />)}
                        </div>
                    )}
                    {!active ? (
                        <div className="flex flex-1 flex-col items-center justify-center gap-3 bg-navy-50/60 p-8 text-center dark:bg-navy-950/40">
                            <span className="flex size-14 items-center justify-center rounded-full bg-white shadow-sm dark:bg-navy-800"><MessageSquare className="size-6 text-navy-500" /></span>
                            <p className="font-semibold text-navy-900 dark:text-white">{t('Select a conversation')}</p>
                            <p className="max-w-xs text-sm text-navy-500">{t('Messages are encrypted and visible only to participants.')}</p>
                            {conversations[0] && <Button size="sm" variant="secondary" onClick={() => visit(route(`${routePrefix}.show`, conversations[0].id))}>{t('Open the latest conversation')}</Button>}
                        </div>
                    ) : (
                        <>
                            <div className="flex items-center gap-3 border-b border-navy-100 px-4 py-3 dark:border-navy-800">
                                <Link href={route(`${routePrefix}.index`)} className="lg:hidden" aria-label={t('Back')}><ArrowLeft className="size-5 rtl:rotate-180" /></Link>
                                <Avatar name={active.with || '?'} src={active.with_avatar} />
                                <div className="min-w-0 flex-1">
                                    <p className="truncate font-semibold">{active.with}</p>
                                    <p className="truncate text-xs text-navy-500">{active.subject}{active.case && <>, <Link href={route('cases.show', active.case.id)} className="underline">{active.case.title}</Link></>}</p>
                                </div>
                                <Button size="sm" variant="ghost" icon={<Archive className="size-4" />} onClick={() => router.post(route(`${routePrefix}.archive`, active.id))}>{active.archived ? t('Unarchive') : t('Archive')}</Button>
                            </div>

                            <div ref={scroller} className="flex-1 overflow-y-auto bg-navy-50/60 px-3 py-4 sm:px-5 dark:bg-navy-950/40">
                                {grouped.map(({ message: m, newDay, lastOfGroup }) => (
                                    <div key={m.id}>
                                        {newDay && <DaySeparator iso={m.created_at} />}
                                        <Bubble mine={m.mine} name={m.mine ? me.name : m.sender} avatar={m.mine ? me.avatar : m.sender_avatar} showAvatar={lastOfGroup} time={timeOf(m.created_at, locale)} ticks={m.mine ? <Ticks status={m.status} /> : null}>
                                            {m.body && <p className="whitespace-pre-line break-words">{m.body}</p>}
                                            {m.attachment && <a href={m.attachment.url} className="mt-1 flex items-center gap-1.5 underline"><Paperclip className="size-3.5" />{m.attachment.name}, {formatBytes(m.attachment.size)}</a>}
                                        </Bubble>
                                    </div>
                                ))}
                                {pending.map((p) => (
                                    <Bubble key={p.key} mine name={me.name} avatar={me.avatar} showAvatar time={timeOf(p.created_at, locale)} ticks={<Ticks status={null} pending={!p.failed} failed={p.failed} />} faded={!p.failed}>
                                        {p.body && <p className="whitespace-pre-line break-words">{p.body}</p>}
                                        {p.attachment && <p className="mt-1 flex items-center gap-1.5"><Paperclip className="size-3.5" />{p.attachment}</p>}
                                        {p.failed && (
                                            <span className="mt-1 flex items-center gap-2 text-[11px]">
                                                {t('Not sent.')}
                                                <button type="button" className="underline" onClick={() => { setPending((x) => x.filter((y) => y.key !== p.key)); setBody(p.body); }}>{t('Edit and retry')}</button>
                                            </span>
                                        )}
                                    </Bubble>
                                ))}
                            </div>

                            {attachment && (
                                <div className="flex items-center gap-2 border-t border-navy-100 bg-navy-50 px-4 py-2 text-xs dark:border-navy-800 dark:bg-navy-900">
                                    <Paperclip className="size-3.5" />{attachment.name}, {formatBytes(attachment.size)}
                                    <button type="button" className="ms-auto rounded p-0.5 hover:bg-navy-200 dark:hover:bg-navy-800" onClick={() => setAttachment(null)} aria-label={t('Remove attachment')}><X className="size-3.5" /></button>
                                </div>
                            )}
                            <form onSubmit={send} className="flex items-end gap-2 border-t border-navy-100 p-3 dark:border-navy-800">
                                <label className="cursor-pointer rounded-md p-2 hover:bg-navy-100 dark:hover:bg-navy-800" aria-label={t('Attach file')}>
                                    <Paperclip className={cn('size-5', attachment ? 'text-gold-600' : 'text-navy-500')} />
                                    <input type="file" className="sr-only" accept=".pdf,.docx,image/*" onChange={(e) => { setAttachment(e.target.files?.[0] ?? null); e.target.value = ''; }} />
                                </label>
                                <textarea
                                    ref={textarea}
                                    value={body}
                                    onChange={(e) => { setBody(e.target.value); autosize(); }}
                                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
                                    rows={1}
                                    placeholder={t('Write a message…')}
                                    className={controlClasses(!!errors.body, 'max-h-32 min-h-10 resize-none rounded-2xl')}
                                    aria-label={t('Message')}
                                />
                                <Button type="submit" className="rounded-full" icon={<Send className="size-4 rtl:-scale-x-100" />} aria-label={t('Send')} disabled={!body.trim() && !attachment} />
                            </form>
                            {(errors.body || errors.attachment) && <p className="px-3 pb-2 text-xs text-red-600">{errors.body ?? errors.attachment}</p>}
                        </>
                    )}
                </Card>
            </div>
            <StartDialog open={startOpen} onClose={() => setStartOpen(false)} routePrefix={routePrefix} starters={starters} clients={clients} />
        </AppLayout>
    );
}

/** One chat bubble with the sender's photo on the outer side (yours on the right, theirs on the left). */
function Bubble({ mine, name, avatar, showAvatar, time, ticks, faded, children }: { mine: boolean; name: string; avatar: string | null; showAvatar: boolean; time: string; ticks: React.ReactNode; faded?: boolean; children: React.ReactNode }) {
    return (
        <div className={cn('flex items-end gap-2', mine ? 'flex-row-reverse' : 'flex-row', showAvatar ? 'mb-3' : 'mb-0.5')}>
            <div className="w-8 shrink-0">{showAvatar && <Avatar name={name} src={avatar} size="sm" />}</div>
            <div className={cn(
                'relative max-w-[78%] rounded-2xl px-3.5 py-2 text-sm shadow-xs sm:max-w-[65%]',
                mine ? 'bg-navy-900 text-white dark:bg-verdant-700' : 'bg-white text-navy-900 dark:bg-navy-800 dark:text-navy-50',
                showAvatar && (mine ? 'rounded-ee-sm' : 'rounded-es-sm'),
                faded && 'opacity-70',
            )}>
                {children}
                <span className={cn('mt-0.5 flex items-center justify-end gap-1 text-[10px] tabular-nums', mine ? 'text-white/70' : 'text-navy-400')}>
                    <span className="ltr-nums">{time}</span>{ticks}
                </span>
            </div>
        </div>
    );
}

function DaySeparator({ iso }: { iso: string }) {
    const t = useT();
    const { locale } = useLocale();
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
    const day = iso.slice(0, 10);
    const label = day === today ? t('Today') : day === yesterday ? t('Yesterday') : formatDate(iso, locale, { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' });
    return (
        <div className="my-4 flex justify-center">
            <span className="rounded-full bg-white px-3 py-1 text-[11px] font-medium text-navy-500 shadow-xs dark:bg-navy-800 dark:text-navy-300">{label}</span>
        </div>
    );
}

function StartDialog({ open, onClose, routePrefix, starters, clients }: { open: boolean; onClose: () => void; routePrefix: string; starters: Props['starters']; clients: Props['clients'] }) {
    const t = useT();
    const [choice, setChoice] = useState('');
    const options = starters ? starters.map((s, i) => ({ value: String(i), label: s.label })) : (clients ?? []);
    function start() {
        if (!choice) return;
        const data = starters ? { client_id: starters[Number(choice)].client_id, lawyer_id: starters[Number(choice)].lawyer_id } : { client_id: choice };
        router.post(route(`${routePrefix}.store`), data, { onSuccess: onClose });
    }
    return (
        <Modal open={open} onClose={onClose} title={t('New conversation')} footer={<><Button variant="secondary" onClick={onClose}>{t('Cancel')}</Button><Button onClick={start} disabled={!choice}>{t('Start')}</Button></>}>
            {options.length === 0 ? <p className="text-sm text-navy-500">{starters ? t('You can message lawyers on your shared cases.') : t('Only clients with a portal account can receive messages.')}</p> : (
                <Select label={starters ? t('Lawyer') : t('Client')} value={choice} onChange={(e) => setChoice(e.target.value)} options={options} placeholder={t('Select')} />
            )}
        </Modal>
    );
}
