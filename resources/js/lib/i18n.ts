import { usePage } from '@inertiajs/react';
import type { SharedProps } from '@/types';

export type Translator = (key: string, replacements?: Record<string, string | number>) => string;

/**
 * UI translations: keys are the English source strings (lang/en.json, lang/ur.json).
 * Placeholders use Laravel's ":name" syntax.
 */
export function translate(dictionary: Record<string, string>, key: string, replacements?: Record<string, string | number>): string {
    let value = dictionary[key] ?? key;
    if (replacements) {
        for (const [name, replacement] of Object.entries(replacements)) {
            value = value.replaceAll(`:${name}`, String(replacement));
        }
    }
    return value;
}

export function useT(): Translator {
    const { translations } = usePage<SharedProps>().props;
    return (key, replacements) => translate(translations ?? {}, key, replacements);
}

export function useLocale() {
    const { app } = usePage<SharedProps>().props;
    return { locale: app.locale, dir: app.dir, isRtl: app.dir === 'rtl' };
}
