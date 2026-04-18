import { pool } from '../db/pool';
import { RowDataPacket } from 'mysql2';

type Language = 'ar' | 'ru' | 'en';

interface SnippetRow {
  key: string;
  value_ar: string;
  value_ru: string | null;
  value_en: string | null;
}

/**
 * Renders a template body for a given language.
 *
 * Supports:
 *   {{key}}              — variable substitution
 *   {{#if key}}...{{/if}} — conditional block (truthy check)
 *   {{snippet:key}}      — insert snippet value for the target language
 */
export async function renderTemplate(
  template: string,
  values: Record<string, string | number | boolean | null | undefined>,
  language: Language
): Promise<string> {
  // Load all snippets once
  const [snippetRows] = await pool.execute('SELECT `key`, value_ar, value_ru, value_en FROM snippets');
  const snippets = new Map<string, SnippetRow>();
  for (const row of snippetRows as SnippetRow[]) {
    snippets.set(row.key, row);
  }

  return renderWithSnippets(template, values, language, snippets);
}

export function renderWithSnippets(
  template: string,
  values: Record<string, string | number | boolean | null | undefined>,
  language: Language,
  snippets: Map<string, { value_ar: string; value_ru: string | null; value_en: string | null }>
): string {
  let result = template;

  // 1. Resolve snippet references: {{snippet:key}}
  result = result.replace(/\{\{snippet:(\w+)\}\}/g, (_match, key: string) => {
    const snippet = snippets.get(key);
    if (!snippet) return '';
    const langKey = `value_${language}` as const;
    return (snippet[langKey] || snippet.value_ar) ?? '';
  });

  // 2. Resolve conditionals: {{#if key}}...{{/if}}
  result = result.replace(/\{\{#if (\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (_match, key: string, content: string) => {
    const val = values[key];
    const isTruthy = val !== null && val !== undefined && val !== false && val !== '' && val !== 0;
    return isTruthy ? content : '';
  });

  // 3. Resolve variable placeholders: {{key}}
  result = result.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => {
    const val = values[key];
    if (val === null || val === undefined) return '';
    return String(val);
  });

  // 4. Clean up any double blank lines left by removed conditionals
  result = result.replace(/\n{3,}/g, '\n\n');

  return result.trim();
}
