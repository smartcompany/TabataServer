import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import {
  IOS_APP_STORE_WEB,
  PLAY_STORE_WEB,
} from '@/lib/applink';
import { buildShareLandingScript } from '@/lib/share-app-scheme';
import { buildApplinkSocialUrl } from '@/lib/share-url';
import { getSharedRoutine } from '@/lib/shared-routine-store';
import { descriptionPlainText } from '@/lib/description-blocks';

type PageProps = {
  params: Promise<{ id: string }>;
};

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

  const socialLandingUrl = buildApplinkSocialUrl();
  const landingScript = buildShareLandingScript(id, socialLandingUrl);

  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: landingScript }} />
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
          <p className="m-0 text-center text-xs text-zinc-500">
            앱이 설치되어 있으면 자동으로 앱이 열립니다. 열리지 않으면 잠시 후
            스토어로 이동합니다.
          </p>
          <a
            id="share-btn-ios"
            href={IOS_APP_STORE_WEB}
            className="block rounded-xl bg-orange-500 px-5 py-3.5 text-center text-sm font-semibold text-zinc-950 no-underline"
          >
            App Store에서 설치
          </a>
          <a
            id="share-btn-android"
            href={PLAY_STORE_WEB}
            className="block rounded-xl border border-zinc-600 bg-white/5 px-5 py-3.5 text-center text-sm font-semibold text-zinc-100 no-underline"
          >
            Google Play에서 설치
          </a>
          <a
            href={socialLandingUrl}
            className="block text-center text-xs text-orange-400 no-underline hover:underline"
          >
            스토어가 자동으로 열리지 않으면 여기를 눌러 주세요
          </a>
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
