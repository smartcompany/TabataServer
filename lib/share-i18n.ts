import type { RoutineProfile } from '@/lib/profile-schema';

export type ContentLanguage = NonNullable<RoutineProfile['contentLanguage']>;

const SHARE_DEFAULT_LANGUAGE: ContentLanguage = 'en';

/** Flutter `lib/l10n/app_*.arb` → `appTitle` 과 동일 */
const APP_TITLES: Record<ContentLanguage, string> = {
  ko: '모두의 타바타',
  en: "Everyone's Tabata",
  ja: 'みんなのタバタ',
  zh: '大家的塔巴塔',
};

type SharePageCopy = {
  appTitle: string;
  sharedRoutineBadge: string;
  exercisesHeading: string;
  appOpenHint: string;
  installAppStore: string;
  installPlayStore: string;
  storeFallbackLink: string;
  shareFallbackTitle: string;
  defaultDescription: string;
};

const SHARE_COPY: Record<ContentLanguage, Omit<SharePageCopy, 'appTitle'>> = {
  ko: {
    sharedRoutineBadge: '공유 루틴',
    exercisesHeading: '운동 목록',
    appOpenHint:
      '앱이 설치되어 있으면 자동으로 앱이 열립니다. 열리지 않으면 잠시 후 스토어로 이동합니다.',
    installAppStore: 'App Store에서 설치',
    installPlayStore: 'Google Play에서 설치',
    storeFallbackLink: '스토어가 자동으로 열리지 않으면 여기를 눌러 주세요',
    shareFallbackTitle: '공유',
    defaultDescription: '공유된 운동 루틴',
  },
  en: {
    sharedRoutineBadge: 'Shared routine',
    exercisesHeading: 'Exercises',
    appOpenHint:
      'If the app is installed, it will open automatically. Otherwise you will be redirected to the store shortly.',
    installAppStore: 'Install from App Store',
    installPlayStore: 'Install from Google Play',
    storeFallbackLink: "Tap here if the store doesn't open automatically",
    shareFallbackTitle: 'Share',
    defaultDescription: 'Shared workout routine',
  },
  ja: {
    sharedRoutineBadge: '共有ルーティン',
    exercisesHeading: '種目一覧',
    appOpenHint:
      'アプリがインストールされていれば自動的に開きます。開かない場合はまもなくストアに移動します。',
    installAppStore: 'App Store でインストール',
    installPlayStore: 'Google Play でインストール',
    storeFallbackLink: 'ストアが自動で開かない場合はこちらをタップ',
    shareFallbackTitle: '共有',
    defaultDescription: '共有されたトレーニングルーティン',
  },
  zh: {
    sharedRoutineBadge: '共享训练',
    exercisesHeading: '动作列表',
    appOpenHint: '如已安装应用将自动打开，否则会跳转到应用商店。',
    installAppStore: '从 App Store 安装',
    installPlayStore: '从 Google Play 安装',
    storeFallbackLink: '如果未自动打开应用商店，请点击此处',
    shareFallbackTitle: '分享',
    defaultDescription: '共享的训练',
  },
};

const OPEN_GRAPH_LOCALES: Record<ContentLanguage, string> = {
  ko: 'ko_KR',
  en: 'en_US',
  ja: 'ja_JP',
  zh: 'zh_CN',
};

export function resolveContentLanguage(
  value?: string | null,
): ContentLanguage {
  const lang = value?.trim() || SHARE_DEFAULT_LANGUAGE;
  if (lang === 'en' || lang === 'ko' || lang === 'zh' || lang === 'ja') {
    return lang;
  }
  return SHARE_DEFAULT_LANGUAGE;
}

/** SNS 크롤러 등 루틴 데이터 없을 때 Accept-Language 폴백 */
export function resolveContentLanguageFromHeader(
  acceptLanguage: string | null | undefined,
): ContentLanguage {
  if (!acceptLanguage) {
    return SHARE_DEFAULT_LANGUAGE;
  }

  for (const part of acceptLanguage.split(',')) {
    const code = part.trim().split(';')[0]?.split('-')[0]?.toLowerCase();
    if (code === 'en' || code === 'ko' || code === 'zh' || code === 'ja') {
      return code;
    }
  }

  return SHARE_DEFAULT_LANGUAGE;
}

export function getSharePageCopy(lang: ContentLanguage): SharePageCopy {
  return {
    appTitle: APP_TITLES[lang],
    ...SHARE_COPY[lang],
  };
}

export function buildSharePageTitle(
  routineTitle: string,
  lang: ContentLanguage,
): string {
  return `${routineTitle} — ${APP_TITLES[lang]}`;
}

export function getOpenGraphLocale(lang: ContentLanguage): string {
  return OPEN_GRAPH_LOCALES[lang];
}
