<?php

namespace App\Services\Judgments;

use Illuminate\Support\Facades\DB;

/**
 * Keyword-in-context excerpts for a full-text judgment search: the sentence around the
 * first hit on each matching page, split into plain/highlighted segments so the UI can
 * mark the searched words without rendering HTML from the database.
 */
class JudgmentSnippets
{
    public const MaxPerJudgment = 2;

    private const CharsBefore = 140;

    private const CharsAfter = 220;

    /**
     * @param  list<int>  $judgmentIds  judgments on the current result page
     * @param  array<int, list<int>>  $pagesByJudgment  matching page numbers per judgment (textMatch()['pages'])
     * @param  array{phrases: list<string>, words: list<string>}  $terms
     * @return array<int, list<array{page: int, segments: list<array{text: string, hit: bool}>}>>
     */
    public function for(array $judgmentIds, array $pagesByJudgment, array $terms): array
    {
        $pattern = $this->pattern($terms);
        $wanted = [];
        foreach ($judgmentIds as $id) {
            foreach (array_slice($pagesByJudgment[$id] ?? [], 0, self::MaxPerJudgment + 1) as $page) {
                $wanted[$id][] = $page;
            }
        }

        if ($pattern === null || $wanted === []) {
            return [];
        }

        $rows = DB::table('judgment_pages')
            ->whereIn('reported_judgment_id', array_keys($wanted))
            ->whereIn('page_number', array_unique(array_merge(...array_values($wanted))))
            ->orderBy('page_number')
            ->get(['reported_judgment_id', 'page_number', 'body']);

        $snippets = [];
        foreach ($rows as $row) {
            $id = (int) $row->reported_judgment_id;
            if (! in_array((int) $row->page_number, $wanted[$id] ?? [], true) || count($snippets[$id] ?? []) >= self::MaxPerJudgment) {
                continue;
            }

            $segments = $this->excerpt((string) $row->body, $pattern);
            if ($segments !== null) {
                $snippets[$id][] = ['page' => (int) $row->page_number, 'segments' => $segments];
            }
        }

        return $snippets;
    }

    /** @param  array{phrases: list<string>, words: list<string>}  $terms */
    private function pattern(array $terms): ?string
    {
        $parts = [];
        foreach ($terms['phrases'] as $phrase) {
            // MySQL treats hyphens and punctuation as word breaks, so "pre arrest bail" also matches "Pre-arrest Bail".
            $parts[] = implode('[\s\-\x{2010}-\x{2014}.,]+', array_map(fn ($w) => preg_quote($w, '/'), preg_split('/\s+/', trim($phrase)) ?: []));
        }
        foreach ($terms['words'] as $word) {
            // The search matches word prefixes (word*), so highlight the whole word that starts with it.
            $parts[] = preg_quote($word, '/').'[\p{L}\p{N}]*';
        }
        $parts = array_filter($parts);

        return $parts === [] ? null : '/(?<![\p{L}\p{N}])(?:'.implode('|', $parts).')/iu';
    }

    /** @return list<array{text: string, hit: bool}>|null */
    private function excerpt(string $body, string $pattern): ?array
    {
        $text = trim(preg_replace('/\s+/u', ' ', $body) ?? '');
        if (! preg_match($pattern, $text, $first, PREG_OFFSET_CAPTURE)) {
            return null;
        }

        $offset = mb_strlen(substr($text, 0, $first[0][1]));
        $length = mb_strlen($text);
        $start = max(0, $offset - self::CharsBefore);
        $end = min($length, $offset + mb_strlen($first[0][0]) + self::CharsAfter);

        // Snap to whole words so the excerpt never starts or ends mid-word.
        if ($start > 0 && ($space = mb_strpos($text, ' ', $start)) !== false && $space < $offset) {
            $start = $space + 1;
        }
        if ($end < $length && ($space = mb_strrpos(mb_substr($text, 0, $end), ' ')) !== false && $space > $offset) {
            $end = $space;
        }

        $window = ($start > 0 ? '… ' : '').mb_substr($text, $start, $end - $start).($end < $length ? ' …' : '');
        $segments = [];
        $cursor = 0;
        preg_match_all($pattern, $window, $hits, PREG_OFFSET_CAPTURE);
        foreach ($hits[0] as [$hit, $at]) {
            if ($at > $cursor) {
                $segments[] = ['text' => substr($window, $cursor, $at - $cursor), 'hit' => false];
            }
            $segments[] = ['text' => $hit, 'hit' => true];
            $cursor = $at + strlen($hit);
        }
        if ($cursor < strlen($window)) {
            $segments[] = ['text' => substr($window, $cursor), 'hit' => false];
        }

        return $segments;
    }
}
