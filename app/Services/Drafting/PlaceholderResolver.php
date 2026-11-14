<?php

namespace App\Services\Drafting;

use App\Models\Client;
use App\Models\LegalCase;
use App\Models\Organization;
use App\Models\User;

/**
 * Fills {{placeholders}} in templates from case/client/lawyer data.
 * Unknown or empty placeholders are left visible (highlighted) so the
 * advocate notices what still needs filling.
 */
class PlaceholderResolver
{
    /** @var array<string, string> placeholder => description */
    public const AVAILABLE = [
        'client.name' => 'Client name', 'client.cnic' => 'Client CNIC', 'client.address' => 'Client address', 'client.phone' => 'Client phone',
        'case.title' => 'Case title', 'case.number' => 'Court case number', 'case.court' => 'Court', 'case.judge' => 'Judge',
        'case.fir_number' => 'FIR number', 'case.police_station' => 'Police station', 'case.sections' => 'Legal sections',
        'party.opposite' => 'Opposite party name(s)', 'lawyer.name' => 'Lawyer name', 'lawyer.enrollment' => 'Enrollment number',
        'lawyer.category' => 'Advocate category', 'organization.name' => 'Chambers / firm name', 'organization.address' => 'Chambers address',
        'organization.city' => 'City', 'today' => "Today's date",
        'lawyer.phone' => 'Lawyer phone', 'lawyer.email' => 'Lawyer email', 'lawyer.bar_council' => 'Bar Council', 'lawyer.chamber_address' => 'Chamber address',
    ];

    /**
     * @param  array<string, string|null>  $extra  more values, e.g. form.client_name from a legal form
     */
    public function resolve(string $body, Organization $organization, User $lawyer, ?LegalCase $case = null, ?Client $client = null, array $extra = []): string
    {
        $values = [...$this->values($organization, $lawyer, $case, $client), ...$extra];

        return preg_replace_callback('/\{\{\s*([a-z_.]+)\s*\}\}/', function (array $m) use ($values): string {
            $value = $values[$m[1]] ?? null;

            return filled($value)
                ? nl2br(e((string) $value), false)
                : '<span class="placeholder" data-placeholder="'.e($m[1]).'">{{'.e($m[1]).'}}</span>';
        }, $body) ?? $body;
    }

    /**
     * Every known placeholder value for this lawyer, case and client (used to prefill legal forms).
     *
     * @return array<string, string|null>
     */
    public function values(Organization $organization, User $lawyer, ?LegalCase $case = null, ?Client $client = null): array
    {
        $case?->loadMissing(['court:id,name', 'judge:id,name', 'parties', 'clients']);
        $client ??= $case?->clients->first();
        $profile = $lawyer->lawyerProfile;

        $values = [
            'client.name' => $client?->name, 'client.cnic' => $client?->cnic, 'client.address' => $client?->address, 'client.phone' => $client?->phone,
            'case.title' => $case?->title, 'case.number' => $case?->case_number, 'case.court' => $case?->court?->name, 'case.judge' => $case?->judge?->name ?? $case?->judge_name,
            'case.fir_number' => $case?->fir_number, 'case.police_station' => $case?->police_station, 'case.sections' => $case?->legal_sections,
            'party.opposite' => $case?->parties->where('is_our_side', false)->pluck('name')->implode(', ') ?: null,
            'lawyer.name' => $lawyer->name, 'lawyer.enrollment' => $profile?->enrollment_number, 'lawyer.category' => $profile?->advocate_category?->label(),
            'organization.name' => $organization->name, 'organization.address' => $organization->address, 'organization.city' => $organization->city?->name,
            'today' => now()->translatedFormat('d F Y'),
            'lawyer.phone' => $lawyer->phone, 'lawyer.email' => $lawyer->email, 'lawyer.bar_council' => $profile?->barCouncil?->name,
            'lawyer.chamber_address' => $profile?->chamber_address ?: $organization->address,
        ];

        return array_map(fn ($v) => $v === null ? null : (string) $v, $values);
    }
}
