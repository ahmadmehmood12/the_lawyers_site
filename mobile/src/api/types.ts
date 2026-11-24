export type AppPlatformConfig = {
  version: string | null;
  min_version: string | null;
  url: string | null;
};

export type AppConfig = {
  app_name: string;
  icon_url: string | null;
  push_enabled: boolean;
  force_update: boolean;
  maintenance: boolean;
  maintenance_message: string | null;
  ios: AppPlatformConfig;
  android: AppPlatformConfig;
  /** Branding, contact and social links from Admin > Settings (the same values the website uses). */
  site: { name: string; tagline: string | null; logo_url: string | null; favicon_url: string | null; theme: string | null; url: string | null };
  contact: { email: string | null; phone: string | null; address: string | null };
  social: Partial<Record<'facebook' | 'instagram' | 'youtube' | 'linkedin' | 'x' | 'whatsapp', string>>;
  google: { enabled: boolean; web_client_id: string | null; ios_client_id: string | null; android_client_id: string | null };
};
