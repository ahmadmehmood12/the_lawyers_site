<?php

namespace App\Services\Cases;

use App\Enums\CaseStatus;
use App\Models\Client;
use App\Models\LegalCase;
use App\Models\Organization;
use App\Models\User;
use App\Services\Access\OrganizationAccess;
use App\Services\Support\NumberSequencer;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Case lifecycle. Clients and lawyers attached to a case must belong to the
 * same organization — this service enforces it (never trust submitted IDs).
 */
class CaseService
{
    public function __construct(private NumberSequencer $numbers, private Timeline $timeline, private OrganizationAccess $access) {}

    /**
     * @param  array<string, mixed>  $data  validated StoreCaseRequest payload
     */
    public function create(Organization $organization, User $actor, array $data): LegalCase
    {
        return DB::transaction(function () use ($organization, $actor, $data): LegalCase {
            $case = $organization->cases()->create([
                ...Arr::except($data, ['client_ids', 'lawyer_ids', 'lead_lawyer_id', 'parties']),
                'reference' => $this->numbers->next($organization, 'case'),
                'filing_year' => $data['filing_year'] ?? (isset($data['filing_date']) ? (int) substr((string) $data['filing_date'], 0, 4) : null),
                'created_by' => $actor->id,
            ]);

            $this->syncClients($case, $data['client_ids'] ?? []);
            $this->syncLawyers($case, $data['lawyer_ids'] ?? [$actor->id], $data['lead_lawyer_id'] ?? $actor->id);
            $this->syncParties($case, $data['parties'] ?? []);

            $this->timeline->record($case, 'case_opened', __('Case file opened'), $case->title, $case, true);

            return $case;
        });
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function update(LegalCase $case, array $data): LegalCase
    {
        return DB::transaction(function () use ($case, $data): LegalCase {
            $previousStatus = $case->status;
            $case->fill(Arr::except($data, ['client_ids', 'lawyer_ids', 'lead_lawyer_id', 'parties']));

            if ($case->isDirty('status') && $case->status === CaseStatus::Archived) {
                $case->archived_at = now();
            }

            $case->save();

            if (array_key_exists('client_ids', $data)) {
                $this->syncClients($case, $data['client_ids']);
            }

            if (array_key_exists('parties', $data)) {
                $this->syncParties($case, $data['parties']);
            }

            if ($previousStatus !== $case->status) {
                $this->timeline->record($case, 'status_changed', __('Status changed to :status', ['status' => $case->status->label()]), null, $case, true);
            }

            return $case;
        });
    }

    /**
     * @param  list<int>  $clientIds
     */
    public function syncClients(LegalCase $case, array $clientIds): void
    {
        $clientIds = array_values(array_unique(array_map('intval', $clientIds)));
        $valid = Client::query()->forOrganization($case->organization_id)->whereIn('id', $clientIds)->pluck('id')->all();

        if (count($valid) !== count($clientIds)) {
            throw ValidationException::withMessages(['client_ids' => __('One or more selected clients are not in this organization.')]);
        }

        $case->clients()->sync(collect($valid)->mapWithKeys(fn ($id, $i) => [$id => ['is_primary' => $i === 0]])->all());
    }

    /**
     * @param  list<int>  $lawyerIds
     */
    public function syncLawyers(LegalCase $case, array $lawyerIds, ?int $leadId = null): void
    {
        $lawyerIds = array_values(array_unique(array_map('intval', [...$lawyerIds, ...($leadId ? [$leadId] : [])])));

        foreach ($lawyerIds as $id) {
            if (! $this->access->isMember(User::findOrFail($id), $case->organization_id)) {
                throw ValidationException::withMessages(['lawyer_ids' => __('Assigned lawyers must be members of this organization.')]);
            }
        }

        $before = $case->lawyers()->pluck('users.id')->all();
        $case->lawyers()->sync(collect($lawyerIds)->mapWithKeys(fn ($id) => [$id => ['role' => $id === $leadId ? 'lead' : 'assisting']])->all());

        $added = array_diff($lawyerIds, $before);
        if ($added && $before) {
            $names = User::query()->whereIn('id', $added)->pluck('name')->implode(', ');
            $this->timeline->record($case, 'lawyer_assigned', __('Lawyer assigned: :names', ['names' => $names]), null, $case);
        }
    }

    /**
     * @param  list<array<string, mixed>>  $parties
     */
    public function syncParties(LegalCase $case, array $parties): void
    {
        $case->parties()->delete();

        foreach (array_values($parties) as $index => $party) {
            $case->parties()->create([...Arr::only($party, ['role', 'name', 'father_name', 'cnic', 'address', 'counsel_name', 'is_our_side']), 'sort_order' => $index]);
        }
    }
}
