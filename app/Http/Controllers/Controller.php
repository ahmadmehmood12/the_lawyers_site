<?php

namespace App\Http\Controllers;

use App\Models\Organization;
use App\Support\ApiBridge;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;

/**
 * @OA\Info(
 *     title="Wakeel Diary API",
 *     version="1.0",
 *     description="REST API for the Wakeel Diary mobile apps (clients, lawyers, law firms). Every endpoint calls the same services, policies and notifications as the web app. Authenticate with POST /api/v1/auth/login and send the token as `Authorization: Bearer <token>`."
 * )
 *
 * @OA\Server(url="/", description="This server")
 *
 * @OA\SecurityScheme(securityScheme="sanctum", type="http", scheme="bearer", bearerFormat="Sanctum token")
 */
abstract class Controller
{
    use AuthorizesRequests;

    /**
     * Runs the action; on mobile API routes that reuse this web action (middleware `api.web`) the
     * result is converted to JSON by ApiBridge — the web flow itself is unchanged.
     *
     * @param  string  $method
     * @param  array<int|string, mixed>  $parameters
     */
    public function callAction($method, $parameters)
    {
        $result = $this->{$method}(...array_values($parameters));

        return request()->attributes->get('api_bridge') ? ApiBridge::toJson($result, request()) : $result;
    }

    /** Organization resolved by the `workspace` middleware for the current request. */
    protected function organization(): Organization
    {
        $organization = request()->attributes->get('organization');
        abort_unless($organization instanceof Organization, 403);

        return $organization;
    }

    /**
     * Allow-listed sort column + direction for server-side tables.
     *
     * @param  list<string>  $allowed
     * @return array{0: string, 1: string}
     */
    protected function sorting(array $allowed, string $default, string $defaultDirection = 'desc'): array
    {
        $sort = request()->string('sort')->toString();
        $direction = request()->string('direction')->toString() === 'asc' ? 'asc' : 'desc';

        return in_array($sort, $allowed, true) ? [$sort, $direction] : [$default, $defaultDirection];
    }
}
