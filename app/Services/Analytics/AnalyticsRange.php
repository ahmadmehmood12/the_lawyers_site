<?php

namespace App\Services\Analytics;

use Carbon\CarbonImmutable;
use Carbon\CarbonPeriod;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Query\Builder as QueryBuilder;

/**
 * The dashboard's date range (preset or custom), the equally long period before it (for the
 * percentage change on KPI cards) and the chart bucket size (hour, day, week, month, year).
 */
final class AnalyticsRange
{
    public const PRESETS = ['today', '7d', '30d', 'month', 'year', 'custom'];

    public const INTERVALS = ['auto', 'day', 'week', 'month', 'year'];

    private function __construct(
        public readonly string $preset,
        public readonly CarbonImmutable $from,
        public readonly CarbonImmutable $to,
        public readonly string $interval,
    ) {}

    public static function make(?string $preset, ?string $from = null, ?string $to = null, ?string $interval = null): self
    {
        $now = CarbonImmutable::now();
        $preset = in_array($preset, self::PRESETS, true) ? $preset : '30d';

        [$start, $end] = match ($preset) {
            'today' => [$now->startOfDay(), $now->endOfDay()],
            '7d' => [$now->subDays(6)->startOfDay(), $now->endOfDay()],
            'month' => [$now->startOfMonth(), $now->endOfDay()],
            'year' => [$now->startOfYear(), $now->endOfDay()],
            'custom' => self::custom($from, $to, $now),
            default => [$now->subDays(29)->startOfDay(), $now->endOfDay()],
        };

        $interval = in_array($interval, self::INTERVALS, true) ? $interval : 'auto';
        if ($interval === 'auto') {
            $days = $start->diffInDays($end) + 1;
            $interval = match (true) {
                $days <= 1 => 'hour',
                $days <= 62 => 'day',
                $days <= 366 * 2 => 'month',
                default => 'year',
            };
        }

        return new self($preset, $start, $end, $interval);
    }

    /** @return array{0: CarbonImmutable, 1: CarbonImmutable} */
    private static function custom(?string $from, ?string $to, CarbonImmutable $now): array
    {
        try {
            $start = $from ? CarbonImmutable::parse($from)->startOfDay() : $now->subDays(29)->startOfDay();
            $end = $to ? CarbonImmutable::parse($to)->endOfDay() : $now->endOfDay();
        } catch (\Throwable) {
            return [$now->subDays(29)->startOfDay(), $now->endOfDay()];
        }
        if ($end->lessThan($start)) {
            [$start, $end] = [$end->startOfDay(), $start->endOfDay()];
        }

        // Ten years at most keeps the queries bounded.
        return [$start->max($end->subYears(10)->startOfDay()), $end];
    }

    /**
     * The period to compare with: the same days of last month (This month), of last year
     * (This year), otherwise the same length of time immediately before this range.
     */
    public function previous(): self
    {
        if ($this->preset === 'month') {
            $from = $this->from->subMonthNoOverflow()->startOfMonth();

            return new self($this->preset, $from, $this->to->subMonthNoOverflow()->min($from->endOfMonth()), $this->interval);
        }
        if ($this->preset === 'year') {
            return new self($this->preset, $this->from->subYearNoOverflow(), $this->to->subYearNoOverflow(), $this->interval);
        }

        $seconds = $this->to->getTimestamp() - $this->from->getTimestamp();
        $end = $this->from->subSecond();

        return new self($this->preset, $end->subSeconds($seconds), $end, $this->interval);
    }

    /**
     * @template T of Builder|QueryBuilder
     *
     * @param  T  $query
     * @return T
     */
    public function apply(Builder|QueryBuilder $query, string $column): Builder|QueryBuilder
    {
        return $query->whereBetween($column, [$this->from->toDateTimeString(), $this->to->toDateTimeString()]);
    }

    /** Same as apply() for DATE columns. */
    public function applyDate(Builder|QueryBuilder $query, string $column): Builder|QueryBuilder
    {
        return $query->whereBetween($column, [$this->from->toDateString(), $this->to->toDateString()]);
    }

    /** SQL (MySQL) that turns a column into this range's bucket key. */
    public function bucketSql(string $column): string
    {
        return match ($this->interval) {
            'hour' => "DATE_FORMAT({$column}, '%Y-%m-%d %H')",
            'week' => "DATE_FORMAT({$column}, '%x-%v')",
            'month' => "DATE_FORMAT({$column}, '%Y-%m')",
            'year' => "DATE_FORMAT({$column}, '%Y')",
            default => "DATE_FORMAT({$column}, '%Y-%m-%d')",
        };
    }

    /**
     * Every bucket in the range, in order, so empty buckets show as zero.
     *
     * @return list<array{key: string, label: string, from: string, to: string}>
     */
    public function buckets(): array
    {
        [$step, $keyFormat, $labelFormat, $startOf, $endOf] = match ($this->interval) {
            'hour' => ['1 hour', 'Y-m-d H', 'H:00', 'startOfHour', 'endOfHour'],
            'week' => ['1 week', 'o-W', 'j M', 'startOfWeek', 'endOfWeek'],
            'month' => ['1 month', 'Y-m', 'M Y', 'startOfMonth', 'endOfMonth'],
            'year' => ['1 year', 'Y', 'Y', 'startOfYear', 'endOfYear'],
            default => ['1 day', 'Y-m-d', 'j M', 'startOfDay', 'endOfDay'],
        };

        $buckets = [];
        foreach (CarbonPeriod::create($this->from->{$startOf}(), $step, $this->to) as $moment) {
            $moment = CarbonImmutable::instance($moment);
            $buckets[] = [
                'key' => $moment->format($keyFormat),
                'label' => $moment->translatedFormat($labelFormat),
                'from' => $moment->{$startOf}()->max($this->from)->toDateString(),
                'to' => $moment->{$endOf}()->min($this->to)->toDateString(),
            ];
        }

        return $buckets;
    }

    public function isLive(): bool
    {
        return $this->to->isFuture() || $this->to->isToday();
    }

    public function cacheKey(): string
    {
        return $this->from->format('YmdHi').'-'.$this->to->format('YmdHi').'-'.$this->interval;
    }

    /** @return array{preset: string, from: string, to: string, interval: string, previous_from: string, previous_to: string} */
    public function toArray(): array
    {
        $previous = $this->previous();

        return [
            'preset' => $this->preset,
            'from' => $this->from->toDateString(),
            'to' => $this->to->toDateString(),
            'interval' => $this->interval,
            'previous_from' => $previous->from->toDateString(),
            'previous_to' => $previous->to->toDateString(),
        ];
    }
}
