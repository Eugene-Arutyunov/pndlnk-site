import { rotatePoint, project3DTo2D } from '../core/geometry3d.js';

function cubicBezierPoint(p0, p1, p2, p3, t) {
  const mt = 1 - t;
  return mt * mt * mt * p0 + 3 * mt * mt * t * p1 + 3 * mt * t * t * p2 + t * t * t * p3;
}

function appendCubicBezier(ring, x0, y0, x1, y1, x2, y2, x3, y3) {
  const N = 8;
  for (let k = 1; k <= N; k++) {
    const t = k / N;
    ring.push({
      x: cubicBezierPoint(x0, x1, x2, x3, t),
      y: cubicBezierPoint(y0, y1, y2, y3, t)
    });
  }
}

/**
 * Парсит один path `d` и возвращает объект {rings: [[{x,y}], ...]}
 * Каждый замкнутый sub-path (M...Z) становится отдельным ring.
 * Все rings одного path-элемента хранятся вместе, чтобы evenodd-заливка
 * корректно пробивала дырки (второй ring внутри первого — дырка).
 */
function parsePathD(d, centerX, centerY) {
  const tokenRe = /([MmLlHhVvCcSsQqTtAaZz])|(-?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?)/g;
  const tokens = [];
  let m;
  while ((m = tokenRe.exec(d)) !== null) tokens.push(m[0]);

  let i = 0;
  let cx = 0, cy = 0, startX = 0, startY = 0;
  let current = [];
  const rings = [];

  const isNum = () => i < tokens.length && /^-?[\d.]/.test(tokens[i]);
  const num = () => parseFloat(tokens[i++]);

  const flushRing = () => {
    if (current.length >= 3) {
      rings.push(current.map(p => ({ x: p.x - centerX, y: p.y - centerY })));
    }
    current = [];
  };

  while (i < tokens.length) {
    const cmd = tokens[i++];
    switch (cmd) {
      case 'M':
        flushRing();
        cx = num(); cy = num();
        startX = cx; startY = cy;
        current = [{ x: cx, y: cy }];
        while (isNum()) { cx = num(); cy = num(); current.push({ x: cx, y: cy }); }
        break;
      case 'm':
        flushRing();
        cx += num(); cy += num();
        startX = cx; startY = cy;
        current = [{ x: cx, y: cy }];
        while (isNum()) { cx += num(); cy += num(); current.push({ x: cx, y: cy }); }
        break;
      case 'L': while (isNum()) { cx = num(); cy = num(); current.push({ x: cx, y: cy }); } break;
      case 'l': while (isNum()) { cx += num(); cy += num(); current.push({ x: cx, y: cy }); } break;
      case 'H': while (isNum()) { cx = num(); current.push({ x: cx, y: cy }); } break;
      case 'h': while (isNum()) { cx += num(); current.push({ x: cx, y: cy }); } break;
      case 'V': while (isNum()) { cy = num(); current.push({ x: cx, y: cy }); } break;
      case 'v': while (isNum()) { cy += num(); current.push({ x: cx, y: cy }); } break;
      case 'C':
        while (isNum()) {
          const x1 = num(), y1 = num(), x2 = num(), y2 = num(), x = num(), y = num();
          appendCubicBezier(current, cx, cy, x1, y1, x2, y2, x, y);
          cx = x; cy = y;
        }
        break;
      case 'c':
        while (isNum()) {
          const dx1 = num(), dy1 = num(), dx2 = num(), dy2 = num(), dx = num(), dy = num();
          appendCubicBezier(current, cx, cy, cx + dx1, cy + dy1, cx + dx2, cy + dy2, cx + dx, cy + dy);
          cx += dx; cy += dy;
        }
        break;
      case 'Z':
      case 'z':
        current.push({ x: startX, y: startY });
        flushRing();
        cx = startX; cy = startY;
        break;
    }
  }

  if (current.length >= 3) {
    rings.push(current.map(p => ({ x: p.x - centerX, y: p.y - centerY })));
  }

  return rings.length > 0 ? { rings } : null;
}

