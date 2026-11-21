export const verifiedEndpoints = {
  appConfig: '/app/config',
} as const;

export const webOnlyEndpoints = {
  deviceToken: '/account/device-token',
  aiRun: '/ai/run',
  hearingConflicts: '/hearings-conflicts',
} as const;
