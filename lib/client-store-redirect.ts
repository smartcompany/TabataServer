import {
  IOS_APP_STORE_ITMS,
  IOS_APP_STORE_WEB,
  PLAY_STORE_MARKET,
  PLAY_STORE_WEB,
} from '@/lib/applink';

const IN_APP_UA =
  /(Twitter|X\/[\d.]+|FBIOS|FBAN|FBAV|Line\/|KakaoTalk|Kakao|Daum|KAKAOTALK|Whatsapp|Telegram|Snapchat|Slack|LinkedIn|FB_IAB|Instagram|Pinterest|musical_ly|ByteDance|Aweme|; wv\))/i;

/**
 * 모바일 Safari/Chrome 등(인앱 WebView 제외):
 * 앱 미설치로 /share 페이지에 도달한 경우 스토어로 이동.
 * Universal Link로 앱이 열리면 페이지가 숨겨지므로 visibilitychange 로 리다이렉트를 취소.
 */
export function buildDirectStoreRedirectScript(options?: {
  fallbackDelayMs?: number;
}): string {
  const fallbackDelayMs = options?.fallbackDelayMs ?? 2000;
  return `
(function () {
  var ua = typeof navigator !== "undefined" ? navigator.userAgent || "" : "";
  if (${IN_APP_UA}.test(ua)) { return; }
  var isAndroid = /android/i.test(ua);
  var isIOS = /iphone|ipad|ipod/i.test(ua);
  if (!isAndroid && !isIOS) { return; }
  var scheme = isAndroid ? ${JSON.stringify(PLAY_STORE_MARKET)} : ${JSON.stringify(IOS_APP_STORE_ITMS)};
  var web = isAndroid ? ${JSON.stringify(PLAY_STORE_WEB)} : ${JSON.stringify(IOS_APP_STORE_WEB)};
  var t = window.setTimeout(function () { window.location.replace(web); }, ${fallbackDelayMs});
  function cancel() {
    if (t !== null) { window.clearTimeout(t); t = null; }
  }
  document.addEventListener("visibilitychange", function () { if (document.hidden) { cancel(); } });
  window.addEventListener("pagehide", cancel);
  try { window.location.href = scheme; } catch (e) { cancel(); window.location.replace(web); }
})();
`.trim();
}

/**
 * 카카오·X 등 인앱 브라우저: Universal Link 미지원 → 스토어 안내 페이지로 이동.
 */
export function buildInAppStoreLandingRedirectScript(
  socialLandingUrl: string,
  options?: { delayMs?: number },
): string {
  const delayMs = options?.delayMs ?? 2500;
  return `
(function () {
  var ua = typeof navigator !== "undefined" ? navigator.userAgent || "" : "";
  if (!${IN_APP_UA}.test(ua)) { return; }
  var isMobile = /android|iphone|ipad|ipod/i.test(ua);
  if (!isMobile) { return; }
  var target = ${JSON.stringify(socialLandingUrl)};
  window.setTimeout(function () { window.location.replace(target); }, ${delayMs});
})();
`.trim();
}

/**
 * 인앱/일반 브라우저 공통: 스토어 버튼 href 를 itms / market 으로 보강.
 */
export function buildStoreButtonHrefScript(): string {
  return `
(function () {
  var ua = typeof navigator !== "undefined" ? navigator.userAgent || "" : "";
  var isAndroid = /android/i.test(ua);
  var isIOS = /iphone|ipad|ipod/i.test(ua);
  var elIos = document.getElementById("share-btn-ios");
  var elAnd = document.getElementById("share-btn-android");
  if (isIOS && elIos) { elIos.setAttribute("href", ${JSON.stringify(IOS_APP_STORE_ITMS)}); }
  if (isAndroid && elAnd) { elAnd.setAttribute("href", ${JSON.stringify(PLAY_STORE_MARKET)}); }
})();
`.trim();
}
