import { BookOpen, FolderOpen, Home, Save, Search, ShieldCheck } from 'lucide-preact';
import {
  CommandButton,
  SegmentedControl,
  WORKSPACE_ICON_SIZE
} from '../../components/ui/WorkspacePrimitives';
import { ProjectHistoryControls } from '../history/ProjectHistoryControls';

export function WorkspaceHeader() {
  const isWebRuntime = window.platformAdapter?.runtime === 'web';
  return (
    <header class="app-topbar glass">
      <div class="app-brand-block app-brand">
        <img
          class="app-brand__icon brand-logo-mark"
          src="./src/renderer/assets/brand/cqnu-logo.svg"
          alt=""
          aria-hidden="true"
        />
        <div class="app-brand__text">
          <span class="app-kicker">CQNU · V1.1 BETA</span>
          <h1 data-i18n="appTitle">校园植物分区管理系统</h1>
          <p class="subtle" data-i18n="appSubtitle">分区绘制、点位管理、植物信息与图片归档</p>
          {isWebRuntime ? (
            <span class="web-runtime-badge">
              <ShieldCheck size={14} aria-hidden="true" />
              <span data-i18n="webReadOnlyBadge">浏览器本地 · OPFS 与授权目录保存</span>
            </span>
          ) : null}
        </div>
      </div>
      <div class="app-topbar-actions ui-command-bar">
        {isWebRuntime ? (
          <nav class="web-site-links" aria-label="站点导航">
            <a class="btn btn-soft web-site-link" href="/" title="站点首页">
              <Home size={WORKSPACE_ICON_SIZE} aria-hidden="true" />
              <span data-i18n="webSiteHome">站点首页</span>
            </a>
            <a class="btn btn-soft web-site-link" href="/docs" title="使用文档">
              <BookOpen size={WORKSPACE_ICON_SIZE} aria-hidden="true" />
              <span data-i18n="webSiteDocs">使用文档</span>
            </a>
          </nav>
        ) : null}
        <CommandButton
          id="btnOpenCommandPalette"
          icon={<Search size={WORKSPACE_ICON_SIZE} aria-hidden="true" />}
          label="命令中心"
          i18nKey="openCommandPalette"
          className="btn-soft command-palette-trigger"
          shortcut="Ctrl K"
        />
        <ProjectHistoryControls />
        <SegmentedControl
          className="lang-toggle"
          ariaLabel="界面语言 / Interface language"
          dataAttribute="lang"
          options={[
            { value: 'zh', label: '中文', active: true },
            { value: 'en', label: 'English' }
          ]}
        />
        <CommandButton
          id="btnChooseDir"
          icon={<FolderOpen size={WORKSPACE_ICON_SIZE} aria-hidden="true" />}
          label={isWebRuntime ? '打开本地项目' : '选择项目目录'}
          i18nKey={isWebRuntime ? 'webOpenLocalData' : 'chooseProject'}
          className="btn-primary"
        />
        <CommandButton
          id="btnSave"
          icon={<Save size={WORKSPACE_ICON_SIZE} aria-hidden="true" />}
          label="保存项目"
          i18nKey="saveProject"
          className="btn-primary"
        />
      </div>
    </header>
  );
}
