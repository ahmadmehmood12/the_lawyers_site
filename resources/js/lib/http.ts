/** JSON POST with Laravel's XSRF cookie (for non-Inertia endpoints such as the AI assistant). */
export async function postJson<T>(url: string, body: unknown): Promise<{ ok: boolean; status: number; data: T }> {
    const token = decodeURIComponent(document.cookie.split('; ').find((c) => c.startsWith('XSRF-TOKEN='))?.split('=')[1] ?? '');
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-XSRF-TOKEN': token, 'X-Requested-With': 'XMLHttpRequest' },
        body: JSON.stringify(body),
        credentials: 'same-origin',
    });
    const data = (await response.json().catch(() => ({}))) as T;
    return { ok: response.ok, status: response.status, data };
}
