import type { Metadata } from 'next';
import Link from 'next/link';

import {
  IOS_APP_STORE_ITMS,
  IOS_APP_STORE_WEB,
  PLAY_STORE_MARKET,
  PLAY_STORE_WEB,
} from '@/lib/applink';

/**
 * X·카카오·FB·인스타 등: 자동 itms 를 쓰면 WebView가 비거나 UI가 먼저 켜져
 * 하단 “받기/열기” 화면만 보이는 경우가 많다. → 인앱이면 **자동 이동 금지**, 버튼+탭만.
 * 사파리/Chrome 모바일: itms / market 즉시 시도 후 https 폴백.
 */
const BOOT_SCRIPT = `
(function () {
  var ua = typeof navigator !== "undefined" ? navigator.userAgent || "" : "";
  var inApp = /(Twitter|X\\/[\\d.]+|FBIOS|FBAN|FBAV|Line\\/|KakaoTalk|Kakao|Daum|KAKAOTALK|Whatsapp|Telegram|Snapchat|Slack|LinkedIn|FB_IAB|Instagram|Pinterest|musical_ly|ByteDance|Aweme|; wv\\))/i.test(ua);
  var isAndroid = /android/i.test(ua);
  var isIOS = /iphone|ipad|ipod/i.test(ua);
  var elIos = document.getElementById("applink-btn-ios");
  var elAnd = document.getElementById("applink-btn-android");
  if (isIOS && elIos) { elIos.setAttribute("href", ${JSON.stringify(IOS_APP_STORE_ITMS)}); }
  if (isAndroid && elAnd) { elAnd.setAttribute("href", ${JSON.stringify(PLAY_STORE_MARKET)}); }
  if (inApp) { return; }
  if (!isAndroid && !isIOS) { return; }
  var scheme = isAndroid ? ${JSON.stringify(PLAY_STORE_MARKET)} : ${JSON.stringify(IOS_APP_STORE_ITMS)};
  var web = isAndroid ? ${JSON.stringify(PLAY_STORE_WEB)} : ${JSON.stringify(IOS_APP_STORE_WEB)};
  var t = window.setTimeout(function () { window.location.replace(web); }, 2000);
  function cancel() {
    if (t !== null) { window.clearTimeout(t); t = null; }
  }
  document.addEventListener("visibilitychange", function () { if (document.hidden) { cancel(); } });
  window.addEventListener("pagehide", cancel);
  try { window.location.href = scheme; } catch (e) { cancel(); window.location.replace(web); }
})();
`.trim();

export const metadata: Metadata = {
  title: 'Tabata Timer — Download',
  description: 'App Store 또는 Google Play에서 Tabata Timer를 설치하세요.',
  robots: { index: false, follow: false },
  openGraph: {
    title: 'Tabata Timer',
    description: '운동 타이머 및 루틴 공유 앱',
    url: 'https://tabata-server.vercel.app/applink/social',
  },
};

export default function AppLinkSocialPage() {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: BOOT_SCRIPT }} />
      <main
        className="box-border flex min-h-[100dvh] flex-col items-center justify-start gap-2 bg-zinc-950 px-6 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(5rem,env(safe-area-inset-bottom,32px))] text-center text-zinc-100"
        style={{ minHeight: '100dvh' }}
      >
        <p className="m-0 text-base font-semibold">Tabata Timer</p>
        <p className="m-0 mt-2 max-w-sm text-xs leading-relaxed text-zinc-400">
          X·카카오 등 앱 안 브라우저는 아래 버튼을 눌러 스토어로 이동해 주세요.
        </p>
        <p className="m-0 mb-4 mt-1 text-[11px] text-zinc-600">
          일반 Safari에서는 자동으로 스토어가 열릴 수 있습니다.
        </p>
        <div className="flex w-full max-w-sm flex-col gap-3">
          <a
            id="applink-btn-ios"
            href={IOS_APP_STORE_WEB}
            className="block rounded-xl bg-white px-5 py-3.5 text-sm font-semibold text-zinc-900 no-underline"
          >
            App Store
          </a>
          <a
            id="applink-btn-android"
            href={PLAY_STORE_WEB}
            className="block rounded-xl border border-zinc-600 bg-white/5 px-5 py-3.5 text-sm font-semibold text-zinc-100 no-underline"
          >
            Google Play
          </a>
        </div>
        <p className="mt-8 text-xs text-zinc-500">
          <Link href="/" className="text-orange-400 no-underline hover:underline">
            서버 홈
          </Link>
        </p>
        <noscript>
          <p>
            <a href={IOS_APP_STORE_WEB} className="text-orange-400">
              App Store로 이동
            </a>
          </p>
        </noscript>
      </main>
    </>
  );
}
