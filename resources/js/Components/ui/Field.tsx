import type { ComponentProps, ReactNode } from 'react';
import { useId } from 'react';
import { cn } from '@/lib/cn';
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

type SelectProps = ComponentProps<'select'> &
    Common & { options: { value: string | number; label: string }[]; placeholder?: string };

export function Select({ label, error, hint, wrapperClassName, className, options, placeholder, required, ...props }: SelectProps) {
    return (
        <Field label={label} error={error} hint={hint} required={required} className={wrapperClassName}>
            {(id) => (
                <select id={id} required={required} aria-invalid={!!error} className={controlClasses(!!error, className)} {...props}>
                    {placeholder !== undefined && <option value="">{placeholder}</option>}
                    {options.map((option) => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>
            )}
        </Field>
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
