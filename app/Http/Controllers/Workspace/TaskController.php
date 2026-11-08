<?php

namespace App\Http\Controllers\Workspace;

use App\Enums\Priority;
use App\Enums\TaskStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Workspace\TaskRequest;
use App\Models\Hearing;
use App\Models\LegalCase;
use App\Models\Task;
use App\Models\User;
use App\Services\Access\OrganizationAccess;
use App\Support\ReferenceOptions;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class TaskController extends Controller
{
    public function index(Request $request, OrganizationAccess $access): Response
    {
        $organization = $this->organization();
        $user = $request->user();
        $manager = $access->allows($user, $organization, 'tasks.manage');
        $scope = $request->query('scope', 'mine');

        $tasks = Task::query()->forOrganization($organization)
            ->with(['assignee:id,name', 'legalCase:id,title,reference'])
            ->when($scope === 'mine' || ! $manager, fn ($q) => $q->where(fn ($w) => $w->where('assigned_to', $user->id)->orWhere('created_by', $user->id)))
            ->when($request->string('status')->toString() ?: 'active', function ($q, string $status): void {
                $status === 'active' ? $q->whereIn('status', [TaskStatus::Open->value, TaskStatus::InProgress->value]) : ($status === 'all' ? null : $q->where('status', $status));
            })
            ->when($request->string('search')->trim()->toString(), fn ($q, $s) => $q->where('title', 'like', "%{$s}%"))
            ->orderByRaw('due_date IS NULL, due_date')->orderByDesc('id')
            ->paginate(30)->withQueryString()->through(fn (Task $t) => self::present($t));

        return Inertia::render('Workspace/Tasks/Index', [
            'tasks' => $tasks,
            'filters' => ['scope' => $scope, ...$request->only(['status', 'search'])],
            'options' => [
                'members' => ReferenceOptions::members($organization),
                'priorities' => Priority::options(),
                'statuses' => TaskStatus::options(),
                'cases' => LegalCase::query()->visibleTo($user, $organization)->orderBy('title')->limit(500)->get(['id', 'title', 'reference'])->map(fn ($c) => ['value' => $c->id, 'label' => $c->reference.', '.$c->title]),
            ],
            'canManage' => $manager,
        ]);
    }

    public function store(TaskRequest $request, OrganizationAccess $access): RedirectResponse
    {
        $organization = $this->organization();
        abort_unless($access->allows($request->user(), $organization, 'tasks.manage'), 403);

        $data = $this->scoped($request->validated(), $request);
        Task::create([...$data, 'organization_id' => $organization->id, 'status' => TaskStatus::Open, 'created_by' => $request->user()->id]);

        return back()->with('success', __('Task created.'));
    }

    public function update(TaskRequest $request, Task $task): RedirectResponse
    {
        $this->authorize('manage', $task);
        $data = $this->scoped($request->validated(), $request);

        if (isset($data['status'])) {
            $data['completed_at'] = $data['status'] === TaskStatus::Done->value ? ($task->completed_at ?? now()) : null;
        }

        $task->update($data);

        return back()->with('success', __('Task updated.'));
    }

    public function toggle(Task $task): RedirectResponse
    {
        $this->authorize('manage', $task);
        $done = $task->status !== TaskStatus::Done;
        $task->update(['status' => $done ? TaskStatus::Done : TaskStatus::Open, 'completed_at' => $done ? now() : null]);

        return back();
    }

    /**
     * Ensures referenced case/hearing/assignee belong to the current organization.
     *
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    private function scoped(array $data, Request $request): array
    {
        $organization = $this->organization();

        if (! empty($data['legal_case_id'])) {
            $case = LegalCase::query()->forOrganization($organization)->find($data['legal_case_id']);
            if (! $case || $request->user()->cannot('view', $case)) {
                throw ValidationException::withMessages(['legal_case_id' => __('Invalid case.')]);
            }
        }

        if (! empty($data['hearing_id']) && ! Hearing::query()->forOrganization($organization)->whereKey($data['hearing_id'])->exists()) {
            throw ValidationException::withMessages(['hearing_id' => __('Invalid hearing.')]);
        }

        if (! empty($data['assigned_to']) && ! app(OrganizationAccess::class)->isMember(User::findOrFail($data['assigned_to']), $organization)) {
            throw ValidationException::withMessages(['assigned_to' => __('Assignee must be a member of this organization.')]);
        }

        return $data;
    }

    /**
     * @return array<string, mixed>
     */
    public static function present(Task $t): array
    {
        return [
            'id' => $t->id, 'title' => $t->title, 'description' => $t->description,
            'due_date' => $t->due_date?->toDateString(), 'overdue' => $t->due_date && $t->due_date->isPast() && ! $t->due_date->isToday() && $t->status !== TaskStatus::Done,
            'priority' => $t->priority->value, 'priority_label' => $t->priority->label(),
            'status' => $t->status->value, 'status_label' => $t->status->label(),
            'assignee' => $t->assignee?->name, 'assigned_to' => $t->assigned_to,
            'case' => $t->relationLoaded('legalCase') && $t->legalCase ? ['id' => $t->legalCase->id, 'title' => $t->legalCase->title, 'reference' => $t->legalCase->reference] : null,
            'legal_case_id' => $t->legal_case_id,
        ];
    }
}
