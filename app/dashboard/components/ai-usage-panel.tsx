'use client';

import { useCallback, useEffect, useState } from 'react';

import { formatUsd } from '@/lib/gemini-usage';
import type {
  AiUsageDashboardData,
  AiUsageLogRow,
  AiUsagePeriodSummary,
} from '@/lib/ai-usage-store';

const API = '';

function formatTokens(value: number): string {
  return value.toLocaleString('ko-KR');
}

function SummaryCard({
  label,
  summary,
}: {
  label: string;
  summary: AiUsagePeriodSummary;
}) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold text-zinc-900">
        {summary.requestCount.toLocaleString('ko-KR')}회
      </div>
      <dl className="mt-3 space-y-1 text-sm text-zinc-600">
        <div className="flex justify-between gap-4">
          <dt>입력 토큰</dt>
          <dd className="font-medium text-zinc-800">
            {formatTokens(summary.promptTokenCount)}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt>출력 토큰</dt>
          <dd className="font-medium text-zinc-800">
            {formatTokens(summary.outputTokenCount)}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt>합계 토큰</dt>
          <dd className="font-medium text-zinc-800">
            {formatTokens(summary.totalTokenCount)}
          </dd>
        </div>
        <div className="flex justify-between gap-4 border-t border-zinc-200 pt-2">
          <dt>예상 비용</dt>
          <dd className="font-semibold text-emerald-700">
            {formatUsd(summary.estimatedTotalUsd)}
          </dd>
        </div>
      </dl>
    </div>
  );
}

function RecentRow({ row }: { row: AiUsageLogRow }) {
  return (
    <tr className="border-t border-zinc-100">
      <td className="px-3 py-2 text-zinc-600 whitespace-nowrap">
        {new Date(row.createdAt).toLocaleString('ko-KR')}
      </td>
      <td className="px-3 py-2 text-zinc-800 max-w-[180px] truncate">
        {row.routineTitle || '—'}
      </td>
      <td className="px-3 py-2 text-zinc-600 text-right whitespace-nowrap">
        {formatTokens(row.promptTokenCount)}
      </td>
      <td className="px-3 py-2 text-zinc-600 text-right whitespace-nowrap">
        {formatTokens(row.candidatesTokenCount + row.thoughtsTokenCount)}
      </td>
      <td className="px-3 py-2 text-zinc-800 text-right whitespace-nowrap font-medium">
        {formatUsd(row.estimatedTotalUsd)}
      </td>
    </tr>
  );
}

export function AiUsagePanel() {
  const [data, setData] = useState<AiUsageDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchUsage = useCallback(async () => {
    setError('');
    try {
      const res = await fetch(`${API}/api/dashboard/ai-usage`, {
        credentials: 'include',
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'AI 사용량을 불러오지 못했습니다.');
      }
      setData(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'AI 사용량을 불러오지 못했습니다.');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchUsage();
  }, [fetchUsage]);

  return (
    <section className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-zinc-200">
        <div className="mr-auto">
          <h2 className="font-medium text-zinc-800">AI 루틴 사용량</h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            {data?.model ?? 'gemini-2.5-flash-lite'} · 배포 이후 누적
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setLoading(true);
            void fetchUsage();
          }}
          disabled={loading}
          className="text-sm rounded-lg border border-zinc-300 px-3 py-1.5 text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
        >
          {loading ? '새로고침 중...' : '새로고침'}
        </button>
      </div>

      <div className="p-4 space-y-4">
        {loading && !data ? (
          <p className="text-sm text-zinc-500">사용량 불러오는 중...</p>
        ) : error ? (
          <p className="text-sm text-red-600">{error}</p>
        ) : !data?.configured ? (
          <p className="text-sm text-amber-700">
            Supabase가 설정되지 않아 사용량을 저장·표시할 수 없습니다.{' '}
            <code className="text-xs bg-amber-50 px-1 py-0.5 rounded">
              supabase/schema.sql
            </code>
            의 <code className="text-xs bg-amber-50 px-1 py-0.5 rounded">
              tabata_ai_usage_logs
            </code>{' '}
            테이블을 적용하세요.
          </p>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <SummaryCard label="오늘 (UTC)" summary={data.today} />
              <SummaryCard label="최근 28일" summary={data.last28Days} />
            </div>
            <p className="text-xs text-zinc-500">{data.pricingNote}</p>

            {data.recent.length === 0 ? (
              <p className="text-sm text-zinc-500 py-4 text-center">
                아직 기록된 AI 생성 요청이 없습니다.
              </p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-zinc-200">
                <table className="min-w-full text-sm">
                  <thead className="bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-500">
                    <tr>
                      <th className="px-3 py-2 font-medium">시각</th>
                      <th className="px-3 py-2 font-medium">루틴</th>
                      <th className="px-3 py-2 font-medium text-right">입력</th>
                      <th className="px-3 py-2 font-medium text-right">출력</th>
                      <th className="px-3 py-2 font-medium text-right">예상</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recent.map((row) => (
                      <RecentRow key={row.id} row={row} />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
