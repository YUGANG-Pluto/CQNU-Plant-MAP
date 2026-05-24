# Commercial Sample Checklist

## Product

- [ ] Software name is consistent.
- [ ] Icon is consistent.
- [ ] Version is clear.
- [ ] README describes the product clearly.
- [ ] User manual is complete.
- [ ] Installation notes are complete.
- [ ] Feedback path is clear.

## License

- [ ] `LICENSE.md` exists.
- [ ] `EULA.md` exists.
- [ ] `SCHOOL_USE_LICENSE.md` exists.
- [ ] `PRIVACY.md` exists.
- [ ] `THIRD_PARTY_NOTICES.md` exists.
- [ ] `package.json` does not declare an open license.
- [ ] School-use boundary is clear.
- [ ] External redistribution and commercial sale restrictions are clear.

## Engineering

- [ ] `app/package-lock.json` exists.
- [ ] `npm ci` works.
- [ ] `npm run verify` passes.
- [ ] CI passes.
- [ ] Repository hygiene check passes.
- [ ] JavaScript syntax check passes.
- [ ] Self-check passes.
- [ ] Core manual smoke test passes.
- [ ] Species reference source links open in the system default browser.
- [ ] iNaturalist token page opens from the image comparison area.
- [ ] iNaturalist token use is documented as temporary and not stored in project JSON.
- [ ] Statistics center shows overview, zone, composition, diversity, similarity, phenology, trend, quality, export, and metric-note sections.
- [ ] Statistics heatmap matrices support CSV, JSON, Markdown, and SVG export.
- [ ] Statistics formulas and data-scope limits are visible in the UI.

## Data

- [ ] Project creation works.
- [ ] Project opening works.
- [ ] Backup works.
- [ ] Manual restore path is documented.
- [ ] CSV export works.
- [ ] GeoJSON export works.
- [ ] Statistics CSV export opens correctly in Excel.
- [ ] Statistics full JSON and Markdown summary exports work.
- [ ] Heatmap SVG export opens without external resources.
- [ ] Maintenance health check works.
- [ ] Current JSON storage is documented as active.
- [ ] Database structure changes remain deferred unless a separate migration task is approved.

## Release

- [ ] Installer is generated.
- [ ] Optional portable package is generated.
- [ ] Checksum file is generated.
- [ ] Release notes are complete.
- [ ] Windows install test passes.
- [ ] Windows uninstall test passes.
- [ ] User project data is not removed by uninstall.
