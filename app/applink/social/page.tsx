import type { Metadata } from 'next';
import { headers } from 'next/headers';

import {
  IOS_APP_STORE_ITMS,
  IOS_APP_STORE_WEB,
  PLAY_STORE_MARKET,
  PLAY_STORE_WEB,
} from '@/lib/applink';
import {
  getApplinkSocialCopy,
  resolveApplinkLocale,
} from '@/lib/applink-l10n';

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

async function resolvePageLocale(queryLang?: string | null) {
  const h = await headers();
  return resolveApplinkLocale(h.get('accept-language'), queryLang);
}

type PageProps = {
  searchParams: Promise<{ lang?: string }>;
};

export async function generateMetadata({
  searchParams,
}: PageProps): Promise<Metadata> {
  const { lang } = await searchParams;
  const locale = await resolvePageLocale(lang);
  const copy = getApplinkSocialCopy(locale);
  return {
    title: copy.pageTitle,
    description: copy.metaDescription,
    robots: { index: false, follow: false },
    openGraph: {
      title: copy.appTitle,
      description: copy.ogDescription,
      url: 'https://tabata-server.vercel.app/applink/social',
      locale:
        locale === 'ko'
          ? 'ko_KR'
          : locale === 'ja'
            ? 'ja_JP'
            : locale === 'zh'
              ? 'zh_CN'
              : 'en_US',
    },
  };
}

export default async function AppLinkSocialPage({ searchParams }: PageProps) {
  const { lang } = await searchParams;
  const locale = await resolvePageLocale(lang);
  const copy = getApplinkSocialCopy(locale);

  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: BOOT_SCRIPT }} />
      <main
        className="box-border flex min-h-[100dvh] flex-col items-center justify-start gap-2 bg-zinc-950 px-6 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(5rem,env(safe-area-inset-bottom,32px))] text-center text-zinc-100"
        style={{ minHeight: '100dvh' }}
        lang={locale}
      >
        <p className="m-0 text-base font-semibold">{copy.appTitle}</p>
        <p className="m-0 mt-2 max-w-sm text-xs leading-relaxed text-zinc-400">
          {copy.inAppHint}
        </p>
        <p className="m-0 mb-4 mt-1 text-[11px] text-zinc-600">
          {copy.safariHint}
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
        <noscript>
          <p>
            <a href={IOS_APP_STORE_WEB} className="text-orange-400">
              {copy.noscriptAppStore}
            </a>
          </p>
        </noscript>
      </main>
    </>
  );
}