function parseSVG(svgContent) {
  const parser = new DOMParser();
  const svgDoc = parser.parseFromString(svgContent, 'image/svg+xml');

  const parserError = svgDoc.querySelector('parsererror');
  if (parserError) throw new Error(`SVG parsing error: ${parserError.textContent}`);

  const svgElement = svgDoc.documentElement;
  const viewBox = svgElement.getAttribute('viewBox');
  const viewBoxValues = viewBox ? viewBox.split(/\s+/).map(Number) : [0, 0, 470.2, 161.6];
  const [minX, minY, width, height] = viewBoxValues;
  const centerX = minX + width / 2;
  const centerY = minY + height / 2;

  const fills = [];

  // Каждый path-элемент → один fill с потенциально несколькими rings (дырки через evenodd)
  svgElement.querySelectorAll('path.cls-1').forEach(el => {
    const d = el.getAttribute('d');
    if (!d) return;
    const fill = parsePathD(d, centerX, centerY);
    if (fill) fills.push(fill);
  });

  // Каждый polyline → один fill с одним ring
  svgElement.querySelectorAll('polyline.cls-1').forEach(el => {
    const pts = el.getAttribute('points');
    if (!pts) return;
    const coords = pts.trim().split(/[\s,]+/);
    const ring = [];
    for (let i = 0; i + 1 < coords.length; i += 2) {
      ring.push({ x: parseFloat(coords[i]) - centerX, y: parseFloat(coords[i + 1]) - centerY });
    }
    if (ring.length >= 3) fills.push({ rings: [ring] });
  });

  return { fills, bounds: { width, height, centerX, centerY } };
}

function getGeometryCenter(geometry) {
  let sumX = 0, sumY = 0, count = 0;
  geometry.fills.forEach(fill => {
    fill.rings.forEach(ring => {
      ring.forEach(p => { sumX += p.x; sumY += p.y; count++; });
    });
  });
  return count === 0 ? { x: 0, y: 0 } : { x: sumX / count, y: sumY / count };
}

function easeInOut(t) {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

function rotate2DAroundCenter(point, center, angle) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const dx = point.x - center.x;
  const dy = point.y - center.y;
  return {
    x: dx * cos - dy * sin + center.x,
    y: dx * sin + dy * cos + center.y
  };
}

function calculateAutoScale(geometry, config) {
  const { rotationX, rotationY, rotationZ, layerSpacing, numLayers } = config;

  const rotX = (rotationX * Math.PI) / 180;
  const rotY = (rotationY * Math.PI) / 180;
  const rotZ = (rotationZ * Math.PI) / 180;

  const allPoints = [];
  geometry.fills.forEach(fill => {
    fill.rings.forEach(ring => {
      ring.forEach(p => allPoints.push({ ...p, z: 0 }));
    });
  });

  if (allPoints.length === 0) return 1;

  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;

  for (let layer = 0; layer < numLayers; layer++) {
    const z = layer * layerSpacing;
    allPoints.forEach(point => {
      const point3D = { x: point.x, y: point.y, z };
      const rotated = rotatePoint(point3D, { x: rotX, y: rotY, z: rotZ });
      const projected = project3DTo2D(rotated, { centerX: 500, centerY: 500 });
      minX = Math.min(minX, projected.x);
      maxX = Math.max(maxX, projected.x);
      minY = Math.min(minY, projected.y);
      maxY = Math.max(maxY, projected.y);
    });
  }

  if (!isFinite(minX) || !isFinite(maxX) || !isFinite(minY) || !isFinite(maxY)) return 1;

  const paddingTop = 20;
  const paddingBottom = 30;
  const paddingSides = 30;
  const availableWidth = 1000 - paddingSides * 2;
  const availableHeight = 500 - paddingTop - paddingBottom; // canvas 1000×500
  const scaleX = (maxX - minX) > 0 ? availableWidth / (maxX - minX) : 1;
  const scaleY = (maxY - minY) > 0 ? availableHeight / (maxY - minY) : 1;

  return Math.max(0.1, Math.min(Math.min(scaleX, scaleY), 10));
}

