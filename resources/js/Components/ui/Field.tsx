import { Check, ChevronDown, Search, X } from 'lucide-react';
import {
    useCallback,
    useEffect,
    useId,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
    type ChangeEvent,
    type ComponentProps,
    type KeyboardEvent as ReactKeyboardEvent,
    type ReactNode,
} from 'react';
import { cn } from '@/lib/cn';
import { useT } from '@/lib/i18n';
import { DateTimePicker, type PickerKind } from './DateTimePicker';

export const controlClasses = (invalid?: boolean, className?: string) =>
    cn(
        'block w-full rounded-lg border-0 bg-white px-3 py-2 text-sm text-navy-900 shadow-xs ring-1 ring-inset placeholder:text-navy-400',
        'transition-shadow duration-150 focus:ring-2 focus:ring-inset focus:outline-none disabled:cursor-not-allowed disabled:bg-navy-50 disabled:text-navy-500',
        'dark:bg-navy-900 dark:text-navy-50 dark:placeholder:text-navy-500 dark:disabled:bg-navy-800',
        invalid ? 'ring-red-500 focus:ring-red-600' : 'ring-navy-400 focus:ring-navy-600 dark:ring-navy-400 dark:focus:ring-gold-500',
        className,
    );

type FieldProps = { label?: ReactNode; error?: string; hint?: ReactNode; required?: boolean; className?: string; children: (id: string) => ReactNode };

export function Field({ label, error, hint, required, className, children }: FieldProps) {
    const id = useId();
    return (
        <div className={cn('space-y-1.5', className)}>
            {label && (
                <label htmlFor={id} className="block text-sm font-medium text-navy-800 dark:text-navy-200">
                    {label}
                    {required && <span className="ms-0.5 text-red-600">*</span>}
                </label>
            )}
            {children(id)}
            {hint && !error && <p className="text-xs text-navy-500 dark:text-navy-400">{hint}</p>}
            {error && (
                <p className="animate-field-error text-xs font-medium text-red-600 dark:text-red-400" role="alert">
                    {error}
                </p>
            )}
        </div>
    );
}

type Common = { label?: ReactNode; error?: string; hint?: ReactNode; wrapperClassName?: string };

export function Input({ label, error, hint, wrapperClassName, className, required, ...props }: ComponentProps<'input'> & Common) {
    const picker = props.type === 'date' || props.type === 'time' || props.type === 'datetime-local';
    return (
        <Field label={label} error={error} hint={hint} required={required} className={wrapperClassName}>
            {(id) => picker
                ? <DateTimePicker id={id} type={props.type as PickerKind} value={props.value} onChange={props.onChange} name={props.name} min={props.min} max={props.max} step={props.step} disabled={props.disabled} required={required} invalid={!!error} placeholder={props.placeholder} className={className} aria-label={props['aria-label']} />
                : <input id={id} required={required} aria-invalid={!!error} className={controlClasses(!!error, className)} {...props} />}
        </Field>
    );
}

export function Textarea({ label, error, hint, wrapperClassName, className, required, rows = 4, ...props }: ComponentProps<'textarea'> & Common) {
    return (
        <Field label={label} error={error} hint={hint} required={required} className={wrapperClassName}>
            {(id) => <textarea id={id} rows={rows} required={required} aria-invalid={!!error} className={controlClasses(!!error, className)} {...props} />}
        </Field>
    );
}

type SelectOption = { value: string | number; label: string };

type SelectProps = Omit<ComponentProps<'select'>, 'defaultValue' | 'multiple' | 'onChange' | 'size' | 'value'> &
    Common & {
        options: SelectOption[];
        placeholder?: string;
        value?: string | number | readonly string[];
        onChange?: (event: ChangeEvent<HTMLSelectElement>) => void;
        bare?: boolean;
    };

type VisibleOption = SelectOption & { sourceIndex: number; placeholder?: boolean };

const normalizeText = (input: string): string =>
    input
        .toLowerCase()
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim();

const matchScore = (option: SelectOption, query: string): number => {
    const label = normalizeText(option.label);
    const value = normalizeText(String(option.value));
    if (label === query || value === query) return 0;
    if (label.startsWith(query)) return 1;
    if (label.split(/[\s,./()\-]+/).some((part) => part.startsWith(query))) return 2;
    if (label.includes(query)) return 3;
    const tokens = query.split(/\s+/).filter(Boolean);
    if (tokens.length > 1 && tokens.every((token) => label.includes(token) || value.includes(token))) return 4;
    if (value.includes(query)) return 5;
    return -1;
};

