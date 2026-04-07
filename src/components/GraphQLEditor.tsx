import React from "react";
import CodeEditor from "./CodeEditor";

interface GraphQLEditorProps {
  query: string;
  variables: string;
  envVariables: { key: string; value: string }[];
  envName?: string;
  onQueryChange: (val: string) => void;
  onVariablesChange: (val: string) => void;
}

const GraphQLEditor: React.FC<GraphQLEditorProps> = ({
  query,
  variables,
  envVariables,
  envName,
  onQueryChange,
  onVariablesChange,
}) => {
  return (
    <div className="graphql-editor">
      <div className="graphql-section">
        <label className="graphql-label">Query</label>
        <CodeEditor
          value={query}
          onChange={onQueryChange}
          language="javascript"
          placeholder={"query {\n  users {\n    id\n    name\n  }\n}"}
          className="graphql-query"
          variables={envVariables}
          envName={envName}
        />
      </div>
      <div className="graphql-section">
        <label className="graphql-label">Variables (JSON)</label>
        <CodeEditor
          value={variables}
          onChange={onVariablesChange}
          language="json"
          placeholder='{"id": 1}'
          className="graphql-variables"
          showFormatButton
          variables={envVariables}
          envName={envName}
        />
      </div>
    </div>
  );
};

export default GraphQLEditor;
