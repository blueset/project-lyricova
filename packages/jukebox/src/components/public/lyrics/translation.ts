/**
 * Selects a translation by language key.
 *
 * An empty string is the intentional key for an untagged `[tr]` attachment, so
 * only a nullish language means that no translation is selected.
 */
export function getSelectedTranslation(
  translations: Readonly<Record<string, string>>,
  language: string | null | undefined,
): string | undefined {
  if (language == null) return undefined;
  return translations[language];
}
