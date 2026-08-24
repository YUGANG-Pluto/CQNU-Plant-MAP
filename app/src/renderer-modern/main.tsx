import { render } from 'preact';
import { App } from './App';
import { installRendererDomainBridge } from './domain/runtime';
import { installPlatformAdapter } from './platform/runtime';
import { installProjectEditHistoryBridge } from './features/history/runtime';
import { installResearchReviewBridge } from './features/review/runtime';
import { installRendererStateFacade } from './features/state/runtime';
import { installLegacyThemeBridge } from './features/theme/runtime';
import './styles/design-system.css';
import './styles/research-charts.css';
import './styles/workspace-primitives.css';
import './styles/modal-primitives.css';
import './styles/command-palette.css';
import './styles/project-history.css';
import './styles/review-workbench.css';

installPlatformAdapter();
installLegacyThemeBridge();
installRendererDomainBridge();
installRendererStateFacade();
installProjectEditHistoryBridge();
installResearchReviewBridge();

const root = document.getElementById('modernUiRoot');
if (root) {
  render(<App />, root);
}
