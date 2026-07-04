import { redirect } from 'next/navigation';

import { APP_DISPLAY_NAME, IOS_APP_STORE_WEB } from '@/lib/applink';

export const metadata = {
  title: `${APP_DISPLAY_NAME} — App Store`,
};

/**
 * middleware 가 /applink → 스토어 302를 담당.
 * 미들웨어가 적용되지 않는 환경의 iOS 기본 폴백.
 *
 * X·인앱 WebView는 `/applink/social` 사용.
 */
export default function AppLinkFallbackPage() {
  redirect(IOS_APP_STORE_WEB);
}
