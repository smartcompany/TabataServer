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

/** 앱 스킴 시도 후 실패 시 스토어/다운로드 페이지로만 이동 (루틴 HTML 미표시). */
export function buildShareLandingScript(
  shareId: string,
  socialLandingUrl: string,
): string {
  const appSchemeUrl = buildTabataShareAppSchemeUrl(shareId);
  return `
(function () {
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

  function redirectToDownload() {
    if (inApp) {
      window.location.replace(socialLanding);
      return;
    }
    if (!isMobile) {
      window.location.replace(socialLanding);
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
  }

  function tryOpenApp() {
    document.addEventListener("visibilitychange", onHidden, { passive: true });
    window.addEventListener("pagehide", onHidden, { passive: true });

    // In-app webview(카카오 등)에서는 커스텀 스킴으로 앱이 열림.
    // 최상위 location.href 로 스킴을 열면 iOS Safari에서 "주소 유효하지 않음"
    // 오류 팝업이 뜨고 이후 리다이렉트 타이머가 취소되므로, iframe 으로만 시도한다.
    var iframe = document.createElement("iframe");
    iframe.style.display = "none";
    iframe.setAttribute("aria-hidden", "true");
    iframe.src = appScheme;
    document.body.appendChild(iframe);

    window.setTimeout(function () {
      document.removeEventListener("visibilitychange", onHidden);
      window.removeEventListener("pagehide", onHidden);
      if (iframe && iframe.parentNode) {
        iframe.parentNode.removeChild(iframe);
      }
      if (switchedToApp) { return; }
      redirectToDownload();
    }, 1000);
  }

  if (!isMobile) {
    redirectToDownload();
    return;
  }

  tryOpenApp();
})();
`.trim();
}
