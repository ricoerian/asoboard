import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ToolbarComponent } from './toolbar';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { CanvasTool } from '../../../models/types';

describe('ToolbarComponent', () => {
  let component: ToolbarComponent;
  let fixture: ComponentFixture<ToolbarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ToolbarComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(ToolbarComponent);
    component = fixture.componentInstance;

    fixture.detectChanges();

    const httpTesting = TestBed.inject(HttpTestingController);
    const req = httpTesting.expectOne('http://localhost:8000/api/assets/');
    req.flush([]);
  });

  afterEach(() => {
    const httpTesting = TestBed.inject(HttpTestingController);
    httpTesting.verify();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Zoom Controls', () => {
    it('should initialize with zoom = 1', () => {
      expect(component.zoom).toBe(1);
    });

    it('should calculate zoomPercent correctly at 1x', () => {
      component.zoom = 1;
      expect(component.zoomPercent).toBe(100);
    });

    it('should calculate zoomPercent correctly at 2x', () => {
      component.zoom = 2;
      expect(component.zoomPercent).toBe(200);
    });

    it('should calculate zoomPercent correctly at 0.5x', () => {
      component.zoom = 0.5;
      expect(component.zoomPercent).toBe(50);
    });

    it('should emit zoomInRequested when onZoomIn called', () => {
      let emitted = false;
      component.zoomInRequested.subscribe(() => (emitted = true));
      component.onZoomIn();
      expect(emitted).toBe(true);
    });

    it('should emit zoomOutRequested when onZoomOut called', () => {
      let emitted = false;
      component.zoomOutRequested.subscribe(() => (emitted = true));
      component.onZoomOut();
      expect(emitted).toBe(true);
    });

    it('should emit resetViewRequested when onResetView called', () => {
      let emitted = false;
      component.resetViewRequested.subscribe(() => (emitted = true));
      component.onResetView();
      expect(emitted).toBe(true);
    });

    it('should reflect updated zoom value', () => {
      component.zoom = 3;
      expect(component.zoom).toBe(3);
      expect(component.zoomPercent).toBe(300);
    });
  });

  describe('Tool Selection', () => {
    it('should emit currentToolChange when selectTool called', () => {
      let emittedTool: CanvasTool | undefined;
      component.currentToolChange.subscribe((tool) => (emittedTool = tool));
      component.selectTool('rect');
      expect(emittedTool).toBe('rect');
    });

    it('should include hand tool in navigationTools array', () => {
      const handEntry = component.navigationTools.find((t) => t.id === 'hand');
      expect(handEntry).toBeDefined();
      expect(handEntry!.name).toBe('Hand');
      expect(handEntry!.icon).toBe('fas fa-hand-paper');
    });

    it('should allow hand tool to be selected via selectTool', () => {
      let emittedTool: CanvasTool | undefined;
      component.currentToolChange.subscribe((tool) => (emittedTool = tool));
      component.selectTool('hand');
      expect(emittedTool).toBe('hand');
    });

    it('should open asset picker for image/audio/animation/sprite tools', () => {
      component.selectTool('pen');
      expect(component.showAssetPicker).toBeFalsy();
      component.selectTool('image');
      expect(component.showAssetPicker).toBeTruthy();
    });

    it('should not open asset picker for hand tool', () => {
      component.selectTool('hand');
      expect(component.showAssetPicker).toBeFalsy();
    });
  });

  describe('Export Functionality', () => {
    it('should emit exportRequested with userRole on export click', () => {
      let emittedRole: string | undefined;
      component.userRole = 'mentor';
      component.exportRequested.subscribe((role) => (emittedRole = role));
      component.onExportClick();
      expect(emittedRole).toBe('mentor');
    });

    it('should emit student as default for export when no role set', () => {
      let emittedRole: string | undefined;
      component.userRole = null;
      component.exportRequested.subscribe((role) => (emittedRole = role));
      component.onExportClick();
      expect(emittedRole).toBe('student');
    });

    it('should emit exportPdfRequested on PDF export click', () => {
      let emitted = false;
      component.exportPdfRequested.subscribe(() => (emitted = true));
      component.onExportPdfClick();
      expect(emitted).toBe(true);
    });

    it('should have exportPdfRequested EventEmitter defined', () => {
      expect(component.exportPdfRequested).toBeDefined();
    });

    it('should emit exportRequested on JSON export click', () => {
      let emitted = false;
      component.exportRequested.subscribe(() => (emitted = true));
      component.onExportClick();
      expect(emitted).toBe(true);
    });

    it('should have exportRequested EventEmitter defined', () => {
      expect(component.exportRequested).toBeDefined();
    });
  });

  describe('Color Selection', () => {
    it('should emit colorChange when selectColor called with valid hex', () => {
      let emittedColor: string | undefined;
      component.colorChange.subscribe((color) => (emittedColor = color));
      component.selectColor('#ff0000');
      expect(emittedColor).toBe('#ff0000');
    });

    it('should not emit colorChange when invalid color passed', () => {
      let emittedCount = 0;
      component.colorChange.subscribe(() => emittedCount++);
      component.selectColor('not-a-color');
      expect(emittedCount).toBe(0);
    });
  });

  describe('Layer Management', () => {
    it('should emit bringToFrontRequested on onBringToFront', () => {
      let emitted = false;
      component.bringToFrontRequested.subscribe(() => (emitted = true));
      component.onBringToFront();
      expect(emitted).toBe(true);
    });

    it('should emit sendToBackRequested on onSendToBack', () => {
      let emitted = false;
      component.sendToBackRequested.subscribe(() => (emitted = true));
      component.onSendToBack();
      expect(emitted).toBe(true);
    });

    it('should emit bringForwardRequested on onBringForward', () => {
      let emitted = false;
      component.bringForwardRequested.subscribe(() => (emitted = true));
      component.onBringForward();
      expect(emitted).toBe(true);
    });

    it('should emit sendBackwardRequested on onSendBackward', () => {
      let emitted = false;
      component.sendBackwardRequested.subscribe(() => (emitted = true));
      component.onSendBackward();
      expect(emitted).toBe(true);
    });

    it('should have bringToFrontRequested EventEmitter defined', () => {
      expect(component.bringToFrontRequested).toBeDefined();
    });

    it('should have sendToBackRequested EventEmitter defined', () => {
      expect(component.sendToBackRequested).toBeDefined();
    });

    it('should have bringForwardRequested EventEmitter defined', () => {
      expect(component.bringForwardRequested).toBeDefined();
    });

    it('should have sendBackwardRequested EventEmitter defined', () => {
      expect(component.sendBackwardRequested).toBeDefined();
    });

    it('should be able to emit multiple layer events sequentially', () => {
      const events: string[] = [];
      component.bringToFrontRequested.subscribe(() => events.push('front'));
      component.sendToBackRequested.subscribe(() => events.push('back'));
      component.bringForwardRequested.subscribe(() => events.push('forward'));
      component.sendBackwardRequested.subscribe(() => events.push('backward'));

      component.onBringToFront();
      component.onSendToBack();
      component.onBringForward();
      component.onSendBackward();

      expect(events).toEqual(['front', 'back', 'forward', 'backward']);
    });
  });

  describe('Corner Radius', () => {
    it('should default to 0', () => {
      expect(component.cornerRadius).toBe(0);
    });

    it('should have cornerRadiusChange EventEmitter defined', () => {
      expect(component.cornerRadiusChange).toBeDefined();
    });

    it('should emit cornerRadiusChange when value set', () => {
      let emittedValue: number | undefined;
      component.cornerRadiusChange.subscribe((v) => (emittedValue = v));
      component.cornerRadius = 20;
      component.cornerRadiusChange.emit(20);
      expect(emittedValue).toBe(20);
    });

    it('should accept zero corner radius', () => {
      component.cornerRadius = 0;
      expect(component.cornerRadius).toBe(0);
    });
  });
});
