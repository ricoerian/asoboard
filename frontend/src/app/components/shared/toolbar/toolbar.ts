import { Component, Input, Output, EventEmitter, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Api } from '../../../services/api';
import { TranslatePipe } from '@ngx-translate/core';
import { CanvasTool, Asset, AnimationConfig, BrushPreset } from '../../../models/types';

interface Tool {
  id: CanvasTool;
  name: string;
  icon: string;
}

@Component({
  selector: 'app-toolbar',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  templateUrl: './toolbar.html',
  styleUrls: ['./toolbar.css'],
})
export class ToolbarComponent implements OnInit {
  @Input() currentTool: CanvasTool = 'pen';
  @Input() color = '#1982C4';
  @Input() thickness = 8;
  @Input() fontSize = 24;
  @Input() fontFamily = 'Arial';
  @Input() userRole: 'mentor' | 'student' | 'staff' | 'parent' | null = null;
  @Input() isSaving = false;
  @Input() zoom = 1;
  @Input() strokeDash: number[] = [];
  @Input() fillType: 'solid' | 'linear' | 'radial' | 'none' = 'solid';
  @Input() fillGradientColor1 = '#1982C4';
  @Input() fillGradientColor2 = '#FF66C4';
  @Input() fillGradientDirection: 'to-right' | 'to-bottom' | 'to-bottom-right' | 'to-top-right' =
    'to-right';
  @Input() currentBrushPreset: BrushPreset = 'round';
  @Input() cornerRadius = 0;
  @Input() studentCanDraw = true;

  @Input() opacity = 1;
  @Input() snapToGrid = false;
  @Input() shadowEnabled = false;

  @Output() currentToolChange = new EventEmitter<CanvasTool>();
  @Output() colorChange = new EventEmitter<string>();
  @Output() thicknessChange = new EventEmitter<number>();
  @Output() fontSizeChange = new EventEmitter<number>();
  @Output() fontFamilyChange = new EventEmitter<string>();
  @Output() clearRequested = new EventEmitter<void>();
  @Output() saveRequested = new EventEmitter<void>();
  @Output() assetSelected = new EventEmitter<Asset>();
  @Output() undoRequested = new EventEmitter<void>();
  @Output() redoRequested = new EventEmitter<void>();
  @Output() exportRequested = new EventEmitter<string>();
  @Output() exportPdfRequested = new EventEmitter<void>();
  @Output() zoomInRequested = new EventEmitter<void>();
  @Output() zoomOutRequested = new EventEmitter<void>();
  @Output() resetViewRequested = new EventEmitter<void>();
  @Output() strokeDashChange = new EventEmitter<number[]>();
  @Output() fillTypeChange = new EventEmitter<'solid' | 'linear' | 'radial' | 'none'>();
  @Output() fillGradientColor1Change = new EventEmitter<string>();
  @Output() fillGradientColor2Change = new EventEmitter<string>();
  @Output() fillGradientDirectionChange = new EventEmitter<
    'to-right' | 'to-bottom' | 'to-bottom-right' | 'to-top-right'
  >();
  @Output() currentBrushPresetChange = new EventEmitter<BrushPreset>();
  @Output() bringToFrontRequested = new EventEmitter<void>();
  @Output() sendToBackRequested = new EventEmitter<void>();
  @Output() bringForwardRequested = new EventEmitter<void>();
  @Output() sendBackwardRequested = new EventEmitter<void>();
  @Output() cornerRadiusChange = new EventEmitter<number>();
  @Output() opacityChange = new EventEmitter<number>();
  @Output() snapToGridChange = new EventEmitter<boolean>();
  @Output() shadowEnabledChange = new EventEmitter<boolean>();

  private apiService = inject(Api);
  assets: Asset[] = [];
  filteredAssets: Asset[] = [];
  showAssetPicker = false;
  showFontSettings = false;

  toggleFontSettings() {
    this.showFontSettings = !this.showFontSettings;
    if (this.showFontSettings) this.closeOtherPopups('font');
  }

  showToolsPopup = false;
  showShapesPopup = false;
  showStylePopup = false;
  showCanvasPopup = false;

