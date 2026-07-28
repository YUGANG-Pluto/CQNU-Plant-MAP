export const IPC_CHANNELS = {
  project: {
    chooseDir: 'project:chooseDir',
    chooseMergeDir: 'project:chooseMergeDir',
    load: 'project:load',
    save: 'project:save',
    getModifiedTime: 'project:getModifiedTime',
    importCsv: 'project:importCsv',
    exportCsv: 'project:exportCsv',
    importGeoJson: 'project:importGeoJson',
    exportGeoJson: 'project:exportGeoJson',
    exportMarkdown: 'project:exportMarkdown',
    exportSvg: 'project:exportSvg'
  },
  settings: {
    importJson: 'settings:importJson',
    exportJson: 'settings:exportJson'
  },
  image: {
    import: 'image:import',
    delete: 'image:delete'
  },
  backup: {
    chooseDir: 'backup:chooseDir',
    create: 'backup:create',
    inspectRestore: 'backup:inspectRestore',
    restore: 'backup:restore',
    listExpired: 'backup:listExpired',
    keepExpired: 'backup:keepExpired',
    deleteExpired: 'backup:deleteExpired'
  },
  log: {
    report: 'log:renderer',
    setLevel: 'log:setLevel',
    listRecent: 'log:listRecent',
    readLog: 'log:readLog',
    deleteLogs: 'log:deleteLogs',
    cleanup: 'log:cleanup',
    exportDiagnostics: 'log:exportDiagnostics'
  },
  maintenance: {
    checkImageRefs: 'maintenance:checkImageRefs'
  },
  storage: {
    conversionPreflight: 'storage:conversionPreflight',
    listArtifacts: 'storage:listArtifacts',
    deleteArtifacts: 'storage:deleteArtifacts',
    createSqliteFromJson: 'storage:createSqliteFromJson',
    exportSqliteToJson: 'storage:exportSqliteToJson'
  },
  species: {
    referenceQuery: 'species:referenceQuery',
    suggestTaxonomy: 'species:suggestTaxonomy',
    imageCompare: 'species:imageCompare'
  },
  window: {
    toggleFullscreen: 'window:toggleFullscreen',
    openExternal: 'window:openExternal'
  }
} as const;

type NestedValueOf<T> = {
  [Key in keyof T]: T[Key] extends Record<string, infer Value> ? Value : never;
}[keyof T];

export type IpcChannel = NestedValueOf<typeof IPC_CHANNELS>;

export interface IpcSuccess<T = unknown> {
  ok: true;
  data: T;
}

export interface IpcFailure {
  ok: false;
  error: {
    code: string;
    message: string;
  };
}

export type IpcResponse<T = unknown> = IpcSuccess<T> | IpcFailure;
export type IpcCommand<TResult = unknown> = (payload?: unknown) => Promise<IpcResponse<TResult>>;
export type IpcNoPayloadCommand<TResult = unknown> = () => Promise<IpcResponse<TResult>>;

export interface PlantAppApi {
  project: {
    chooseDir: IpcNoPayloadCommand;
    chooseMergeDir: IpcNoPayloadCommand;
    load: IpcCommand;
    save: IpcCommand;
    getModifiedTime: IpcCommand;
    importCsv: IpcNoPayloadCommand;
    exportCsv: IpcCommand;
    importGeoJson: IpcNoPayloadCommand;
    exportGeoJson: IpcCommand;
    exportMarkdown: IpcCommand;
    exportSvg: IpcCommand;
  };
  settings: {
    importJson: IpcCommand;
    exportJson: IpcCommand;
  };
  image: {
    import: IpcCommand;
    delete: IpcCommand;
  };
  backup: {
    chooseDir: IpcNoPayloadCommand;
    create: IpcCommand;
    inspectRestore: IpcCommand;
    restore: IpcCommand;
    listExpired: IpcCommand;
    keepExpired: IpcCommand;
    deleteExpired: IpcCommand;
  };
  log: {
    report: IpcCommand;
    setLevel: IpcCommand;
    listRecent: IpcCommand;
    readLog: IpcCommand;
    deleteLogs: IpcCommand;
    cleanup: IpcCommand;
    exportDiagnostics: IpcCommand;
  };
  maintenance: {
    checkImageRefs: IpcCommand;
  };
  storage: {
    conversionPreflight: IpcCommand;
    listArtifacts: IpcCommand;
    deleteArtifacts: IpcCommand;
    createSqliteFromJson: IpcCommand;
    exportSqliteToJson: IpcCommand;
  };
  species: {
    referenceQuery: IpcCommand;
    suggestTaxonomy: IpcCommand;
    imageCompare: IpcCommand;
  };
  window: {
    toggleFullscreen: IpcNoPayloadCommand;
    openExternal: IpcCommand;
  };
}
