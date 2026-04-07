import React, { useCallback, useMemo, useRef } from "react";
import CodeMirror, { type ReactCodeMirrorRef } from "@uiw/react-codemirror";
import { vscodeDark } from "@uiw/codemirror-theme-vscode";
import { autocompletion } from "@codemirror/autocomplete";
import type { Extension } from "@codemirror/state";
import type { RawLanguage } from "../types/electron";
import {
  formatCode,
  getLanguageExtension,
  baseTheme,
  envVarHighlightPlugin,
  envVarCompletion,
  envVarHoverTooltip,
} from "../utils/codemirror-extensions";

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language: RawLanguage | "graphql";
  placeholder?: string;
  readOnly?: boolean;
  className?: string;
  showFormatButton?: boolean;
  variables?: { key: string; value: string }[];
  envName?: string;
}

const CodeEditor: React.FC<CodeEditorProps> = ({
  value,
  onChange,
  language,
  placeholder,
  readOnly = false,
  className,
  showFormatButton = false,
  variables = [],
  envName,
}) => {
  const cmRef = useRef<ReactCodeMirrorRef>(null);

  const hasVars = variables.length > 0;

  const extensions = useMemo(() => {
    const exts: Extension[] = [baseTheme];
    const langExt = getLanguageExtension(language);
    if (!Array.isArray(langExt)) {
      exts.push(langExt);
    }
    if (hasVars) {
      exts.push(envVarHighlightPlugin);
      exts.push(
        autocompletion({
          override: [envVarCompletion(variables)],
          activateOnTyping: true,
        }),
      );
      exts.push(envVarHoverTooltip(variables, envName));
    }
    return exts;
  }, [language, hasVars, variables, envName]);

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
        ref={cmRef}
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
          autocompletion: hasVars,
          indentOnInput: true,
        }}
      />
    </div>
  );
};

export default CodeEditor;
