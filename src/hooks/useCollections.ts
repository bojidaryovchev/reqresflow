import { useCallback, useState } from "react";
import { Collection } from "../types/electron";

export function useCollections() {
  const [collections, setCollections] = useState<Collection[]>([]);

  const handleCollectionsChange = useCallback((updated: Collection[]) => {
    setCollections(updated);
    window.electronAPI.saveCollections(updated);
  }, []);

  return {
    collections,
    setCollections,
    handleCollectionsChange,
  };
}
