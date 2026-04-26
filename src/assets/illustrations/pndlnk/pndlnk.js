import { AnimationLoop } from '../core/animation.js';
import { PndlnkModel } from './pndlnk-model.js';
import { PndlnkRenderer } from './pndlnk-renderer.js';
import { parsePndlnkConfig } from './pndlnk-config.js';

export class PndlnkIllustration {
  constructor(container) {
    this.container = container;
    this.canvas = container.querySelector('.illustration-canvas');

    if (!this.canvas) {
      throw new Error('Canvas element not found in container');
    }

    this.config = parsePndlnkConfig(container);
    this.model = new PndlnkModel(this.config);
    this.renderer = new PndlnkRenderer(this.canvas, container, this.config);
    this.animation = new AnimationLoop(() => this.onFrame());

    this.isLoaded = false;
    this.resizeObserver = null;
  }

  async loadSVG() {
    const response = await fetch('/assets/logo/pndlnk-abbr-logo_RGB.svg');
    if (!response.ok) throw new Error(`Failed to load SVG: ${response.statusText}`);
    const svgContent = await response.text();
    this.model.loadSVG(svgContent);
    this.isLoaded = true;
  }

  onFrame() {
    if (!this.isLoaded) return;
    this.model.updateAnimations();
    this.renderer.render(this.model);
  }

  async start() {
    await this.loadSVG();
    this.initResizeObserver();
    this.animation.start();
    this.renderer.render(this.model);
  }

  stop() {
    this.animation.stop();
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
  }

  initResizeObserver() {
    if (this.resizeObserver) this.resizeObserver.disconnect();

    this.resizeObserver = new ResizeObserver(() => {
      if (this.isLoaded) {
        this.renderer.setupCanvas();
        this.renderer.render(this.model);
      }
    });

    this.resizeObserver.observe(this.container);
  }
}
