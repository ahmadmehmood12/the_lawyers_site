import { Link, router } from '@inertiajs/react';
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/cn';
import { useT } from '@/lib/i18n';
import type { Paginated } from '@/types';
import { controlClasses } from './Field';

export type Column<T> = {
    key: string;
    label: ReactNode;
    render?: (row: T) => ReactNode;
    sortable?: boolean;
    className?: string;
    /** Hide on narrow screens; the row's primary column should stay visible. */
    hideOnMobile?: boolean;
};

type Props<T> = {
    columns: Column<T>[];
    rows: Paginated<T> | T[];
    filters?: Record<string, string | null | undefined>;
    searchable?: boolean;
    searchPlaceholder?: string;
    toolbar?: ReactNode;
    rowHref?: (row: T) => string;
    empty?: ReactNode;
    rowKey?: (row: T) => string | number;
};

/**
 * Server-driven table: search, sort and pagination round-trip through the
 * query string so the backend applies them (never filter in the browser).
 */
export function DataTable<T extends { id?: number | string }>({ columns, rows, filters = {}, searchable = true, searchPlaceholder, toolbar, rowHref, empty, rowKey }: Props<T>) {
    const t = useT();
    const data = Array.isArray(rows) ? rows : rows.data;
    const paginated = Array.isArray(rows) ? null : rows;
    const [search, setSearch] = useState(filters.search ?? '');
    const first = useRef(true);

    useEffect(() => {
        if (first.current) {
            first.current = false;
            return;
        }
        const timer = setTimeout(() => visit({ search: search || undefined, page: undefined }), 350);
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search]);

    function visit(changes: Record<string, string | number | undefined>) {
        const query = { ...filters, ...changes };
        Object.keys(query).forEach((key) => (query[key] === undefined || query[key] === '' || query[key] === null) && delete query[key]);
        router.get(window.location.pathname, query as Record<string, string>, { preserveState: true, preserveScroll: true, replace: true });
    }

    function toggleSort(key: string) {
        const direction = filters.sort === key && filters.direction !== 'desc' ? 'desc' : 'asc';
        visit({ sort: key, direction });
    }

    return (
        <div>
            {(searchable || toolbar) && (
                <div className="flex flex-col gap-3 border-b border-navy-100 p-3 sm:flex-row sm:items-center dark:border-navy-800">
                    {searchable && (
                        <div className="relative sm:w-72">
                            <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-navy-400" />
                            <input
                                type="search"
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                placeholder={searchPlaceholder ?? t('Search…')}
                                className={controlClasses(false, 'ps-9')}
                                aria-label={t('Search')}
                            />
                        </div>
                    )}
                    {toolbar && <div className="flex flex-1 flex-wrap items-center gap-2 sm:justify-end">{toolbar}</div>}
                </div>
            )}
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-navy-100 text-sm dark:divide-navy-800">
                    <thead className="bg-navy-50/60 dark:bg-navy-950/40">
                        <tr>
                            {columns.map((column) => (
                                <th
                                    key={column.key}
                                    scope="col"
                                    className={cn('px-4 py-2.5 text-start text-[13px] font-semibold whitespace-nowrap text-navy-600 dark:text-navy-300', column.hideOnMobile && 'hidden md:table-cell', column.className)}
                                >
                                    {column.sortable ? (
                                        <button type="button" onClick={() => toggleSort(column.key)} className="inline-flex items-center gap-1 hover:text-navy-900 dark:hover:text-white">
                                            {column.label}
                                            {filters.sort === column.key && (filters.direction === 'desc' ? <ArrowDown className="size-3" /> : <ArrowUp className="size-3" />)}
                                        </button>
                                    ) : (
                                        column.label
                                    )}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-navy-100 dark:divide-navy-800">
                        {data.length === 0 ? (
                            <tr>
                                <td colSpan={columns.length} className="px-4 py-12 text-center text-navy-500">
                                    {empty ?? t('No records found.')}
                                </td>
                            </tr>
                        ) : (
                            data.map((row, index) => (
                                <tr
                                    key={rowKey ? rowKey(row) : (row.id ?? index)}
                                    className={cn('align-top', rowHref && 'cursor-pointer hover:bg-navy-50/70 dark:hover:bg-navy-800/50')}
                                    onClick={(event) => {
                                        if (!rowHref || (event.target as HTMLElement).closest('a,button,input,select')) return;
                                        router.visit(rowHref(row));
                                    }}
                                >
                                    {columns.map((column) => (
                                        <td key={column.key} className={cn('px-4 py-3 text-navy-800 dark:text-navy-100', column.hideOnMobile && 'hidden md:table-cell', column.className)}>
                                            {column.render ? column.render(row) : String((row as Record<string, unknown>)[column.key] ?? '—')}
                                        </td>
                                    ))}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
            {paginated && <Pagination meta={paginated} />}
        </div>
    );
}

export function Pagination({ meta }: { meta: Paginated<unknown> }) {
    const t = useT();
    if (meta.last_page <= 1) {
        return meta.total > 0 ? <p className="px-4 py-3 text-xs text-navy-500">{t(':count records', { count: meta.total })}</p> : null;
    }
    const prev = meta.links[0]?.url;
    const next = meta.links[meta.links.length - 1]?.url;
    return (
        <div className="flex items-center justify-between gap-3 border-t border-navy-100 px-4 py-3 text-sm dark:border-navy-800">
            <p className="text-xs text-navy-500">{t('Showing :from–:to of :total', { from: meta.from ?? 0, to: meta.to ?? 0, total: meta.total })}</p>
            <div className="flex items-center gap-1">
                <PageLink href={prev} label={t('Previous')}>
                    <ChevronLeft className="size-4 rtl:rotate-180" />
                </PageLink>
                <span className="px-2 text-xs text-navy-600 dark:text-navy-300">
                    {meta.current_page} / {meta.last_page}
                </span>
                <PageLink href={next} label={t('Next')}>
                    <ChevronRight className="size-4 rtl:rotate-180" />
                </PageLink>
            </div>
        </div>
    );
}

function PageLink({ href, label, children }: { href: string | null | undefined; label: string; children: ReactNode }) {
    const classes = 'inline-flex size-8 items-center justify-center rounded-md ring-1 ring-navy-200 dark:ring-navy-700';
    return href ? (
        <Link href={href} preserveScroll preserveState className={cn(classes, 'hover:bg-navy-50 dark:hover:bg-navy-800')} aria-label={label}>
            {children}
        </Link>
    ) : (
        <span className={cn(classes, 'opacity-40')} aria-hidden>
            {children}
        </span>
    );
}
