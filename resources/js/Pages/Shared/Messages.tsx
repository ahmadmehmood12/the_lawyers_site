import { Link, router, useForm, usePoll } from '@inertiajs/react';
import { Archive, ArrowLeft, CheckCheck, MessageSquare, Paperclip, Plus, Send } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Button, Card, EmptyState, Modal, Select } from '@/Components/ui';
import { controlClasses } from '@/Components/ui/Field';
import AppLayout from '@/Layouts/AppLayout';
import { cn } from '@/lib/cn';
import { formatBytes, formatDateTime } from '@/lib/format';
import { useLocale, useT } from '@/lib/i18n';
import type { SelectOption } from '@/types/domain';

type Conversation = { id: number; subject: string | null; with: string; organization: string; last_message_at: string | null; preview: string | null; unread: number };
type Message = { id: number; body: string | null; mine: boolean; sender: string; attachment: { name: string; size: number; url: string } | null; created_at: string; read: boolean };
type Props = {
    area: 'workspace' | 'portal';
    routePrefix: string;
    conversations: Conversation[];
    active: { id: number; subject: string | null; with: string; case: { id: number; title: string } | null; archived: boolean; messages: Message[] } | null;
    starters: { client_id: number; lawyer_id: number; label: string }[] | null;
    clients: SelectOption[] | null;
    filters: { archived: boolean; search: string };
};

