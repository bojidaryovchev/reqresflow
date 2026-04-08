import { useState, useCallback, useRef, useEffect } from "react";
import type { GeneratorConfig, GeneratorInfo } from "../types/electron";

interface UseGeneratorsReturn {
  generatorConfig: GeneratorConfig | null;
  setGeneratorConfig: React.Dispatch<
    React.SetStateAction<GeneratorConfig | null>
  >;
  generators: GeneratorInfo[];
  containerStatus: "stopped" | "starting" | "running" | "error";
  statusError: string | null;
  containerLogs: string;
  pickProjectDir: () => Promise<void>;
  buildImage: () => Promise<{ success: boolean; error?: string }>;
  startContainer: () => Promise<{ success: boolean; error?: string }>;
  rebuildContainer: () => Promise<void>;
  stopContainer: () => Promise<void>;
  removeConfig: () => Promise<void>;
  refreshGenerators: () => Promise<void>;
  fetchLogs: () => Promise<void>;
}

export function useGenerators(): UseGeneratorsReturn {
  const [generatorConfig, setGeneratorConfig] =
    useState<GeneratorConfig | null>(null);
  const [generators, setGenerators] = useState<GeneratorInfo[]>([]);
  const [containerStatus, setContainerStatus] = useState<
    "stopped" | "starting" | "running" | "error"
  >("stopped");
  const [statusError, setStatusError] = useState<string | null>(null);
  const [containerLogs, setContainerLogs] = useState<string>("");
  const healthIntervalRef = useRef<ReturnType<typeof setInterval>>(undefined);

  // Poll health when we have a config
  const startHealthPolling = useCallback((port: number) => {
    if (healthIntervalRef.current) clearInterval(healthIntervalRef.current);
    healthIntervalRef.current = setInterval(async () => {
      const healthy = await window.electronAPI.generatorsHealth(port);
      setContainerStatus((prev) => {
        if (healthy && prev !== "running") return "running";
        if (!healthy && prev === "running") return "stopped";
        return prev;
      });
    }, 5000);
  }, []);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (healthIntervalRef.current) clearInterval(healthIntervalRef.current);
    };
  }, []);

  // When config changes, check health + poll
  useEffect(() => {
    if (!generatorConfig) {
      setContainerStatus("stopped");
      setGenerators([]);
      if (healthIntervalRef.current) clearInterval(healthIntervalRef.current);
      return;
    }
    // Initial health check
    window.electronAPI
      .generatorsHealth(generatorConfig.port)
      .then((healthy) => {
        setContainerStatus(healthy ? "running" : "stopped");
        if (healthy) {
          window.electronAPI
            .generatorsList(generatorConfig.port)
            .then(setGenerators);
        }
      });
    startHealthPolling(generatorConfig.port);
  }, [generatorConfig?.port]);

  const pickProjectDir = useCallback(async () => {
    const dir = await window.electronAPI.selectDirectory();
    if (!dir) return;
    const newConfig: GeneratorConfig = {
      projectDir: dir,
      containerName: "reqresflow-generators",
      port: 7890,
    };
    setGeneratorConfig(newConfig);
    await window.electronAPI.saveGeneratorConfig(newConfig);
  }, []);

  const buildImage = useCallback(async () => {
    if (!generatorConfig)
      return { success: false, error: "No config", logs: "" };
    setContainerStatus("starting");
    setStatusError(null);
    setContainerLogs("Building image...\n");
    const result = await window.electronAPI.generatorsBuild(
      generatorConfig.projectDir,
    );
    setContainerLogs(result.logs || "");
    if (!result.success) {
      setContainerStatus("error");
      setStatusError(result.error || "Build failed");
    }
    return result;
  }, [generatorConfig]);

  const startContainer = useCallback(async () => {
    if (!generatorConfig)
      return { success: false, error: "No config", logs: "" };
    setContainerStatus("starting");
    setStatusError(null);
    const result = await window.electronAPI.generatorsStart(generatorConfig);
    if (result.logs) {
      setContainerLogs(
        (prev) => prev + "\nStarting container...\n" + result.logs,
      );
    }
    if (result.success) {
      // Wait a moment for the container to start responding
      await new Promise((r) => setTimeout(r, 2000));
      const healthy = await window.electronAPI.generatorsHealth(
        generatorConfig.port,
      );
      if (healthy) {
        setContainerStatus("running");
        const list = await window.electronAPI.generatorsList(
          generatorConfig.port,
        );
        setGenerators(list);
      } else {
        setContainerStatus("error");
        setStatusError("Container started but not responding");
      }
    } else {
      setContainerStatus("error");
      setStatusError(result.error || "Start failed");
    }
    return result;
  }, [generatorConfig]);

  const stopContainer = useCallback(async () => {
    if (!generatorConfig) return;
    await window.electronAPI.generatorsStop(generatorConfig.containerName);
    setContainerStatus("stopped");
    setGenerators([]);
  }, [generatorConfig]);

  const removeConfig = useCallback(async () => {
    if (generatorConfig) {
      try {
        await window.electronAPI.generatorsStop(generatorConfig.containerName);
      } catch {
        // Ignore
      }
    }
    await window.electronAPI.removeGeneratorConfig();
    setGeneratorConfig(null);
    setGenerators([]);
    setContainerStatus("stopped");
    setStatusError(null);
  }, [generatorConfig]);

  const refreshGenerators = useCallback(async () => {
    if (!generatorConfig) return;
    const healthy = await window.electronAPI.generatorsHealth(
      generatorConfig.port,
    );
    if (healthy) {
      setContainerStatus("running");
      const list = await window.electronAPI.generatorsList(
        generatorConfig.port,
      );
      setGenerators(list);
    } else {
      setContainerStatus("stopped");
      setGenerators([]);
    }
  }, [generatorConfig]);

  const rebuildContainer = useCallback(async () => {
    if (!generatorConfig) return;
    // Stop existing container
    try {
      await window.electronAPI.generatorsStop(generatorConfig.containerName);
    } catch {
      // Ignore
    }
    setContainerStatus("starting");
    setStatusError(null);
    setContainerLogs("Rebuilding image...\n");
    // Build
    const buildResult = await window.electronAPI.generatorsBuild(
      generatorConfig.projectDir,
    );
    setContainerLogs(buildResult.logs || "");
    if (!buildResult.success) {
      setContainerStatus("error");
      setStatusError(buildResult.error || "Build failed");
      return;
    }
    // Start
    setContainerLogs((prev) => prev + "\nStarting container...\n");
    const startResult =
      await window.electronAPI.generatorsStart(generatorConfig);
    if (startResult.logs) {
      setContainerLogs((prev) => prev + startResult.logs + "\n");
    }
    if (!startResult.success) {
      setContainerStatus("error");
      setStatusError(startResult.error || "Start failed");
      return;
    }
    await new Promise((r) => setTimeout(r, 2000));
    const healthy = await window.electronAPI.generatorsHealth(
      generatorConfig.port,
    );
    if (healthy) {
      setContainerStatus("running");
      const list = await window.electronAPI.generatorsList(
        generatorConfig.port,
      );
      setGenerators(list);
    } else {
      setContainerStatus("error");
      setStatusError("Container started but not responding");
    }
  }, [generatorConfig]);

  const fetchLogs = useCallback(async () => {
    if (!generatorConfig) return;
    try {
      const logs = await window.electronAPI.generatorsLogs(
        generatorConfig.containerName,
      );
      setContainerLogs(logs);
    } catch (err) {
      setContainerLogs(`Error fetching logs: ${err}`);
    }
  }, [generatorConfig]);

  return {
    generatorConfig,
    setGeneratorConfig,
    generators,
    containerStatus,
    statusError,
    containerLogs,
    pickProjectDir,
    buildImage,
    startContainer,
    rebuildContainer,
    stopContainer,
    removeConfig,
    refreshGenerators,
    fetchLogs,
  };
}
