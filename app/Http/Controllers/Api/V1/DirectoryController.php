<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\AppointmentMode;
use App\Enums\CaseStatus;
use App\Http\Controllers\Public\FirmDirectoryController;
use App\Http\Controllers\Public\HomeController;
use App\Http\Controllers\Public\LawyerDirectoryController;
use App\Http\Controllers\Public\SpecializationController;
use App\Models\LawyerProfile;
use App\Models\Organization;
use App\Services\Appointments\AppointmentService;
use App\Support\DirectoryPresenter;
use App\Support\InertiaPayload;
use App\Support\ReferenceOptions;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Public discovery for the mobile apps: home, practice areas, lawyers, firms and free slots.
 * Uses the same query/presenter helpers as the public web pages.
 * Swagger: app/Swagger/DirectoryControllerDocs.php.
 */
class DirectoryController extends ApiController
{
    /** Home screen: practice areas, stats, court holidays and the top listed lawyers and firms. */
    public function home(Request $request): JsonResponse
    {
        $web = InertiaPayload::props(app()->call([app(HomeController::class), '__invoke']), ['specializations', 'stats', 'courtHolidays']);

        return $this->success([
            ...$web,
            'lawyers' => LawyerDirectoryController::search([])->limit(10)->get()->map(fn (LawyerProfile $p) => DirectoryPresenter::lawyer($p)),
            'firms' => FirmDirectoryController::search(null, null)->limit(6)->get()->map(fn (Organization $o) => DirectoryPresenter::firm($o)),
        ]);
    }

    public function specializations(): JsonResponse
    {
        return $this->success(InertiaPayload::props(app()->call([app(SpecializationController::class), 'index']), ['specializations'])['specializations']);
    }

    /** Filter values for the lawyer search (cities, courts, practice areas, …). */
    public function filters(): JsonResponse
    {
        return $this->success([
            'cities' => ReferenceOptions::cities(),
            'provinces' => ReferenceOptions::provinces(),
            'courts' => ReferenceOptions::courts(),
            'specializations' => ReferenceOptions::specializations(),
            'bar_councils' => ReferenceOptions::barCouncils(),
            'languages' => LawyerDirectoryController::LANGUAGES,
        ]);
    }

    public function lawyers(Request $request): JsonResponse
    {
        $filters = $request->only(['search', 'city', 'province', 'district', 'court', 'specialization', 'experience', 'bar_council', 'category', 'language', 'online', 'fee_max', 'verified', 'sort']);
        $closed = array_map(fn (CaseStatus $s) => $s->value, array_filter(CaseStatus::cases(), fn (CaseStatus $s) => $s->isClosed()));

        $page = LawyerDirectoryController::search($filters)
            ->paginate(min(max($request->integer('per_page', 12), 1), 30))
            ->through(fn (LawyerProfile $p) => [
                ...DirectoryPresenter::lawyer($p),
                'cases_handled' => (int) $p->cases_handled,
                'cases_completed' => (int) $p->cases_completed,
            ]);

        return $this->paginated($page);
    }

    public function lawyer(Request $request, LawyerProfile $lawyer): JsonResponse
    {
        abort_unless(LawyerProfile::query()->listed()->whereKey($lawyer->id)->exists(), 404);

        return $this->success(LawyerDirectoryController::profile($lawyer, $request->user('sanctum')));
    }

    /** Bookable 30-minute slots for the next 14 days and the modes this lawyer offers. */
    public function slots(LawyerProfile $lawyer, AppointmentService $service): JsonResponse
    {
        abort_unless(LawyerProfile::query()->listed()->whereKey($lawyer->id)->exists(), 404);
        $lawyer->load('user:id,name');

        return $this->success([
            'lawyer' => ['slug' => $lawyer->slug, 'name' => $lawyer->user->name, 'fee' => $lawyer->consultation_fee_min, 'accepting' => $lawyer->accepting_clients],
            'slots' => $service->availableSlots($lawyer->user, today(), 14)->values(),
            'modes' => collect(AppointmentMode::options())->filter(fn ($m) => ($m['value'] === 'online' && $lawyer->offers_online) || ($m['value'] === 'in_person' && $lawyer->offers_in_person))->values(),
        ]);
    }

    public function firms(Request $request): JsonResponse
    {
        $page = FirmDirectoryController::search($request->string('search')->trim()->toString() ?: null, $request->string('city')->toString() ?: null)
            ->paginate(min(max($request->integer('per_page', 12), 1), 30))
            ->through(fn (Organization $o) => DirectoryPresenter::firm($o));

        return $this->paginated($page);
    }

    public function firm(Organization $firm): JsonResponse
    {
        return $this->success(FirmDirectoryController::profile($firm));
    }

    /** Adds or removes a lawyer from the signed-in user's favourites (same toggle as the web). */
    public function toggleFavourite(Request $request, LawyerProfile $lawyer): JsonResponse
    {
        abort_unless(LawyerProfile::query()->listed()->whereKey($lawyer->id)->exists(), 404);
        $request->user()->favouriteLawyers()->toggle([$lawyer->id]);

        return $this->success(['is_favourite' => $request->user()->favouriteLawyers()->whereKey($lawyer->id)->exists()]);
    }
}
