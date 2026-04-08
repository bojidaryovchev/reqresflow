import type { GeneratorConfig } from "../types/electron";

/**
 * Scan text for all {{$generatorName}} placeholders and return unique generator names.
 */
export function findGeneratorRefs(text: string): string[] {
  const regex = /\{\{\$(\w+)\}\}/g;
  const names = new Set<string>();
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    names.add(match[1]);
  }
  return Array.from(names);
}

/**
 * Collect all generator references from every substitutable field of a request.
 */
export function collectGeneratorNames(fields: string[]): string[] {
  const names = new Set<string>();
  for (const text of fields) {
    for (const name of findGeneratorRefs(text)) {
      names.add(name);
    }
  }
  return Array.from(names);
}

/**
 * Invoke all referenced generators and return them as virtual env vars
 * (key = "$generatorName", value = generated value).
 */
export async function resolveGenerators(
  fields: string[],
  config: GeneratorConfig | null,
): Promise<{ key: string; value: string }[]> {
  const names = collectGeneratorNames(fields);
  if (names.length === 0 || !config) return [];

  const results: { key: string; value: string }[] = [];
  for (const name of names) {
    try {
      const value = await window.electronAPI.generatorsInvoke(
        config.port,
        name,
      );
      results.push({ key: `$${name}`, value });
    } catch (err) {
      console.error(`Generator $${name} failed:`, err);
      // Leave unresolved — substituteVars will keep the {{$name}} placeholder
    }
  }
  return results;
}
