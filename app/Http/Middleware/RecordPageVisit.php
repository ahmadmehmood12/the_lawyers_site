<?php

namespace App\Http\Middleware;

use App\Models\Article;
use App\Models\LawyerProfile;
use App\Models\Organization;
use App\Models\PageVisit;
use App\Models\ReportedJudgment;
use App\Models\Specialization;
use App\Services\Analytics\TrafficSource;
use Closure;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;
use Throwable;

/**
 * Records one PageVisit per public page view (full loads and Inertia navigations) for the
 * admin Analytics dashboard. Skips bots, platform staff, partial reloads, prefetches and
 * non-200 responses. The row is written after the response is sent (terminate), and a
 * failure is logged, never shown to the visitor. Only salted hashes identify a visitor.
 */
class RecordPageVisit
{
    private const ATTRIBUTE = 'analytics.visit';

    /** @var array<class-string<Model>, string> */
    private const SUBJECTS = [
        LawyerProfile::class => 'lawyer',
        Organization::class => 'firm',
        ReportedJudgment::class => 'judgment',
        Specialization::class => 'practice_area',
        Article::class => 'article',
    ];

    private const SKIPPED_ROUTES = ['sitemap', 'robots'];

    public function handle(Request $request, Closure $next): Response
    {
        if (! $this->shouldTrack($request)) {
            return $next($request);
        }

        $session = $request->hasSession() ? $request->session() : null;
        $external = TrafficSource::externalReferrerHost($request);
        $utm = $request->query('utm_source');
        $isEntry = $session === null || ! $session->has('analytics.source') || $external !== null || filled($utm);
        $source = $isEntry ? TrafficSource::detect(is_string($utm) ? $utm : null, $external) : (string) $session->get('analytics.source');
        $session?->put('analytics.source', $source);

        $response = $next($request);

        if ($response->getStatusCode() === 200) {
            $request->attributes->set(self::ATTRIBUTE, [
                'source' => $source,
                'is_entry' => $isEntry,
                'referrer_host' => $external,
                'session' => $session?->getId() ?? Str::random(40),
            ]);
        }

        return $response;
    }

    public function terminate(Request $request, Response $response): void
    {
        $visit = $request->attributes->get(self::ATTRIBUTE);
        if (! is_array($visit)) {
            return;
        }

        try {
            [$subjectType, $subjectId] = $this->subject($request);
            $agent = (string) $request->userAgent();
            $key = (string) config('app.key');

            PageVisit::query()->insert([
                'visited_at' => now(),
                'visited_on' => now()->toDateString(),
                'path' => Str::limit('/'.ltrim($request->path(), '/'), 250, ''),
                'route_name' => $request->route()?->getName(),
                'subject_type' => $subjectType,
                'subject_id' => $subjectId,
                'source' => $visit['source'],
                'referrer_host' => $visit['referrer_host'] ? Str::limit($visit['referrer_host'], 120, '') : null,
                'utm_source' => $this->utm($request, 'utm_source', 80),
                'utm_medium' => $this->utm($request, 'utm_medium', 80),
                'utm_campaign' => $this->utm($request, 'utm_campaign', 120),
                'visitor_hash' => hash_hmac('sha256', $request->user() ? 'user:'.$request->user()->getKey() : $request->ip().'|'.$agent, $key),
                'session_hash' => hash_hmac('sha256', 'session:'.$visit['session'], $key),
                'is_entry' => $visit['is_entry'],
                'device' => $this->device($agent),
                'user_id' => $request->user()?->getKey(),
            ]);
        } catch (Throwable $exception) {
            Log::warning('Page visit not recorded: '.$exception->getMessage());
        }
    }

    private function shouldTrack(Request $request): bool
    {
        if (! config('analytics.track_visits') || ! $request->isMethod('GET')) {
            return false;
        }
        if ($request->headers->has('X-Inertia-Partial-Data') || $request->headers->has('X-Inertia-Partial-Except') || $request->header('Purpose') === 'prefetch') {
            return false;
        }
        if (! $request->headers->has('X-Inertia') && $request->expectsJson()) {
            return false;
        }
        if (in_array($request->route()?->getName(), self::SKIPPED_ROUTES, true) || $request->user()?->isPlatformStaff()) {
            return false;
        }

        $agent = Str::lower((string) $request->userAgent());

        return $agent !== '' && ! Str::contains($agent, config('analytics.bots', []));
    }

    /** @return array{0: string|null, 1: int|null} */
    private function subject(Request $request): array
    {
        foreach ($request->route()?->parameters() ?? [] as $parameter) {
            if ($parameter instanceof Model && isset(self::SUBJECTS[$parameter::class])) {
                return [self::SUBJECTS[$parameter::class], (int) $parameter->getKey()];
            }
        }

        $name = (string) $request->route()?->getName();

        return [str_starts_with($name, 'pages.') || $name === 'pages.show' ? 'page' : null, null];
    }

    private function device(string $agent): string
    {
        return match (true) {
            (bool) preg_match('/ipad|tablet|kindle|playbook|silk/i', $agent) => 'tablet',
            (bool) preg_match('/mobi|android|iphone|ipod|opera mini|iemobile/i', $agent) => 'mobile',
            default => 'desktop',
        };
    }

    private function utm(Request $request, string $key, int $length): ?string
    {
        $value = $request->query($key);

        return is_string($value) && $value !== '' ? Str::limit(strip_tags($value), $length, '') : null;
    }
}
