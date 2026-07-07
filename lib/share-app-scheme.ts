/** 도파민 `dopamineassets://communityPost?postId=` 와 동일한 앱 스킴 폴백 */
export const TABATA_APP_SCHEME = 'tabata';

export function buildTabataShareAppSchemeUrl(shareId: string): string {
  return `${TABATA_APP_SCHEME}://share?shareId=${encodeURIComponent(shareId)}`;
}

/**
 * 앱 스킴 시도 후 실패하면 `/applink` 로만 이동한다.
 * `/applink` 은 미들웨어가 UA 기준으로 스토어 302 처리한다.
 */
export function buildShareLandingScript(
  shareId: string,
  downloadUrl: string,
): string {
  const appSchemeUrl = buildTabataShareAppSchemeUrl(shareId);
  return `
(function () {
  var appScheme = ${JSON.stringify(appSchemeUrl)};
  var downloadUrl = ${JSON.stringify(downloadUrl)};
  var ua = typeof navigator !== "undefined" ? navigator.userAgent || "" : "";
  var isMobile = /android|iphone|ipad|ipod/i.test(ua);
  var switchedToApp = false;

  function onHidden() {
    if (document.visibilityState === "hidden") {
      switchedToApp = true;
    }
  }

  function redirectToDownload() {
    if (switchedToApp) { return; }
    window.location.replace(downloadUrl);
  }

  if (!isMobile) {
    redirectToDownload();
    return;
  }

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
    redirectToDownload();
  }, 1000);
})();
`.trim();
}
