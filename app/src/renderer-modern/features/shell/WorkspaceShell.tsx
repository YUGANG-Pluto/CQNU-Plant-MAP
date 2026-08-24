import { ContextInspector } from './ContextInspector';
import { MapWorkspace } from './MapWorkspace';
import { WorkspaceHeader } from './WorkspaceHeader';
import { WorkspaceToolsPanel } from './WorkspaceToolsPanel';

export function WorkspaceShell() {
  return (
    <div class="app-shell">
      <WorkspaceHeader />
      <WorkspaceToolsPanel />
      <MapWorkspace />
      <ContextInspector />
    </div>
  );
}
