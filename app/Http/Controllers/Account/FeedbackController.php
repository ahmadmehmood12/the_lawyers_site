<?php

namespace App\Http\Controllers\Account;

use App\Enums\FeedbackCategory;
use App\Enums\SupportMessageKind;
use App\Http\Controllers\Controller;
use App\Models\ContactMessage;
use App\Rules\PakistaniPhone;
use App\Services\Support\SupportInbox;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Feedback from any signed-in user (client, lawyer, firm staff, admin). Messages go to
 * the platform admins' inbox; the sender sees only their own messages and statuses.
 */
class FeedbackController extends Controller
{
    public function create(Request $request): Response
    {
        $user = $request->user();

        return Inertia::render('Account/Feedback', [
            'area' => $user->isClient() ? 'portal' : ($user->isPlatformStaff() ? 'admin' : 'workspace'),
            'categories' => FeedbackCategory::options(),
            'mine' => ContactMessage::query()->where('user_id', $user->id)->latest()->limit(20)->get()
                ->map(fn (ContactMessage $m) => [
                    'reference' => $m->reference,
                    'subject' => $m->subject,
                    'kind' => $m->kind->label(),
                    'status' => $m->status->value,
                    'status_label' => $m->status->label(),
                    'created_at' => $m->created_at->toIso8601String(),
                ]),
        ]);
    }

    public function store(Request $request, SupportInbox $inbox): RedirectResponse
    {
        $user = $request->user();
        $validated = $request->validate([
            'category' => ['required', Rule::enum(FeedbackCategory::class)],
            'subject' => ['required', 'string', 'max:160'],
            'body' => ['required', 'string', 'min:10', 'max:5000'],
            'phone' => ['nullable', new PakistaniPhone],
            'whatsapp_consent' => ['boolean'],
        ]);

        $message = $inbox->receive(SupportMessageKind::Feedback, [...$validated, 'name' => $user->name, 'email' => $user->email], $user);

        return back()->with('success', __('Thank you. Your feedback reference is :reference. A confirmation has been sent to your email.', ['reference' => $message->reference]));
    }
}