export default function Messages({ area, routePrefix, conversations, active, starters, clients, filters }: Props) {
    const t = useT();
    const { locale } = useLocale();
    const [startOpen, setStartOpen] = useState(false);
    const bottom = useRef<HTMLDivElement>(null);
    const form = useForm({ body: '', attachment: null as File | null });
    usePoll(10000, { only: ['conversations', 'active'] }, { keepAlive: false });
    useEffect(() => bottom.current?.scrollIntoView({ block: 'end' }), [active?.messages.length, active?.id]);

    function send(e: React.FormEvent) {
        e.preventDefault();
        if (!active) return;
        form.post(route(`${routePrefix}.send`, active.id), { forceFormData: !!form.data.attachment, preserveScroll: true, onSuccess: () => form.reset() });
    }

    return (
        <AppLayout title={t('Messages')} area={area} wide>
            <div className="grid h-[calc(100dvh-9rem)] gap-4 lg:h-[calc(100dvh-7rem)] lg:grid-cols-[320px_1fr]">
                <Card className={cn('flex min-h-0 flex-col', active && 'hidden lg:flex')}>
                    <div className="flex items-center gap-2 border-b border-navy-100 p-3 dark:border-navy-800">
                        <input type="search" defaultValue={filters.search} placeholder={t('Search…')} className={controlClasses(false)} onKeyDown={(e) => e.key === 'Enter' && router.get(route(`${routePrefix}.index`), { search: (e.target as HTMLInputElement).value || undefined, archived: filters.archived ? 1 : undefined }, { preserveState: true })} aria-label={t('Search')} />
                        <Button size="sm" icon={<Plus className="size-4" />} onClick={() => setStartOpen(true)} aria-label={t('New conversation')} />
                    </div>
                    <div className="flex gap-1 border-b border-navy-100 px-3 py-2 text-xs dark:border-navy-800">
                        <Link href={route(`${routePrefix}.index`)} className={cn('rounded px-2 py-1', !filters.archived && 'bg-navy-100 font-semibold dark:bg-navy-800')}>{t('Inbox')}</Link>
                        <Link href={route(`${routePrefix}.index`, { archived: 1 })} className={cn('rounded px-2 py-1', filters.archived && 'bg-navy-100 font-semibold dark:bg-navy-800')}>{t('Archived')}</Link>
                    </div>
                    <ul className="flex-1 overflow-y-auto">
                        {conversations.length === 0 && <li className="p-6 text-center text-sm text-navy-500">{t('No conversations.')}</li>}
                        {conversations.map((c) => (
                            <li key={c.id}>
                                <Link href={route(`${routePrefix}.show`, c.id)} preserveScroll className={cn('block border-b border-navy-50 px-4 py-3 hover:bg-navy-50 dark:border-navy-800 dark:hover:bg-navy-800', active?.id === c.id && 'bg-navy-50 dark:bg-navy-800')}>
                                    <div className="flex items-center justify-between gap-2">
                                        <p className={cn('truncate text-sm', c.unread > 0 ? 'font-semibold' : 'font-medium')}>{c.with}</p>
                                        {c.unread > 0 && <span className="rounded-full bg-gold-500 px-1.5 text-[11px] font-bold text-navy-950">{c.unread}</span>}
                                    </div>
                                    <p className="truncate text-xs text-navy-500">{c.subject}{area === 'portal' ? `, ${c.organization}` : ''}</p>
                                    {c.preview && <p className="truncate text-xs text-navy-400">{c.preview}</p>}
                                </Link>
                            </li>
                        ))}
                    </ul>
                </Card>

                <Card className={cn('flex min-h-0 flex-col', !active && 'hidden lg:flex')}>
                    {!active ? (
                        <div className="flex flex-1 items-center justify-center"><EmptyState icon={<MessageSquare className="size-5" />} title={t('Select a conversation')} description={t('Messages are encrypted and visible only to participants.')} /></div>
                    ) : (
                        <>
                            <div className="flex items-center gap-3 border-b border-navy-100 px-4 py-3 dark:border-navy-800">
                                <Link href={route(`${routePrefix}.index`)} className="lg:hidden" aria-label={t('Back')}><ArrowLeft className="size-5 rtl:rotate-180" /></Link>
                                <div className="min-w-0 flex-1">
                                    <p className="truncate font-semibold">{active.with}</p>
                                    <p className="truncate text-xs text-navy-500">{active.subject}{active.case && <>, <Link href={route('cases.show', active.case.id)} className="underline">{active.case.title}</Link></>}</p>
                                </div>
                                <Button size="sm" variant="ghost" icon={<Archive className="size-4" />} onClick={() => router.post(route(`${routePrefix}.archive`, active.id))}>{active.archived ? t('Unarchive') : t('Archive')}</Button>
                            </div>
                            <div className="flex-1 space-y-3 overflow-y-auto bg-navy-50/40 p-4 dark:bg-navy-950/30">
                                {active.messages.map((m) => (
                                    <div key={m.id} className={cn('flex', m.mine ? 'justify-end' : 'justify-start')}>
                                        <div className={cn('max-w-[80%] rounded-2xl px-3.5 py-2 text-sm shadow-xs', m.mine ? 'rounded-ee-sm bg-navy-900 text-white dark:bg-gold-500 dark:text-navy-950' : 'rounded-es-sm bg-white dark:bg-navy-800')}>
                                            {m.body && <p className="whitespace-pre-line">{m.body}</p>}
                                            {m.attachment && <a href={m.attachment.url} className="mt-1 flex items-center gap-1.5 underline"><Paperclip className="size-3.5" />{m.attachment.name}, {formatBytes(m.attachment.size)}</a>}
                                            <p className={cn('mt-1 flex items-center gap-1 text-[10px]', m.mine ? 'justify-end opacity-75' : 'text-navy-500')}>{formatDateTime(m.created_at, locale)}{m.mine && m.read && <CheckCheck className="size-3" aria-label={t('Read')} />}</p>
                                        </div>
                                    </div>
                                ))}
                                <div ref={bottom} />
                            </div>
                            <form onSubmit={send} className="flex items-end gap-2 border-t border-navy-100 p-3 dark:border-navy-800">
                                <label className="cursor-pointer rounded-md p-2 hover:bg-navy-100 dark:hover:bg-navy-800" aria-label={t('Attach file')}>
                                    <Paperclip className={cn('size-5', form.data.attachment ? 'text-gold-600' : 'text-navy-500')} />
                                    <input type="file" className="sr-only" accept=".pdf,.docx,image/*" onChange={(e) => form.setData('attachment', e.target.files?.[0] ?? null)} />
                                </label>
                                <textarea value={form.data.body} onChange={(e) => form.setData('body', e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(e); } }} rows={1} placeholder={form.data.attachment ? form.data.attachment.name : t('Write a message…')} className={controlClasses(!!form.errors.body, 'max-h-32 min-h-10 resize-none')} aria-label={t('Message')} />
                                <Button type="submit" loading={form.processing} icon={<Send className="size-4 rtl:-scale-x-100" />} aria-label={t('Send')} disabled={!form.data.body && !form.data.attachment} />
                            </form>
                            {(form.errors.body || form.errors.attachment) && <p className="px-3 pb-2 text-xs text-red-600">{form.errors.body ?? form.errors.attachment}</p>}
                        </>
                    )}
                </Card>
            </div>
            <StartDialog open={startOpen} onClose={() => setStartOpen(false)} routePrefix={routePrefix} starters={starters} clients={clients} />
        </AppLayout>
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
