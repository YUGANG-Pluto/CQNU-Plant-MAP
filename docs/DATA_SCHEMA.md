# Data Schema

## Project Folder

A project is a user-selected folder with this structure:

```text
project-folder/
  information/
    settings.json
    zones.json
    points.json
    images/
```

The application creates missing files when a trusted project directory is opened.

## settings.json

`settings.json` is an object. Current commonly used fields include:

| Field | Type | Purpose |
| --- | --- | --- |
| `language` | string | UI language, usually `zh` or `en`. |
| `mapCenter` | array | Leaflet map center as `[lat, lng]`. |
| `mapZoom` | number | Current map zoom. |
| `activeBaseMapId` | string | Selected basemap id. |
| `baseMaps` | array | Built-in and user-defined basemap records. |
| `uiTheme` | object | Theme, layout, glass, motion, progress, and status settings. |
| `statsCustom` | object | Custom statistics configuration. |
| `recycleBin` | array | Soft-deleted zones, points, and image references. |

## zones.json

`zones.json` is an array of zone records.

| Field | Type | Purpose |
| --- | --- | --- |
| `id` | string | Internal unique id. |
| `zoneId` | string | User-visible zone code. |
| `name` | string | Zone name. |
| `description` | string | Zone notes. |
| `geometry` | object | GeoJSON Polygon using `[lng, lat]` coordinate pairs. |

Older zone records may contain `coordinates` or `latlngs`; renderer normalization maps them to `geometry` when loaded.

## points.json

`points.json` is an array of point records.

| Field | Type | Purpose |
| --- | --- | --- |
| `id` | string | Internal unique id. |
| `pointId` | string | User-visible point code. |
| `zoneRef` | string | Related zone id. |
| `lat` | number | Stored WGS84 latitude. |
| `lng` | number | Stored WGS84 longitude. |
| `plantNameCn` | string | Chinese plant name. |
| `plantNameSci` | string | Scientific name. |
| `phenologyEntries` | array | Multi-entry phenology records. |

Top-level observer, survey, habitat, abundance, growth form, phenology, source, note, and images fields are retained as summary mirrors for older workflows.

## Phenology Entry

| Field | Type | Purpose |
| --- | --- | --- |
| `id` | string | Internal unique id. |
| `label` | string | Entry label. |
| `observer` | string | Observer name. |
| `surveyDate` | string | Survey date as text, usually `YYYY-MM-DD`. |
| `habitat` | string | Microhabitat. |
| `abundance` | string | Abundance label. |
| `growthForm` | string | Growth form. |
| `floweringState` | string | Phenology state. |
| `cultivatedStatus` | string | Source status. |
| `note` | string | Notes. |
| `images` | array | Project-relative image paths. |

## Image Paths

Imported images are copied under:

```text
information/images/
```

Stored image references are project-relative paths such as `information/images/img_...jpg`.

## Export Fields

CSV export currently uses the Chinese headers defined in `src/renderer/state/store.js`:

```text
分区编号, 分区名称, 点位编号, 中文名, 学名, 记录者, 调查日期,
微生境, 多度/数量, 生活型, 物候状态, 来源属性, 备注, 图片文件, 经度, 纬度
```

GeoJSON export emits point features with WGS84 coordinates in `[lng, lat]` order.

## Backups

Manual backups are zip files created outside the project folder by default. Expired backup cleanup only handles trusted `.zip` files.

## Deferred Database Changes

No database structure change is part of the current task. The active data model remains the project-folder JSON layout described above.

The current JSON files do not require a top-level `schemaVersion`. Missing `schemaVersion` must remain valid current data, and loading JSON must not rewrite files only to add version metadata.

SQLite or other database-storage design notes are deferred. Do not add database tables, migrations, or schema conversion code until a later scoped task explicitly reopens that work with backup, rollback, compatibility, and test requirements.
