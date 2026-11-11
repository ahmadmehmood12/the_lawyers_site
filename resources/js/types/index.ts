export type Option = { value: string; label: string };

export type AuthUser = {
    id: number;
    name: string;
    email: string;
    phone: string | null;
    avatar_url: string | null;
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
    app: {
        name: string;
        tagline: string;
        logo_url: string | null;
        favicon_url: string | null;
        social: Record<'facebook' | 'instagram' | 'youtube' | 'linkedin' | 'x' | 'whatsapp', string | null>;
        contact?: { email: string | null; phone: string | null; address: string | null };
        locale: 'en' | 'ur';
        dir: 'ltr' | 'rtl';
        locales: Record<string, string>;
        site_theme: 'navy-gold' | 'white-green';
    };
    translations: Record<string, string>;
    auth: {
        user: AuthUser | null;
        organization: CurrentOrganization | null;
        organizations: { id: number; name: string }[];
    };
    unread: { notifications: number; messages: number } | null;
    flash: { success: string | null; error: string | null };
    /** Only on sign-in / sign-up pages (Admin, Settings, Sign-in page media). */
    authMedia?: AuthMedia | null;
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

export type AuthMedia = {
    enabled: boolean;
    mode: 'image' | 'video';
    image_url: string | null;
    video_url: string | null;
    poster_url: string | null;
    heading: string;
    description: string;
    heading_ur: string;
    description_ur: string;
    default_image: string;
};
