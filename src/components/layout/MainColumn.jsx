import { useRef } from 'react';
import { EnvironmentPanel } from '../environment';
import { RequestBuilder } from '../request';
import { CollectionDetailView } from '../collections';
import ResponsePanel from './ResponsePanel';
import ResizeHandle from './ResizeHandle';
import WelcomeEmptyState from './WelcomeEmptyState';
import { useResponseResize } from './useResponseResize';

/**
 * @param {object} props
 * @param {'collection' | 'request' | 'empty'} props.mainView
 * @param {boolean} props.hasCollections
 * @param {() => void} props.onCreateCollection
 * @param {object} props.environmentProps
 * @param {object} [props.collectionDetailProps]
 * @param {object} [props.requestProps]
 * @param {object} props.response
 */
export default function MainColumn({
  mainView,
  hasCollections,
  onCreateCollection,
  environmentProps,
  collectionDetailProps,
  requestProps,
  response,
}) {
  const mainRef = useRef(null);
  const tabsEndRef = useRef(null);
  const responseHeaderRef = useRef(null);
  const showRequestView = mainView === 'request';
  const showCollectionView = mainView === 'collection';

  const { responseHeight, startDrag } = useResponseResize(
    mainRef,
    tabsEndRef,
    responseHeaderRef
  );

  return (
    <main
      ref={mainRef}
      className="flex min-h-0 flex-1 flex-col overflow-hidden lg:shadow-card"
    >
      <EnvironmentPanel {...environmentProps} />

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {showCollectionView && collectionDetailProps && (
          <CollectionDetailView {...collectionDetailProps} />
        )}

        {showRequestView && requestProps && (
          <RequestBuilder {...requestProps} tabsEndRef={tabsEndRef} />
        )}

        {mainView === 'empty' && !hasCollections && (
          <WelcomeEmptyState onCreateCollection={onCreateCollection} />
        )}

        {mainView === 'empty' && hasCollections && (
          <div className="flex min-h-0 flex-1 items-center justify-center bg-background p-6">
            <p className="text-center text-sm text-muted">
              Select a collection or request from the sidebar to get started.
            </p>
          </div>
        )}

        {showRequestView && (
          <>
            <ResizeHandle onDragStart={startDrag} />
            <ResponsePanel
              response={response}
              height={responseHeight}
              headerRef={responseHeaderRef}
            />
          </>
        )}
      </div>
    </main>
  );
}
