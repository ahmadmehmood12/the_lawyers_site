<?php

namespace App\Services\Analytics\Sections;

use App\Enums\AppointmentMode;
use App\Enums\AppointmentStatus;
use App\Services\Analytics\AnalyticsRange;
use App\Services\Analytics\AnalyticsSection;
use App\Support\PublicFile;
use Illuminate\Database\Query\Builder;
use Illuminate\Support\Facades\DB;

/**
 * Appointments and consultations booked in the range (by booking date). Requested = pending,
 * Confirmed = accepted. Client messages and lawyer notes are never read.
 */
class AppointmentAnalytics extends AnalyticsSection
{
    public function data(): array
    {
        $booked = $this->booked();
        $statuses = $this->enumCounts($booked, 'status', AppointmentStatus::class);
        $byStatus = array_column($statuses, 'value', 'key');
        $total = array_sum($byStatus);
        $decided = $total - ($byStatus['requested'] ?? 0);

        return [
            'kpis' => [
                'booked' => $this->compare(fn (AnalyticsRange $r) => (int) $this->booked($r)->count()),
                'pending' => (int) ($byStatus['requested'] ?? 0),
                'accepted' => (int) ($byStatus['confirmed'] ?? 0),
                'completed' => $this->compare(fn (AnalyticsRange $r) => (int) $this->booked($r)->where('status', 'completed')->count()),
                'cancelled' => (int) (($byStatus['cancelled'] ?? 0) + ($byStatus['declined'] ?? 0)),
                'no_show' => (int) ($byStatus['no_show'] ?? 0),
                'acceptance_rate' => $decided > 0 ? round(((($byStatus['confirmed'] ?? 0) + ($byStatus['completed'] ?? 0) + ($byStatus['no_show'] ?? 0)) / $decided) * 100, 1) : null,
                'completion_rate' => $total > 0 ? round((($byStatus['completed'] ?? 0) / $total) * 100, 1) : null,
                'fees' => $this->compare(fn (AnalyticsRange $r) => (float) $this->booked($r)->where('status', 'completed')->sum('fee')),
                'upcoming' => (int) DB::table('appointments')->where('status', 'confirmed')->where('starts_at', '>=', now())->count(),
                'awaiting_reply' => (int) DB::table('appointments')->where('status', 'requested')->where('starts_at', '>=', now())->count(),
            ],
            'statuses' => $statuses,
            'trend' => $this->combine([
                'booked' => $this->series(DB::table('appointments'), 'created_at'),
                'completed' => $this->series(DB::table('appointments')->where('status', 'completed'), 'created_at'),
                'cancelled' => $this->series(DB::table('appointments')->whereIn('status', ['cancelled', 'declined']), 'created_at'),
            ], ['booked' => __('Booked'), 'completed' => __('Completed'), 'cancelled' => __('Cancelled or declined')]),
            'modes' => $this->enumCounts($booked, 'mode', AppointmentMode::class),
            'kinds' => $this->grouped($booked, 'kind'),
            'weekdays' => $this->weekdays($booked),
            'lawyers' => $this->lawyers(),
        ];
    }

    private function booked(?AnalyticsRange $range = null): Builder
    {
        return ($range ?? $this->range)->apply(DB::table('appointments'), 'appointments.created_at');
    }

    /** When consultations take place, Monday to Sunday. */
    private function weekdays(Builder $booked): array
    {
        $counts = (clone $booked)->selectRaw('WEEKDAY(starts_at) as day, COUNT(*) as total')->groupBy('day')->pluck('total', 'day');
        $names = [__('Mon'), __('Tue'), __('Wed'), __('Thu'), __('Fri'), __('Sat'), __('Sun')];

        return array_map(fn (int $day) => ['key' => (string) $day, 'label' => $names[$day], 'value' => (int) ($counts[$day] ?? 0)], range(0, 6));
    }

    private function lawyers(): array
    {
        return $this->booked()->join('users', 'users.id', '=', 'appointments.lawyer_id')
            ->leftJoin('organizations', 'organizations.id', '=', 'appointments.organization_id')
            ->selectRaw("users.id, users.name, users.avatar_path, organizations.name as organization, COUNT(*) as total,
                SUM(appointments.status = 'completed') as completed, SUM(appointments.status IN ('cancelled', 'declined')) as cancelled,
                SUM(appointments.status = 'requested') as pending, COALESCE(SUM(CASE WHEN appointments.status = 'completed' THEN appointments.fee END), 0) as fees")
            ->groupBy('users.id', 'users.name', 'users.avatar_path', 'organizations.name')
            ->orderByDesc('total')->limit(20)->get()
            ->map(fn ($row) => [
                'id' => $row->id, 'name' => $row->name, 'avatar' => PublicFile::url($row->avatar_path), 'organization' => $row->organization,
                'total' => (int) $row->total, 'completed' => (int) $row->completed, 'cancelled' => (int) $row->cancelled,
                'pending' => (int) $row->pending, 'fees' => (float) $row->fees,
            ])->all();
    }
}
