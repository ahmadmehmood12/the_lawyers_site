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
};
