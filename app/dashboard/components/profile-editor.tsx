'use client';

import {
  createExercise,
  createPhase,
  type Exercise,
  type ExercisePhaseKind,
  type RoutineProfile,
} from '@/lib/dashboard-profile-model';

type ProfileEditorProps = {
  profile: RoutineProfile;
  isNew: boolean;
  onChange: (profile: RoutineProfile) => void;
};

const inputClass =
  'w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none';
const labelClass = 'block text-sm font-medium text-zinc-600 mb-1';

function NumberField({
  label,
  value,
  min,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  onChange: (value: number) => void;
}) {
  return (
    <div>
      <label className={labelClass}>{label}</label>
      <input
        type="number"
        min={min}
        value={value}
        onChange={(event) => onChange(Math.max(min, Number(event.target.value) || min))}
        className={inputClass}
      />
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
  multiline = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
}) {
  return (
    <div>
      <label className={labelClass}>{label}</label>
      {multiline ? (
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          rows={3}
          className={inputClass}
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className={inputClass}
        />
      )}
    </div>
  );
}

function moveItem<T>(items: T[], index: number, delta: number): T[] {
  const target = index + delta;
  if (target < 0 || target >= items.length) return items;
  const copy = [...items];
  const [item] = copy.splice(index, 1);
  copy.splice(target, 0, item);
  return copy;
}

