# User Manual

## Install And Start

Install the Windows package or run the app from source with `npm start` in the `app/` folder during development.

## Create Or Open Project

Click `Choose Project Folder`. Select an existing project folder or an empty folder. The app creates `information/settings.json`, `zones.json`, `points.json`, and `images/` when needed.

## Map Workspace

- Use browse mode to pan and inspect.
- Use draw zone mode to draw a management area.
- Use add point mode to place a plant point.
- Select zones or points from the map or lists.

## Zone Editing

Select a zone, enter zone code, name, and description in the inspector, then apply the changes.

## Point And Phenology Editing

Select a point and open the phenology editor. Enter point code, Chinese name, scientific name, observer, date, habitat, abundance, growth form, phenology state, source status, and notes. One point can contain multiple phenology entries.

## Images

Use the image picker from the phenology editor. Imported images are copied into the project `information/images/` folder. Image preview supports zoom and navigation.

## Query

Open the query center to filter by name, zone, growth form, phenology state, source status, observer, date, and completeness.

## Statistics

Open the statistics center to view research-oriented project statistics, zone analysis, taxonomic composition, life form and origin composition, diversity metrics, zone similarity, phenology statistics, time trends, data quality, export tools, and metric notes.

The diversity and similarity pages use the current project records as the statistical scope. By default, diversity metrics use point-record frequency; if a project contains reliable abundance fields, those fields can be used by later analysis workflows. Matrix views show Jaccard, Sørensen-Dice, Bray-Curtis, month-by-phenology, and zone-by-quality results as table-based heatmaps that can be reviewed cell by cell.

Use chart display control to switch between recommended charts, report-oriented charts, quality charts, all charts, or a custom selection. Chart cards include a fullscreen action for reviewing dense charts and heatmaps; press `Esc` or use the close button to return to the statistics center. Heatmaps support a warm orange-red palette and the default palette while keeping exported data unchanged.

Use the export page or matrix export buttons to save CSV, JSON, Markdown, and SVG outputs for reports. CSV files include a UTF-8 BOM for easier Excel opening. SVG heatmaps contain the title, matrix, legend, and scope note without external resources.

Metric notes explain formulas and limits. Data quality scores only describe record completeness; they do not represent ecological quality.

## Species Reference

Open species reference from the point editor or query results to compare the current plant name with GBIF and iNaturalist suggestions. Source, Wiki, and attribution links open through the system default browser.

For iNaturalist image comparison, click the token page action in the comparison area. Sign in to iNaturalist in the browser, open `https://www.inaturalist.org/users/api_token`, copy the temporary API token, paste it into the token field, then run comparison. Treat the token as temporary private text; the app uses it for the request and does not store it in project JSON.

## Import And Export

The workspace drawer includes CSV and GeoJSON import/export actions. CSV is for tabular review. GeoJSON is for GIS exchange.

## Backups

Open the backup center to create a manual zip backup. Store backups outside the project folder.

## Merge

Use the merge center to compare two local projects and review suspected duplicate points before applying a merge.

## Maintenance

The maintenance center supports health checks, conservative repair, log review, diagnostic export, settings import/export, and safe mode.

## Safe Mode

Safe mode locks write actions and keeps browsing, query, statistics viewing, and map dragging available. Exit safe mode to restore the previous UI settings.

## Common Issues

- If a project cannot load, reselect the folder through the system picker.
- If an image is missing, run maintenance health check.
- If map tiles fail, check network access and basemap settings.
- If reference lookup or image comparison fails, retry later, check the external service availability, and refresh the iNaturalist temporary token if it expired.