  showAssetsPopup = false;
  showLayerPopup = false;
  showExportPopup = false;
  showOpacityPanel = false;

  closeOtherPopups(current: string) {
    if (current !== 'shapes') this.showShapesPopup = false;
    if (current !== 'assets') this.showAssetsPopup = false;
    if (current !== 'layer') this.showLayerPopup = false;
    if (current !== 'export') this.showExportPopup = false;
    if (current !== 'dash') this.showDashPanel = false;
    if (current !== 'fill') this.showFillPanel = false;
    if (current !== 'brush') this.showBrushPanel = false;
    if (current !== 'font') this.showFontSettings = false;
    if (current !== 'opacity') this.showOpacityPanel = false;
  }

  toggleShapesPopup() {
    this.showShapesPopup = !this.showShapesPopup;
    if (this.showShapesPopup) this.closeOtherPopups('shapes');
  }

  toggleAssetsPopup() {
    this.showAssetsPopup = !this.showAssetsPopup;
    if (this.showAssetsPopup) this.closeOtherPopups('assets');
  }

  toggleLayerPopup() {
    this.showLayerPopup = !this.showLayerPopup;
    if (this.showLayerPopup) this.closeOtherPopups('layer');
  }

  toggleExportPopup() {
    this.showExportPopup = !this.showExportPopup;
    if (this.showExportPopup) this.closeOtherPopups('export');
  }

  selectedAsset: Asset | null = null;

  tempConfig: AnimationConfig = {
    behavior: 'gravity',
    g: 0.5,
    restitution: -0.7,
    frequency: 150,
    damping: 2000,
    amplitude: 0.15,
    speed: 20,
  };

  get showGravityParams() {
    return ['gravity', 'drop-bounce', 'bounce-bounds'].includes(this.tempConfig.behavior);
  }

  get showHarmonicParams() {
    return [
      'harmonic',
      'heartbeat',
      'fade-pulse',
      'shake',
      'wavy',
      'drift',
      'zigzag',
      'float',
    ].includes(this.tempConfig.behavior);
  }

  get showSpeedParams() {
    return [
      'angular',
      'swing',
      'swirl',
      'flip',
      'orbit-mouse',
      'orbit-center',
      'flee-mouse',
      'attract-mouse',
      'friction',
      'slide-in',
    ].includes(this.tempConfig.behavior);
  }

  ngOnInit() {
    this.apiService.getAssets().subscribe({
      next: (data) => {
        const parsedData = typeof data === 'string' ? JSON.parse(data as string) : data;
        if (Array.isArray(parsedData)) {
          this.assets = parsedData;
        } else if (parsedData && typeof parsedData === 'object') {
          this.assets = parsedData.results || parsedData.data || [parsedData];
        }
      },
    });
  }

  selectTool(id: CanvasTool) {
    this.currentToolChange.emit(id);
    if (id === 'image' || id === 'audio' || id === 'animation' || id === 'sprite') {
      const dbType = id === 'sprite' ? 'image' : id;
      this.filteredAssets = this.assets.filter((a) => a.asset_type === dbType);
      this.showAssetPicker = true;
    } else {
      this.showAssetPicker = false;
    }
  }

  onAssetPick(asset: Asset) {
    if (asset.asset_type === 'animation') {
      this.selectedAsset = asset;
      const behavior: AnimationConfig['behavior'] =
        asset.animation_config?.behavior ||
        (asset.title.toLowerCase().includes('rotate') || asset.title.toLowerCase().includes('spin')
          ? 'angular'
          : 'gravity');
      const defaults: Partial<AnimationConfig> = {
        behavior: behavior,
        g: 0.5,
        restitution: -0.7,
        amplitude: 20,
        frequency: 150,
        damping: 2000,
        speed: 20,
      };

      this.tempConfig = {
        ...defaults,
        ...(asset.animation_config || {}),
        behavior: behavior,
      };
    } else {
      this.assetSelected.emit(asset);
      this.showAssetPicker = false;
    }
  }

