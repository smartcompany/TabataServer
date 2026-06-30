import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { buildApplinkSocialUrl } from '@/lib/share-url';
import { getSharedRoutine } from '@/lib/shared-routine-store';
import { descriptionPlainText } from '@/lib/description-blocks';

type PageProps = {
  params: Promise<{ id: string }>;
};

const REDIRECT_SCRIPT = `
(function () {
  var ua = typeof navigator !== "undefined" ? navigator.userAgent || "" : "";
  var inApp = /(Twitter|X\\/[\\d.]+|FBIOS|FBAN|FBAV|Line\\/|KakaoTalk|Kakao|Daum|KAKAOTALK|Whatsapp|Telegram|Snapchat|Slack|LinkedIn|FB_IAB|Instagram|Pinterest|musical_ly|ByteDance|Aweme|; wv\\))/i.test(ua);
  if (inApp) { return; }
  var isMobile = /android|iphone|ipad|ipod/i.test(ua);
  if (!isMobile) { return; }
  var target = ${JSON.stringify(buildApplinkSocialUrl())};
  window.setTimeout(function () {
    window.location.replace(target);
  }, 1500);
})();
`.trim();

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const row = await getSharedRoutine(id).catch(() => null);
  if (!row) {
    return { title: 'Tabata Timer — Share' };
  }
  const description = descriptionPlainText(
    row.data.description,
    row.data.descriptionBlocks,
  );
  return {
    title: `${row.data.title} — Tabata Timer`,
    description: description.slice(0, 160) || 'Shared workout routine',
    robots: { index: false, follow: false },
  };
}

export default async function ShareRoutinePage({ params }: PageProps) {
  const { id } = await params;
  const row = await getSharedRoutine(id).catch(() => null);
  if (!row) notFound();

  const routine = row.data;
  const description = descriptionPlainText(
    routine.description,
    routine.descriptionBlocks,
  );
  const exerciseNames = [...routine.exercises]
    .sort((a, b) => a.order - b.order)
    .map((exercise) => exercise.name)
    .filter(Boolean);

  const storeUrl = buildApplinkSocialUrl();

  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: REDIRECT_SCRIPT }} />
      <main
        className="mx-auto flex min-h-[100dvh] max-w-lg flex-col bg-zinc-950 px-5 pb-10 pt-[max(1.5rem,env(safe-area-inset-top))] text-zinc-100"
        style={{ minHeight: '100dvh' }}
      >
        <p className="m-0 text-xs font-medium uppercase tracking-wide text-orange-400">
          Shared routine
        </p>
        <h1 className="m-0 mt-2 text-2xl font-bold leading-tight">{routine.title}</h1>
        {description ? (
          <p className="m-0 mt-3 whitespace-pre-wrap text-sm leading-relaxed text-zinc-400">
            {description.length > 400 ? `${description.slice(0, 400)}…` : description}
          </p>
        ) : null}
        {exerciseNames.length > 0 ? (
          <section className="mt-5">
            <h2 className="m-0 text-sm font-semibold text-zinc-300">Exercises</h2>
            <ul className="m-0 mt-2 list-inside list-disc space-y-1 text-sm text-zinc-400">
              {exerciseNames.map((name) => (
                <li key={name}>{name}</li>
              ))}
            </ul>
          </section>
        ) : null}
        <div className="mt-8 flex flex-col gap-3">
          <a
            href={storeUrl}
            className="block rounded-xl bg-orange-500 px-5 py-3.5 text-center text-sm font-semibold text-zinc-950 no-underline"
          >
            앱에서 열기 / 설치하기
          </a>
          <p className="m-0 text-center text-xs text-zinc-500">
            앱이 설치되어 있으면 이 링크로 바로 열립니다. 없으면 스토어로 이동합니다.
          </p>
        </div>
        <p className="mt-auto pt-10 text-center text-xs text-zinc-600">
          <Link href="/" className="text-orange-400 no-underline hover:underline">
            Tabata Timer
          </Link>
        </p>
      </main>
    </>
  );
}
