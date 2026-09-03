import { render } from 'preact';
import { App } from './App';
import { installRendererDomainBridge } from './domain/runtime';
import { installPlatformAdapter } from './platform/runtime';
import { installProjectEditHistoryBridge } from './features/history/runtime';
import { installResearchReviewBridge } from './features/review/runtime';
import { installResearchQueryBridge } from './features/query/runtime';
import { installRendererStateFacade } from './features/state/runtime';
import { installObjectSelectionStore } from './features/selection/runtime';
import { installStatsChartRegistryBridge } from './features/stats/runtime';
import { installLegacyThemeBridge } from './features/theme/runtime';
import { installProjectWorkflowBridge } from './features/project/runtime';
import { installProjectSessionStore } from './features/project/sessionRuntime';
import { installLayerManagerBridge } from './features/layers/runtime';
import { installMotionKernel } from './motion/motionKernel';
import './styles/web-capability.css';
import './styles/design-system.css';
import './styles/appearance-center.css';
import './styles/research-charts.css';
import './styles/workspace-primitives.css';
import './styles/workspace-motion.css';
import './styles/modal-primitives.css';
import './styles/command-palette.css';
import './styles/project-history.css';
import './styles/project-import-center.css';
import './styles/cloud-project-library.css';
import './styles/cloud-project-history.css';
import './styles/review-workbench.css';

installPlatformAdapter();
installLayerManagerBridge();
installProjectSessionStore();
installProjectWorkflowBridge();
installLegacyThemeBridge();
installRendererDomainBridge();
installResearchQueryBridge();
installObjectSelectionStore();
installRendererStateFacade();
installProjectEditHistoryBridge();
installResearchReviewBridge();
installStatsChartRegistryBridge();

const root = document.getElementById('modernUiRoot');
if (root) {
  render(<App />, root);
  installMotionKernel();
}