export function ProfileEditor({ profile, isNew, onChange }: ProfileEditorProps) {
  const update = (patch: Partial<RoutineProfile>) => {
    onChange({ ...profile, ...patch });
  };

  const updateExercise = (index: number, patch: Partial<Exercise>) => {
    const exercises = profile.exercises.map((exercise, i) =>
      i === index ? { ...exercise, ...patch } : exercise,
    );
    update({ exercises });
  };

  const updatePhase = (
    exerciseIndex: number,
    phaseIndex: number,
    patch: Partial<Exercise['phases'][number]>,
  ) => {
    const exercises = profile.exercises.map((exercise, i) => {
      if (i !== exerciseIndex) return exercise;
      const phases = exercise.phases.map((phase, j) =>
        j === phaseIndex ? { ...phase, ...patch } : phase,
      );
      return { ...exercise, phases };
    });
    update({ exercises });
  };

  const addExercise = () => {
    update({
      exercises: [...profile.exercises, createExercise(profile.exercises.length)],
    });
  };

  const removeExercise = (index: number) => {
    if (profile.exercises.length <= 1) return;
    update({ exercises: profile.exercises.filter((_, i) => i !== index) });
  };

  const moveExercise = (index: number, delta: number) => {
    update({ exercises: moveItem(profile.exercises, index, delta) });
  };

  const addPhase = (exerciseIndex: number, kind: ExercisePhaseKind) => {
    const exercise = profile.exercises[exerciseIndex];
    if (!exercise) return;
    updateExercise(exerciseIndex, {
      phases: [...exercise.phases, createPhase(kind, exercise.phases.length)],
    });
  };

  const removePhase = (exerciseIndex: number, phaseIndex: number) => {
    const exercise = profile.exercises[exerciseIndex];
    if (!exercise || exercise.phases.length <= 1) return;
    updateExercise(exerciseIndex, {
      phases: exercise.phases.filter((_, i) => i !== phaseIndex),
    });
  };

  const movePhase = (exerciseIndex: number, phaseIndex: number, delta: number) => {
    const exercise = profile.exercises[exerciseIndex];
    if (!exercise) return;
    updateExercise(exerciseIndex, {
      phases: moveItem(exercise.phases, phaseIndex, delta),
    });
  };

  return (
    <div className="space-y-6 overflow-y-auto max-h-[calc(100vh-12rem)] pr-1">
      <section className="space-y-4 rounded-xl border border-zinc-200 p-4">
        <h3 className="font-semibold text-zinc-800">루틴 정보</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="프로필 ID (URL용, 영문·숫자·하이픈)"
            value={profile.id}
            onChange={(id) => update({ id: id.toLowerCase().replace(/[^a-z0-9-]/g, '-') })}
            placeholder="rotator-cuff"
          />
          <TextField
            label="루틴 이름"
            value={profile.title}
            onChange={(title) => update({ title })}
          />
        </div>
        {isNew && (
          <p className="text-xs text-amber-700">
            새 프로필 ID는 저장 후 변경하기 어렵습니다. 영문 소문자와 하이픈만 사용하세요.
          </p>
        )}
        <TextField
          label="설명"
          value={profile.description}
          onChange={(description) => update({ description })}
          multiline
        />
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-zinc-800">운동 목록</h3>
          <button
            type="button"
            onClick={addExercise}
            className="text-sm rounded-lg border border-zinc-300 px-3 py-1.5 hover:bg-zinc-50"
          >
            + 운동 추가
          </button>
        </div>

        {profile.exercises.map((exercise, exerciseIndex) => (
          <div
            key={exercise.id}
            className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-4 space-y-4"
          >
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="font-medium text-zinc-800 mr-auto">
                운동 {exerciseIndex + 1}
              </h4>
              <button
                type="button"
                disabled={exerciseIndex === 0}
                onClick={() => moveExercise(exerciseIndex, -1)}
                className="text-xs px-2 py-1 rounded border border-zinc-300 disabled:opacity-40"
              >
                ↑
              </button>
              <button
                type="button"
                disabled={exerciseIndex === profile.exercises.length - 1}
                onClick={() => moveExercise(exerciseIndex, 1)}
                className="text-xs px-2 py-1 rounded border border-zinc-300 disabled:opacity-40"
              >
                ↓
              </button>
              <button
                type="button"
                disabled={profile.exercises.length <= 1}
                onClick={() => removeExercise(exerciseIndex)}
                className="text-xs px-2 py-1 rounded border border-red-200 text-red-700 disabled:opacity-40"
              >
                삭제
              </button>
            </div>

            <TextField
              label="운동 이름"
              value={exercise.name}
              onChange={(name) => updateExercise(exerciseIndex, { name })}
            />
            <TextField
              label="설명"
              value={exercise.instruction}
              onChange={(instruction) => updateExercise(exerciseIndex, { instruction })}
              multiline
            />

            <div className="grid gap-4 sm:grid-cols-3">
              <NumberField
                label="준비 (초)"
                value={exercise.prepare.durationSec}
                min={0}
                onChange={(durationSec) =>
                  updateExercise(exerciseIndex, {
                    prepare: { durationSec },
                  })
                }
              />
              <NumberField
                label="횟수"
                value={exercise.reps}
                min={1}
                onChange={(reps) => updateExercise(exerciseIndex, { reps })}
              />
              <NumberField
                label="세트"
                value={exercise.sets}
                min={1}
                onChange={(sets) => updateExercise(exerciseIndex, { sets })}
              />
            </div>

            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium text-zinc-700">동작 순서</span>
                <button
                  type="button"
                  onClick={() => addPhase(exerciseIndex, 'work')}
                  className="text-xs rounded-lg bg-red-50 text-red-700 px-2 py-1 border border-red-100"
                >
                  + 운동
                </button>
                <button
                  type="button"
                  onClick={() => addPhase(exerciseIndex, 'relax')}
                  className="text-xs rounded-lg bg-emerald-50 text-emerald-700 px-2 py-1 border border-emerald-100"
                >
                  + 이완
                </button>
              </div>

              {exercise.phases.map((phase, phaseIndex) => (
                <div
                  key={phase.id}
                  className="grid gap-3 sm:grid-cols-[auto_1fr_100px_100px_auto] items-end rounded-lg border border-zinc-200 bg-white p-3"
                >
                  <div>
                    <label className={labelClass}>구분</label>
                    <select
                      value={phase.kind}
                      onChange={(event) =>
                        updatePhase(exerciseIndex, phaseIndex, {
                          kind: event.target.value as ExercisePhaseKind,
                        })
                      }
                      className={inputClass}
                    >
                      <option value="work">운동</option>
                      <option value="relax">이완</option>
                    </select>
                  </div>
                  <TextField
                    label="라벨"
                    value={phase.label}
                    onChange={(label) => updatePhase(exerciseIndex, phaseIndex, { label })}
                  />
                  <NumberField
                    label="시간(초)"
                    value={phase.durationSec}
                    min={1}
                    onChange={(durationSec) =>
                      updatePhase(exerciseIndex, phaseIndex, { durationSec })
                    }
                  />
                  <div className="flex gap-1 pb-2">
                    <button
                      type="button"
                      disabled={phaseIndex === 0}
                      onClick={() => movePhase(exerciseIndex, phaseIndex, -1)}
                      className="text-xs px-2 py-2 rounded border border-zinc-300 disabled:opacity-40"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      disabled={phaseIndex === exercise.phases.length - 1}
                      onClick={() => movePhase(exerciseIndex, phaseIndex, 1)}
                      className="text-xs px-2 py-2 rounded border border-zinc-300 disabled:opacity-40"
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      disabled={exercise.phases.length <= 1}
                      onClick={() => removePhase(exerciseIndex, phaseIndex)}
                      className="text-xs px-2 py-2 rounded border border-red-200 text-red-700 disabled:opacity-40"
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
