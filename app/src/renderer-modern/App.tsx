import { SystemDialogs } from './components/SystemDialogs';
import { BasemapWorkspaceModal } from './features/basemap/BasemapWorkspaceModal';
import { MaintenanceModal } from './features/maintenance/MaintenanceModal';
import { PointEditorModal } from './features/phenology/PointEditorModal';
import { DialogSupport } from './features/phenology/DialogSupport';
import { ProjectOperationModals } from './features/project/ProjectOperationModals';
import { ProjectImportCenter } from './features/project/ProjectImportCenter';
import { QueryModal } from './features/query/QueryModal';
import { RecycleBinModal } from './features/recycle-bin/RecycleBinModal';
import { ReviewWorkbenchModal } from './features/review/ReviewWorkbenchModal';
import { CommandPalette } from './features/shell/CommandPalette';
import { UtilityDrawers } from './features/shell/UtilityDrawers';
import { WorkspaceShell } from './features/shell/WorkspaceShell';
import { SpeciesReferenceModal } from './features/species-reference/SpeciesReferenceModal';
import { StatsModalShell } from './features/stats/StatsModalShell';
import { ThemeSettingsModal } from './features/theme/ThemeSettingsModal';

export function App() {
  return (
    <>
      <WorkspaceShell />
      <CommandPalette />
      <UtilityDrawers />
      <BasemapWorkspaceModal />
      <PointEditorModal />
      <SpeciesReferenceModal />
      <DialogSupport />
      <StatsModalShell />
      <QueryModal />
      <RecycleBinModal />
      <ReviewWorkbenchModal />
      <ThemeSettingsModal />
      <ProjectImportCenter />
      <ProjectOperationModals />
      <MaintenanceModal />
      <SystemDialogs />
    </>
  );
}
