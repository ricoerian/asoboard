import { TestBed } from '@angular/core/testing';
import { ToolbarComponent } from './toolbar';
import { CanvasComponent } from '../canvas/canvas';
import { BrushPreset } from '../../../models/types';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { describe, it, expect, beforeEach } from 'vitest';

describe('Brush Presets - Toolbar (Agent Justin)', () => {
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

  describe('Brush preset list (Agent Justin)', () => {
    it('should have 8 brush presets defined', () => {
      expect(toolbar.brushPresetList.length).toBe(8);
    });

    it('should include Round, Calligraphy, Square, Crayon presets', () => {
      const names = toolbar.brushPresetList.map((p) => p.id);
      expect(names).toContain('round');
      expect(names).toContain('calligraphy');
      expect(names).toContain('square');
      expect(names).toContain('crayon');
    });

    it('should include Fine Pen, Spray, Highlighter, Watercolor', () => {
      const ids = toolbar.brushPresetList.map((p) => p.id);
      expect(ids).toContain('fine-pen');
      expect(ids).toContain('spray');
      expect(ids).toContain('highlighter');
      expect(ids).toContain('watercolor');
    });

    it('each preset should have id, name, icon, description', () => {
      for (const preset of toolbar.brushPresetList) {
        expect(preset.id).toBeTruthy();
        expect(preset.name).toBeTruthy();
        expect(preset.icon).toBeTruthy();
        expect(preset.description).toBeTruthy();
      }
    });

    it('all preset ids should be unique', () => {
      const ids = toolbar.brushPresetList.map((p) => p.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });
  });

  describe('Brush state (Agent Justin)', () => {
    it('default brush preset should be round', () => {
      expect(toolbar.currentBrushPreset).toBe('round');
    });

    it('showBrushPanel should be false by default', () => {
      expect(toolbar.showBrushPanel).toBe(false);
    });
  });

  describe('selectBrushPreset (Agent Justin)', () => {
    it('should update currentBrushPreset', () => {
      toolbar.selectBrushPreset('calligraphy');
      expect(toolbar.currentBrushPreset).toBe('calligraphy');
    });

    it('should emit currentBrushPresetChange', () => {
      let emitted: BrushPreset | null = null;
      toolbar.currentBrushPresetChange.subscribe((v) => (emitted = v));
      toolbar.selectBrushPreset('square');
      expect(emitted).toBe('square');
    });

    it('should close brush panel after selection', () => {
      toolbar.showBrushPanel = true;
      toolbar.selectBrushPreset('crayon');
      expect(toolbar.showBrushPanel).toBe(false);
    });

    it('can select all 8 presets', () => {
      const all: BrushPreset[] = [
        'round',
        'calligraphy',
        'square',
        'crayon',
        'fine-pen',
        'spray',
        'highlighter',
        'watercolor',
      ];
      for (const preset of all) {
        toolbar.selectBrushPreset(preset);
        expect(toolbar.currentBrushPreset).toBe(preset);
      }
    });
  });

  describe('isBrushActive (Agent Justin)', () => {
    it('should return true for current preset', () => {
      toolbar.currentBrushPreset = 'watercolor';
      expect(toolbar.isBrushActive('watercolor')).toBe(true);
    });

    it('should return false for non-current preset', () => {
      toolbar.currentBrushPreset = 'watercolor';
      expect(toolbar.isBrushActive('round')).toBe(false);
      expect(toolbar.isBrushActive('crayon')).toBe(false);
    });

    it('should work for all presets', () => {
      const presets: BrushPreset[] = [
        'round',
        'calligraphy',
        'square',
        'crayon',
        'fine-pen',
        'spray',
        'highlighter',
        'watercolor',
      ];
      for (const preset of presets) {
        toolbar.currentBrushPreset = preset;
        expect(toolbar.isBrushActive(preset)).toBe(true);
        for (const other of presets) {
          if (other !== preset) {
            expect(toolbar.isBrushActive(other)).toBe(false);
          }
        }
      }
    });
  });

  describe('toggleBrushPanel (Agent Justin)', () => {
    it('should toggle brush panel open and close', () => {
      expect(toolbar.showBrushPanel).toBe(false);
      toolbar.toggleBrushPanel();
      expect(toolbar.showBrushPanel).toBe(true);
      toolbar.toggleBrushPanel();
      expect(toolbar.showBrushPanel).toBe(false);
    });

    it('should close dash panel when opening brush panel', () => {
      toolbar.showDashPanel = true;
      toolbar.toggleBrushPanel();
      expect(toolbar.showBrushPanel).toBe(true);
      expect(toolbar.showDashPanel).toBe(false);
    });

    it('should close fill panel when opening brush panel', () => {
      toolbar.showFillPanel = true;
      toolbar.toggleBrushPanel();
      expect(toolbar.showBrushPanel).toBe(true);
      expect(toolbar.showFillPanel).toBe(false);
    });

    it('dash panel opening should close brush panel', () => {
      toolbar.showBrushPanel = true;
      toolbar.toggleDashPanel();
      expect(toolbar.showBrushPanel).toBe(false);
      expect(toolbar.showDashPanel).toBe(true);
    });

    it('fill panel opening should close brush panel', () => {
      toolbar.showBrushPanel = true;
      toolbar.toggleFillPanel();
      expect(toolbar.showBrushPanel).toBe(false);
      expect(toolbar.showFillPanel).toBe(true);
    });

    it('only one panel can be open at a time', () => {
      toolbar.toggleDashPanel();
      expect(toolbar.showDashPanel).toBe(true);
      toolbar.toggleFillPanel();
      expect(toolbar.showFillPanel).toBe(true);
      expect(toolbar.showDashPanel).toBe(false);
      toolbar.toggleBrushPanel();
      expect(toolbar.showBrushPanel).toBe(true);
      expect(toolbar.showFillPanel).toBe(false);
    });
  });
});

describe('Brush Presets - Canvas (Agent Justin)', () => {
  let canvas: CanvasComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [CanvasComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const fixture = TestBed.createComponent(CanvasComponent);
    canvas = fixture.componentInstance;
  });

  describe('brushPresets config (Agent Justin)', () => {
    it('should have 8 presets defined', () => {
      const keys = Object.keys(canvas.brushPresets);
      expect(keys.length).toBe(8);
    });

    it('should contain all preset types', () => {
      const keys = Object.keys(canvas.brushPresets) as BrushPreset[];
      expect(keys).toContain('round');
      expect(keys).toContain('calligraphy');
      expect(keys).toContain('square');
      expect(keys).toContain('crayon');
      expect(keys).toContain('fine-pen');
      expect(keys).toContain('spray');
      expect(keys).toContain('highlighter');
      expect(keys).toContain('watercolor');
    });

    it('each preset must have name, icon, tension, lineCap, lineJoin', () => {
      for (const preset of Object.values(canvas.brushPresets)) {
        expect(preset.name).toBeTruthy();
        expect(preset.icon).toBeTruthy();
        expect(typeof preset.tension).toBe('number');
        expect(['round', 'square', 'butt']).toContain(preset.lineCap);
        expect(['round', 'miter', 'bevel']).toContain(preset.lineJoin);
      }
    });

    it('highlighter should have opacity < 1', () => {
      expect(canvas.brushPresets.highlighter.opacity).toBeLessThan(1);
    });

    it('watercolor should have opacity < 1 and shadowBlur > 0', () => {
      expect(canvas.brushPresets.watercolor.opacity).toBeLessThan(1);
      expect(canvas.brushPresets.watercolor.shadowBlur).toBeGreaterThan(0);
    });

    it('crayon should have low tension', () => {
      expect(canvas.brushPresets.crayon.tension).toBeLessThan(0.5);
    });

    it('fine-pen should have high tension', () => {
      expect(canvas.brushPresets['fine-pen'].tension).toBeGreaterThan(0.5);
    });

    it('calligraphy should have butt lineCap and miter lineJoin', () => {
      expect(canvas.brushPresets.calligraphy.lineCap).toBe('butt');
      expect(canvas.brushPresets.calligraphy.lineJoin).toBe('miter');
    });
  });

  describe('getBrushProps (Agent Justin)', () => {
    it('should return props for round preset', () => {
      const props = canvas.getBrushProps('round');
      expect(props.tension).toBe(0.5);
      expect(props.lineCap).toBe('round');
      expect(props.lineJoin).toBe('round');
    });

    it('should return props for calligraphy preset', () => {
      const props = canvas.getBrushProps('calligraphy');
      expect(props.lineCap).toBe('butt');
      expect(props.lineJoin).toBe('miter');
      expect(props.tension).toBeLessThan(0.5);
    });

    it('should return props for all valid presets', () => {
      const all: BrushPreset[] = [
        'round',
        'calligraphy',
        'square',
        'crayon',
        'fine-pen',
        'spray',
        'highlighter',
        'watercolor',
      ];
      for (const preset of all) {
        const props = canvas.getBrushProps(preset);
        expect(props).toBeDefined();
        expect(typeof props.tension).toBe('number');
      }
    });

    it('should return round props for invalid preset (fallback)', () => {
      const props = canvas.getBrushProps('non-existent' as BrushPreset);

      expect(props).toEqual(canvas.brushPresets['round']);
    });

    it('highlighter opacity is 0.4', () => {
      const props = canvas.getBrushProps('highlighter');
      expect(props.opacity).toBe(0.4);
    });

    it('watercolor shadowBlur is 5', () => {
      const props = canvas.getBrushProps('watercolor');
      expect(props.shadowBlur).toBe(5);
    });

    it('square lineCap is square', () => {
      const props = canvas.getBrushProps('square');
      expect(props.lineCap).toBe('square');
    });

    it('round preset has no opacity or shadowBlur by default', () => {
      const props = canvas.getBrushProps('round');
      expect(props.opacity).toBeUndefined();
      expect(props.shadowBlur).toBeUndefined();
    });
  });

  describe('currentBrushPreset input (Agent Justin)', () => {
    it('should default to round', () => {
      expect(canvas.currentBrushPreset).toBe('round');
    });

    it('should accept all 8 valid presets', () => {
      const all: BrushPreset[] = [
        'round',
        'calligraphy',
        'square',
        'crayon',
        'fine-pen',
        'spray',
        'highlighter',
        'watercolor',
      ];
      for (const preset of all) {
        canvas.currentBrushPreset = preset;
        expect(canvas.currentBrushPreset).toBe(preset);
      }
    });
  });
});