  applyCustomizedAsset() {
    if (this.selectedAsset) {
      const finalAsset = {
        ...this.selectedAsset,
        animation_config:
          this.selectedAsset.asset_type === 'animation' ? { ...this.tempConfig } : undefined,
      };
      this.assetSelected.emit(finalAsset);
      this.selectedAsset = null;
      this.showAssetPicker = false;
    }
  }

  presetColors = [
    '#a7f3d0',
    '#93c5fd',
    '#f9a8d4',
    '#fde047',
    '#d8b4fe',
    '#ef4444',
    '#3b82f6',
    '#22c55e',
    '#1e293b',
    '#ffffff',
  ];

  basicTools: Tool[] = [
    { id: 'pen', name: 'Pen', icon: 'fas fa-pen' },
    { id: 'eraser', name: 'Eraser', icon: 'fas fa-eraser' },
    { id: 'text', name: 'Text', icon: 'fas fa-font' },
  ];

  shapeTools: Tool[] = [
    { id: 'rect', name: 'Box', icon: 'far fa-square' },
    { id: 'circle', name: 'Circle', icon: 'far fa-circle' },
    { id: 'arrow', name: 'Arrow', icon: 'fas fa-arrow-right' },
    { id: 'star', name: 'Star', icon: 'far fa-star' },
    { id: 'straight-line', name: 'Line', icon: 'fas fa-minus' },
    { id: 'triangle', name: 'Triangle', icon: 'fas fa-caret-up' },
    { id: 'diamond', name: 'Diamond', icon: 'fas fa-diamond' },
    { id: 'pentagon', name: 'Pentagon', icon: 'fas fa-draw-polygon' },
    { id: 'hexagon', name: 'Hexagon', icon: 'fas fa-cube' },
    { id: 'ellipse', name: 'Ellipse', icon: 'fas fa-egg' },
    { id: 'heart', name: 'Love', icon: 'fas fa-heart text-red-500' },
  ];

  isShapeToolActive(): boolean {
    return this.shapeTools.some((t) => t.id === this.currentTool);
  }

  isAssetToolActive(): boolean {
    return this.assetTools.some((t) => t.id === this.currentTool);
  }

  assetTools: Tool[] = [
    { id: 'image', name: 'Sticker', icon: 'fas fa-images' },
    { id: 'audio', name: 'Audio', icon: 'fas fa-volume-up' },
    { id: 'animation', name: 'Anim', icon: 'fas fa-film' },
    { id: 'sprite', name: 'Sprite', icon: 'fas fa-ghost' },
  ];

  navigationTools: Tool[] = [{ id: 'hand', name: 'Hand', icon: 'fas fa-hand-paper' }];

  selectColor(newColor: string) {
    if (newColor && newColor.startsWith('#')) {
      this.colorChange.emit(newColor);
    }
  }

  onExportClick() {
    this.exportRequested.emit(this.userRole || 'student');
  }

  onExportPdfClick() {
    this.exportPdfRequested.emit();
  }

  onZoomIn() {
    this.zoomInRequested.emit();
  }

  onZoomOut() {
    this.zoomOutRequested.emit();
  }

  onResetView() {
    this.resetViewRequested.emit();
  }

  get zoomPercent(): number {
    return Math.round(this.zoom * 100);
  }

  dashPresets: { name: string; value: number[] }[] = [
    { name: 'Solid', value: [] },
    { name: 'Dashed', value: [15, 8] },
    { name: 'Dotted', value: [3, 6] },
    { name: 'Dash-Dot', value: [15, 5, 3, 5] },
    { name: 'Long Dash', value: [30, 10] },
    { name: 'Double Dash', value: [10, 5, 2, 5] },
  ];

  gradientDirections: {
    id: 'to-right' | 'to-bottom' | 'to-bottom-right' | 'to-top-right';
    icon: string;
    label: string;
  }[] = [
    { id: 'to-right', icon: '→', label: 'Right' },
    { id: 'to-bottom', icon: '↓', label: 'Down' },
    { id: 'to-bottom-right', icon: '↘', label: 'Down-Right' },
    { id: 'to-top-right', icon: '↗', label: 'Up-Right' },
  ];

  showDashPanel = false;
  showFillPanel = false;
  showBrushPanel = false;

