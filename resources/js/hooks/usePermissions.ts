import { usePage } from '@inertiajs/react';
import type { SharedProps } from '@/types';

/**
 * UI-only permission checks used to hide actions the user cannot perform.
 * The server enforces every permission independently — this is not authorization.
 */
export function usePermissions() {
    const { auth } = usePage<SharedProps>().props;
    const orgPermissions = auth.organization?.permissions ?? [];
    const platformPermissions = auth.user?.platform_permissions ?? [];
    const isSuperAdmin = auth.user?.platform_roles.includes('super-admin') ?? false;

    return {
        can: (permission: string) => orgPermissions.includes(permission),
        canPlatform: (permission: string) => isSuperAdmin || platformPermissions.includes(permission),
        isSuperAdmin,
    };
}
