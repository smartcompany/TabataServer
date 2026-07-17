'use client';

import { useEffect, useState } from 'react';

const API = '';

export const AI_ROUTINE_PROMPT_HINT = `예)
https://www.youtube.com/watch?v=9bZkp7q19f0
이 영상 내용으로 운동 루틴을 만들어 줘

또는

요즘 목이 너무 뻐근한데 추천 운동으로 루틴을 만들어 줘`;

const LOADING_STAGES = [
  '요청을 읽고 있어요...',
  '운동 동작을 고르고 있어요...',
  '시간·횟수를 맞추고 있어요...',
  '세트와 순서를 정리하고 있어요...',
  '마지막으로 다듬는 중이에요...',
];

type ContentLanguage = 'ko' | 'en' | 'ja' | 'zh';

type AiRoutineCreateDialogProps = {
  open: boolean;
  onClose: () => void;
  onCreated: (profile: Record<string, unknown>) => void;
};

export function AiRoutineCreateDialog({
  open,
  onClose,
  onCreated,
}: AiRoutineCreateDialogProps) {
  const [prompt, setPrompt] = useState('');
  const [contentLanguage, setContentLanguage] = useState<ContentLanguage>('ko');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [loadingStageIndex, setLoadingStageIndex] = useState(0);

  useEffect(() => {
    if (!open) {
      setError('');
      setLoading(false);
      setLoadingStageIndex(0);
    }
  }, [open]);

  useEffect(() => {
    if (!loading) {
      setLoadingStageIndex(0);
      return;
    }

    const timer = window.setInterval(() => {
      setLoadingStageIndex((current) =>
        current >= LOADING_STAGES.length - 1 ? current : current + 1,
      );
    }, 2200);

    return () => window.clearInterval(timer);
  }, [loading]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = prompt.trim();
    if (!trimmed) {
      setError('요청 내용을 입력해 주세요.');
      return;
    }

    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/dashboard/routines/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          prompt: trimmed,
          contentLanguage,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(
          typeof data.error === 'string' && data.error
            ? data.error
            : '루틴 생성에 실패했습니다.',
        );
        return;
      }

      const profile = data.profile;
      if (!profile || typeof profile !== 'object') {
        setError('서버 응답을 읽을 수 없습니다.');
        return;
      }

      onCreated(profile as Record<string, unknown>);
      setPrompt('');
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="닫기"
        className="absolute inset-0 bg-black/40"
        onClick={loading ? undefined : onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="ai-routine-dialog-title"
        className="relative w-full max-w-lg rounded-xl bg-white shadow-xl border border-zinc-200"
      >
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <h2
              id="ai-routine-dialog-title"
              className="text-lg font-semibold text-zinc-900"
            >
              AI로 만들기
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              앱과 같은 방식으로 AI가 루틴을 생성합니다. 저장하면 기본 루틴 목록에
              추가됩니다.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-600 mb-1">
              루틴 언어
            </label>
            <select
              value={contentLanguage}
              onChange={(event) =>
                setContentLanguage(event.target.value as ContentLanguage)
              }
              disabled={loading}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none"
            >
              <option value="ko">한국어</option>
              <option value="en">English</option>
              <option value="ja">日本語</option>
              <option value="zh">中文</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-600 mb-1">
              요청
            </label>
            <textarea
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder={AI_ROUTINE_PROMPT_HINT}
              rows={10}
              disabled={loading}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none resize-y min-h-[220px]"
            />
          </div>

          {error && <p className="text-sm text-red-600 whitespace-pre-wrap">{error}</p>}

          {loading && (
            <div className="rounded-lg border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-900">
              <p className="font-medium">AI가 루틴을 만들고 있어요...</p>
              <p className="mt-1 text-violet-700">
                {LOADING_STAGES[loadingStageIndex]}
              </p>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-violet-600 text-white px-4 py-2 text-sm font-medium hover:bg-violet-500 disabled:opacity-50"
            >
              {loading ? '생성 중...' : '루틴 생성하기'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
