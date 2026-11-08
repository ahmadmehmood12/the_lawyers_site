@include('errors.page', [
    'status' => isset($exception) && method_exists($exception, 'getStatusCode') ? $exception->getStatusCode() : 500,
    'title' => 'Something went wrong',
    'message' => 'We could not complete that request. Please try again shortly.',
])
