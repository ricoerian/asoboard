/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, no-empty */
import { TestBed } from '@angular/core/testing';
import { CanvasComponent } from './canvas';

const mockContext = {
  clearRect: () => {},
  fillRect: () => {},
  strokeRect: () => {},
  createRadialGradient: () => ({ addColorStop: () => {} }),
  createLinearGradient: () => ({ addColorStop: () => {} }),
  getImageData: () => ({ data: new Uint8ClampedArray(4) }),
  putImageData: () => {},
  drawImage: () => {},
  scale: () => {},
  translate: () => {},
  rotate: () => {},
  save: () => {},
  restore: () => {},
  beginPath: () => {},
  arc: () => {},
  rect: () => {},
  moveTo: () => {},
  lineTo: () => {},
  bezierCurveTo: () => {},
  quadraticCurveTo: () => {},
  fill: () => {},
  stroke: () => {},
  closePath: () => {},
  clip: () => {},
  measureText: () => ({ width: 0 }),
  setTransform: () => {},
  canvas: {
    clearRect: () => {},
    width: 100,
    height: 100,
  },
};

HTMLCanvasElement.prototype.getContext = function () {
  return mockContext as any;
};

if (typeof OffscreenCanvas !== 'undefined') {
  (OffscreenCanvas.prototype as any).getContext = function () {
    return mockContext as any;
  };
}

describe('CanvasComponent — Layer Management', () => {
  let canvas: CanvasComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CanvasComponent],
    }).compileComponents();

    const fixture = TestBed.createComponent(CanvasComponent);
    canvas = fixture.componentInstance;
  });

  describe('hasSelectedShape', () => {
    it('should return false when no shape is selected', () => {
      expect(canvas.hasSelectedShape()).toBe(false);
    });

    it('should return false when only selectedEventId is set without a shape', () => {
      canvas.selectedEventId = 'evt-1';
      expect(canvas.hasSelectedShape()).toBe(false);
    });
  });

  describe('bringToFront', () => {
    it('should return false when no shape is selected', () => {
      expect(canvas.bringToFront()).toBe(false);
    });

    it('should return false when selectedEventId is set but no Konva shape exists', () => {
      canvas.selectedEventId = 'evt-1';
      expect(canvas.bringToFront()).toBe(false);
    });
  });

  describe('sendToBack', () => {
    it('should return false when no shape is selected', () => {
      expect(canvas.sendToBack()).toBe(false);
    });

    it('should return false when selectedEventId is set but no Konva shape exists', () => {
      canvas.selectedEventId = 'evt-1';
      expect(canvas.sendToBack()).toBe(false);
    });
  });

  describe('bringForward', () => {
    it('should return false when no shape is selected', () => {
      expect(canvas.bringForward()).toBe(false);
    });

    it('should return false when selectedEventId is set but no Konva shape exists', () => {
      canvas.selectedEventId = 'evt-1';
      expect(canvas.bringForward()).toBe(false);
    });
  });

  describe('sendBackward', () => {
    it('should return false when no shape is selected', () => {
      expect(canvas.sendBackward()).toBe(false);
    });

    it('should return false when selectedEventId is set but no Konva shape exists', () => {
      canvas.selectedEventId = 'evt-1';
      expect(canvas.sendBackward()).toBe(false);
    });
  });

  describe('selectedEventId management', () => {
    it('should default to null', () => {
      expect(canvas.selectedEventId).toBeNull();
    });

    it('should accept a string value', () => {
      canvas.selectedEventId = 'shape-abc123';
      expect(canvas.selectedEventId).toBe('shape-abc123');
    });

    it('should be cleared by deselectAll', () => {
      canvas.selectedEventId = 'test-id';
      canvas.deselectAll();
      expect(canvas.selectedEventId).toBeNull();
    });
  });

  describe('deleteSelected', () => {
    it('should return false when no shape is selected', () => {
      expect(canvas.deleteSelected()).toBe(false);
    });

    it('should return false when selectedEventId is set without Konva shape', () => {
      canvas.selectedEventId = 'evt-1';
      expect(canvas.deleteSelected()).toBe(false);
    });
  });

  describe('deselectAll', () => {
    it('should not throw when nothing is selected', () => {
      expect(() => canvas.deselectAll()).not.toThrow();
    });

    it('should clear selectedEventId', () => {
      canvas.selectedEventId = 'test-id';
      canvas.deselectAll();
      expect(canvas.selectedEventId).toBeNull();
    });
  });

  describe('deselectImage (deprecated)', () => {
    it('should delegate to deselectAll', () => {
      canvas.selectedEventId = 'test-id';
      canvas.deselectImage();
      expect(canvas.selectedEventId).toBeNull();
    });
  });

  describe('cornerRadius', () => {
    it('should default to 0', () => {
      expect(canvas.cornerRadius).toBe(0);
    });

    it('should accept a numeric value', () => {
      canvas.cornerRadius = 15;
      expect(canvas.cornerRadius).toBe(15);
    });

    it('should handle zero corner radius (sharp corners)', () => {
      canvas.cornerRadius = 0;
      expect(canvas.cornerRadius).toBe(0);
    });

    it('should handle maximum corner radius', () => {
      canvas.cornerRadius = 50;
      expect(canvas.cornerRadius).toBe(50);
    });
  });

  describe('createShapeFromEvent — rect cornerRadius', () => {
    it('should create rect with cornerRadius from event', () => {
      const ev = {
        type: 'rect',
        x: 10,
        y: 20,
        width: 100,
        height: 80,
        cornerRadius: 12,
        stroke: '#ff0000',
        strokeWidth: 5,
        timestamp: Date.now(),
      };
      const shape = canvas.createShapeFromEvent(ev);
      expect(shape).toBeDefined();
      expect(shape.attrs.cornerRadius).toBe(12);
    });

    it('should default cornerRadius to 0 when not specified', () => {
      const ev = {
        type: 'rect',
        x: 10,
        y: 20,
        width: 100,
        height: 80,
        stroke: '#ff0000',
        strokeWidth: 5,
        timestamp: Date.now(),
      };
      const shape = canvas.createShapeFromEvent(ev);
      expect(shape).toBeDefined();
      expect(shape.attrs.cornerRadius).toBe(0);
    });

    it('should create non-rect shapes without cornerRadius issues', () => {
      const ev = {
        type: 'circle',
        x: 50,
        y: 50,
        radius: 30,
        stroke: '#00ff00',
        strokeWidth: 3,
        timestamp: Date.now(),
      };
      const shape = canvas.createShapeFromEvent(ev);
      expect(shape).toBeDefined();
      expect(shape.attrs.radius).toBe(30);
    });
  });
});
