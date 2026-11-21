<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\JsonResponse;

/**
 * Base for the mobile REST API (docs/API/API-Documentation.md, Swagger in app/Swagger).
 * Every response uses one envelope: {status, timestamp, message, data[, meta]}.
 * Errors are rendered with the same envelope in bootstrap/app.php.
 */
abstract class ApiController extends Controller
{
    protected function success(mixed $data = null, string $message = 'OK', int $status = 200): JsonResponse
    {
        return response()->json([
            'status' => 'Success',
            'timestamp' => now()->format('Y-m-d H:i:s'),
            'message' => $message,
            'data' => $data,
        ], $status);
    }

    /** A page of results plus {current_page, last_page, per_page, total}. */
    protected function paginated(LengthAwarePaginator $page, string $message = 'OK'): JsonResponse
    {
        return response()->json([
            'status' => 'Success',
            'timestamp' => now()->format('Y-m-d H:i:s'),
            'message' => $message,
            'data' => $page->items(),
            'meta' => ['current_page' => $page->currentPage(), 'last_page' => $page->lastPage(), 'per_page' => $page->perPage(), 'total' => $page->total()],
        ]);
    }
}
