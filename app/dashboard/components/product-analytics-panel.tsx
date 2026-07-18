'use client';

import { useCallback, useEffect, useState } from 'react';

type FunnelStep = {
  eventName: string;
  label: string;
  installs: number;
  rateFromPrevious: number | null;
};

type Journey = {
  installId: string;
  shortId: string;
  platform: string;
  locale: string;
  appVersion: string;
  firstSeenAt: string;
  lastSeenAt: string;
  stage: string;
  workoutCount: number;
  aiSavedCount: number;
  uploadCount: number;
  downloadCount: number;
  shareCount: number;
  events: Array<{
    occurredAt: string;
    eventName: string;
    properties: Record<string, string | number | boolean>;
  }>;
};

type DashboardData = {
  configured: boolean;
  periodDays: number;
  summary: {
    activeInstalls: number;
    firstOpens: number;
    workoutStarters: number;
    workoutCompleters: number;
    repeatWorkoutInstalls: number;
  };
  activationFunnel: FunnelStep[];
  aiFunnel: FunnelStep[];
  stageCounts: Record<string, number>;
  featureAdoption: {
    schedules: number;
    health: number;
    uploads: number;
    downloads: number;
    shares: number;
  };
  journeys: Journey[];
};

const eventLabels: Record<string, string> = {
  first_open: '최초 실행',
  app_open: '앱 실행',
  onboarding_viewed: '온보딩 진입',
  onboarding_complete: '온보딩 완료',
  routine_create_started: '루틴 만들기 시작',
  routine_created: '루틴 생성',
  routine_edited: '루틴 편집',
  routine_download_started: '루틴 다운로드 시작',
  routine_download_succeeded: '루틴 다운로드 완료',
  routine_download_failed: '루틴 다운로드 실패',
  login_started: '로그인 시작',
  login_succeeded: '로그인 완료',
  login_cancelled: '로그인 취소',
  routine_upload_started: '루틴 업로드 시작',
  routine_upload_succeeded: '루틴 업로드 완료',
  routine_upload_failed: '루틴 업로드 실패',
  routine_share_tapped: '루틴 공유 탭',
  routine_share_succeeded: '루틴 공유 성공',
  routine_share_failed: '루틴 공유 실패',
  ai_create_opened: 'AI 만들기 진입',
  ai_prompt_submitted: 'AI 요청 제출',
  ai_generation_succeeded: 'AI 생성 성공',
  ai_generation_failed: 'AI 생성 실패',
  ai_routine_saved: 'AI 루틴 저장',
  workout_opened: '운동 화면 진입',
  workout_started: '운동 시작',
  workout_completed: '운동 완료',
  workout_abandoned: '운동 중단',
  schedule_created: '운동 예약',
  health_workout_sync_succeeded: '건강 앱 저장',
};

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
      <div className="text-xs text-zinc-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-zinc-900">
        {value.toLocaleString('ko-KR')}
      </div>
    </div>
  );
}

