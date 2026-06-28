import fs from 'fs';
import path from 'path';

const PROMPTS_DIR = path.join(process.cwd(), 'prompts');

function readPrompt(relativePath: string): string {
  const fullPath = path.join(PROMPTS_DIR, relativePath);
  return fs.readFileSync(fullPath, 'utf8').trim();
}

export function renderPromptTemplate(
  templateFile: string,
  variables: Record<string, string>,
): string {
  let text = readPrompt(templateFile);
  for (const [key, value] of Object.entries(variables)) {
    text = text.replaceAll(`{{${key}}}`, value);
  }
  return text;
}

export function loadPromptJson(relativePath: string): string {
  return readPrompt(relativePath);
}
