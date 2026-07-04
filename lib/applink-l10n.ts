export type ApplinkLocale = 'ko' | 'en' | 'ja' | 'zh';

export type ApplinkSocialCopy = {
  appTitle: string;
  pageTitle: string;
  metaDescription: string;
  ogDescription: string;
  inAppHint: string;
  safariHint: string;
  serverHome: string;
  noscriptAppStore: string;
};

const SOCIAL_COPY: Record<ApplinkLocale, ApplinkSocialCopy> = {
  ko: {
    appTitle: '모두의 타바타',
    pageTitle: '모두의 타바타 — 다운로드',
    metaDescription:
      'App Store 또는 Google Play에서 모두의 타바타를 설치하세요.',
    ogDescription: '운동 루틴 인터벌 타이머 앱',
    inAppHint:
      'X·카카오 등 앱 안 브라우저는 아래 버튼을 눌러 스토어로 이동해 주세요.',
    safariHint: '일반 Safari에서는 자동으로 스토어가 열릴 수 있습니다.',
    serverHome: '서버 홈',
    noscriptAppStore: 'App Store로 이동',
  },
  en: {
    appTitle: "Everyone's Tabata",
    pageTitle: "Everyone's Tabata — Download",
    metaDescription:
      "Install Everyone's Tabata from the App Store or Google Play.",
    ogDescription: 'Interval timer for workout routines',
    inAppHint:
      'In X, KakaoTalk, and other in-app browsers, tap a button below to open the store.',
    safariHint: 'Safari and Chrome may open the store automatically.',
    serverHome: 'Server home',
    noscriptAppStore: 'Open in App Store',
  },
  ja: {
    appTitle: 'みんなのタバタ',
    pageTitle: 'みんなのタバタ — ダウンロード',
    metaDescription:
      'App Store または Google Play からみんなのタバタをインストールしてください。',
    ogDescription: 'ワークアウトルーティン用インターバルタイマーアプリ',
    inAppHint:
      'X・カカオトークなどアプリ内ブラウザでは、下のボタンからストアを開いてください。',
    safariHint: 'Safari などでは自動的にストアが開く場合があります。',
    serverHome: 'サーバーホーム',
    noscriptAppStore: 'App Storeを開く',
  },
  zh: {
    appTitle: '大家的塔巴塔',
    pageTitle: '大家的塔巴塔 — 下载',
    metaDescription: '从 App Store 或 Google Play 安装大家的塔巴塔。',
    ogDescription: '运动 routine 间歇计时器应用',
    inAppHint:
      '在 X、KakaoTalk 等应用内浏览器中，请点击下方按钮前往商店。',
    safariHint: '在 Safari 等浏览器中可能会自动打开商店。',
    serverHome: '服务器首页',
    noscriptAppStore: '打开 App Store',
  },
};

/** `Accept-Language` 또는 `?lang=` 값을 앱과 동일한 4개 로케일로 정규화. */
export function resolveApplinkLocale(
  acceptLanguage: string | null | undefined,
  queryLang?: string | null,
): ApplinkLocale {
  const q = (queryLang ?? '').trim().toLowerCase();
  if (q === 'ko' || q.startsWith('ko-')) return 'ko';
  if (q === 'ja' || q.startsWith('ja-')) return 'ja';
  if (q === 'zh' || q.startsWith('zh-')) return 'zh';
  if (q === 'en' || q.startsWith('en-')) return 'en';

  const raw = (acceptLanguage ?? '').toLowerCase();
  for (const part of raw.split(',')) {
    const tag = part.split(';')[0]?.trim() ?? '';
    if (tag.startsWith('ko')) return 'ko';
    if (tag.startsWith('ja')) return 'ja';
    if (tag.startsWith('zh')) return 'zh';
    if (tag.startsWith('en')) return 'en';
  }
  return 'en';
}

export function getApplinkSocialCopy(locale: ApplinkLocale): ApplinkSocialCopy {
  return SOCIAL_COPY[locale];
}
