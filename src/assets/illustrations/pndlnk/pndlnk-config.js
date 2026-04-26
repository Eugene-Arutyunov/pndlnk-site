export function parsePndlnkConfig(container) {
  const defaults = {
    rotationX: -41,
    rotationY: -25,
    rotationZ: -26,
    layerSpacing: 10,
    numLayers: 10,
    offsetX: 0,
    offsetY: -35,
    accentColor: '--ids__accent-RGB',
    backgroundColor: null,
    lineWidth: 3,
    scale: 1.99,
    animationBaseAngle: 15,
    animationAngle: 10,
    animationDurationForward: 1000,
    animationPauseAfterForward: 2500,
    animationDurationBackward: 1000,
    animationPauseAfterBackward: 2500,
    animationDelay: 10
  };

  const config = { ...defaults };

  if (container.dataset.rotationX) config.rotationX = parseFloat(container.dataset.rotationX);
  if (container.dataset.rotationY) config.rotationY = parseFloat(container.dataset.rotationY);
  if (container.dataset.rotationZ) config.rotationZ = parseFloat(container.dataset.rotationZ);
  if (container.dataset.layerSpacing) config.layerSpacing = parseFloat(container.dataset.layerSpacing);
  if (container.dataset.numLayers) config.numLayers = parseInt(container.dataset.numLayers);
  if (container.dataset.offsetX) config.offsetX = parseFloat(container.dataset.offsetX);
  if (container.dataset.offsetY) config.offsetY = parseFloat(container.dataset.offsetY);
  if (container.dataset.accentColor) config.accentColor = container.dataset.accentColor;
  if (container.dataset.backgroundColor) config.backgroundColor = container.dataset.backgroundColor;
  if (container.dataset.lineWidth) config.lineWidth = parseFloat(container.dataset.lineWidth);
  if (container.dataset.scale) config.scale = parseFloat(container.dataset.scale);
  if (container.dataset.animationBaseAngle) config.animationBaseAngle = parseFloat(container.dataset.animationBaseAngle);
  if (container.dataset.animationAngle) config.animationAngle = parseFloat(container.dataset.animationAngle);
  if (container.dataset.animationDurationForward) config.animationDurationForward = parseFloat(container.dataset.animationDurationForward);
  if (container.dataset.animationPauseAfterForward) config.animationPauseAfterForward = parseFloat(container.dataset.animationPauseAfterForward);
  if (container.dataset.animationDurationBackward) config.animationDurationBackward = parseFloat(container.dataset.animationDurationBackward);
  if (container.dataset.animationPauseAfterBackward) config.animationPauseAfterBackward = parseFloat(container.dataset.animationPauseAfterBackward);
  if (container.dataset.animationDelay) config.animationDelay = parseFloat(container.dataset.animationDelay);

  if (!config.backgroundColor) {
    throw new Error('data-background-color is required for pndlnk illustration');
  }

  return config;
}
