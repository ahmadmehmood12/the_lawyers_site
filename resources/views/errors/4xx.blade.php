@include('errors.page', [
    'status' => isset($exception) && method_exists($exception, 'getStatusCode') ? $exception->getStatusCode() : 400,
    'title' => 'Request could not be completed',
    'message' => isset($exception) && $exception->getMessage() !== '' ? $exception->getMessage() : 'Please check the address and try again.',
])
