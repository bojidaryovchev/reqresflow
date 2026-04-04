import React, { useState } from 'react';
import { Collection, SavedRequest } from '../types/electron';

interface SidebarProps {
  collections: Collection[];
  onCollectionsChange: (collections: Collection[]) => void;
  onLoadRequest: (request: SavedRequest) => void;
  onSaveRequest: () => SavedRequest;
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

const METHOD_COLORS: Record<string, string> = {
  GET: 'var(--method-get)',
  POST: 'var(--method-post)',
  PUT: 'var(--method-put)',
  PATCH: 'var(--method-patch)',
  DELETE: 'var(--method-delete)',
};

const Sidebar: React.FC<SidebarProps> = ({ collections, onCollectionsChange, onLoadRequest, onSaveRequest }) => {
  const [expandedCollections, setExpandedCollections] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const toggleExpanded = (id: string) => {
    setExpandedCollections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const addCollection = () => {
    const newCollection: Collection = {
      id: generateId(),
      name: 'New Collection',
      requests: [],
    };
    const updated = [...collections, newCollection];
    onCollectionsChange(updated);
    setExpandedCollections((prev) => new Set(prev).add(newCollection.id));
    setEditingId(newCollection.id);
    setEditingName('New Collection');
  };

  const saveToCollection = (collectionId: string) => {
    const request = onSaveRequest();
    const updated = collections.map((c) => {
      if (c.id !== collectionId) return c;
      return { ...c, requests: [...c.requests, { ...request, id: generateId() }] };
    });
    onCollectionsChange(updated);
  };

  const deleteRequest = (collectionId: string, requestId: string) => {
    const updated = collections.map((c) => {
      if (c.id !== collectionId) return c;
      return { ...c, requests: c.requests.filter((r) => r.id !== requestId) };
    });
    onCollectionsChange(updated);
  };

  const deleteCollection = (collectionId: string) => {
    onCollectionsChange(collections.filter((c) => c.id !== collectionId));
  };

  const startRename = (id: string, currentName: string) => {
    setEditingId(id);
    setEditingName(currentName);
  };

  const commitRename = () => {
    if (!editingId || !editingName.trim()) {
      setEditingId(null);
      return;
    }
    // Check if it's a collection or a request
    const updated = collections.map((c) => {
      if (c.id === editingId) return { ...c, name: editingName.trim() };
      return {
        ...c,
        requests: c.requests.map((r) =>
          r.id === editingId ? { ...r, name: editingName.trim() } : r
        ),
      };
    });
    onCollectionsChange(updated);
    setEditingId(null);
  };

  const handleRenameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') commitRename();
    if (e.key === 'Escape') setEditingId(null);
  };

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h1>Collections</h1>
        <button className="sidebar-add-btn" onClick={addCollection} title="New Collection">+</button>
      </div>
      <div className="sidebar-content">
        {collections.length === 0 && (
          <div className="sidebar-empty">
            No collections yet.<br />Click + to create one.
          </div>
        )}
        {collections.map((collection) => (
          <div className="collection" key={collection.id}>
            <div
              className="collection-header"
              onClick={() => toggleExpanded(collection.id)}
            >
              <span className="collection-arrow">
                {expandedCollections.has(collection.id) ? '▼' : '▶'}
              </span>
              {editingId === collection.id ? (
                <input
                  className="rename-input"
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onBlur={commitRename}
                  onKeyDown={handleRenameKeyDown}
                  autoFocus
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <span className="collection-name">{collection.name}</span>
              )}
              <div className="collection-actions" onClick={(e) => e.stopPropagation()}>
                <button
                  className="sidebar-icon-btn"
                  onClick={() => saveToCollection(collection.id)}
                  title="Save current request here"
                >
                  +
                </button>
                <button
                  className="sidebar-icon-btn"
                  onClick={() => startRename(collection.id, collection.name)}
                  title="Rename"
                >
                  ✎
                </button>
                <button
                  className="sidebar-icon-btn danger"
                  onClick={() => deleteCollection(collection.id)}
                  title="Delete collection"
                >
                  ×
                </button>
              </div>
            </div>
            {expandedCollections.has(collection.id) && (
              <div className="collection-requests">
                {collection.requests.length === 0 && (
                  <div className="sidebar-empty" style={{ padding: '8px 16px' }}>
                    Empty collection
                  </div>
                )}
                {collection.requests.map((req) => (
                  <div
                    className="request-item"
                    key={req.id}
                    onClick={() => onLoadRequest(req)}
                  >
                    <span
                      className="request-method-badge"
                      style={{ color: METHOD_COLORS[req.method] || 'var(--text-secondary)' }}
                    >
                      {req.method}
                    </span>
                    {editingId === req.id ? (
                      <input
                        className="rename-input"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onBlur={commitRename}
                        onKeyDown={handleRenameKeyDown}
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <span className="request-name">{req.name}</span>
                    )}
                    <div className="collection-actions" onClick={(e) => e.stopPropagation()}>
                      <button
                        className="sidebar-icon-btn"
                        onClick={() => startRename(req.id, req.name)}
                        title="Rename"
                      >
                        ✎
                      </button>
                      <button
                        className="sidebar-icon-btn danger"
                        onClick={() => deleteRequest(collection.id, req.id)}
                        title="Delete request"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Sidebar;
