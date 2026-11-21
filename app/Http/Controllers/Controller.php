<?php

namespace App\Http\Controllers;

use App\Models\Organization;
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
