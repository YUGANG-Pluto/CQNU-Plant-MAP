import type { PlatformRuntime } from '../../../shared/types/platform';
import type { ProjectOpenMode, ProjectStorageFormat } from './types';

export type ProjectImportAction = 'open-project' | 'restore-backup';

export interface ProjectImportOption {
  id: string;
  action: ProjectImportAction;
  mode?: ProjectOpenMode;
  labelKey: string;
  descriptionKey: string;
  badgeKey?: string;
  recommended?: boolean;
  disabled: boolean;
  disabledReasonKey?: string;
}

export interface ProjectImportOptionContext {
  runtime: PlatformRuntime;
  canReadProject: boolean;
  canImportSqlite: boolean;
  canImportJson: boolean;
  canRestoreBackup: boolean;
  projectLoaded: boolean;
}

export interface ProjectSourceInput {
  storageFormat?: ProjectStorageFormat;
  sourceKind?: string;
  directoryPermissionStatus?: string;
  directoryReconnectRequired?: boolean;
  externalSqliteImported?: boolean;
}

export interface ProjectSourceDescription {
  kind: 'sqlite' | 'directory' | 'import' | 'browser' | 'cloud' | 'json' | 'unknown';
  labelKey: string;
  detailKey: string;
  warningKey?: string;
}

export function buildProjectImportOptions(context: ProjectImportOptionContext): ProjectImportOption[] {
  const webOnly = context.runtime !== 'web';
  return [
    {
      id: 'btnImportProjectDirectory',
      action: 'open-project',
      mode: 'directory',
      labelKey: 'projectImportDirectory',
      descriptionKey: 'projectImportDirectoryHint',
      badgeKey: 'recommended',
      recommended: true,
      disabled: !context.canReadProject
    },
    {
      id: 'btnImportProjectSqlite',
      action: 'open-project',
      mode: 'sqlite-file',
      labelKey: 'projectImportSqlite',
      descriptionKey: 'projectImportSqliteHint',
      disabled: webOnly || !context.canReadProject || !context.canImportSqlite,
      disabledReasonKey: 'projectImportWebOnly'
    },
    {
      id: 'btnImportProjectJson',
      action: 'open-project',
      mode: 'json-files',
      labelKey: 'projectImportJson',
      descriptionKey: 'projectImportJsonHint',
      disabled: webOnly || !context.canReadProject || !context.canImportJson,
      disabledReasonKey: 'projectImportWebOnly'
    },
    {
      id: 'btnImportProjectFolder',
      action: 'open-project',
      mode: 'portable-folder',
      labelKey: 'projectImportCompatibleFolder',
      descriptionKey: 'projectImportCompatibleFolderHint',
      disabled: webOnly || !context.canReadProject,
      disabledReasonKey: 'projectImportWebOnly'
    },
    {
      id: 'btnImportProjectBackup',
      action: 'restore-backup',
      labelKey: 'projectImportBackup',
      descriptionKey: 'projectImportBackupHint',
      disabled: webOnly || !context.canRestoreBackup || !context.projectLoaded,
      disabledReasonKey: context.projectLoaded
        ? 'projectImportBackupUnavailable'
        : 'projectImportBackupRequiresProject'
    }
  ];
}

export function describeProjectSource(input: ProjectSourceInput): ProjectSourceDescription {
  if (input.sourceKind === 'cloud') {
    return {
      kind: 'cloud',
      labelKey: 'projectSourceCloud',
      detailKey: 'projectSourceCloudDetail'
    };
  }
  if (input.externalSqliteImported || input.sourceKind === 'sqlite') {
    return {
      kind: 'sqlite',
      labelKey: 'projectSourceSqlite',
      detailKey: 'projectSourceSqliteDetail',
      warningKey: 'projectSourceSqliteWarning'
    };
  }
  if (input.sourceKind === 'directory') {
    return {
      kind: 'directory',
      labelKey: 'projectSourceDirectory',
      detailKey: input.directoryReconnectRequired
        ? 'projectSourceDirectoryReconnect'
        : 'projectSourceDirectoryDetail'
    };
  }
  if (input.sourceKind === 'import') {
    return {
      kind: 'import',
      labelKey: 'projectSourceImportedFiles',
      detailKey: 'projectSourceImportedFilesDetail'
    };
  }
  if (input.sourceKind === 'opfs') {
    return {
      kind: 'browser',
      labelKey: 'projectSourceBrowserDatabase',
      detailKey: 'projectSourceBrowserDatabaseDetail'
    };
  }
  if (input.storageFormat === 'json') {
    return {
      kind: 'json',
      labelKey: 'projectSourceJson',
      detailKey: 'projectSourceJsonDetail'
    };
  }
  return {
    kind: 'unknown',
    labelKey: 'projectSourceLocal',
    detailKey: 'projectSourceLocalDetail'
  };
}
