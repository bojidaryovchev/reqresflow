import { useCallback, useRef, useState } from "react";
import {
  Collection,
  Environment,
  Flow,
  FlowRunState,
  FlowRunStepResult,
  HistoryEntry,
  SavedRequest,
} from "../types/electron";
import { generateId } from "../utils/helpers";
import { executeRequest } from "../utils/request";

interface UseFlowExecutionDeps {
  collections: Collection[];
  activeEnv: Environment | null;
  activeEnvId: string | null;
  environments: Environment[];
  setEnvironments: React.Dispatch<React.SetStateAction<Environment[]>>;
  setHistory: React.Dispatch<React.SetStateAction<HistoryEntry[]>>;
  openFlowTab: (flow: Flow, mode?: "editor" | "runner") => void;
}

export function useFlowExecution({
  collections,
  activeEnv,
  activeEnvId,
  environments,
  setEnvironments,
  setHistory,
  openFlowTab,
}: UseFlowExecutionDeps) {
  const [flowRunState, setFlowRunState] = useState<FlowRunState | null>(null);
  const [flowRunHistory, setFlowRunHistory] = useState<
    Record<string, FlowRunState>
  >({});
  const flowAbortRef = useRef(false);

  const findRequest = useCallback(
    (collectionId: string, requestId: string): SavedRequest | null => {
      const col = collections.find((c) => c.id === collectionId);
      if (!col) return null;
      return col.requests.find((r) => r.id === requestId) || null;
    },
    [collections],
  );

  const runFlow = useCallback(
    async (flow: Flow) => {
      flowAbortRef.current = false;
      openFlowTab(flow, "runner");

      const runState: FlowRunState = {
        flowId: flow.id,
        status: "running",
        currentStepIndex: 0,
        stepResults: [],
        startedAt: Date.now(),
        completedAt: null,
        totalTime: 0,
      };
      setFlowRunState(runState);

      let currentVars = activeEnv
        ? activeEnv.variables.map((v) => ({ ...v }))
        : [];

      const stepResults: FlowRunStepResult[] = [];
      let aborted = false;

      for (let i = 0; i < flow.steps.length; i++) {
        if (flowAbortRef.current) {
          aborted = true;
          for (let j = i; j < flow.steps.length; j++) {
            const skipStep = flow.steps[j];
            const skipReq = findRequest(
              skipStep.collectionId,
              skipStep.requestId,
            );
            stepResults.push({
              stepId: skipStep.id,
              stepIndex: j,
              requestName: skipReq?.name || "Unknown",
              requestMethod: skipReq?.method || "GET",
              status: "skipped",
              execution: null,
              durationMs: 0,
            });
          }
          break;
        }

        const step = flow.steps[i];
        const req = findRequest(step.collectionId, step.requestId);

        setFlowRunState((prev) =>
          prev ? { ...prev, currentStepIndex: i } : prev,
        );

        if (!req) {
          stepResults.push({
            stepId: step.id,
            stepIndex: i,
            requestName: "Missing request",
            requestMethod: "GET",
            status: "error",
            execution: {
              resolvedUrl: "",
              resolvedMethod: "GET",
              resolvedHeaders: {},
              resolvedBody: undefined,
              response: null,
              error: "Request not found in collection (may have been deleted)",
              capturedValues: [],
            },
            durationMs: 0,
          });
          if (!step.continueOnError) {
            for (let j = i + 1; j < flow.steps.length; j++) {
              const skipStep = flow.steps[j];
              const skipReq = findRequest(
                skipStep.collectionId,
                skipStep.requestId,
              );
              stepResults.push({
                stepId: skipStep.id,
                stepIndex: j,
                requestName: skipReq?.name || "Unknown",
                requestMethod: skipReq?.method || "GET",
                status: "skipped",
                execution: null,
                durationMs: 0,
              });
            }
            break;
          }
          continue;
        }

        const mergedReq: SavedRequest = {
          ...req,
          captures: [...(req.captures || []), ...step.captures],
        };

        const start = performance.now();
        const { detail, updatedVars } = await executeRequest(
          mergedReq,
          currentVars,
        );
        const durationMs = Math.round(performance.now() - start);

        currentVars = updatedVars;

        const isError = detail.error !== null;
        const result: FlowRunStepResult = {
          stepId: step.id,
          stepIndex: i,
          requestName: req.name,
          requestMethod: req.method,
          status: isError ? "error" : "success",
          execution: detail,
          durationMs,
        };
        stepResults.push(result);

        if (!isError && detail.response) {
          const historyEntry: HistoryEntry = {
            id: generateId(),
            timestamp: Date.now(),
            method: req.method,
            url: req.url,
            status: detail.response.status,
            statusText: detail.response.statusText,
            time: detail.response.time,
            request: mergedReq,
            flowName: flow.name,
          };
          setHistory((prev) => {
            const updated = [historyEntry, ...prev].slice(0, 100);
            window.electronAPI.saveHistory(updated);
            return updated;
          });
        }

        setFlowRunState((prev) =>
          prev
            ? {
                ...prev,
                stepResults: [...stepResults],
                totalTime: Math.round(Date.now() - runState.startedAt),
              }
            : prev,
        );

        if (isError && !step.continueOnError) {
          for (let j = i + 1; j < flow.steps.length; j++) {
            const skipStep = flow.steps[j];
            const skipReq = findRequest(
              skipStep.collectionId,
              skipStep.requestId,
            );
            stepResults.push({
              stepId: skipStep.id,
              stepIndex: j,
              requestName: skipReq?.name || "Unknown",
              requestMethod: skipReq?.method || "GET",
              status: "skipped",
              execution: null,
              durationMs: 0,
            });
          }
          break;
        }
      }

      if (activeEnvId && currentVars.length > 0) {
        const updatedEnvs = environments.map((env) =>
          env.id === activeEnvId ? { ...env, variables: currentVars } : env,
        );
        setEnvironments(updatedEnvs);
        window.electronAPI.saveEnvironments(updatedEnvs);
      }

      const completedAt = Date.now();
      const finalState: FlowRunState = {
        flowId: flow.id,
        status: aborted ? "aborted" : "completed",
        currentStepIndex: -1,
        stepResults,
        startedAt: runState.startedAt,
        completedAt,
        totalTime: Math.round(completedAt - runState.startedAt),
      };
      setFlowRunState(finalState);
      setFlowRunHistory((prev) => ({ ...prev, [flow.id]: finalState }));
    },
    [
      activeEnv,
      activeEnvId,
      environments,
      findRequest,
      openFlowTab,
      setEnvironments,
      setHistory,
    ],
  );

  return {
    flowRunState,
    setFlowRunState,
    flowRunHistory,
    flowAbortRef,
    findRequest,
    runFlow,
  };
}
