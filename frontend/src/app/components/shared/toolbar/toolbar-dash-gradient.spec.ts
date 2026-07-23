import { TestBed } from '@angular/core/testing';
import { ToolbarComponent } from './toolbar';
import { CanvasComponent } from '../canvas/canvas';
import { CanvasEvent } from '../../../models/types';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { describe, it, expect, beforeEach } from 'vitest';

describe('Stroke Dash & Gradient Fills - Toolbar (Agent Justin)', () => {
  let toolbar: ToolbarComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ToolbarComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const fixture = TestBed.createComponent(ToolbarComponent);
    toolbar = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('Dash presets (Agent Justin)', () => {
    it('should have 6 predefined dash patterns', () => {
      expect(toolbar.dashPresets.length).toBe(6);
    });

    it('should have Solid as first preset with empty array', () => {
      expect(toolbar.dashPresets[0].name).toBe('Solid');
      expect(toolbar.dashPresets[0].value).toEqual([]);
    });

    it('should include Dashed, Dotted, Dash-Dot, Long Dash, Double Dash', () => {
      const names = toolbar.dashPresets.map((p) => p.name);
      expect(names).toContain('Dashed');
      expect(names).toContain('Dotted');
      expect(names).toContain('Dash-Dot');
      expect(names).toContain('Long Dash');
      expect(names).toContain('Double Dash');
    });

    it('selectDashPattern should emit and update state', () => {
      let emitted: number[] | null = null;
      toolbar.strokeDashChange.subscribe((v) => (emitted = v));
      toolbar.selectDashPattern([15, 8]);
      expect(toolbar.strokeDash).toEqual([15, 8]);
      expect(emitted).toEqual([15, 8]);
    });

    it('isDashActive for Solid (empty array)', () => {
      toolbar.strokeDash = [];
      expect(toolbar.isDashActive([])).toBe(true);
      expect(toolbar.isDashActive([15, 8])).toBe(false);
    });

    it('isDashActive for Dashed ([15,8])', () => {
      toolbar.strokeDash = [15, 8];
      expect(toolbar.isDashActive([15, 8])).toBe(true);
      expect(toolbar.isDashActive([])).toBe(false);
      expect(toolbar.isDashActive([3, 6])).toBe(false);
    });

    it('isDashActive uses deep equality', () => {
      toolbar.strokeDash = [15, 8];
      expect(toolbar.isDashActive([15, 9])).toBe(false);
      expect(toolbar.isDashActive([15, 8, 2])).toBe(false);
    });
  });

  describe('Fill type (Agent Justin)', () => {
    it('default fillType should be solid', () => {
      expect(toolbar.fillType).toBe('solid');
    });

    it('setFillType should emit change', () => {
      let emitted: string | null = null;
      toolbar.fillTypeChange.subscribe((v) => (emitted = v));
      toolbar.setFillType('linear');
      expect(toolbar.fillType).toBe('linear');
      expect(emitted).toBe('linear');
    });

    it('setFillType to radial and none', () => {
      toolbar.setFillType('radial');
      expect(toolbar.fillType).toBe('radial');
      toolbar.setFillType('none');
      expect(toolbar.fillType).toBe('none');
    });
  });

  describe('Gradient colors (Agent Justin)', () => {
    it('should have default gradient colors', () => {
      expect(toolbar.fillGradientColor1).toBeDefined();
      expect(toolbar.fillGradientColor2).toBeDefined();
    });

    it('setGradientColor1 should emit change', () => {
      let emitted: string | null = null;
      toolbar.fillGradientColor1Change.subscribe((v) => (emitted = v));
      toolbar.setGradientColor1('#ff0000');
      expect(toolbar.fillGradientColor1).toBe('#ff0000');
      expect(emitted).toBe('#ff0000');
    });

    it('setGradientColor2 should emit change', () => {
      let emitted: string | null = null;
      toolbar.fillGradientColor2Change.subscribe((v) => (emitted = v));
      toolbar.setGradientColor2('#00ff00');
      expect(toolbar.fillGradientColor2).toBe('#00ff00');
      expect(emitted).toBe('#00ff00');
    });
  });

  describe('Gradient direction (Agent Justin)', () => {
    it('should have 4 predefined directions', () => {
      expect(toolbar.gradientDirections.length).toBe(4);
    });

    it('default direction should be to-right', () => {
      expect(toolbar.fillGradientDirection).toBe('to-right');
    });

    it('setGradientDirection should emit change', () => {
      let emitted: string | null = null;
      toolbar.fillGradientDirectionChange.subscribe((v) => (emitted = v));
      toolbar.setGradientDirection('to-bottom');
      expect(toolbar.fillGradientDirection).toBe('to-bottom');
      expect(emitted).toBe('to-bottom');
    });

    it('all direction options exist', () => {
      const ids = toolbar.gradientDirections.map((d) => d.id);
      expect(ids).toContain('to-right');
      expect(ids).toContain('to-bottom');
      expect(ids).toContain('to-bottom-right');
      expect(ids).toContain('to-top-right');
    });
  });

  describe('Panel toggle (Agent Justin)', () => {
    it('panels should be closed by default', () => {
      expect(toolbar.showDashPanel).toBe(false);
      expect(toolbar.showFillPanel).toBe(false);
    });

    it('toggleDashPanel should open/close', () => {
      toolbar.toggleDashPanel();
      expect(toolbar.showDashPanel).toBe(true);
      toolbar.toggleDashPanel();
      expect(toolbar.showDashPanel).toBe(false);
    });

    it('opening dash panel should close fill panel', () => {
      toolbar.showFillPanel = true;
      toolbar.toggleDashPanel();
      expect(toolbar.showDashPanel).toBe(true);
      expect(toolbar.showFillPanel).toBe(false);
    });

    it('opening fill panel should close dash panel', () => {
      toolbar.showDashPanel = true;
      toolbar.toggleFillPanel();
      expect(toolbar.showFillPanel).toBe(true);
      expect(toolbar.showDashPanel).toBe(false);
    });
  });

  describe('dashPreviewStyle (Agent Justin)', () => {
    it('should return empty string for solid', () => {
      toolbar.strokeDash = [];
      expect(toolbar.dashPreviewStyle).toBe('');
    });

    it('should format px values', () => {
      toolbar.strokeDash = [10, 5];
      expect(toolbar.dashPreviewStyle).toBe('10px 5px');
    });

    it('should handle multi-segment patterns', () => {
      toolbar.strokeDash = [15, 5, 3, 5];
      expect(toolbar.dashPreviewStyle).toBe('15px 5px 3px 5px');
    });
  });
});

