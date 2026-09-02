const desktopRuntimeTags = Object.freeze([
  '<script src="./renderer-dist/modern-shell.js"></script>',
  '<script src="./node_modules/leaflet/dist/leaflet.js"></script>',
  '<script src="./node_modules/leaflet-draw/dist/leaflet.draw.js"></script>',
  '<script defer src="./src/renderer/legacy-loader.js"></script>'
]);

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function removeDesktopRuntimeScripts(documentSource) {
  return desktopRuntimeTags.reduce((source, tag) => {
    const linePattern = new RegExp(
      `^[\\t ]*${escapeRegExp(tag)}[\\t ]*(?:\\r?\\n|$)`,
      'mu'
    );
    if (!linePattern.test(source)) {
      throw new Error(`Desktop runtime tag is missing from the workspace template: ${tag}`);
    }
    return source.replace(linePattern, '');
  }, String(documentSource || ''));
}
