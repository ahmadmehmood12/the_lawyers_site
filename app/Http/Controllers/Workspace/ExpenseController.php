<?php

namespace App\Http\Controllers\Workspace;

use App\Http\Controllers\Controller;
use App\Models\CaseExpense;
use App\Models\LegalCase;
use App\Services\Cases\Timeline;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ExpenseController extends Controller
{
    public const CATEGORIES = ['court_fee', 'stamp_paper', 'filing', 'travel', 'photocopy', 'expert', 'other'];

    public function store(Request $request, LegalCase $case, Timeline $timeline): RedirectResponse
    {
        $this->authorize('manageWithin', [$case, 'expenses.manage']);
        $validated = $request->validate([
            'category' => ['required', Rule::in(self::CATEGORIES)],
            'description' => ['required', 'string', 'max:255'],
            'amount' => ['required', 'numeric', 'min:1', 'max:99999999'],
            'incurred_on' => ['required', 'date', 'before_or_equal:today'],
            'is_billable' => ['boolean'],
        ]);

        $expense = $case->expenses()->create([...$validated, 'organization_id' => $case->organization_id, 'recorded_by' => $request->user()->id]);
        $timeline->record($case, 'expense_recorded', __('Expense recorded: :desc', ['desc' => $expense->description]), null, $expense);

        return back()->with('success', __('Expense recorded.'));
    }

    /** Only expenses not yet invoiced can be removed; invoiced ones are part of the financial record. */
    public function destroy(CaseExpense $expense): RedirectResponse
    {
        $this->authorize('manageWithin', [$expense->legalCase, 'expenses.manage']);

        if ($expense->invoice_item_id) {
            return back()->with('error', __('This expense has been invoiced and cannot be removed.'));
        }

        $expense->delete();

        return back()->with('success', __('Expense removed.'));
    }
}