describe('Stroke Dash & Gradient Fills - Canvas (Agent Justin)', () => {
  let canvas: CanvasComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [CanvasComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const fixture = TestBed.createComponent(CanvasComponent);
    canvas = fixture.componentInstance;
  });

  describe('buildFillProps (Agent Justin)', () => {
    it('should return solid fill for default event', () => {
      const ev: CanvasEvent = { type: 'rect', timestamp: 0, stroke: '#ff0000' };
      const props = canvas.buildFillProps(ev);
      expect(props['fill']).toBe('#ff0000');
    });

    it('should return undefined fill for none type', () => {
      const ev: CanvasEvent = { type: 'rect', timestamp: 0, fillType: 'none' };
      const props = canvas.buildFillProps(ev);
      expect(props['fill']).toBeUndefined();
    });

    it('should return linear gradient props', () => {
      const ev: CanvasEvent = {
        type: 'rect',
        timestamp: 0,
        fillType: 'linear',
        width: 100,
        height: 100,
        fillLinearGradientColorStops: [0, 'red', 1, 'blue'],
      };
      const props = canvas.buildFillProps(ev);
      expect(props['fillLinearGradientColorStops']).toEqual([0, 'red', 1, 'blue']);
      expect(props['fillLinearGradientStartPoint']).toBeDefined();
      expect(props['fillLinearGradientEndPoint']).toBeDefined();
    });

    it('should return radial gradient props', () => {
      const ev: CanvasEvent = {
        type: 'circle',
        timestamp: 0,
        fillType: 'radial',
        width: 100,
        height: 100,
      };
      const props = canvas.buildFillProps(ev);
      expect(props['fillRadialGradientStartPoint']).toBeDefined();
      expect(props['fillRadialGradientColorStops']).toBeDefined();
    });

    it('should respect explicit gradient start/end points', () => {
      const ev: CanvasEvent = {
        type: 'rect',
        timestamp: 0,
        fillType: 'linear',
        fillLinearGradientStartPoint: [10, 20],
        fillLinearGradientEndPoint: [90, 20],
        fillLinearGradientColorStops: [0, 'red', 1, 'blue'],
      };
      const props = canvas.buildFillProps(ev);
      expect(props['fillLinearGradientStartPoint']).toEqual([10, 20]);
      expect(props['fillLinearGradientEndPoint']).toEqual([90, 20]);
    });
  });

  describe('buildGradientPointsForShape (Agent Justin)', () => {
    it('to-right: start (0,0) end (w,0)', () => {
      const ev: CanvasEvent = { type: 'rect', timestamp: 0, fillGradientDirection: 'to-right' };
      const [start, end] = canvas.buildGradientPointsForShape(ev, 100, 50);
      expect(start).toEqual([0, 0]);
      expect(end).toEqual([100, 0]);
    });

    it('to-bottom: start (0,0) end (0,h)', () => {
      const ev: CanvasEvent = { type: 'rect', timestamp: 0, fillGradientDirection: 'to-bottom' };
      const [start, end] = canvas.buildGradientPointsForShape(ev, 100, 50);
      expect(start).toEqual([0, 0]);
      expect(end).toEqual([0, 50]);
    });

    it('to-bottom-right: diagonal', () => {
      const ev: CanvasEvent = {
        type: 'rect',
        timestamp: 0,
        fillGradientDirection: 'to-bottom-right',
      };
      const [start, end] = canvas.buildGradientPointsForShape(ev, 100, 50);
      expect(start).toEqual([0, 0]);
      expect(end).toEqual([100, 50]);
    });

    it('to-top-right: inverse diagonal', () => {
      const ev: CanvasEvent = {
        type: 'rect',
        timestamp: 0,
        fillGradientDirection: 'to-top-right',
      };
      const [start, end] = canvas.buildGradientPointsForShape(ev, 100, 50);
      expect(start).toEqual([0, 50]);
      expect(end).toEqual([100, 0]);
    });

    it('default to to-right when direction missing', () => {
      const ev: CanvasEvent = { type: 'rect', timestamp: 0 };
      const [start, end] = canvas.buildGradientPointsForShape(ev, 100, 50);
      expect(start).toEqual([0, 0]);
      expect(end).toEqual([100, 0]);
    });
  });

  describe('buildLiveFillProps (Agent Justin)', () => {
    it('should respect fillType=none', () => {
      canvas.fillType = 'none';
      const props = canvas.buildLiveFillProps('red');
      expect(props['fill']).toBeUndefined();
    });

    it('should use stroke color for solid fill', () => {
      canvas.fillType = 'solid';
      const props = canvas.buildLiveFillProps('#abcdef');
      expect(props['fill']).toBe('#abcdef');
    });

    it('should build linear gradient with current colors', () => {
      canvas.fillType = 'linear';
      canvas.fillGradientColor1 = '#ff0000';
      canvas.fillGradientColor2 = '#0000ff';
      canvas.fillGradientDirection = 'to-right';
      const props = canvas.buildLiveFillProps('blue');
      expect(props['fillLinearGradientColorStops']).toEqual([0, '#ff0000', 1, '#0000ff']);
      expect(props['fillLinearGradientStartPoint']).toEqual([0, 0]);
      expect(props['fillLinearGradientEndPoint']).toEqual([100, 0]);
    });

    it('should build radial gradient with current colors', () => {
      canvas.fillType = 'radial';
      canvas.fillGradientColor1 = '#ffff00';
      canvas.fillGradientColor2 = '#00ff00';
      const props = canvas.buildLiveFillProps('red');
      expect(props['fillRadialGradientColorStops']).toEqual([0, '#ffff00', 1, '#00ff00']);
      expect(props['fillRadialGradientStartRadius']).toBe(0);
    });

    it('should change points based on direction', () => {
      canvas.fillType = 'linear';
      canvas.fillGradientColor1 = '#ff0000';
      canvas.fillGradientColor2 = '#0000ff';

      canvas.fillGradientDirection = 'to-bottom';
      let props = canvas.buildLiveFillProps('blue');
      expect(props['fillLinearGradientEndPoint']).toEqual([0, 100]);

      canvas.fillGradientDirection = 'to-bottom-right';
      props = canvas.buildLiveFillProps('blue');
      expect(props['fillLinearGradientEndPoint']).toEqual([100, 100]);
    });
  });
});
