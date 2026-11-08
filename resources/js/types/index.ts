export type Option = { value: string; label: string };

export type AuthUser = {
    id: number;
    name: string;
    email: string;
    phone: string | null;
    account_type: 'lawyer' | 'client' | 'staff' | 'platform';
    locale: 'en' | 'ur';
    theme: 'light' | 'dark' | 'system';
    email_verified: boolean;
    two_factor_enabled: boolean;
    platform_roles: string[];
    platform_permissions: string[];
    lawyer_profile_slug: string | null;
};

export type CurrentOrganization = {
    id: number;
    name: string;
    type: 'solo' | 'firm';
    role: string | null;
    permissions: string[];
};

export type SharedProps = {
    app: { name: string; locale: 'en' | 'ur'; dir: 'ltr' | 'rtl'; locales: Record<string, string> };
    translations: Record<string, string>;
    auth: {
        user: AuthUser | null;
        organization: CurrentOrganization | null;
        organizations: { id: number; name: string }[];
    };
    unread: { notifications: number } | null;
    flash: { success: string | null; error: string | null };
    errors: Record<string, string>;
    [key: string]: unknown;
};

export type Paginated<T> = {
    data: T[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
    links: { url: string | null; label: string; active: boolean }[];
};

export type Enum = { value: string; label: string };
