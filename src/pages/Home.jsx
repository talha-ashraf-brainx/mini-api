import { useCallback, useMemo, useState } from 'react';
import { AppShell } from '../components/layout';
import { useCollection } from '../context/CollectionContext/CollectionContext';
import { useEnvironment } from '../context/EnvironmentContext/EnvironmentContext';
import {
  createCollection,
  renameCollection,
  deleteCollection,
  addRequestToCollection,
  renameRequest,
  deleteRequest,
  duplicateRequest,
  syncRequestEditor,
  setCollectionAuth,
  setCollectionEnvironment,
  clearEnvironmentReferences,
  findRequestInCollections,
  getFirstRequestId,
  collectionReducer,
} from '../context/CollectionContext/collectionReducer';
import {
  createEnvironment,
  renameEnvironment,
  deleteEnvironment,
  updateEnvironmentVariables,
  environmentReducer,
} from '../context/EnvironmentContext/environmentReducer';
import {
  cloneKeyValueRows,
  createEmptyKeyValue,
} from '../data/mockData';
import { canSendRequest } from '../lib/http/canSendRequest';
import {
  bodyRequiresJsonValidation,
  getJsonValidationError,
} from '../utils/jsonValidation';
import { variablesArrayToMap } from '../utils/envParser';
import { DEFAULT_REQUEST_AUTH, normalizeAuth } from '../utils/auth';
import { executeRequest } from '../utils/requestExecutor';
import {
  getResponseForRequest,
  setResponseForRequest,
  removeResponseForRequest,
  removeResponsesForRequestIds,
} from '../utils/responseCache';

const emptyEditorState = {
  method: 'GET',
  url: '',
  headers: [createEmptyKeyValue()],
  params: [createEmptyKeyValue()],
  body: '',
  auth: { ...DEFAULT_REQUEST_AUTH },
};

function loadRequestIntoEditor(ref) {
  if (!ref) return { ...emptyEditorState };
  return {
    method: ref.method,
    url: ref.url,
    headers: cloneKeyValueRows(ref.headers),
    params: cloneKeyValueRows(ref.params),
    body: ref.body ?? '',
    auth: normalizeAuth(ref.auth, 'request'),
  };
}

function countCollectionsUsingEnvironment(collections, environmentId) {
  return collections.filter((col) => col.environmentId === environmentId)
    .length;
}

