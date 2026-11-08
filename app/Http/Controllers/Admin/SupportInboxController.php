<?php

namespace App\Http\Controllers\Admin;

use App\Enums\SupportMessageKind;
use App\Enums\SupportMessageStatus;
use App\Http\Controllers\Controller;
use App\Models\ContactMessage;
use App\Models\NotificationDelivery;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/** Feedback and contact inbox for platform admins (support.manage). */
class SupportInboxController extends Controller
{
    public function index(Request $request): Response
    {
        $filters = $request->validate([
            'search' => ['nullable', 'string', 'max:100'],
            'kind' => ['nullable', Rule::enum(SupportMessageKind::class)],
            'status' => ['nullable', Rule::enum(SupportMessageStatus::class)],
        ]);

        $messages = ContactMessage::query()
            ->with(['handler:id,name'])
            ->when($filters['kind'] ?? null, fn ($q, $kind) => $q->where('kind', $kind))
            ->when($filters['status'] ?? null, fn ($q, $status) => $q->where('status', $status))
            ->when($filters['search'] ?? null, fn ($q, $term) => $q->where(fn ($q) => $q
                ->where('reference', 'like', "%{$term}%")->orWhere('name', 'like', "%{$term}%")
                ->orWhere('email', 'like', "%{$term}%")->orWhere('subject', 'like', "%{$term}%")))
            ->latest()
            ->paginate(20)
            ->withQueryString();

        $acknowledgements = NotificationDelivery::query()
            ->where('subject_type', (new ContactMessage)->getMorphClass())
            ->whereIn('subject_id', $messages->pluck('id'))
            ->get(['subject_id', 'status', 'error'])
            ->keyBy('subject_id');

        $messages->through(fn (ContactMessage $m) => [
            'id' => $m->id,
            'reference' => $m->reference,
            'kind' => $m->kind->value,
            'kind_label' => $m->kind->label(),
            'account_type' => $m->account_type,
            'name' => $m->name,
            'email' => $m->email,
            'phone' => $m->phone,
            'subject' => $m->subject,
            'category' => $m->category?->label(),
            'body' => $m->body,
            'status' => $m->status->value,
            'admin_note' => $m->admin_note,
            'handler' => $m->handler?->name,
            'handled_at' => $m->handled_at?->toIso8601String(),
            'whatsapp' => $m->whatsapp_consent ? ($acknowledgements[$m->id]->status->value ?? 'queued') : null,
            'whatsapp_error' => $acknowledgements[$m->id]->error ?? null,
            'created_at' => $m->created_at->toIso8601String(),
        ]);

        return Inertia::render('Admin/Support', [
            'messages' => $messages,
            'filters' => $filters,
            'kinds' => SupportMessageKind::options(),
            'statuses' => SupportMessageStatus::options(),
            'counts' => ContactMessage::query()->selectRaw('status, count(*) as total')->groupBy('status')->pluck('total', 'status'),
        ]);
    }

    public function update(Request $request, ContactMessage $message): RedirectResponse
    {
        $validated = $request->validate([
            'status' => ['required', Rule::enum(SupportMessageStatus::class)],
            'admin_note' => ['nullable', 'string', 'max:2000'],
        ]);
        $resolved = $validated['status'] === SupportMessageStatus::Resolved->value;

        $message->update([
            ...$validated,
            'handled_by' => $request->user()->id,
            'handled_at' => $resolved ? ($message->handled_at ?? now()) : null,
        ]);
        activity('support')->causedBy($request->user())->performedOn($message)->withProperties(['reference' => $message->reference, 'status' => $validated['status']])->log('support_message_updated');

        return back()->with('success', __('Message :reference updated.', ['reference' => $message->reference]));
    }
}
