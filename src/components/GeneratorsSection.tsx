import React, { useState, useRef, useEffect } from "react";
import type { GeneratorConfig, GeneratorInfo } from "../types/electron";

interface GeneratorsSectionProps {
  generatorConfig: GeneratorConfig | null;
  generators: GeneratorInfo[];
  containerStatus: "stopped" | "starting" | "running" | "error";
  statusError: string | null;
  containerLogs: string;
  onPickProjectDir: () => void;
  onBuild: () => Promise<{ success: boolean; error?: string }>;
  onStart: () => Promise<{ success: boolean; error?: string }>;
  onRebuild: () => Promise<void>;
  onStop: () => void;
  onRemove: () => void;
  onRefresh: () => void;
  onFetchLogs: () => Promise<void>;
}

const GeneratorsSection: React.FC<GeneratorsSectionProps> = ({
  generatorConfig,
  generators,
  containerStatus,
  statusError,
  containerLogs,
  onPickProjectDir,
  onBuild,
  onStart,
  onRebuild,
  onStop,
  onRemove,
  onRefresh,
  onFetchLogs,
}) => {
  const [building, setBuilding] = useState(false);
  const [rebuilding, setRebuilding] = useState(false);
  const [buildError, setBuildError] = useState<string | null>(null);
  const [showLogs, setShowLogs] = useState(false);
  const logsEndRef = useRef<HTMLDivElement>(null);

  const handleBuildAndStart = async () => {
    setBuilding(true);
    setBuildError(null);
    const buildResult = await onBuild();
    if (!buildResult.success) {
      setBuildError(buildResult.error || "Build failed");
      setBuilding(false);
      return;
    }
    const startResult = await onStart();
    if (!startResult.success) {
      setBuildError(startResult.error || "Start failed");
    }
    setBuilding(false);
  };

  const handleRebuild = async () => {
    setRebuilding(true);
    setBuildError(null);
    await onRebuild();
    setRebuilding(false);
  };

  const handleToggleLogs = () => {
    const willShow = !showLogs;
    setShowLogs(willShow);
    if (willShow) {
      onFetchLogs().catch(() => {
        /* ignored */
      });
    }
  };

  const handleRefreshLogs = () => {
    onFetchLogs().catch(() => {
      /* ignored */
    });
  };

  // Auto-scroll logs to bottom
  useEffect(() => {
    if (showLogs && logsEndRef.current) {
      logsEndRef.current.scrollTop = logsEndRef.current.scrollHeight;
    }
  }, [containerLogs, showLogs]);

  const statusIndicator = () => {
    switch (containerStatus) {
      case "running":
        return <span className="gen-status-dot running" title="Running" />;
      case "starting":
        return <span className="gen-status-dot starting" title="Starting..." />;
      case "error":
        return <span className="gen-status-dot error" title="Error" />;
      default:
        return <span className="gen-status-dot stopped" title="Stopped" />;
    }
  };

  if (!generatorConfig) {
    return (
      <div className="generators-section">
        <div className="generators-empty">
          <p className="generators-empty-text">
            Connect a Docker-based generator project to produce dynamic values
            like <code>{"{{$randomEmail}}"}</code> in your requests.
          </p>
          <button className="generators-setup-btn" onClick={onPickProjectDir}>
            Select Generator Project
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="generators-section">
      <div className="generators-config">
        <div className="generators-config-row">
          <span className="generators-config-label">Project</span>
          <span
            className="generators-config-value"
            title={generatorConfig.projectDir}
          >
            {generatorConfig.projectDir.split(/[\\/]/).pop()}
          </span>
        </div>
        <div className="generators-config-row">
          <span className="generators-config-label">Status</span>
          <span className="generators-config-value">
            {statusIndicator()} {containerStatus}
          </span>
        </div>
        {statusError && <div className="generators-error">{statusError}</div>}
        {buildError && <div className="generators-error">{buildError}</div>}
      </div>

      <div className="generators-actions">
        {containerStatus === "stopped" || containerStatus === "error" ? (
          <button
            className="generators-action-btn"
            onClick={handleBuildAndStart}
            disabled={building}
          >
            {building ? "Building..." : "Build & Start"}
          </button>
        ) : containerStatus === "running" ? (
          <>
            <button className="generators-action-btn" onClick={onStop}>
              Stop
            </button>
            <button
              className="generators-action-btn"
              onClick={handleRebuild}
              disabled={rebuilding}
            >
              {rebuilding ? "Rebuilding..." : "Rebuild"}
            </button>
            <button className="generators-action-btn" onClick={onRefresh}>
              Refresh
            </button>
          </>
        ) : null}
        <button
          className="generators-action-btn danger"
          onClick={onRemove}
          title="Remove generator config"
        >
          Remove
        </button>
      </div>

      {generators.length > 0 && (
        <div className="generators-list">
          <div className="generators-list-header">
            Available Generators ({generators.length})
          </div>
          {generators.map((gen) => (
            <div key={gen.name} className="generator-item">
              <span className="generator-name">${gen.name}</span>
              {gen.description && (
                <span className="generator-desc">{gen.description}</span>
              )}
            </div>
          ))}
        </div>
      )}

      {containerStatus === "running" && generators.length === 0 && (
        <div className="generators-empty-list">
          No generators found. Add generator functions to the{" "}
          <code>generators/</code> folder in your project.
        </div>
      )}

      {generatorConfig && (
        <div className="generators-logs-section">
          <button className="generators-logs-toggle" onClick={handleToggleLogs}>
            <span
              className={`generators-logs-chevron ${showLogs ? "open" : ""}`}
            >
              ▶
            </span>
            Container Logs
          </button>
          {showLogs && (
            <>
              <div className="generators-logs-actions">
                <button
                  className="generators-action-btn"
                  onClick={handleRefreshLogs}
                >
                  Refresh Logs
                </button>
              </div>
              <div className="generators-logs" ref={logsEndRef}>
                {containerLogs ? (
                  <pre className="generators-logs-content">{containerLogs}</pre>
                ) : (
                  <span className="generators-logs-empty">
                    No logs available
                  </span>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default GeneratorsSection;