export default function Home() {
  const { collections, dispatch: collectionDispatch } = useCollection();
  const { environments, dispatch: environmentDispatch } = useEnvironment();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarTab, setSidebarTab] = useState('collections');
  const [expandedIds, setExpandedIds] = useState({});
  const [activeCollectionId, setActiveCollectionId] = useState(null);
  const [activeRequestId, setActiveRequestId] = useState(null);
  const [selectedEnvironmentId, setSelectedEnvironmentId] = useState(null);

  const [request, setRequest] = useState(() => ({ ...emptyEditorState }));
  const [responsesByRequestId, setResponsesByRequestId] = useState({});
  const [isSending, setIsSending] = useState(false);

  const response = useMemo(
    () => getResponseForRequest(responsesByRequestId, activeRequestId),
    [responsesByRequestId, activeRequestId]
  );

  const closeSidebar = useCallback(() => setSidebarOpen(false), []);
  const openSidebar = useCallback(() => setSidebarOpen(true), []);

  const activeCollection = useMemo(() => {
    if (!activeCollectionId) return null;
    return collections.find((col) => col.id === activeCollectionId) ?? null;
  }, [collections, activeCollectionId]);

  const activeCollectionContext = useMemo(() => {
    if (!activeRequestId) return null;
    return findRequestInCollections(collections, activeRequestId);
  }, [collections, activeRequestId]);

  const resolvedEnvironment = useMemo(() => {
    const envId =
      activeCollectionContext?.collection.environmentId ??
      activeCollection?.environmentId ??
      null;
    if (!envId) return null;
    return environments.find((e) => e.id === envId) ?? null;
  }, [environments, activeCollectionContext, activeCollection]);

  const envVariableMap = useMemo(
    () => variablesArrayToMap(resolvedEnvironment?.variables ?? []),
    [resolvedEnvironment]
  );

  const selectRequestById = useCallback((requestId, cols) => {
    setActiveRequestId(requestId);
    setActiveCollectionId(null);
    const found = findRequestInCollections(cols, requestId);
    if (found) {
      setRequest(loadRequestIntoEditor(found.request));
    }
  }, []);

  const handleSelectCollection = useCallback(
    (collectionId) => {
      setActiveCollectionId(collectionId);
      setActiveRequestId(null);
      setExpandedIds((prev) => ({ ...prev, [collectionId]: true }));
      closeSidebar();
    },
    [closeSidebar]
  );

  const handleRequestFieldChange = useCallback(
    (field, value) => {
      setRequest((prev) => {
        const next = { ...prev, [field]: value };
        if (activeRequestId) {
          collectionDispatch(syncRequestEditor(activeRequestId, next));
        }
        return next;
      });
    },
    [activeRequestId, collectionDispatch]
  );

  const handleToggleCollection = useCallback((collectionId) => {
    setExpandedIds((prev) => ({
      ...prev,
      [collectionId]: !prev[collectionId],
    }));
  }, []);

  const handleSelectRequest = useCallback(
    (requestId) => {
      selectRequestById(requestId, collections);
      closeSidebar();
    },
    [collections, selectRequestById, closeSidebar]
  );

  const handleCreateCollection = useCallback(() => {
    const action = createCollection();
    collectionDispatch(action);
    const { id } = action.payload;
    setExpandedIds((prev) => ({ ...prev, [id]: true }));
    setActiveCollectionId(id);
    setActiveRequestId(null);
    setSidebarTab('collections');
  }, [collectionDispatch]);

  const handleRenameCollection = useCallback(
    (collectionId, name) => {
      collectionDispatch(renameCollection(collectionId, name));
    },
    [collectionDispatch]
  );

  const handleDeleteCollection = useCallback(
    (collectionId) => {
      const col = collections.find((c) => c.id === collectionId);
      if (
        !col ||
        !window.confirm(
          `Delete collection "${col.name}" and all its requests?`
        )
      ) {
        return;
      }
      const deleteAction = deleteCollection(collectionId);
      const nextCollections = collectionReducer(
        { collections },
        deleteAction
      ).collections;
      collectionDispatch(deleteAction);
      setExpandedIds((prev) => {
        const next = { ...prev };
        delete next[collectionId];
        return next;
      });
      if (activeCollectionId === collectionId) {
        setActiveCollectionId(null);
      }
      setResponsesByRequestId((prev) =>
        removeResponsesForRequestIds(
          prev,
          col.requests.map((r) => r.id)
        )
      );
      if (
        activeRequestId &&
        col.requests.some((r) => r.id === activeRequestId)
      ) {
        const nextId = getFirstRequestId(nextCollections);
        if (nextId) {
          selectRequestById(nextId, nextCollections);
        } else {
          setActiveRequestId(null);
          setRequest({ ...emptyEditorState });
        }
      }
    },
    [collections, collectionDispatch, activeRequestId, activeCollectionId, selectRequestById]
  );

  const handleSetCollectionEnvironment = useCallback(
    (collectionId, environmentId) => {
      collectionDispatch(setCollectionEnvironment(collectionId, environmentId));
    },
    [collectionDispatch]
  );

  const handleAddRequest = useCallback(
    (collectionId) => {
      const action = addRequestToCollection(collectionId);
      collectionDispatch(action);
      const { request: newReq } = action.payload;
      setExpandedIds((prev) => ({ ...prev, [collectionId]: true }));
      setActiveCollectionId(null);
      setActiveRequestId(newReq.id);
      setRequest(loadRequestIntoEditor(newReq));
      setSidebarTab('collections');
    },
    [collectionDispatch]
  );

  const handleRenameRequest = useCallback(
    (collectionId, requestId, name) => {
      collectionDispatch(renameRequest(collectionId, requestId, name));
    },
    [collectionDispatch]
  );

  const handleDuplicateRequest = useCallback(
    (collectionId, requestId) => {
      const col = collections.find((c) => c.id === collectionId);
      const source = col?.requests.find((r) => r.id === requestId);
      if (!source) return;

      const action = duplicateRequest(collectionId, source);
      collectionDispatch(action);
      const { request: copy } = action.payload;
      setExpandedIds((prev) => ({ ...prev, [collectionId]: true }));
      setActiveRequestId(copy.id);
      setRequest(loadRequestIntoEditor(copy));
      setSidebarTab('collections');
    },
    [collections, collectionDispatch]
  );

  const handleDeleteRequest = useCallback(
    (collectionId, requestId) => {
      const col = collections.find((c) => c.id === collectionId);
      const req = col?.requests.find((r) => r.id === requestId);
      if (!req || !window.confirm(`Delete request "${req.name}"?`)) {
        return;
      }
      const deleteAction = deleteRequest(collectionId, requestId);
      const nextCollections = collectionReducer(
        { collections },
        deleteAction
      ).collections;
      collectionDispatch(deleteAction);
      setResponsesByRequestId((prev) =>
        removeResponseForRequest(prev, requestId)
      );
      if (activeRequestId === requestId) {
        const nextId = getFirstRequestId(nextCollections);
        if (nextId) {
          selectRequestById(nextId, nextCollections);
        } else {
          setActiveRequestId(null);
          setRequest({ ...emptyEditorState });
        }
      }
    },
    [collections, collectionDispatch, activeRequestId, selectRequestById]
  );

  const handleCreateEnvironment = useCallback(() => {
    const action = createEnvironment();
    environmentDispatch(action);
    setSelectedEnvironmentId(action.payload.id);
    setSidebarTab('environments');
  }, [environmentDispatch]);

  const handleRenameEnvironment = useCallback(
    (environmentId, name) => {
      environmentDispatch(renameEnvironment(environmentId, name));
    },
    [environmentDispatch]
  );

  const handleDeleteEnvironment = useCallback(
    (environmentId) => {
      const env = environments.find((e) => e.id === environmentId);
      if (!env) return;

      const refCount = countCollectionsUsingEnvironment(
        collections,
        environmentId
      );
      const refNote =
        refCount > 0
          ? ` It is attached to ${refCount} collection${refCount === 1 ? '' : 's'}.`
          : '';

      if (!window.confirm(`Delete environment "${env.name}"?${refNote}`)) {
        return;
      }

      const deleteAction = deleteEnvironment(environmentId);
      const nextEnvironments = environmentReducer(
        { environments },
        deleteAction
      ).environments;
      environmentDispatch(deleteAction);
      collectionDispatch(clearEnvironmentReferences(environmentId));

      if (selectedEnvironmentId === environmentId) {
        setSelectedEnvironmentId(nextEnvironments[0]?.id ?? null);
      }
    },
    [
      environments,
      collections,
      environmentDispatch,
      collectionDispatch,
      selectedEnvironmentId,
    ]
  );

  const handleCollectionAuthChange = useCallback(
    (auth) => {
      const collectionId =
        activeCollectionId ?? activeCollectionContext?.collection.id;
      if (!collectionId) return;
      collectionDispatch(setCollectionAuth(collectionId, auth));
    },
    [activeCollectionId, activeCollectionContext, collectionDispatch]
  );

  const mainView = useMemo(() => {
    if (activeRequestId) return 'request';
    if (activeCollectionId && activeCollection) return 'collection';
    return 'empty';
  }, [activeRequestId, activeCollectionId, activeCollection]);

  const handleSend = useCallback(async () => {
    const requestId = activeRequestId;
    if (!requestId || isSending) return;
    if (
      bodyRequiresJsonValidation(request.method, request.body) &&
      getJsonValidationError(request.body)
    ) {
      return;
    }
    if (!canSendRequest(request)) return;

    setIsSending(true);
    try {
      const result = await executeRequest({
        method: request.method,
        url: request.url,
        headers: request.headers,
        params: request.params,
        body: request.body,
        collectionAuth: activeCollectionContext?.collection.auth,
        requestAuth: request.auth,
        envVariableMap,
      });
      setResponsesByRequestId((prev) =>
        setResponseForRequest(prev, requestId, result)
      );
    } finally {
      setIsSending(false);
    }
  }, [
    activeRequestId,
    request,
    envVariableMap,
    isSending,
    activeCollectionContext,
  ]);

  const handleVariablesChange = useCallback(
    (environmentId, variables) => {
      environmentDispatch(
        updateEnvironmentVariables(environmentId, variables)
      );
    },
    [environmentDispatch]
  );

  const environmentProps = useMemo(
    () => ({
      resolvedEnvironment,
      onVariablesChange: handleVariablesChange,
    }),
    [resolvedEnvironment, handleVariablesChange]
  );

  const requestProps = useMemo(
    () => ({
      method: request.method,
      url: request.url,
      headers: request.headers,
      params: request.params,
      body: request.body,
      collectionAuth: activeCollectionContext?.collection.auth ?? null,
      requestAuth: request.auth,
      envVariableMap,
      onChange: handleRequestFieldChange,
      onSend: handleSend,
      isSending,
    }),
    [
      request,
      envVariableMap,
      activeCollectionContext,
      handleRequestFieldChange,
      handleSend,
      isSending,
    ]
  );

  const collectionDetailProps = useMemo(() => {
    if (!activeCollection) return null;
    const environmentName = activeCollection.environmentId
      ? environments.find((e) => e.id === activeCollection.environmentId)
          ?.name ?? null
      : null;
    return {
      collection: activeCollection,
      environmentName,
      onAuthChange: handleCollectionAuthChange,
    };
  }, [
    activeCollection,
    environments,
    handleCollectionAuthChange,
  ]);

  const sidebarProps = useMemo(
    () => ({
      activeTab: sidebarTab,
      onTabChange: setSidebarTab,
      collectionsProps: {
        collections,
        environments,
        expandedIds,
        activeCollectionId,
        activeRequestId,
        onCreateCollection: handleCreateCollection,
        onToggleCollection: handleToggleCollection,
        onSelectCollection: handleSelectCollection,
        onSelectRequest: handleSelectRequest,
        onRenameCollection: handleRenameCollection,
        onDeleteCollection: handleDeleteCollection,
        onSetCollectionEnvironment: handleSetCollectionEnvironment,
        onAddRequest: handleAddRequest,
        onRenameRequest: handleRenameRequest,
        onDuplicateRequest: handleDuplicateRequest,
        onDeleteRequest: handleDeleteRequest,
      },
      environmentsProps: {
        environments,
        selectedEnvironmentId,
        onCreateEnvironment: handleCreateEnvironment,
        onSelectEnvironment: setSelectedEnvironmentId,
        onRenameEnvironment: handleRenameEnvironment,
        onDeleteEnvironment: handleDeleteEnvironment,
        onVariablesChange: handleVariablesChange,
      },
    }),
    [
      sidebarTab,
      collections,
      environments,
      expandedIds,
      activeCollectionId,
      activeRequestId,
      handleCreateCollection,
      handleToggleCollection,
      handleSelectCollection,
      handleSelectRequest,
      handleRenameCollection,
      handleDeleteCollection,
      handleSetCollectionEnvironment,
      handleAddRequest,
      handleRenameRequest,
      handleDuplicateRequest,
      handleDeleteRequest,
      selectedEnvironmentId,
      handleCreateEnvironment,
      handleRenameEnvironment,
      handleDeleteEnvironment,
      handleVariablesChange,
    ]
  );

  return (
    <AppShell
      sidebarOpen={sidebarOpen}
      onOpenSidebar={openSidebar}
      onCloseSidebar={closeSidebar}
      sidebarProps={sidebarProps}
      environmentProps={environmentProps}
      mainView={mainView}
      hasCollections={collections.length > 0}
      onCreateCollection={handleCreateCollection}
      collectionDetailProps={collectionDetailProps}
      requestProps={requestProps}
      response={response}
    />
  );
}
