import { useRef } from 'react';
import Sidebar from './Sidebar';
import MainColumn from './MainColumn';
import MobileHeader from './MobileHeader';
import ResizeHandle from './ResizeHandle';
import { useSidebarResize } from './useSidebarResize';

/**
 * @param {object} props
 * @param {boolean} props.sidebarOpen
 * @param {() => void} props.onOpenSidebar
 * @param {() => void} props.onCloseSidebar
 * @param {object} props.sidebarProps
 * @param {object} props.environmentProps
 * @param {'collection' | 'request' | 'empty'} props.mainView
 * @param {boolean} props.hasCollections
 * @param {() => void} props.onCreateCollection
 * @param {object} [props.collectionDetailProps]
 * @param {object} [props.requestProps]
 * @param {object} props.response
 */
export default function AppShell({
  sidebarOpen,
  onOpenSidebar,
  onCloseSidebar,
  sidebarProps,
  environmentProps,
  mainView,
  hasCollections,
  onCreateCollection,
  collectionDetailProps,
  requestProps,
  response,
}) {
  const shellRef = useRef(null);
  const { sidebarWidth, startDrag } = useSidebarResize(shellRef);

  return (
    <div className="flex h-dvh min-h-0 flex-col bg-background transition-colors duration-200">
      <MobileHeader
        sidebarOpen={sidebarOpen}
        onOpenSidebar={onOpenSidebar}
      />

      {sidebarOpen && (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          aria-label="Dismiss sidebar"
          onClick={onCloseSidebar}
        />
      )}

      <div
        ref={shellRef}
        className="flex min-h-0 flex-1 flex-col lg:flex-row"
        style={{ '--sidebar-width': `${sidebarWidth}px` }}
      >
        <Sidebar
          id="app-sidebar"
          isOpen={sidebarOpen}
          onClose={onCloseSidebar}
          {...sidebarProps}
        />

        <ResizeHandle
          orientation="vertical"
          onDragStart={startDrag}
          className="hidden lg:flex"
        />

        <MainColumn
          mainView={mainView}
          hasCollections={hasCollections}
          onCreateCollection={onCreateCollection}
          environmentProps={environmentProps}
          collectionDetailProps={collectionDetailProps}
          requestProps={requestProps}
          response={response}
        />
      </div>
    </div>
  );
}
