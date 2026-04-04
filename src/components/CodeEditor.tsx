import React, { useCallback, useMemo } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { vscodeDark } from "@uiw/codemirror-theme-vscode";
import { json } from "@codemirror/lang-json";
import { xml } from "@codemirror/lang-xml";
import { html } from "@codemirror/lang-html";
import { javascript } from "@codemirror/lang-javascript";
import { EditorView } from "@codemirror/view";
import type { Extension } from "@codemirror/state";
import type { RawLanguage } from "../types/electron";

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language: RawLanguage | "graphql";
  placeholder?: string;
  readOnly?: boolean;
  className?: string;
  showFormatButton?: boolean;
}

async function formatCode(
  code: string,
  language: RawLanguage | "graphql",
): Promise<string> {
  if (!code.trim()) return code;

  // JSON: use built-in JSON.parse for speed
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

  // For graphql variables, try JSON first
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

function getLanguageExtension(language: RawLanguage | "graphql"): Extension {
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
      return javascript(); // graphql variables are JSON
    default:
      return [];
  }
}

const baseTheme = EditorView.theme({
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
});

const CodeEditor: React.FC<CodeEditorProps> = ({
  value,
  onChange,
  language,
  placeholder,
  readOnly = false,
  className,
  showFormatButton = false,
}) => {
  const extensions = useMemo(
    () => [
      baseTheme,
      ...(Array.isArray(getLanguageExtension(language))
        ? []
        : [getLanguageExtension(language)]),
    ],
    [language],
  );

  const handleFormat = useCallback(async () => {
    const formatted = await formatCode(value, language);
    if (formatted !== value) {
      onChange(formatted);
    }
  }, [value, language, onChange]);

  return (
    <div className={`code-editor-wrapper ${className || ""}`}>
      {showFormatButton && !readOnly && language !== "text" && (
        <button
          className="format-btn"
          onClick={handleFormat}
          title="Format document (Prettier)"
        >
          Format
        </button>
      )}
      <CodeMirror
        value={value}
        onChange={readOnly ? undefined : onChange}
        theme={vscodeDark}
        extensions={extensions}
        placeholder={placeholder}
        readOnly={readOnly}
        editable={!readOnly}
        basicSetup={{
          lineNumbers: true,
          foldGutter: true,
          highlightActiveLine: !readOnly,
          bracketMatching: true,
          closeBrackets: true,
          autocompletion: false,
          indentOnInput: true,
        }}
      />
    </div>
  );
};

export default CodeEditor;
