'use client';

import { useEffect, useMemo, useState } from 'react';

import { API_BASE } from '@/lib/api-config';

type ProfileSummary = {
  id: string;
  title: string;
  description: string;
  exerciseCount: number;
  updatedAt: string;
};

type ProfileRow = {
  summary: ProfileSummary;
  profile: Record<string, unknown>;
};

const API = API_BASE;

const emptyProfile = {
  schemaVersion: 1,
  id: 'new-profile',
  title: '새 루틴',
  description: '',
  exercises: [],
};

export default function DashboardPage() {
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editorText, setEditorText] = useState('');
  const [editorError, setEditorError] = useState('');
  const [saveLoading, setSaveLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const selectedRow = useMemo(
    () => profiles.find((row) => row.summary.id === selectedId) ?? null,
    [profiles, selectedId],
  );

  const fetchProfiles = async () => {
    const res = await fetch(`${API}/api/dashboard/profiles`, {
      credentials: 'include',
    });
    if (res.status === 401) {
      setAuthenticated(false);
      setProfiles([]);
      return false;
    }
    if (!res.ok) {
      setAuthenticated(true);
      setProfiles([]);
      return true;
    }
    const data = await res.json();
    const rows: ProfileRow[] = data.profiles || [];
    setProfiles(rows);
    setAuthenticated(true);
    if (!selectedId && rows.length > 0) {
      selectProfile(rows[0].summary.id, rows[0].profile);
    }
    return true;
  };

  const selectProfile = (id: string, profile: Record<string, unknown>) => {
    setSelectedId(id);
    setEditorText(JSON.stringify(profile, null, 2));
    setEditorError('');
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      await fetchProfiles();
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoginError('');
    setLoginLoading(true);
    try {
      const res = await fetch(`${API}/api/dashboard/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setLoginError(data.error || '로그인 실패');
        return;
      }
      setAuthenticated(true);
      setPassword('');
      await fetchProfiles();
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = async () => {
    await fetch(`${API}/api/dashboard/logout`, {
      method: 'POST',
      credentials: 'include',
    });
    setAuthenticated(false);
    setProfiles([]);
    setSelectedId(null);
    setEditorText('');
  };

  const handleCreate = () => {
    setSelectedId('__new__');
    setEditorText(JSON.stringify(emptyProfile, null, 2));
    setEditorError('');
  };

  const handleSave = async () => {
    setEditorError('');
    setSaveLoading(true);
    try {
      let parsed: Record<string, unknown>;
      try {
        parsed = JSON.parse(editorText);
      } catch {
        setEditorError('JSON 형식이 올바르지 않습니다.');
        return;
      }

      const id = typeof parsed.id === 'string' ? parsed.id : '';
      if (!id) {
        setEditorError('profile.id가 필요합니다.');
        return;
      }

      const isNew = selectedId === '__new__';
      const url = isNew
        ? `${API}/api/dashboard/profiles/create`
        : `${API}/api/dashboard/profiles/${encodeURIComponent(id)}`;
      const method = isNew ? 'POST' : 'PUT';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(parsed),
      });
      const data = await res.json();
      if (!res.ok) {
        setEditorError(data.error || '저장에 실패했습니다.');
        return;
      }

      await fetchProfiles();
      selectProfile(id, data.profile ?? parsed);
    } finally {
      setSaveLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedRow || selectedId === '__new__') return;
    if (!confirm(`"${selectedRow.summary.title}" 프로필을 삭제할까요?`)) return;

    setDeleteLoading(true);
    try {
      const res = await fetch(
        `${API}/api/dashboard/profiles/${encodeURIComponent(selectedRow.summary.id)}`,
        { method: 'DELETE', credentials: 'include' },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || '삭제에 실패했습니다.');
        return;
      }
      setSelectedId(null);
      setEditorText('');
      await fetchProfiles();
    } finally {
      setDeleteLoading(false);
    }
  };

  if (loading && authenticated === null) {
    return (
      <div className="min-h-screen bg-zinc-100 flex items-center justify-center">
        <p className="text-zinc-500">확인 중...</p>
      </div>
    );
  }

  if (authenticated === false) {
    return (
      <div className="min-h-screen bg-zinc-100 flex items-center justify-center p-4">
        <div className="w-full max-w-sm rounded-xl bg-white shadow-lg border border-zinc-200 p-8">
          <h1 className="text-xl font-semibold text-zinc-800 mb-6 text-center">
            운동 프로필 관리
          </h1>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-600 mb-1">
                이메일
              </label>
              <input
                type="email"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-zinc-500 focus:outline-none"
                required
                autoComplete="username"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-600 mb-1">
                비밀번호
              </label>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-zinc-500 focus:outline-none"
                required
                autoComplete="current-password"
              />
            </div>
            {loginError && <p className="text-sm text-red-600">{loginError}</p>}
            <button
              type="submit"
              disabled={loginLoading}
              className="w-full rounded-lg bg-zinc-800 text-white py-2 font-medium hover:bg-zinc-700 disabled:opacity-50"
            >
              {loginLoading ? '로그인 중...' : '로그인'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-100">
      <header className="bg-white border-b border-zinc-200 px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-zinc-800">운동 프로필 관리</h1>
          <p className="text-xs text-zinc-500 mt-0.5">API: {API || '(same origin)'}</p>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="text-sm text-zinc-600 hover:text-zinc-900"
        >
          로그아웃
        </button>
      </header>

      <main className="p-4 max-w-7xl mx-auto grid gap-4 lg:grid-cols-[280px_1fr]">
        <section className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200">
            <h2 className="font-medium text-zinc-800">프로필 목록</h2>
            <button
              type="button"
              onClick={handleCreate}
              className="text-sm rounded-lg bg-zinc-800 text-white px-3 py-1.5 hover:bg-zinc-700"
            >
              새로 만들기
            </button>
          </div>
          <ul className="divide-y divide-zinc-100 max-h-[70vh] overflow-y-auto">
            {profiles.length === 0 ? (
              <li className="px-4 py-8 text-center text-zinc-500 text-sm">
                등록된 프로필이 없습니다.
              </li>
            ) : (
              profiles.map((row) => (
                <li key={row.summary.id}>
                  <button
                    type="button"
                    onClick={() => selectProfile(row.summary.id, row.profile)}
                    className={`w-full text-left px-4 py-3 hover:bg-zinc-50 ${
                      selectedId === row.summary.id ? 'bg-zinc-50' : ''
                    }`}
                  >
                    <div className="font-medium text-zinc-800">{row.summary.title}</div>
                    <div className="text-xs text-zinc-500 mt-1">{row.summary.id}</div>
                    <div className="text-xs text-zinc-400 mt-1">
                      {row.summary.exerciseCount}개 운동 ·{' '}
                      {new Date(row.summary.updatedAt).toLocaleString('ko-KR')}
                    </div>
                  </button>
                </li>
              ))
            )}
          </ul>
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white overflow-hidden flex flex-col min-h-[70vh]">
          <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-zinc-200">
            <h2 className="font-medium text-zinc-800 mr-auto">
              {selectedId === '__new__'
                ? '새 프로필'
                : selectedRow?.summary.title || '프로필 편집'}
            </h2>
            <button
              type="button"
              onClick={handleSave}
              disabled={!selectedId || saveLoading}
              className="rounded-lg bg-emerald-600 text-white px-4 py-2 text-sm font-medium hover:bg-emerald-500 disabled:opacity-50"
            >
              {saveLoading ? '저장 중...' : '저장'}
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={!selectedRow || selectedId === '__new__' || deleteLoading}
              className="rounded-lg border border-red-200 text-red-700 px-4 py-2 text-sm font-medium hover:bg-red-50 disabled:opacity-50"
            >
              {deleteLoading ? '삭제 중...' : '삭제'}
            </button>
          </div>

          {!selectedId ? (
            <div className="flex-1 flex items-center justify-center text-zinc-500 text-sm">
              왼쪽에서 프로필을 선택하거나 새로 만드세요.
            </div>
          ) : (
            <div className="flex-1 flex flex-col p-4 gap-3">
              {editorError && (
                <p className="text-sm text-red-600 whitespace-pre-wrap">{editorError}</p>
              )}
              <textarea
                value={editorText}
                onChange={(event) => setEditorText(event.target.value)}
                spellCheck={false}
                className="flex-1 min-h-[420px] w-full rounded-lg border border-zinc-300 px-3 py-2 font-mono text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none"
              />
              <p className="text-xs text-zinc-500">
                Tabata 앱과 동일한 Routine JSON 스키마(schemaVersion 1)를 사용합니다.
              </p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