export class PndlnkModel {
  constructor(config) {
    this.config = config;
    this.geometry = null;
    this.layers = [];
    this.scale = config.scale || 1;
    this.geometryCenter = null;
    this.layerAnimations = [];
    this.animationStartTime = null;
  }

  loadSVG(svgContent) {
    this.geometry = parseSVG(svgContent);

    this.scale = this.config.scale
      ? this.config.scale
      : calculateAutoScale(this.geometry, this.config);

    this.geometry.fills.forEach(fill => {
      fill.rings.forEach(ring => {
        ring.forEach(p => { p.x *= this.scale; p.y *= this.scale; });
      });
    });

    this.geometryCenter = getGeometryCenter(this.geometry);
    this.initializeAnimations();
    this.createLayers();
  }

  initializeAnimations() {
    this.layerAnimations = [];
    const { animationDelay, numLayers, animationBaseAngle } = this.config;
    for (let i = 0; i < numLayers; i++) {
      this.layerAnimations.push({
        phase: 'forward',
        startTime: i * animationDelay,
        currentAngle: animationBaseAngle
      });
    }
    this.animationStartTime = null;
  }

  updateAnimations() {
    if (!this.geometry) return;

    const now = Date.now();
    if (this.animationStartTime === null) this.animationStartTime = now;

    const {
      animationBaseAngle,
      animationAngle,
      animationDurationForward,
      animationPauseAfterForward,
      animationDurationBackward,
      animationPauseAfterBackward
    } = this.config;

    const cycleDuration =
      animationDurationForward + animationPauseAfterForward +
      animationDurationBackward + animationPauseAfterBackward;

    this.layerAnimations.forEach(anim => {
      const elapsed = now - this.animationStartTime - anim.startTime;

      if (elapsed < 0) {
        anim.currentAngle = animationBaseAngle;
        anim.phase = 'forward';
        return;
      }

      const cycleTime = elapsed % cycleDuration;

      if (cycleTime < animationDurationForward) {
        anim.phase = 'forward';
        anim.currentAngle = animationBaseAngle + animationAngle * easeInOut(cycleTime / animationDurationForward);
      } else if (cycleTime < animationDurationForward + animationPauseAfterForward) {
        anim.phase = 'pause1';
        anim.currentAngle = animationBaseAngle + animationAngle;
      } else if (cycleTime < animationDurationForward + animationPauseAfterForward + animationDurationBackward) {
        anim.phase = 'backward';
        const progress = (cycleTime - animationDurationForward - animationPauseAfterForward) / animationDurationBackward;
        anim.currentAngle = animationBaseAngle + animationAngle * (1 - easeInOut(progress));
      } else {
        anim.phase = 'pause2';
        anim.currentAngle = animationBaseAngle;
      }
    });

    this.createLayers();
  }

  createLayers() {
    const { rotationX, rotationY, rotationZ, layerSpacing, numLayers } = this.config;
    const rotX = (rotationX * Math.PI) / 180;
    const rotY = (rotationY * Math.PI) / 180;
    const rotZ = (rotationZ * Math.PI) / 180;

    this.layers = [];

    for (let i = 0; i < numLayers; i++) {
      const z = i * layerSpacing;
      const animAngleRad = ((this.layerAnimations[i]?.currentAngle || 0) * Math.PI) / 180;

      const layer = { z, fills: [] };

      this.geometry.fills.forEach(fill => {
        const transformedRings = fill.rings.map(ring =>
          ring.map(point => {
            const rotated2D = rotate2DAroundCenter(point, this.geometryCenter, animAngleRad);
            const point3D = { x: rotated2D.x, y: rotated2D.y, z };
            const rotated = rotatePoint(point3D, { x: rotX, y: rotY, z: rotZ });
            return project3DTo2D(rotated, { centerX: 500, centerY: 500 });
          })
        );
        layer.fills.push({ rings: transformedRings, z });
      });

      this.layers.push(layer);
    }
  }

  getLayersForRender() {
    return [...this.layers].sort((a, b) => b.z - a.z);
  }
}
