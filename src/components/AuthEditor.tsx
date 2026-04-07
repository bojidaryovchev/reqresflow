import React from "react";
import AutoSuggestInput from "./AutoSuggestInput";
import { AuthConfig } from "../types/electron";

interface AuthEditorProps {
  auth: AuthConfig;
  envVariables: { key: string; value: string }[];
  envName?: string;
  onAuthChange: (auth: AuthConfig) => void;
}

const AuthEditor: React.FC<AuthEditorProps> = ({
  auth,
  envVariables,
  envName,
  onAuthChange,
}) => (
  <div className="auth-editor">
    <div className="auth-type-row">
      <label className="auth-label">Type</label>
      <select
        className="auth-type-select"
        value={auth.type}
        onChange={(e) => {
          const type = e.target.value as AuthConfig["type"];
          if (type === "none") {
            onAuthChange({ type: "none" });
          } else if (type === "bearer") {
            onAuthChange({ type: "bearer", token: "" });
          } else if (type === "basic") {
            onAuthChange({ type: "basic", username: "", password: "" });
          }
        }}
      >
        <option value="none">No Auth</option>
        <option value="bearer">Bearer Token</option>
        <option value="basic">Basic Auth</option>
      </select>
    </div>
    {auth.type === "bearer" && (
      <div className="auth-fields">
        <div className="auth-field">
          <label className="auth-label">Token</label>
          <AutoSuggestInput
            className="auth-input"
            type="text"
            placeholder="{{token}} or paste token"
            value={auth.token}
            onValueChange={(v) => onAuthChange({ type: "bearer", token: v })}
            variables={envVariables}
            envName={envName}
          />
        </div>
        <div className="auth-info">
          Will send as: Authorization: Bearer &lt;token&gt;
        </div>
      </div>
    )}
    {auth.type === "basic" && (
      <div className="auth-fields">
        <div className="auth-field">
          <label className="auth-label">Username</label>
          <AutoSuggestInput
            className="auth-input"
            type="text"
            placeholder="{{username}} or enter username"
            value={auth.username}
            onValueChange={(v) =>
              onAuthChange({
                type: "basic",
                username: v,
                password: auth.type === "basic" ? auth.password : "",
              })
            }
            variables={envVariables}
            envName={envName}
          />
        </div>
        <div className="auth-field">
          <label className="auth-label">Password</label>
          <AutoSuggestInput
            className="auth-input"
            type="text"
            placeholder="{{password}} or enter password"
            value={auth.password}
            onValueChange={(v) =>
              onAuthChange({
                type: "basic",
                username: auth.type === "basic" ? auth.username : "",
                password: v,
              })
            }
            variables={envVariables}
            envName={envName}
          />
        </div>
        <div className="auth-info">
          Will send as: Authorization: Basic base64(username:password)
        </div>
      </div>
    )}
    {auth.type === "none" && (
      <div className="auth-info" style={{ marginTop: 12 }}>
        No authentication will be applied to this request.
      </div>
    )}
  </div>
);

export default AuthEditor;
