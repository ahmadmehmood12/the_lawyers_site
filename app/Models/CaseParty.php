<?php

namespace App\Models;

use App\Enums\PartyRole;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['legal_case_id', 'role', 'name', 'father_name', 'cnic', 'address', 'counsel_name', 'is_our_side', 'sort_order'])]
#[Hidden(['cnic'])]
class CaseParty extends Model
{
    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'role' => PartyRole::class,
            'cnic' => 'encrypted',
            'is_our_side' => 'boolean',
        ];
    }

    public function legalCase(): BelongsTo
    {
        return $this->belongsTo(LegalCase::class);
    }
}
