# IPC Contract

This document describes the current IPC surface exposed through `window.plantApp`.

All IPC handlers return:

```json
{
  "ok": true,
  "data": {}
}
```

or:

```json
{
  "ok": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Readable message"
  }
}
```

Calls are accepted only from the local application page. File-system access remains in the main process.

## Project

| Channel | Preload command | Payload | Result |
| --- | --- | --- | --- |
| `project:chooseDir` | `project.chooseDir()` | none | `{ canceled, projectDir? }` |
| `project:chooseMergeDir` | `project.chooseMergeDir()` | none | `{ canceled, projectDir? }` |
| `project:load` | `project.load(payload)` | `{ projectDir }` | project settings, zones, points, paths, and modified time |
| `project:save` | `project.save(payload)` | `{ projectDir, settings, zones, points }` | `{ projectDir, projectModifiedTime }` |
| `project:getModifiedTime` | `project.getModifiedTime(payload)` | `{ projectDir }` | `{ modifiedTime }` |
| `project:importCsv` | `project.importCsv()` | none | `{ canceled, filePath?, content? }` |
| `project:exportCsv` | `project.exportCsv(payload)` | `{ defaultPath?, content }` | `{ canceled, filePath? }` |
| `project:importGeoJson` | `project.importGeoJson()` | none | `{ canceled, filePath?, content? }` |
| `project:exportGeoJson` | `project.exportGeoJson(payload)` | `{ defaultPath?, content }` | `{ canceled, filePath? }` |

Project directories must be trusted through the system directory picker before load, save, image maintenance, and backup operations.

## Settings

| Channel | Preload command | Payload | Result |
| --- | --- | --- | --- |
| `settings:importJson` | `settings.importJson(payload)` | `{ title? }` | `{ canceled, filePath?, content? }` |
| `settings:exportJson` | `settings.exportJson(payload)` | `{ title?, defaultPath?, content }` | `{ canceled, filePath? }` |

Settings import and export are JSON file operations mediated by system dialogs.

## Images

| Channel | Preload command | Payload | Result |
| --- | --- | --- | --- |
| `image:import` | `image.import(payload)` | `{ projectDir }` | `{ canceled, relativePath?, absolutePath?, exif? }` |
| `image:delete` | `image.delete(payload)` | `{ projectDir, relativePath }` | `{ deleted }` |

Image deletion is limited to `information/images/` under a trusted project directory.

## Backup

| Channel | Preload command | Payload | Result |
| --- | --- | --- | --- |
| `backup:chooseDir` | `backup.chooseDir()` | none | `{ canceled, backupDir? }` |
| `backup:create` | `backup.create(payload)` | `{ projectDir, backupDir?, label? }` | `{ filePath, backupDir }` |
| `backup:listExpired` | `backup.listExpired(payload)` | `{ projectDir, backupDir?, days? }` | `{ items }` |
| `backup:keepExpired` | `backup.keepExpired(payload)` | `{ projectDir, backupDir, paths }` | `{ updated }` |
| `backup:deleteExpired` | `backup.deleteExpired(payload)` | `{ projectDir, backupDir, paths }` | `{ deleted }` |

Manual backup directories must be trusted through the system directory picker. Expired backup cleanup only handles `.zip` files in a trusted backup folder.

## Logs And Diagnostics

| Channel | Preload command | Payload | Result |
| --- | --- | --- | --- |
| `log:renderer` | `log.report(payload)` | `{ level?, scope?, message?, code?, details?, url? }` | `{ logged }` |
| `log:setLevel` | `log.setLevel(payload)` | `{ level }` | `{ level }` |
| `log:listRecent` | `log.listRecent(payload)` | `{ limit? }` | `{ config, files, entries }` |
| `log:readLog` | `log.readLog(payload)` | `{ name, maxBytes? }` | `{ name, size, truncated, content }` |
| `log:deleteLogs` | `log.deleteLogs(payload)` | `{ names }` | `{ deleted, remaining }` |
| `log:cleanup` | `log.cleanup(payload)` | optional | cleanup summary |
| `log:exportDiagnostics` | `log.exportDiagnostics(payload)` | `{ title?, defaultPath?, content }` | `{ canceled, filePath? }` |

Log metadata is sanitized before writing. Log file reads and deletes accept log file names only, not arbitrary paths. Diagnostics export uses the JSON save dialog.

## Maintenance

| Channel | Preload command | Payload | Result |
| --- | --- | --- | --- |
| `maintenance:checkImageRefs` | `maintenance.checkImageRefs(payload)` | `{ projectDir, refs }` | `{ checked, items }` |

Image reference checks are limited to trusted project directories and image relative paths.

## Storage Conversion

| Channel | Preload command | Payload | Result |
| --- | --- | --- | --- |
| `storage:conversionPreflight` | `storage.conversionPreflight(payload)` | `{ projectDir }` | conversion readiness report |
| `storage:createSqliteFromJson` | `storage.createSqliteFromJson(payload)` | `{ projectDir, backupDir? }` | conversion report |
| `storage:exportSqliteToJson` | `storage.exportSqliteToJson(payload)` | `{ projectDir, backupDir? }` | export report |

Storage conversion channels are limited to trusted project directories. They create a backup under `information/statistics/backup` before writing project files, remove the previous source format after successful conversion, and do not expose SQL execution, raw database connections, absolute database paths, or file handles to renderer code.

## Species Reference

| Channel | Preload command | Payload | Result |
| --- | --- | --- | --- |
| `species:referenceQuery` | `species.referenceQuery(payload)` | `{ scientificName?, commonName?, locale? }` | species reference suggestions |
| `species:imageCompare` | `species.imageCompare(payload)` | `{ locale?, token? }` | image comparison suggestions |

Species reference suggestions are temporary until the user chooses to apply them. Image comparison uploads only the image selected by the user for that request.

## Window

| Channel | Preload command | Payload | Result |
| --- | --- | --- | --- |
| `window:toggleFullscreen` | `window.toggleFullscreen()` | none | `{ isFullscreen }` |
| `window:openExternal` | `window.openExternal(payload)` | `{ url }` | `{ opened, url }` |

External opening is limited to `http:` and `https:` URLs.

## Future Storage Conversion Boundary

Renderer code must not receive SQL execution, raw database connections, absolute database paths, or file handles.

The current storage conversion commands are limited to conversion preflight, JSON-to-SQLite copy creation, SQLite-to-JSON export, and report retrieval. Future storage work must preserve the same narrow boundary. Those commands reuse trusted project-directory checks and return stable success/error objects.
