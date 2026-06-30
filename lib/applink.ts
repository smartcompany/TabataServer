export const IOS_APP_STORE_WEB =
  'https://apps.apple.com/app/id6783721406';

export const PLAY_STORE_WEB =
  'https://play.google.com/store/apps/details?id=com.smartcompany.tabata';

export const IOS_APP_STORE_ITMS =
  'itms-apps://apps.apple.com/app/id6783721406';

export const PLAY_STORE_MARKET =
  'market://details?id=com.smartcompany.tabata';

export function pickStoreUrl(userAgent: string): string {
  const ua = userAgent.toLowerCase();
  return ua.includes('android') ? PLAY_STORE_WEB : IOS_APP_STORE_WEB;
}
