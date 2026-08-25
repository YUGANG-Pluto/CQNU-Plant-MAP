function runRendererMotionSmoke() {
  const parseDurationList = value => String(value || '')
    .split(',')
    .map(item => item.trim())
    .filter(Boolean)
    .map(item => {
      const duration = Number.parseFloat(item);
      if (!Number.isFinite(duration)) return Number.NaN;
      return item.endsWith('ms') ? duration : duration * 1000;
    });
  const reducedMotionPreferred = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const moduleButton = document.querySelector('.ui-module-button');
  const moduleButtonStyle = moduleButton ? getComputedStyle(moduleButton) : null;
  const moduleTransitionDurations = parseDurationList(moduleButtonStyle?.transitionDuration);

  return {
    reducedMotionPreferred,
    moduleTransitionDurations,
    moduleMotionRuntimeReady: reducedMotionPreferred || (
      moduleTransitionDurations.some(duration => duration >= 260) &&
      String(moduleButtonStyle?.transitionProperty || '').includes('transform')
    )
  };
}

module.exports = { runRendererMotionSmoke };
