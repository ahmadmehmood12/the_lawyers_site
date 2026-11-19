<?php

namespace App\Services\Analytics;

use BackedEnum;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Query\Builder as QueryBuilder;
use Illuminate\Support\Str;

/**
 * One tab of the admin Analytics dashboard. Sections return plain arrays (cached by
 * PlatformAnalytics) built from real records only; nothing is estimated or invented.
 * Platform staff see aggregates and names of lawyers, firms and platform users, never case
 * content (docs/Security/Data-Privacy.md).
 */
abstract class AnalyticsSection
{
    public function __construct(protected AnalyticsRange $range) {}

    /** @return array<string, mixed> */
    abstract public function data(): array;

    /**
     * A KPI: value in the range, value in the previous period and the percentage change
     * (null when the previous period was zero, so "new" is never shown as +100%).
     *
     * @return array{value: float|int, previous: float|int, change: float|null}
     */
    protected function compare(callable $measure): array
    {
        $current = $measure($this->range);
        $previous = $measure($this->range->previous());

        return ['value' => $current, 'previous' => $previous, 'change' => $this->change($current, $previous)];
    }

    protected function change(float|int $current, float|int $previous): ?float
    {
        return $previous == 0 ? null : round((($current - $previous) / abs($previous)) * 100, 1);
    }

    /**
     * A time series over the range's buckets (zero-filled).
     *
     * @return list<array{key: string, label: string, from: string, to: string, value: float|int}>
     */
    protected function series(Builder|QueryBuilder $query, string $column, string $aggregate = 'COUNT(*)', bool $dateColumn = false, ?AnalyticsRange $range = null): array
    {
        $range ??= $this->range;
        $query = clone $query;
        $dateColumn ? $range->applyDate($query, $column) : $range->apply($query, $column);
        $values = $query->selectRaw($range->bucketSql($column).' as bucket, '.$aggregate.' as aggregate')
            ->groupBy('bucket')->pluck('aggregate', 'bucket');

        return array_map(fn (array $bucket) => $bucket + ['value' => $this->number($values[$bucket['key']] ?? 0)], $range->buckets());
    }

    /**
     * Several series sharing the same buckets, for multi-line charts.
     *
     * @param  array<string, list<array{value: float|int}>>  $series
     * @param  array<string, string>  $labels
     * @return array{buckets: list<array{label: string, from: string, to: string}>, series: list<array{key: string, label: string, values: list<float|int>}>}
     */
    protected function combine(array $series, array $labels = []): array
    {
        $first = reset($series) ?: [];

        return [
            'buckets' => array_map(fn (array $b) => ['label' => $b['label'], 'from' => $b['from'], 'to' => $b['to']], $first),
            'series' => array_values(array_map(fn (string $key) => [
                'key' => $key,
                'label' => $labels[$key] ?? Str::headline($key),
                'values' => array_column($series[$key], 'value'),
            ], array_keys($series))),
        ];
    }

    /**
     * Counts grouped by a column, labelled (enum labels when an enum class is given).
     *
     * @param  class-string<BackedEnum>|null  $enum
     * @return list<array{key: string, label: string, value: float|int}>
     */
    protected function grouped(Builder|QueryBuilder $query, string $column, ?string $enum = null, string $aggregate = 'COUNT(*)', bool $sort = true): array
    {
        $rows = (clone $query)->selectRaw("{$column} as grouping_key, {$aggregate} as aggregate")->groupBy('grouping_key')->pluck('aggregate', 'grouping_key');

        $items = [];
        foreach ($rows as $key => $value) {
            $key = (string) ($key ?? '');
            $items[] = ['key' => $key === '' ? 'none' : $key, 'label' => $this->label($key, $enum), 'value' => $this->number($value)];
        }
        if ($sort) {
            usort($items, fn ($a, $b) => $b['value'] <=> $a['value']);
        }

        return $items;
    }

    /**
     * All values of an enum in their declared order (zero when absent), for stable charts.
     *
     * @param  class-string<BackedEnum>  $enum
     * @return list<array{key: string, label: string, value: float|int}>
     */
    protected function enumCounts(Builder|QueryBuilder $query, string $column, string $enum): array
    {
        $counts = (clone $query)->selectRaw("{$column} as grouping_key, COUNT(*) as aggregate")->groupBy('grouping_key')->pluck('aggregate', 'grouping_key');

        return array_map(fn (BackedEnum $case) => [
            'key' => (string) $case->value,
            'label' => $this->label((string) $case->value, $enum),
            'value' => (int) ($counts[$case->value] ?? 0),
        ], $enum::cases());
    }

    /** @param  class-string<BackedEnum>|null  $enum */
    protected function label(string $value, ?string $enum = null): string
    {
        if ($value === '') {
            return __('Not set');
        }
        if ($enum !== null && ($case = $enum::tryFrom($value)) !== null && method_exists($case, 'label')) {
            return $case->label();
        }

        return __(Str::headline($value));
    }

    protected function number(mixed $value): float|int
    {
        $number = (float) $value;

        return floor($number) == $number && abs($number) < PHP_INT_MAX ? (int) $number : round($number, 2);
    }
}
