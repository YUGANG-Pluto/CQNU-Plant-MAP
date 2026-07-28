import { render } from 'preact';
import { App } from './App';
import { installLegacyThemeBridge } from './features/theme/runtime';
import './styles/design-system.css';
import './styles/research-charts.css';

installLegacyThemeBridge();

const root = document.getElementById('modernUiRoot');
if (root) {
  render(<App />, root);
}
