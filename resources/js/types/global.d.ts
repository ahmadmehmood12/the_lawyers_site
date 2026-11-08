/** Ziggy's global route() helper (injected by the @routes Blade directive). */
type ZiggyRouter = {
    has(name: string): boolean;
    current(name?: string, params?: Record<string, unknown>): boolean;
    params: Record<string, string>;
};

declare global {
    function route(): ZiggyRouter;
    function route(name: string, params?: unknown, absolute?: boolean): string;
}

export {};