export function Select({ label, error, hint, wrapperClassName, className, options, placeholder, required, disabled, name, value, onChange, bare, id: idProp, ...props }: SelectProps) {
    return (
        <Field label={label} error={error} hint={hint} required={required} className={wrapperClassName}>
            {(fieldId) => (
                <SearchableSelect
                    id={idProp ?? fieldId}
                    value={value}
                    options={options}
                    placeholder={placeholder}
                    required={required}
                    invalid={!!error}
                    disabled={disabled}
                    name={name}
                    className={className}
                    bare={bare}
                    label={label}
                    ariaLabel={props['aria-label']}
                    ariaDescribedBy={props['aria-describedby']}
                    title={props.title}
                    onChange={(next) => {
                        onChange?.({ target: { value: next, name: name ?? '' }, currentTarget: { value: next, name: name ?? '' } } as unknown as ChangeEvent<HTMLSelectElement>);
                    }}
                />
            )}
        </Field>
    );
}

type SearchableSelectProps = {
    id: string;
    value?: string | number | readonly string[];
    options: SelectOption[];
    placeholder?: string;
    required?: boolean;
    invalid?: boolean;
    disabled?: boolean;
    name?: string;
    className?: string;
    bare?: boolean;
    label?: ReactNode;
    ariaLabel?: string;
    ariaDescribedBy?: string;
    title?: string;
    onChange: (value: string) => void;
};

