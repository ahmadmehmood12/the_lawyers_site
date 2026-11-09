/**
 * One colour per item type (border/fill for chips, dot for the legend). Status adds its own
 * marks on top: rescheduled = amber ring + struck-through old time, cancelled = struck title,
 * completed = check, ghost (old slot) = dashed and faded.
 */
export const typeColors: Record<string, { chip: string; dot: string; block: string }> = {
    hearing: { chip: 'border-s-navy-700 bg-navy-50 text-navy-900 dark:bg-navy-800/70 dark:text-white', dot: 'bg-navy-700 dark:bg-navy-300', block: 'bg-navy-700 text-white' },
    consultation: { chip: 'border-s-verdant-600 bg-verdant-50 text-verdant-900 dark:bg-verdant-900/40 dark:text-verdant-100', dot: 'bg-verdant-600', block: 'bg-verdant-600 text-white' },
    appointment: { chip: 'border-s-verdant-600 bg-verdant-50 text-verdant-900 dark:bg-verdant-900/40 dark:text-verdant-100', dot: 'bg-verdant-600', block: 'bg-verdant-600 text-white' },
    meeting: { chip: 'border-s-sky-600 bg-sky-50 text-sky-900 dark:bg-sky-900/40 dark:text-sky-100', dot: 'bg-sky-600', block: 'bg-sky-600 text-white' },
    court_visit: { chip: 'border-s-indigo-600 bg-indigo-50 text-indigo-900 dark:bg-indigo-900/40 dark:text-indigo-100', dot: 'bg-indigo-600', block: 'bg-indigo-600 text-white' },
    deadline: { chip: 'border-s-rose-600 bg-rose-50 text-rose-900 dark:bg-rose-900/40 dark:text-rose-100', dot: 'bg-rose-600', block: 'bg-rose-600 text-white' },
    task: { chip: 'border-s-orange-500 bg-orange-50 text-orange-900 dark:bg-orange-900/40 dark:text-orange-100', dot: 'bg-orange-500', block: 'bg-orange-500 text-white' },
    reminder: { chip: 'border-s-gold-500 bg-gold-50 text-gold-700 dark:bg-gold-700/30 dark:text-gold-100', dot: 'bg-gold-500', block: 'bg-gold-500 text-navy-950' },
    note: { chip: 'border-s-slate-400 bg-slate-50 text-slate-800 dark:bg-slate-800/60 dark:text-slate-100', dot: 'bg-slate-400', block: 'bg-slate-500 text-white' },
    personal: { chip: 'border-s-violet-500 bg-violet-50 text-violet-900 dark:bg-violet-900/40 dark:text-violet-100', dot: 'bg-violet-500', block: 'bg-violet-500 text-white' },
    other: { chip: 'border-s-zinc-400 bg-zinc-50 text-zinc-800 dark:bg-zinc-800/60 dark:text-zinc-100', dot: 'bg-zinc-400', block: 'bg-zinc-500 text-white' },
};

export const colorFor = (type: string) => typeColors[type] ?? typeColors.other;
