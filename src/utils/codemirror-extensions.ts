import { json } from "@codemirror/lang-json";
import { xml } from "@codemirror/lang-xml";
import { html } from "@codemirror/lang-html";
import { javascript } from "@codemirror/lang-javascript";
import {
  EditorView,
  Decoration,
  ViewPlugin,
  hoverTooltip,
  type DecorationSet,
  type ViewUpdate,
  type Tooltip,
} from "@codemirror/view";
import { type CompletionContext } from "@codemirror/autocomplete";
import { RangeSetBuilder } from "@codemirror/state";
import type { Extension } from "@codemirror/state";
import type { RawLanguage } from "../types/electron";

export async function formatCode(
  code: string,
  language: RawLanguage | "graphql",
): Promise<string> {
  if (!code.trim()) return code;

  if (language === "json" || language === "graphql") {
    if (language === "json") {
      try {
        return JSON.stringify(JSON.parse(code), null, 2);
      } catch {
        // fall through to prettier
      }
    }
  }

  const prettier = await import("prettier/standalone");
  const babelPlugin = await import("prettier/plugins/babel");
  const estreePlugin = await import("prettier/plugins/estree");
  const htmlPlugin = await import("prettier/plugins/html");

  const parserMap: Record<string, { parser: string; plugins: unknown[] }> = {
    json: {
      parser: "json",
      plugins: [babelPlugin, estreePlugin],
    },
    javascript: {
      parser: "babel",
      plugins: [babelPlugin, estreePlugin],
    },
    html: {
      parser: "html",
      plugins: [htmlPlugin],
    },
    xml: {
      parser: "html",
      plugins: [htmlPlugin],
    },
    graphql: {
      parser: "babel",
      plugins: [babelPlugin, estreePlugin],
    },
  };

  const config = parserMap[language];
  if (!config) return code;

  if (language === "graphql") {
    try {
      return JSON.stringify(JSON.parse(code), null, 2);
    } catch {
      return code;
    }
  }

  try {
    return await prettier.format(code, {
      parser: config.parser,
      plugins: config.plugins as never[],
      tabWidth: 2,
      printWidth: 80,
    });
  } catch {
    return code;
  }
}

export function getLanguageExtension(
  language: RawLanguage | "graphql",
): Extension {
  switch (language) {
    case "json":
      return json();
    case "xml":
      return xml();
    case "html":
      return html();
    case "javascript":
      return javascript();
    case "graphql":
      return javascript();
    default:
      return [];
  }
}

export const baseTheme = EditorView.theme({
  "&": {
    fontSize: "12px",
    height: "100%",
  },
  ".cm-scroller": {
    fontFamily: "'Cascadia Code', 'Fira Code', 'Consolas', monospace",
    lineHeight: "1.5",
  },
  ".cm-content": {
    padding: "8px 0",
  },
  ".cm-gutters": {
    background: "#1e1e1e",
    borderRight: "1px solid #3e3e3e",
    color: "#858585",
  },
  "&.cm-focused": {
    outline: "none",
  },
  ".cm-env-var": {
    color: "#e5c07b",
    backgroundColor: "rgba(229, 192, 123, 0.12)",
    borderRadius: "3px",
    padding: "0 1px",
  },
  ".cm-tooltip-autocomplete": {
    background: "#252526 !important",
    border: "1px solid #3e3e3e !important",
  },
  ".cm-tooltip-autocomplete ul li[aria-selected]": {
    background: "#094771 !important",
  },
  ".cm-tooltip-autocomplete .cm-completionLabel": {
    color: "#e5c07b !important",
  },
  ".cm-tooltip-autocomplete .cm-completionDetail": {
    color: "#999999 !important",
    fontStyle: "normal !important",
    marginLeft: "8px",
  },
});

const envVarMark = Decoration.mark({ class: "cm-env-var" });

function buildEnvVarDecorations(view: EditorView): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();
  const regex = /\{\{\w+\}\}/g;
  for (const { from, to } of view.visibleRanges) {
    const text = view.state.doc.sliceString(from, to);
    let match: RegExpExecArray | null;
    while ((match = regex.exec(text)) !== null) {
      builder.add(
        from + match.index,
        from + match.index + match[0].length,
        envVarMark,
      );
    }
  }
  return builder.finish();
}

export const envVarHighlightPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    constructor(view: EditorView) {
      this.decorations = buildEnvVarDecorations(view);
    }
    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged) {
        this.decorations = buildEnvVarDecorations(update.view);
      }
    }
  },
  { decorations: (v) => v.decorations },
);

export function envVarCompletion(
  variables: { key: string; value: string }[],
) {
  return (context: CompletionContext) => {
    const before = context.matchBefore(/\{\{\w*/);
    if (!before) return null;
    return {
      from: before.from + 2,
      options: variables
        .filter((v) => v.key)
        .map((v) => ({
          label: v.key,
          detail: v.value,
          apply: `${v.key}}}`,
        })),
    };
  };
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function envVarHoverTooltip(
  variables: { key: string; value: string }[],
  envName?: string,
) {
  return hoverTooltip((view: EditorView, pos: number): Tooltip | null => {
    const line = view.state.doc.lineAt(pos);
    const lineText = line.text;
    const regex = /\{\{(\w+)\}\}/g;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(lineText)) !== null) {
      const from = line.from + match.index;
      const to = from + match[0].length;
      if (pos >= from && pos <= to) {
        const varName = match[1];
        const resolved = variables.find((v) => v.key === varName);
        return {
          pos: from,
          end: to,
          above: true,
          create: () => {
            const dom = document.createElement("div");
            dom.className = "cm-env-var-tooltip";

            const rowVar = document.createElement("div");
            rowVar.className = "cm-env-var-tooltip-row";
            rowVar.innerHTML = `<span class="cm-env-var-tooltip-label">Variable</span><span class="cm-env-var-tooltip-val">${escapeHtml(varName)}</span>`;
            dom.appendChild(rowVar);

            const rowVal = document.createElement("div");
            rowVal.className = "cm-env-var-tooltip-row";
            rowVal.innerHTML = `<span class="cm-env-var-tooltip-label">Value</span><span class="cm-env-var-tooltip-val">${resolved?.value ? escapeHtml(resolved.value) : '<span class="cm-env-var-tooltip-empty">empty</span>'}</span>`;
            dom.appendChild(rowVal);

            if (envName) {
              const rowEnv = document.createElement("div");
              rowEnv.className = "cm-env-var-tooltip-row";
              rowEnv.innerHTML = `<span class="cm-env-var-tooltip-label">Environment</span><span class="cm-env-var-tooltip-val">${escapeHtml(envName)}</span>`;
              dom.appendChild(rowEnv);
            }

            if (!resolved) {
              const warning = document.createElement("div");
              warning.className = "cm-env-var-tooltip-warning";
              warning.textContent =
                "Variable not defined in current environment";
              dom.appendChild(warning);
            }

            return { dom };
          },
        };
      }
    }
    return null;
  });
}
