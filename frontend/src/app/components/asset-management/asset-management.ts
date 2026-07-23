import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectorRef,
  inject,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';
import { Api } from '../../services/api';
import { NotificationService } from '../../services/notification.service';
import { Asset, User, ApiListResponse, AssetUsageAnalytics } from '../../models/types';

export type AssetTypeFilter = 'all' | 'image' | 'audio' | 'animation';
export type SortField = 'title' | 'date';
export type SortDirection = 'asc' | 'desc';

@Component({
  selector: 'app-asset-management',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './asset-management.html',
})
export class AssetManagement implements OnInit, OnDestroy {
  assets = signal<Asset[]>([]);
  filteredAssetsList = signal<Asset[]>([]);
  currentUser: User | null = null;
  isLoading = true;

  assetForm: FormGroup;
  selectedFile: File | null = null;
  assetAnalytics = signal<AssetUsageAnalytics[]>([]);

  searchTerm = signal('');
  selectedType = signal<AssetTypeFilter>('all');
  sortField = signal<SortField>('date');
  sortDirection = signal<SortDirection>('desc');

  filteredAssets = computed(() => this.filteredAssetsList());
  totalCount = computed(() => this.assets().length);
  filteredCount = computed(() => this.filteredAssetsList().length);
  hasActiveFilter = computed(
    () =>
      this.searchTerm().trim() !== '' ||
      this.selectedType() !== 'all' ||
      !(this.sortField() === 'date' && this.sortDirection() === 'desc'),
  );

  typeOptions: Array<{ value: AssetTypeFilter; label: string; icon: string; color: string }> = [
    { value: 'all', label: 'All Assets', icon: 'fa-border-all', color: 'slate' },
    { value: 'image', label: 'Images', icon: 'fa-images', color: 'sky' },
    { value: 'audio', label: 'Audio', icon: 'fa-music', color: 'pink' },
    { value: 'animation', label: 'Animations', icon: 'fa-film', color: 'cyan' },
  ];

  sortOptions: Array<{ value: SortField; label: string }> = [
    { value: 'date', label: 'Date' },
    { value: 'title', label: 'Name' },
  ];

  private searchSubject = new Subject<string>();
  private destroy$ = new Subject<void>();

  private apiService = inject(Api);
  private cdr = inject(ChangeDetectorRef);
  private fb = inject(FormBuilder);
  private notificationService = inject(NotificationService);

  constructor() {
    this.assetForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(3)]],
      asset_type: ['image', [Validators.required]],
    });
  }

  ngOnInit() {
    this.apiService.checkAuthStatus().subscribe({
      next: (user: User) => {
        this.currentUser = user;
        this.cdr.detectChanges();
      },
      error: () => {
        this.currentUser = null;
        this.cdr.detectChanges();
      },
    });

    this.searchSubject
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(() => {
        this.loadAssets();
      });

    this.loadAssets();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadAssets() {
    this.isLoading = true;

    const ordering = this.buildOrderingParam();

    this.apiService
      .getAssets({
        search: this.searchTerm().trim() || undefined,
        asset_type: this.selectedType() !== 'all' ? this.selectedType() : undefined,
        ordering,
      })
      .subscribe({
        next: (data) => {
          let parsed: Asset[];
          if (Array.isArray(data)) {
            parsed = data;
          } else if (data && typeof data === 'object') {
            const response = data as ApiListResponse<Asset>;
            parsed = response.results || response.data || [];
          } else {
            parsed = [];
          }

          this.filteredAssetsList.set(parsed);

          if (
            !this.searchTerm().trim() &&
            this.selectedType() === 'all' &&
            ordering === '-created_at'
          ) {
            this.assets.set(parsed);
          }

          this.isLoading = false;
          this.cdr.detectChanges();
        },
        error: () => {
          this.isLoading = false;
          this.cdr.detectChanges();
        },
      });

    this.apiService.getAssetUsageAnalytics().subscribe({
      next: (data) => {
        this.assetAnalytics.set(data);
      },
    });
  }

  private buildOrderingParam(): string {
    const prefix = this.sortDirection() === 'desc' ? '-' : '';
    if (this.sortField() === 'title') {
      return `${prefix}title`;
    }
    return `${prefix}created_at`;
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      this.selectedFile = file;
    }
  }

  submitAsset() {
    const isAnimation = this.assetForm.value.asset_type === 'animation';
    if (this.assetForm.invalid || (!this.selectedFile && !isAnimation)) return;

    this.apiService
      .createAsset({
        title: this.assetForm.value.title,
        file: this.selectedFile || null,
        asset_type: this.assetForm.value.asset_type,
      })
      .subscribe({
        next: () => {
          this.assetForm.reset({ asset_type: 'image' });
          this.selectedFile = null;
          const fileInput = document.getElementById('fileInput') as HTMLInputElement;
          if (fileInput) fileInput.value = '';
          this.notificationService.success('Asset uploaded successfully!');
          this.loadAssets();
        },
        error: () => {
          this.notificationService.error('Failed to upload asset.');
        },
      });
  }

  deleteAsset(id: number) {
    if (confirm('Are you sure you want to delete this asset?')) {
      this.apiService.deleteAsset(id).subscribe({
        next: () => {
          this.notificationService.success('Asset deleted!');
          this.loadAssets();
        },
      });
    }
  }

  setSearch(term: string) {
    this.searchTerm.set(term);
    this.searchSubject.next(term);
  }

  onSearchInput(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.searchTerm.set(value);
    this.searchSubject.next(value);
  }

  setType(type: AssetTypeFilter) {
    this.selectedType.set(type);
    this.loadAssets();
  }

  setSortField(field: SortField) {
    if (this.sortField() === field) {
      this.sortDirection.set(this.sortDirection() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortField.set(field);
      this.sortDirection.set(field === 'title' ? 'asc' : 'desc');
    }
    this.loadAssets();
  }

  clearFilters() {
    this.searchTerm.set('');
    this.selectedType.set('all');
    this.sortField.set('date');
    this.sortDirection.set('desc');
    this.loadAssets();
  }
}