function Funnel({ title, steps }: { title: string; steps: FunnelStep[] }) {
  return (
    <div className="rounded-lg border border-zinc-200 p-4">
      <h3 className="font-medium text-zinc-800">{title}</h3>
      <div className="mt-3 space-y-2">
        {steps.map((step) => (
          <div key={step.eventName} className="flex items-center gap-3 text-sm">
            <span className="min-w-28 text-zinc-600">{step.label}</span>
            <div className="h-2 flex-1 overflow-hidden rounded bg-zinc-100">
              <div
                className="h-full rounded bg-violet-500"
                style={{
                  width: `${
                    steps[0]?.installs
                      ? Math.max(2, (step.installs / steps[0].installs) * 100)
                      : 0
                  }%`,
                }}
              />
            </div>
            <span className="w-20 text-right font-medium text-zinc-800">
              {step.installs}명
              {step.rateFromPrevious !== null
                ? ` (${step.rateFromPrevious}%)`
                : ''}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ProductAnalyticsPanel() {
  const [days, setDays] = useState(28);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(
        `/api/dashboard/product-analytics?days=${days}`,
        { credentials: 'include' },
      );
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || '분석 조회 실패');
      setData(body);
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : '분석 조회 실패',
      );
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold text-zinc-900">사용자 여정 분석</h2>
          <p className="mt-0.5 text-xs text-zinc-500">
            익명 설치 ID 기준 · 최초 실행은 실제 설치의 대리 지표
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={days}
            onChange={(event) => setDays(Number(event.target.value))}
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          >
            <option value={7}>최근 7일</option>
            <option value={28}>최근 28일</option>
            <option value={90}>최근 90일</option>
          </select>
          <button
            type="button"
            onClick={() => void load()}
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          >
            새로고침
          </button>
        </div>
      </div>

      {loading && <p className="py-8 text-center text-zinc-500">불러오는 중...</p>}
      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      {!loading && data && !data.configured && (
        <p className="mt-4 text-sm text-amber-700">
          Supabase 분석 저장소가 설정되지 않았습니다.
        </p>
      )}
      {!loading && data?.configured && (
        <div className="mt-4 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <MetricCard label="활성 설치" value={data.summary.activeInstalls} />
            <MetricCard label="신규 최초 실행" value={data.summary.firstOpens} />
            <MetricCard label="운동 시작" value={data.summary.workoutStarters} />
            <MetricCard label="운동 완료" value={data.summary.workoutCompleters} />
            <MetricCard
              label="반복 운동 사용자"
              value={data.summary.repeatWorkoutInstalls}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Funnel title="활성화 퍼널" steps={data.activationFunnel} />
            <Funnel title="AI 루틴 퍼널" steps={data.aiFunnel} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-lg border border-zinc-200 p-4">
              <h3 className="font-medium text-zinc-800">사용자 단계</h3>
              <div className="mt-3 space-y-2 text-sm">
                {Object.entries(data.stageCounts).map(([stage, count]) => (
                  <div key={stage} className="flex justify-between">
                    <span className="text-zinc-600">{stage}</span>
                    <strong>{count}명</strong>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-lg border border-zinc-200 p-4">
              <h3 className="font-medium text-zinc-800">기능 사용 설치 수</h3>
              <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <span>예약 {data.featureAdoption.schedules}명</span>
                <span>건강 연동 {data.featureAdoption.health}명</span>
                <span>업로드 {data.featureAdoption.uploads}명</span>
                <span>다운로드 {data.featureAdoption.downloads}명</span>
                <span>공유 탭 {data.featureAdoption.shares}명</span>
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-lg border border-zinc-200">
            <div className="border-b border-zinc-200 px-4 py-3">
              <h3 className="font-medium text-zinc-800">익명 사용자 여정</h3>
            </div>
            <div className="max-h-[640px] overflow-auto">
              {data.journeys.map((journey) => (
                <div
                  key={journey.installId}
                  className="border-b border-zinc-100 last:border-0"
                >
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedId(
                        expandedId === journey.installId
                          ? null
                          : journey.installId,
                      )
                    }
                    className="grid w-full gap-2 px-4 py-3 text-left hover:bg-zinc-50 sm:grid-cols-[110px_1fr_160px_210px]"
                  >
                    <strong className="text-sm">{journey.shortId}</strong>
                    <span className="text-sm text-zinc-700">{journey.stage}</span>
                    <span className="text-xs text-zinc-500">
                      운동 {journey.workoutCount} · AI {journey.aiSavedCount} ·
                      업 {journey.uploadCount} · 다운 {journey.downloadCount} ·
                      공유 {journey.shareCount}
                    </span>
                    <span className="text-xs text-zinc-400">
                      {journey.platform} · {journey.locale} ·{' '}
                      {new Date(journey.lastSeenAt).toLocaleString('ko-KR')}
                    </span>
                  </button>
                  {expandedId === journey.installId && (
                    <ol className="space-y-2 bg-zinc-50 px-6 py-4">
                      {journey.events.map((event, index) => (
                        <li
                          key={`${event.occurredAt}-${index}`}
                          className="flex flex-wrap gap-x-3 text-xs"
                        >
                          <time className="text-zinc-400">
                            {new Date(event.occurredAt).toLocaleString('ko-KR')}
                          </time>
                          <strong className="text-zinc-700">
                            {eventLabels[event.eventName] ?? event.eventName}
                          </strong>
                          {Object.keys(event.properties).length > 0 && (
                            <span className="text-zinc-500">
                              {Object.entries(event.properties)
                                .map(([key, value]) => `${key}=${value}`)
                                .join(' · ')}
                            </span>
                          )}
                        </li>
                      ))}
                    </ol>
                  )}
                </div>
              ))}
              {data.journeys.length === 0 && (
                <p className="px-4 py-8 text-center text-sm text-zinc-500">
                  아직 수집된 이벤트가 없습니다.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