  selectDashPattern(value: number[]) {
    this.strokeDash = value;
    this.strokeDashChange.emit(value);
  }

  isDashActive(value: number[]): boolean {
    if (value.length === 0) return this.strokeDash.length === 0;
    return (
      this.strokeDash.length === value.length && value.every((v, i) => v === this.strokeDash[i])
    );
  }

  setFillType(type: 'solid' | 'linear' | 'radial' | 'none') {
    this.fillType = type;
    this.fillTypeChange.emit(type);
  }

  setGradientColor1(color: string) {
    this.fillGradientColor1 = color;
    this.fillGradientColor1Change.emit(color);
  }

  setGradientColor2(color: string) {
    this.fillGradientColor2 = color;
    this.fillGradientColor2Change.emit(color);
  }

  setGradientDirection(direction: 'to-right' | 'to-bottom' | 'to-bottom-right' | 'to-top-right') {
    this.fillGradientDirection = direction;
    this.fillGradientDirectionChange.emit(direction);
  }

  toggleDashPanel() {
    this.showDashPanel = !this.showDashPanel;
    if (this.showDashPanel) this.closeOtherPopups('dash');
  }

  toggleFillPanel() {
    this.showFillPanel = !this.showFillPanel;
    if (this.showFillPanel) this.closeOtherPopups('fill');
  }

  toggleBrushPanel() {
    this.showBrushPanel = !this.showBrushPanel;
    if (this.showBrushPanel) this.closeOtherPopups('brush');
  }

  toggleOpacityPanel() {
    this.showOpacityPanel = !this.showOpacityPanel;
    if (this.showOpacityPanel) this.closeOtherPopups('opacity');
  }

  setOpacity(val: number) {
    this.opacity = val;
    this.opacityChange.emit(this.opacity);
  }

  get opacityPercent(): number {
    return Math.round(this.opacity * 100);
  }

  toggleSnapToGrid() {
    this.snapToGrid = !this.snapToGrid;
    this.snapToGridChange.emit(this.snapToGrid);
  }

  toggleShadow() {
    this.shadowEnabled = !this.shadowEnabled;
    this.shadowEnabledChange.emit(this.shadowEnabled);
  }

  selectBrushPreset(preset: BrushPreset) {
    this.currentBrushPreset = preset;
    this.currentBrushPresetChange.emit(preset);
    this.showBrushPanel = false;
  }

  isBrushActive(preset: BrushPreset): boolean {
    return this.currentBrushPreset === preset;
  }

  onBringToFront() {
    this.bringToFrontRequested.emit();
  }

  onSendToBack() {
    this.sendToBackRequested.emit();
  }

  onBringForward() {
    this.bringForwardRequested.emit();
  }

  onSendBackward() {
    this.sendBackwardRequested.emit();
  }

  brushPresetList: { id: BrushPreset; name: string; icon: string; description: string }[] = [
    { id: 'round', name: 'Round', icon: 'fas fa-circle', description: 'Smooth rounded brush' },
    {
      id: 'calligraphy',
      name: 'Calligraphy',
      icon: 'fas fa-pen-fancy',
      description: 'Sharp calligraphy pen',
    },
    { id: 'square', name: 'Square', icon: 'fas fa-square', description: 'Square-edged brush' },
    {
      id: 'crayon',
      name: 'Crayon',
      icon: 'fas fa-highlighter',
      description: 'Rough crayon texture',
    },
    {
      id: 'fine-pen',
      name: 'Fine Pen',
      icon: 'fas fa-pen',
      description: 'Thin precise pen',
    },
    {
      id: 'spray',
      name: 'Spray',
      icon: 'fas fa-spray-can',
      description: 'Spray paint effect',
    },
    {
      id: 'highlighter',
      name: 'Highlighter',
      icon: 'fas fa-marker',
      description: 'Semi-transparent marker',
    },
    {
      id: 'watercolor',
      name: 'Watercolor',
      icon: 'fas fa-water',
      description: 'Soft watercolor brush',
    },
  ];

  get dashPreviewStyle(): string {
    if (this.strokeDash.length === 0) return '';
    return this.strokeDash.map((v) => `${v}px`).join(' ');
  }
}
