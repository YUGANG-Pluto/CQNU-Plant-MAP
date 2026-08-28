const { mkdir, writeFile } = require('node:fs/promises');
const path = require('node:path');

const GRID_COLUMNS = 12;
const GRID_ROWS = 8;

function roundChannel(value) {
  return Math.max(0, Math.min(255, Math.round(value / 4) * 4));
}

function createBitmapSignature(image) {
  const { width, height } = image.getSize();
  const bitmap = image.toBitmap();
  const cells = [];
  let totalRed = 0;
  let totalGreen = 0;
  let totalBlue = 0;
  let totalLuma = 0;
  let totalSamples = 0;

  for (let row = 0; row < GRID_ROWS; row += 1) {
    const top = Math.floor((row * height) / GRID_ROWS);
    const bottom = Math.max(top + 1, Math.floor(((row + 1) * height) / GRID_ROWS));
    const sampleStepY = Math.max(1, Math.floor((bottom - top) / 10));

    for (let column = 0; column < GRID_COLUMNS; column += 1) {
      const left = Math.floor((column * width) / GRID_COLUMNS);
      const right = Math.max(left + 1, Math.floor(((column + 1) * width) / GRID_COLUMNS));
      const sampleStepX = Math.max(1, Math.floor((right - left) / 10));
      let red = 0;
      let green = 0;
      let blue = 0;
      let count = 0;

      for (let y = top; y < bottom; y += sampleStepY) {
        for (let x = left; x < right; x += sampleStepX) {
          const offset = (y * width + x) * 4;
          blue += bitmap[offset] || 0;
          green += bitmap[offset + 1] || 0;
          red += bitmap[offset + 2] || 0;
          count += 1;
        }
      }

      const cell = [
        roundChannel(red / Math.max(1, count)),
        roundChannel(green / Math.max(1, count)),
        roundChannel(blue / Math.max(1, count))
      ];
      cells.push(cell);
      totalRed += red;
      totalGreen += green;
      totalBlue += blue;
      totalLuma += 0.2126 * red + 0.7152 * green + 0.0722 * blue;
      totalSamples += count;
    }
  }

  return Object.freeze({
    width,
    height,
    columns: GRID_COLUMNS,
    rows: GRID_ROWS,
    average: [
      roundChannel(totalRed / Math.max(1, totalSamples)),
      roundChannel(totalGreen / Math.max(1, totalSamples)),
      roundChannel(totalBlue / Math.max(1, totalSamples))
    ],
    luma: Math.round(totalLuma / Math.max(1, totalSamples)),
    cells
  });
}

async function collectLayoutEvidence(window) {
  return window.webContents.executeJavaScript(
    `(() => {
    const round = value => Math.round(Number(value || 0));
    const visible = node => Boolean(node && node.getClientRects().length > 0);
    const selectors = [
      '.workspace-header',
      '.workspace-tools-panel',
      '.map-layer-popover',
      '.workspace-module-popover',
      '.context-inspector',
      '.auth-brandbar',
      '.auth-intro',
      '.auth-panel',
      '.manage-topbar',
      '.manage-sidebar',
      '.manage-content',
      '.site-nav',
      '.hub-intro',
      '.hub-sidebar',
      '.hub-content',
      '.page-hero',
      '.doc-toc',
      '.doc-content'
    ];
    const anchors = {};
    selectors.forEach(selector => {
      const node = document.querySelector(selector);
      if (!visible(node)) return;
      const rect = node.getBoundingClientRect();
      anchors[selector] = {
        x: round(rect.x),
        y: round(rect.y),
        width: round(rect.width),
        height: round(rect.height)
      };
    });
    const rootStyle = getComputedStyle(document.documentElement);
    const bodyStyle = getComputedStyle(document.body);
    const themeVariables = {};
    [
      '--accent',
      '--primary',
      '--paper',
      '--surface',
      '--workspace-accent',
      '--color-accent'
    ].forEach(name => {
      const value = rootStyle.getPropertyValue(name).trim();
      if (value) themeVariables[name] = value;
    });
    const stableBodyClasses = Array.from(document.body.classList)
      .filter(name => /^(site-page|theme-|glass-|motion-|manage-)/.test(name))
      .sort();
    const viewportWidth = document.documentElement.clientWidth;
    const overflowElements = Array.from(document.body.querySelectorAll('*'))
      .map(node => {
        const rect = node.getBoundingClientRect();
        return {
          selector: node.id
            ? '#' + node.id
            : node.classList.length
              ? node.tagName.toLowerCase() + '.' + Array.from(node.classList).slice(0, 3).join('.')
              : node.tagName.toLowerCase(),
          left: round(rect.left),
          right: round(rect.right),
          width: round(rect.width),
          excess: round(Math.max(0, rect.right - viewportWidth, -rect.left))
        };
      })
      .filter(item => item.width > 0 && item.excess > 2)
      .sort((left, right) => right.excess - left.excess)
      .slice(0, 12);
    return {
      viewport: { width: window.innerWidth, height: window.innerHeight, devicePixelRatio: window.devicePixelRatio },
      document: {
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
        clientHeight: document.documentElement.clientHeight,
        scrollHeight: document.documentElement.scrollHeight,
        horizontalOverflow: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth)
      },
      identity: {
        pathname: location.pathname,
        bodyClasses: stableBodyClasses,
        themeColor: document.querySelector('meta[name="theme-color"]')?.content || '',
        backgroundColor: bodyStyle.backgroundColor,
        color: bodyStyle.color,
        themeVariables
      },
      anchors,
      overflowElements
    };
  })()`,
    true
  );
}

async function writeVisualEvidence(window, outputDirectory, name, image) {
  if (!outputDirectory) return;
  const evidence = {
    version: 1,
    name,
    bitmap: createBitmapSignature(image),
    layout: await collectLayoutEvidence(window)
  };
  await mkdir(outputDirectory, { recursive: true });
  await writeFile(path.join(outputDirectory, `${name}.visual.json`), `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
}

module.exports = {
  createBitmapSignature,
  writeVisualEvidence
};
