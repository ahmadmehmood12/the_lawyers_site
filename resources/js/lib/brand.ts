/**
 * Splits the site name for the two-tone wordmark: the first word stays ink, the rest is gold
 * ("Da Barrister" → "Da" + "Barrister"). A single word ending in "Diary" splits before "Diary".
 */
export function splitBrand(name: string): [string, string | null] {
    const trimmed = name.trim();
    const space = trimmed.indexOf(' ');
    if (space > 0) return [trimmed.slice(0, space), trimmed.slice(space + 1)];
    const diary = trimmed.match(/^(.+?)(Diary)$/);
    return diary ? [diary[1], diary[2]] : [trimmed, null];
}
