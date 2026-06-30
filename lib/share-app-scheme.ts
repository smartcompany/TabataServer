import {
  IOS_APP_STORE_ITMS,
  IOS_APP_STORE_WEB,
  PLAY_STORE_MARKET,
  PLAY_STORE_WEB,
} from '@/lib/applink';

/** 도파민 `dopamineassets://communityPost?postId=` 와 동일한 앱 스킴 폴백 */
export const TABATA_APP_SCHEME = 'tabata';

export function buildTabataShareAppSchemeUrl(shareId: string): string {
  return `${TABATA_APP_SCHEME}://share?shareId=${encodeURIComponent(shareId)}`;
}

const IN_APP_UA =
  /(Twitter|X\/[\d.]+|FBIOS|FBAN|FBAV|Line\/|KakaoTalk|Kakao|Daum|KAKAOTALK|Whatsapp|Telegram|Snapchat|Slack|LinkedIn|FB_IAB|Instagram|Pinterest|musical_ly|ByteDance|Aweme|; wv\))/i;

/**
 * `/share/{id}` 웹 진입 시 앱 스킴을 hidden iframe 으로 시도 (카카오 인앱 등 UL 미동작).
 * 앱 미설치면 웹에 머무른 뒤 스토어/안내 페이지로 이동.
 */
export function buildShareLandingScript(
  shareId: string,
  socialLandingUrl: string,
): string {
  const appSchemeUrl = buildTabataShareAppSchemeUrl(shareId);
  return `
(function () {
  var shareId = ${JSON.stringify(shareId)};
  var appScheme = ${JSON.stringify(appSchemeUrl)};
  var socialLanding = ${JSON.stringify(socialLandingUrl)};
  var ua = typeof navigator !== "undefined" ? navigator.userAgent || "" : "";
  var isAndroid = /android/i.test(ua);
  var isIOS = /iphone|ipad|ipod/i.test(ua);
  var isMobile = isAndroid || isIOS;
  var inApp = ${IN_APP_UA}.test(ua);
  var switchedToApp = false;

  function onHidden() {
    if (document.visibilityState === "hidden") {
      switchedToApp = true;
    }
  }
  document.addEventListener("visibilitychange", onHidden, { passive: true });

  var elIos = document.getElementById("share-btn-ios");
  var elAnd = document.getElementById("share-btn-android");
  if (isIOS && elIos) { elIos.setAttribute("href", ${JSON.stringify(IOS_APP_STORE_ITMS)}); }
  if (isAndroid && elAnd) { elAnd.setAttribute("href", ${JSON.stringify(PLAY_STORE_MARKET)}); }

  if (!isMobile) { return; }

  var iframe = document.createElement("iframe");
  iframe.style.display = "none";
  iframe.setAttribute("aria-hidden", "true");
  iframe.src = appScheme;
  document.body.appendChild(iframe);

  window.setTimeout(function () {
    document.removeEventListener("visibilitychange", onHidden);
    if (iframe && iframe.parentNode) {
      iframe.parentNode.removeChild(iframe);
    }
    if (switchedToApp) { return; }

    if (inApp) {
      window.setTimeout(function () {
        window.location.replace(socialLanding);
      }, 1500);
      return;
    }

    var storeScheme = isAndroid ? ${JSON.stringify(PLAY_STORE_MARKET)} : ${JSON.stringify(IOS_APP_STORE_ITMS)};
    var storeWeb = isAndroid ? ${JSON.stringify(PLAY_STORE_WEB)} : ${JSON.stringify(IOS_APP_STORE_WEB)};
    var storeTimer = window.setTimeout(function () {
      window.location.replace(storeWeb);
    }, 2000);
    function cancelStore() {
      if (storeTimer !== null) {
        window.clearTimeout(storeTimer);
        storeTimer = null;
      }
    }
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) { cancelStore(); }
    }, { passive: true });
    try {
      window.location.href = storeScheme;
    } catch (e) {
      cancelStore();
      window.location.replace(storeWeb);
    }
  }, 1200);
})();
`.trim();
}
