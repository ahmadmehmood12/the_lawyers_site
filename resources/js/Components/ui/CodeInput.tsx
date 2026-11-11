import { useEffect, useRef, useState, type ClipboardEvent, type KeyboardEvent } from 'react';
import { cn } from '@/lib/cn';

/**
 * Six separate digit boxes for one-time codes. Typing moves forward, Backspace moves back,
 * pasting a full code fills every box. Calls onComplete once all digits are present.
 */
export function CodeInput({ value, onChange, onComplete, error, length = 6, autoFocus = true, disabled }: {
    value: string;
    onChange: (code: string) => void;
    onComplete?: (code: string) => void;
    error?: string;
    length?: number;
    autoFocus?: boolean;
    disabled?: boolean;
}) {
    const refs = useRef<Array<HTMLInputElement | null>>([]);
    const [shake, setShake] = useState(0);
    const digits = Array.from({ length }, (_, i) => value[i] ?? '');

    useEffect(() => {
        if (autoFocus) refs.current[0]?.focus();
    }, [autoFocus]);

    useEffect(() => {
        if (error) {
            setShake((n) => n + 1);
            refs.current[0]?.focus();
        }
    }, [error]);

    function update(next: string) {
        const clean = next.replace(/\D/g, '').slice(0, length);
        onChange(clean);
        if (clean.length === length) onComplete?.(clean);
    }

    function setDigit(index: number, digit: string) {
        const chars = digits.slice();
        chars[index] = digit;
        update(chars.join(''));
        if (digit && index < length - 1) refs.current[index + 1]?.focus();
    }

    function onKeyDown(index: number, event: KeyboardEvent<HTMLInputElement>) {
        if (event.key === 'Backspace' && !digits[index] && index > 0) {
            event.preventDefault();
            setDigit(index - 1, '');
            refs.current[index - 1]?.focus();
        } else if (event.key === 'ArrowLeft' && index > 0) refs.current[index - 1]?.focus();
        else if (event.key === 'ArrowRight' && index < length - 1) refs.current[index + 1]?.focus();
    }

    function onPaste(event: ClipboardEvent<HTMLInputElement>) {
        const pasted = event.clipboardData.getData('text').replace(/\D/g, '');
        if (!pasted) return;
        event.preventDefault();
        update(pasted);
        refs.current[Math.min(pasted.length, length - 1)]?.focus();
    }

    return (
        <div>
            <div key={shake} dir="ltr" className={cn('flex justify-center gap-2 sm:gap-3', shake > 0 && 'animate-code-shake')}>
                {digits.map((digit, index) => (
                    <input
                        key={index}
                        ref={(el) => { refs.current[index] = el; }}
                        value={digit}
                        disabled={disabled}
                        inputMode="numeric"
                        autoComplete={index === 0 ? 'one-time-code' : 'off'}
                        maxLength={1}
                        aria-label={`Digit ${index + 1}`}
                        onChange={(e) => setDigit(index, e.target.value.replace(/\D/g, '').slice(-1))}
                        onKeyDown={(e) => onKeyDown(index, e)}
                        onPaste={onPaste}
                        onFocus={(e) => e.target.select()}
                        className={cn(
                            'size-11 rounded-lg border bg-white text-center font-mono text-xl font-semibold text-navy-900 shadow-sm outline-none transition sm:size-12 dark:bg-navy-900 dark:text-white',
                            'focus:border-gold-500 focus:ring-2 focus:ring-gold-500/30',
                            error ? 'border-red-400' : digit ? 'border-navy-400 dark:border-navy-500' : 'border-navy-200 dark:border-navy-700',
                        )}
                    />
                ))}
            </div>
            {error && <p className="mt-2 text-center text-sm text-red-600 dark:text-red-400">{error}</p>}
        </div>
    );
}

/** Seconds left before "send again" is allowed; restart() begins a new countdown. */
export function useCooldown(seconds = 60) {
    const [left, setLeft] = useState(seconds);

    useEffect(() => {
        if (left <= 0) return;
        const timer = setTimeout(() => setLeft((n) => n - 1), 1000);
        return () => clearTimeout(timer);
    }, [left]);

    return { left, restart: () => setLeft(seconds) };
}