function SearchableSelect({ id, value, options, placeholder, required, invalid, disabled, name, className, bare, label, ariaLabel, ariaDescribedBy, title, onChange }: SearchableSelectProps) {
    const t = useT();
    const generatedId = useId();
    const listboxId = `${generatedId}-listbox`;
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [activeIndex, setActiveIndex] = useState(0);
    const [position, setPosition] = useState({ left: 0, top: 0, width: 0, up: false });
    const trigger = useRef<HTMLButtonElement>(null);
    const search = useRef<HTMLInputElement>(null);
    const panel = useRef<HTMLDivElement>(null);
    const list = useRef<HTMLUListElement>(null);
    const displayValue = value === undefined || value === null ? '' : String(value);
    const selectedOption = options.find((option) => String(option.value) === displayValue);
    const selectedLabel = selectedOption?.label ?? '';
    const normalizedQuery = normalizeText(query);

    const visibleOptions = useMemo<VisibleOption[]>(() => {
        const base = options.map((option, sourceIndex) => ({ ...option, sourceIndex }));
        if (!normalizedQuery) {
            return placeholder !== undefined ? [{ value: '', label: placeholder, sourceIndex: -1, placeholder: true }, ...base] : base;
        }
        return base
            .map((option) => ({ option, score: matchScore(option, normalizedQuery) }))
            .filter((entry) => entry.score >= 0)
            .sort((a, b) => a.score - b.score || a.option.sourceIndex - b.option.sourceIndex)
            .map((entry) => entry.option);
    }, [options, placeholder, normalizedQuery]);

    const safeActiveIndex = Math.min(activeIndex, Math.max(0, visibleOptions.length - 1));
    const canClear = placeholder !== undefined && displayValue !== '' && !required && !disabled;

    const close = useCallback((focusTrigger = false) => {
        setOpen(false);
        setQuery('');
        setActiveIndex(0);
        if (focusTrigger) {
            requestAnimationFrame(() => trigger.current?.focus({ preventScroll: true }));
        }
    }, []);

    const choose = (next: string) => {
        if (next !== displayValue) {
            onChange(next);
        }
        close(true);
    };

    const openPanel = () => {
        if (!disabled) {
            setOpen(true);
        }
    };

    useEffect(() => {
        if (!open) return;
        const offset = placeholder !== undefined ? 1 : 0;
        const selectedIndex = options.findIndex((option) => String(option.value) === displayValue);
        setActiveIndex(selectedIndex >= 0 ? selectedIndex + offset : 0);
        const frame = requestAnimationFrame(() => search.current?.focus({ preventScroll: true }));
        return () => cancelAnimationFrame(frame);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    useEffect(() => {
        if (!open) return;
        const listElement = list.current;
        const activeElement = listElement?.querySelector<HTMLElement>(`[data-index="${safeActiveIndex}"]`);
        if (!listElement || !activeElement) return;
        const listRect = listElement.getBoundingClientRect();
        const activeRect = activeElement.getBoundingClientRect();
        if (activeRect.top < listRect.top) {
            listElement.scrollTop -= listRect.top - activeRect.top;
        } else if (activeRect.bottom > listRect.bottom) {
            listElement.scrollTop += activeRect.bottom - listRect.bottom;
        }
    }, [open, safeActiveIndex, normalizedQuery]);

    useLayoutEffect(() => {
        if (!open) return;
        const place = () => {
            const rect = trigger.current?.getBoundingClientRect();
            if (!rect) return;
            const width = Math.min(Math.max(rect.width, 224), Math.max(160, window.innerWidth - 16));
            const height = panel.current?.offsetHeight ?? 280;
            const up = rect.bottom + height + 8 > window.innerHeight && rect.top - height - 8 > 0;
            const left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8));
            const top = up ? Math.max(8, rect.top - height - 6) : rect.bottom + 6;
            setPosition({ left, top, width, up });
        };
        place();
        const frame = requestAnimationFrame(place);
        window.addEventListener('resize', place);
        window.addEventListener('scroll', place, true);
        return () => {
            cancelAnimationFrame(frame);
            window.removeEventListener('resize', place);
            window.removeEventListener('scroll', place, true);
        };
    }, [open, normalizedQuery, visibleOptions.length]);

    useEffect(() => {
        if (!open) return;
        const onPointerDown = (event: MouseEvent | TouchEvent) => {
            const target = event.target as Node;
            if (trigger.current?.contains(target) || panel.current?.contains(target)) return;
            close();
        };
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                event.stopPropagation();
                close(true);
            }
        };
        document.addEventListener('mousedown', onPointerDown);
        document.addEventListener('touchstart', onPointerDown);
        document.addEventListener('keydown', onKeyDown, true);
        return () => {
            document.removeEventListener('mousedown', onPointerDown);
            document.removeEventListener('touchstart', onPointerDown);
            document.removeEventListener('keydown', onKeyDown, true);
        };
    }, [open, close]);

    const onTriggerKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            openPanel();
        }
    };

    const onSearchKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
        if (event.nativeEvent.isComposing) return;
        if (event.key === 'ArrowDown') {
            event.preventDefault();
            if (visibleOptions.length > 0) setActiveIndex(Math.min(visibleOptions.length - 1, safeActiveIndex + 1));
        } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            if (visibleOptions.length > 0) setActiveIndex(Math.max(0, safeActiveIndex - 1));
        } else if (event.key === 'Enter') {
            event.preventDefault();
            const option = visibleOptions[safeActiveIndex];
            if (option) choose(String(option.value));
        } else if (event.key === 'Tab') {
            event.preventDefault();
            close(true);
        }
    };

    const triggerClassName = bare
        ? cn(
              'flex w-full items-center gap-2 rounded-md border-0 text-start transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 disabled:cursor-not-allowed disabled:opacity-60',
              className,
          )
        : controlClasses(invalid, cn('flex items-center gap-2 text-start', className));

    const panelContent = (
        <div
            ref={panel}
            onClick={(event) => event.stopPropagation()}
            style={{ position: 'fixed', left: position.left, top: position.top, width: position.width }}
            className="z-[90] overflow-hidden rounded-xl border border-navy-100 bg-white shadow-pop dark:border-navy-700 dark:bg-navy-900"
        >
            <div className="border-b border-navy-100 p-2 dark:border-navy-800">
                <div className="relative">
                    <Search className="pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-navy-400" />
                    <input
                        ref={search}
                        value={query}
                        onChange={(event) => {
                            setQuery(event.target.value);
                            setActiveIndex(0);
                        }}
                        onKeyDown={onSearchKeyDown}
                        placeholder={t('Search…')}
                        aria-label={t('Search…')}
                        role="combobox"
                        aria-expanded={open}
                        aria-controls={listboxId}
                        aria-autocomplete="list"
                        aria-activedescendant={visibleOptions.length > 0 ? `${listboxId}-option-${safeActiveIndex}` : undefined}
                        className="w-full rounded-lg border-0 bg-navy-50 py-1.5 ps-8 pe-8 text-sm text-navy-900 ring-1 ring-inset ring-navy-200 placeholder:text-navy-400 focus:ring-2 focus:ring-navy-600 focus:outline-none dark:bg-navy-800 dark:text-navy-50 dark:ring-navy-700 dark:focus:ring-gold-500"
                    />
                    {query && (
                        <button
                            type="button"
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => {
                                setQuery('');
                                setActiveIndex(0);
                                search.current?.focus({ preventScroll: true });
                            }}
                            aria-label={t('Clear')}
                            className="absolute end-1.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-navy-400 hover:text-navy-700 dark:hover:text-navy-200"
                        >
                            <X className="size-3.5" />
                        </button>
                    )}
                </div>
            </div>
            <ul
                ref={list}
                id={listboxId}
                role="listbox"
                aria-label={ariaLabel ?? (typeof label === 'string' ? label : t('Select'))}
                className="max-h-60 overflow-y-auto p-1"
            >
                {visibleOptions.length === 0 && (
                    <li role="presentation" className="px-3 py-2 text-sm text-navy-500 dark:text-navy-400">
                        {t('No matches')}
                    </li>
                )}
                {visibleOptions.map((option, index) => {
                    const isSelected = String(option.value) === displayValue;
                    const isActive = index === safeActiveIndex;
                    return (
                        <li
                            key={`${String(option.value)}-${option.sourceIndex}`}
                            id={`${listboxId}-option-${index}`}
                            data-index={index}
                            role="option"
                            aria-selected={isSelected}
                            onMouseDown={(event) => event.preventDefault()}
                            onMouseEnter={() => setActiveIndex(index)}
                            onClick={() => choose(String(option.value))}
                            className={cn(
                                'flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-1.5 text-sm',
                                isActive ? 'bg-navy-100 text-navy-950 dark:bg-navy-800 dark:text-white' : 'text-navy-700 dark:text-navy-200',
                                option.placeholder && 'text-navy-500 dark:text-navy-400',
                                isSelected && 'font-semibold',
                            )}
                        >
                            <span className="min-w-0 flex-1 break-words">{option.label}</span>
                            {isSelected && <Check className="size-4 shrink-0 text-navy-700 dark:text-gold-400" />}
                        </li>
                    );
                })}
            </ul>
        </div>
    );

    return (
        <div className="relative">
            <button
                ref={trigger}
                id={id}
                type="button"
                disabled={disabled}
                onClick={() => (open ? close() : openPanel())}
                onKeyDown={onTriggerKeyDown}
                aria-haspopup="listbox"
                aria-expanded={open}
                aria-required={required}
                aria-invalid={invalid || undefined}
                aria-label={ariaLabel}
                aria-describedby={ariaDescribedBy}
                title={title}
                className={triggerClassName}
            >
                <span className={cn('min-w-0 flex-1 truncate', !selectedLabel && 'text-navy-400')}>{selectedLabel || placeholder || ''}</span>
                {canClear && (
                    <span
                        role="button"
                        tabIndex={-1}
                        aria-label={t('Clear')}
                        onMouseDown={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                        }}
                        onClick={(event) => {
                            event.stopPropagation();
                            choose('');
                        }}
                        className="rounded p-0.5 text-navy-400 hover:bg-navy-100 hover:text-navy-700 dark:hover:bg-navy-800 dark:hover:text-navy-200"
                    >
                        <X className="size-3.5" />
                    </span>
                )}
                <ChevronDown className={cn('size-4 shrink-0 text-navy-400 transition-transform', open && 'rotate-180')} />
            </button>
            {name && <input type="hidden" name={name} value={displayValue} readOnly />}
            {open && panelContent}
        </div>
    );
}

export function Checkbox({ label, error, className, ...props }: ComponentProps<'input'> & { label: ReactNode; error?: string }) {
    return (
        <div>
            <label className={cn('inline-flex cursor-pointer items-start gap-2.5 text-sm text-navy-800 dark:text-navy-200', className)}>
                <input
                    type="checkbox"
                    className="mt-0.5 size-4 rounded border-navy-300 text-navy-900 accent-navy-900 focus:ring-navy-600 dark:accent-gold-500"
                    {...props}
                />
                <span>{label}</span>
            </label>
            {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
        </div>
    );
}
