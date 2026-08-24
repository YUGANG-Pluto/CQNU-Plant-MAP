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
| `family` | string | Plant family. Optional for older projects. |
| `genus` | string | Plant genus. Optional for older projects. |
| `identificationStatus` | string | Identification workflow state such as draft, identified, needReview, verified, or doubtful. |
| `taxonomySource` | string | Taxonomy information source such as manual, iNaturalist, GBIF, iNaturalist+GBIF, or unknown. |
| `taxonomyMatchedName` | string | Simplified matched name from a species reference suggestion. |
| `taxonomyConfidence` | number or null | Advisory taxonomy suggestion confidence from 0 to 1. |
| `taxonomyConfidenceLabel` | string | Confidence label: high, medium, low, or unknown. |
| `taxonomyVerificationStatus` | string | Taxonomy review state such as unverified, suggested, manuallyVerified, doubtful, or rejected. |
| `taxonomyUpdatedAt` | string | Last taxonomy edit or suggestion time in ISO text form. |
| `taxonomyCandidatesSummary` | array | Capped simplified candidate summaries. Complete provider responses are not stored. |
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
分区编号, 分区名称, 点位编号, 中文名, 学名, 科, 属, 鉴定状态,
科属来源, 科属匹配名称, 科属建议置信度, 科属置信等级, 科属核验状态,
科属更新时间, 记录者, 调查日期, 微生境, 多度/数量, 生活型, 物候状态,
来源属性, 备注, 图片文件, 经度, 纬度
```

GeoJSON export emits point features with WGS84 coordinates in `[lng, lat]` order.

## Backups

Manual backups are zip files created outside the project folder by default. Expired backup cleanup only handles trusted `.zip` files.

## Database Planning Status

No runtime database structure change is active. The active data model remains the project-folder JSON layout described above.

The current JSON files do not require a top-level `schemaVersion`. Missing `schemaVersion` must remain valid current data, and loading JSON must not rewrite files only to add version metadata.

SQLite planning notes are documented separately in `SQLITE_SCHEMA.md`, `SQLITE_GUIDE.md`, `JSON_SQLITE_EXCHANGE.md`, and `DATA_MIGRATION_PLAN.md`. These documents describe future optional local storage behavior only. Do not add runtime database tables, migrations, or conversion UI until that work includes backup, rollback, compatibility, and dedicated conversion tests.
