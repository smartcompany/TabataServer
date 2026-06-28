import { randomUUID } from 'crypto';

import {
  createYouTubeContentPart,
  getChatCompletionText,
  isYouTubeUrl,
} from 'nextjs-share-lib/ai';

import { geminiAi } from '@/lib/ai-client';
import {
  parseRoutineProfile,
  type RoutineProfile,
} from '@/lib/profile-schema';
import {
  loadPromptJson,
  renderPromptTemplate,
} from '@/lib/prompt-loader';

const SYSTEM_PROMPT_FILE = 'ai-routine-system.txt';
const USER_PROMPT_FILE = 'ai-routine-user.txt';
const EXAMPLE_JSON_FILE = 'ai-routine-example.json';

const URL_PATTERN = /https?:\/\/[^\s<>"']+/gi;

function extractYouTubeUrls(text: string): string[] {
  const matches = text.match(URL_PATTERN) ?? [];
  return [
    ...new Set(
      matches
        .map((url) => url.replace(/[)\]},.!?]+$/, '').trim())
        .filter(isYouTubeUrl),
    ),
  ];
}

function resolveContentLanguage(
  value: string | undefined,
): NonNullable<RoutineProfile['contentLanguage']> {
  const lang = value?.trim() || 'ko';
  return ['en', 'ko', 'zh', 'ja'].includes(lang)
    ? (lang as NonNullable<RoutineProfile['contentLanguage']>)
    : 'ko';
}

function buildSystemInstruction(outputLanguage: string): string {
  return renderPromptTemplate(SYSTEM_PROMPT_FILE, {
    OUTPUT_LANGUAGE: outputLanguage,
    EXAMPLE_JSON: loadPromptJson(EXAMPLE_JSON_FILE),
  });
}

function buildUserMessage(userPrompt: string): string {
  return renderPromptTemplate(USER_PROMPT_FILE, {
    USER_PROMPT: userPrompt,
  });
}

function prepareAiRoutineForParse(raw: unknown): unknown {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Model response is not a JSON object');
  }

  const source = raw as Record<string, unknown>;
  const { contentLanguage: _contentLanguage, id: _id, ...rest } = source;

  if (!Array.isArray(source.exercises) || source.exercises.length === 0) {
    throw new Error('Model response missing exercises');
  }

  return {
    ...rest,
    schemaVersion: 1,
    id: 'pending',
    exercises: source.exercises.map((exercise, exerciseIndex) => {
      if (!exercise || typeof exercise !== 'object') {
        throw new Error('Invalid exercise entry in model response');
      }
      const entry = exercise as Record<string, unknown>;
      const { id: _exerciseId, ...exerciseRest } = entry;

      if (!Array.isArray(entry.phases) || entry.phases.length === 0) {
        throw new Error('Exercise missing phases in model response');
      }

      return {
        ...exerciseRest,
        id: 'pending',
        order:
          typeof entry.order === 'number' ? entry.order : exerciseIndex,
        phases: entry.phases.map((phase, phaseIndex) => {
          if (!phase || typeof phase !== 'object') {
            throw new Error('Invalid phase entry in model response');
          }
          const phaseEntry = phase as Record<string, unknown>;
          const { id: _phaseId, ...phaseRest } = phaseEntry;
          return {
            ...phaseRest,
            id: 'pending',
            order:
              typeof phaseEntry.order === 'number'
                ? phaseEntry.order
                : phaseIndex,
          };
        }),
      };
    }),
  };
}

function assignFreshIds(profile: RoutineProfile): RoutineProfile {
  const routineId = `ai-${randomUUID().replace(/-/g, '').slice(0, 16)}`;
  return {
    ...profile,
    schemaVersion: 1,
    id: routineId,
    exercises: profile.exercises.map((exercise, exerciseIndex) => ({
      ...exercise,
      id: randomUUID(),
      order: exerciseIndex,
      phases: exercise.phases.map((phase, phaseIndex) => ({
        ...phase,
        id: randomUUID(),
        order: phaseIndex,
      })),
    })),
  };
}

function parseJsonFromModelText(text: string): unknown {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenceMatch?.[1]) {
      return JSON.parse(fenceMatch[1].trim());
    }
    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}');
    if (start >= 0 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1));
    }
    throw new Error('Model response is not valid JSON');
  }
}

export async function generateRoutineFromPrompt(input: {
  prompt: string;
  contentLanguage?: string;
}): Promise<RoutineProfile> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured');
  }

  const prompt = input.prompt.trim();
  if (prompt.length < 8) {
    throw new Error('Prompt is too short');
  }
  if (prompt.length > 4000) {
    throw new Error('Prompt is too long');
  }

  const contentLanguage = resolveContentLanguage(input.contentLanguage);
  const youtubeUrls = extractYouTubeUrls(prompt);

  const response = await geminiAi.createChatCompletion({
    preset: 'long_output',
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: buildSystemInstruction(contentLanguage),
      },
      {
        role: 'user',
        content: [
          ...youtubeUrls.map((url) => createYouTubeContentPart(url)),
          { type: 'text', text: buildUserMessage(prompt) },
        ],
      },
    ],
  });

  const modelText = getChatCompletionText(response);
  if (!modelText) {
    throw new Error('Empty response from Gemini');
  }

  const parsed = parseJsonFromModelText(modelText);
  const profile = parseRoutineProfile(prepareAiRoutineForParse(parsed));
  return assignFreshIds({
    ...profile,
    contentLanguage,
  });
}
