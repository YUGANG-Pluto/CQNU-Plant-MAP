# Import And Export Guide

## CSV Export

CSV export is intended for spreadsheet review and manual correction. The export contains zone, point, plant, phenology, image, and coordinate fields.

## CSV Import

CSV import reads selected files through the system file picker. Imported rows are normalized by renderer logic before being added to the current project.

## GeoJSON Export

GeoJSON export is intended for GIS exchange. Point coordinates use WGS84 `[lng, lat]` order.

## GeoJSON Import

GeoJSON import reads selected `.geojson` or `.json` files. Use synthetic or reviewed data before importing into a real project.

## Settings Import And Export

Settings JSON import/export is scoped to UI language, theme, and statistics preferences. It does not overwrite zones, points, images, or basemap strategy.

## File Limits

Text import is size-limited in the main process. Export paths are selected through system dialogs and validated by extension.

## Data Safety

Create a backup before large imports, merges, repairs, or manual data cleanup.

