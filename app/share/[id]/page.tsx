import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';

import { IOS_APP_STORE_WEB, PLAY_STORE_WEB } from '@/lib/applink';
import { buildShareLandingScript } from '@/lib/share-app-scheme';
import {
  buildSharePageTitle,
  getOpenGraphLocale,
  getSharePageCopy,
  resolveContentLanguage,
  resolveContentLanguageFromHeader,
} from '@/lib/share-i18n';
import { buildApplinkSocialUrl, buildSharePageUrl } from '@/lib/share-url';
import { getSharedRoutine } from '@/lib/shared-routine-store';
import { descriptionPlainText } from '@/lib/description-blocks';

type PageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const row = await getSharedRoutine(id).catch(() => null);
  if (!row) {
    const acceptLanguage = (await headers()).get('accept-language');
    const copy = getSharePageCopy(
      resolveContentLanguageFromHeader(acceptLanguage),
    );
    return { title: `${copy.appTitle} — ${copy.shareFallbackTitle}` };
  }

  const lang = resolveContentLanguage(row.data.contentLanguage);
  const copy = getSharePageCopy(lang);
  const description = descriptionPlainText(
    row.data.description,
    row.data.descriptionBlocks,
  );
  const pageTitle = buildSharePageTitle(row.data.title, lang);
  const pageDescription = description.slice(0, 160) || copy.defaultDescription;
  return {
    title: pageTitle,
    description: pageDescription,
    robots: { index: false, follow: false },
    openGraph: {
      title: pageTitle,
      description: pageDescription,
      url: buildSharePageUrl(id),
      siteName: copy.appTitle,
      locale: getOpenGraphLocale(lang),
      type: 'website',
    },
  };
}

export default async function ShareRoutinePage({ params }: PageProps) {
  const { id } = await params;
  const row = await getSharedRoutine(id).catch(() => null);
  if (!row) notFound();

  const lang = resolveContentLanguage(row.data.contentLanguage);
  const copy = getSharePageCopy(lang);
  const socialLandingUrl = buildApplinkSocialUrl();
  const landingScript = buildShareLandingScript(id, socialLandingUrl);

  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: landingScript }} />
      <main
        className="mx-auto flex min-h-[100dvh] max-w-lg flex-col items-center justify-center bg-zinc-950 px-5 text-center text-zinc-100"
        style={{ minHeight: '100dvh' }}
        lang={lang}
      >
        <p className="m-0 text-sm leading-relaxed text-zinc-400">{copy.appOpenHint}</p>
        <noscript>
          <p className="mt-6 flex flex-col gap-3">
            <a
              href={IOS_APP_STORE_WEB}
              className="text-orange-400 no-underline hover:underline"
            >
              {copy.installAppStore}
            </a>
            <a
              href={PLAY_STORE_WEB}
              className="text-orange-400 no-underline hover:underline"
            >
              {copy.installPlayStore}
            </a>
            <a
              href={socialLandingUrl}
              className="text-zinc-500 no-underline hover:underline"
            >
              {copy.storeFallbackLink}
            </a>
          </p>
        </noscript>
      </main>
    </>
  );
}
