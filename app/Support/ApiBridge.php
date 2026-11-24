<?php

namespace App\Support;

use Illuminate\Contracts\Support\Responsable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\ViewErrorBag;
use Inertia\Response as InertiaResponse;
use Symfony\Component\HttpFoundation\Response;
use Throwable;

/**
 * Turns what a web controller action returned into the mobile API's JSON envelope, so the API
 * runs exactly the web code (same validation, policies, services, notifications, messages):
 *  - Inertia page     -> {status: Success, data: <the page props>}
 *  - redirect + flash -> {status: Success, message: <flash success>, data: {route, params, url}}
 *                        or 422 {status: Failed, message: <flash error> / errors: <error bag>}
 *  - JSON             -> wrapped in the envelope; files (PDF, DOCX, downloads) pass through.
 */
class ApiBridge
{
    public static function toJson(mixed $result, Request $request): mixed
    {
        $now = now()->format('Y-m-d H:i:s');

        if ($result instanceof InertiaResponse) {
            return response()->json(['status' => 'Success', 'timestamp' => $now, 'message' => 'OK', 'data' => InertiaPayload::props($result)]);
        }

        if ($result instanceof RedirectResponse) {
            $session = $request->session();
            $errors = $session->get('errors');
            if ($errors instanceof ViewErrorBag && $errors->any()) {
                return response()->json(['status' => 'Failed', 'timestamp' => $now, 'message' => $errors->first(), 'errors' => $errors->getBag('default')->toArray()], 422);
            }

            $success = $session->get('success');
            $error = $session->get('error');
            if ($error && ! $success) {
                return response()->json(['status' => 'Failed', 'timestamp' => $now, 'message' => (string) $error], 422);
            }

            return response()->json(['status' => 'Success', 'timestamp' => $now, 'message' => (string) ($success ?: 'OK'), 'data' => self::target($result->getTargetUrl())]);
        }

        if ($result instanceof JsonResponse) {
            $data = $result->getData(true);
            if (is_array($data) && isset($data['status'], $data['timestamp'])) {
                return $result;
            }

            return response()->json(['status' => $result->isSuccessful() ? 'Success' : 'Failed', 'timestamp' => $now, 'message' => is_array($data) && is_string($data['message'] ?? null) ? $data['message'] : 'OK', 'data' => $data], $result->getStatusCode());
        }

        return $result instanceof Response || $result instanceof Responsable ? $result : response()->json(['status' => 'Success', 'timestamp' => $now, 'message' => 'OK', 'data' => $result]);
    }

    /**
     * Where the web would have gone next, e.g. {route: "cases.show", params: {case: "12"}}
     * — the mobile app uses it to open the record it just created.
     *
     * @return array{url: string, route: string|null, params: array<string, string>}
     */
    private static function target(string $url): array
    {
        try {
            $route = app('router')->getRoutes()->match(Request::create($url, 'GET'));

            return ['url' => parse_url($url, PHP_URL_PATH) ?: '/', 'route' => $route->getName(), 'params' => array_map('strval', $route->parameters())];
        } catch (Throwable) {
            return ['url' => parse_url($url, PHP_URL_PATH) ?: '/', 'route' => null, 'params' => []];
        }
    }
}
