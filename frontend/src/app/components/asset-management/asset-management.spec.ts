import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { vi, describe, it, expect, beforeEach, afterEach, type Mock } from 'vitest';
import { AssetManagement } from './asset-management';
import { Api } from '../../services/api';
import { NotificationService } from '../../services/notification.service';
import { Asset, User } from '../../models/types';
import { of, EMPTY } from 'rxjs';

describe('AssetManagement — Server-Side Filter/Sort', () => {
  let component: AssetManagement;
  let fixture: ComponentFixture<AssetManagement>;
  let getAssetsSpy: Mock;

  const staffUser: User = { id: 1, username: 'admin', email: 'admin@test.com', role: 'staff' };

  const sampleAssets: Asset[] = [
    {
      id: 1,
      title: 'Star Sticker',
      asset_type: 'image',
      created_at: '2026-06-01T00:00:00Z',
      created_by: 1,
    },
    {
      id: 2,
      title: 'Click Sound',
      asset_type: 'audio',
      created_at: '2026-06-10T00:00:00Z',
      created_by: 1,
    },
    {
      id: 3,
      title: 'Bounce Animation',
      asset_type: 'animation',
      created_at: '2026-06-15T00:00:00Z',
      created_by: 1,
    },
    {
      id: 4,
      title: 'Apple Sticker',
      asset_type: 'image',
      created_at: '2026-06-20T00:00:00Z',
      created_by: 1,
    },
    {
      id: 5,
      title: 'Star Dust Animation',
      asset_type: 'animation',
      created_at: '2026-06-25T00:00:00Z',
      created_by: 1,
    },
  ];

  function simulateServerFilter(params: {
    search?: string;
    asset_type?: string;
    ordering?: string;
  }): Asset[] {
    let list = [...sampleAssets];

    const term = (params.search || '').trim().toLowerCase();
    if (term) {
      list = list.filter(
        (a) => a.title.toLowerCase().includes(term) || a.asset_type.toLowerCase().includes(term),
      );
    }

    if (params.asset_type && params.asset_type !== 'all') {
      list = list.filter((a) => a.asset_type === params.asset_type);
    }

    const ordering = params.ordering || '-created_at';
    const dir = ordering.startsWith('-') ? -1 : 1;
    const field = ordering.replace(/^-/, '');
    list.sort((a, b) => {
      if (field === 'title') {
        return a.title.localeCompare(b.title) * dir;
      }
      const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return (dateA - dateB) * dir;
    });

    return list;
  }

  beforeEach(() => {
    vi.useFakeTimers();

    getAssetsSpy = vi.fn((params?: Record<string, string>) => {
      return of(simulateServerFilter(params || {}));
    });

    const mockApi = {
      checkAuthStatus: () => of(staffUser),
      getAssets: getAssetsSpy,
      createAsset: () => EMPTY,
      deleteAsset: () => EMPTY,
    };

    const mockNotification = {
      success: () => {},
      error: () => {},
      show: () => {},
    };

    TestBed.configureTestingModule({
      imports: [AssetManagement],
      providers: [
        provideRouter([]),
        { provide: Api, useValue: mockApi },
        { provide: NotificationService, useValue: mockNotification },
      ],
    });

    fixture = TestBed.createComponent(AssetManagement);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
    expect(component.currentUser?.role).toBe('staff');
  });

  it('should load assets via server on init', () => {
    expect(component.filteredAssets().length).toBe(5);
    expect(getAssetsSpy).toHaveBeenCalled();
  });

  describe('Initial state', () => {
    it('should default search term to empty', () => {
      expect(component.searchTerm()).toBe('');
    });

    it('should default selected type to "all"', () => {
      expect(component.selectedType()).toBe('all');
    });

    it('should default sort field to "date"', () => {
      expect(component.sortField()).toBe('date');
    });

    it('should default sort direction to descending', () => {
      expect(component.sortDirection()).toBe('desc');
    });

    it('should not have active filter at default state', () => {
      expect(component.hasActiveFilter()).toBe(false);
    });

    it('should initialize filtered assets equal to total assets', () => {
      expect(component.filteredAssets().length).toBe(5);
    });

    it('should have 4 type options (all, image, audio, animation)', () => {
      expect(component.typeOptions.length).toBe(4);
    });

    it('should have 2 sort options (date, title)', () => {
      expect(component.sortOptions.length).toBe(2);
    });
  });

  describe('Search (server-side, debounced 300ms)', () => {
    it('should filter assets by title via server', () => {
      component.setSearch('star');
      vi.advanceTimersByTime(300);
      const result = component.filteredAssets();
      expect(result.length).toBe(2);
      expect(result.every((a) => a.title.toLowerCase().includes('star'))).toBe(true);
    });

    it('should return empty when no title matches', () => {
      component.setSearch('nonexistentxyz');
      vi.advanceTimersByTime(300);
      expect(component.filteredAssets().length).toBe(0);
    });

    it('should match partial titles', () => {
      component.setSearch('stick');
      vi.advanceTimersByTime(300);
      const titles = component.filteredAssets().map((a) => a.title);
      expect(titles).toContain('Star Sticker');
      expect(titles).toContain('Apple Sticker');
    });

    it('should update searchTerm signal on onSearchInput', () => {
      const mockEvent = { target: { value: 'hello' } } as unknown as Event;
      component.onSearchInput(mockEvent);
      expect(component.searchTerm()).toBe('hello');
    });

    it('should show all when search is cleared', () => {
      component.setSearch('star');
      vi.advanceTimersByTime(300);
      expect(component.filteredAssets().length).toBe(2);
      component.setSearch('');
      vi.advanceTimersByTime(300);
      expect(component.filteredAssets().length).toBe(5);
    });

    it('should trim whitespace from search term for active filter detection', () => {
      component.setSearch('   ');
      vi.advanceTimersByTime(300);
      expect(component.filteredCount()).toBe(5);
      expect(component.hasActiveFilter()).toBe(false);
    });
  });

  describe('Type filtering (server-side, immediate)', () => {
    it('should filter by image type', () => {
      component.setType('image');
      const result = component.filteredAssets();
      expect(result.length).toBe(2);
      expect(result.every((a) => a.asset_type === 'image')).toBe(true);
    });

    it('should filter by audio type', () => {
      component.setType('audio');
      const result = component.filteredAssets();
      expect(result.length).toBe(1);
      expect(result[0].asset_type).toBe('audio');
    });

    it('should filter by animation type', () => {
      component.setType('animation');
      const result = component.filteredAssets();
      expect(result.length).toBe(2);
      expect(result.every((a) => a.asset_type === 'animation')).toBe(true);
    });

    it('should show all when "all" selected after filtering', () => {
      component.setType('image');
      expect(component.filteredAssets().length).toBe(2);
      component.setType('all');
      expect(component.filteredAssets().length).toBe(5);
    });
  });

  describe('Sorting (server-side)', () => {
    it('should sort by title ascending when selected', () => {
      component.setSortField('title');
      const titles = component.filteredAssets().map((a) => a.title);
      const sorted = [...titles].sort((a, b) => a.localeCompare(b));
      expect(titles).toEqual(sorted);
    });

    it('should sort by title descending when toggled again', () => {
      component.setSortField('title');
      component.setSortField('title');
      const titles = component.filteredAssets().map((a) => a.title);
      const sorted = [...titles].sort((a, b) => b.localeCompare(a));
      expect(titles).toEqual(sorted);
    });

    it('should sort by date ascending when toggled once', () => {
      component.setSortField('date');
      const dates = component.filteredAssets().map((a) => a.created_at);
      expect(dates[0]).toBe('2026-06-01T00:00:00Z');
      expect(dates[dates.length - 1]).toBe('2026-06-25T00:00:00Z');
    });

    it('should sort by date descending by default', () => {
      const dates = component.filteredAssets().map((a) => a.created_at);
      expect(dates[0]).toBe('2026-06-25T00:00:00Z');
    });

    it('should start ascending when switching from date to title', () => {
      component.setSortField('title');
      expect(component.sortField()).toBe('title');
      expect(component.sortDirection()).toBe('asc');
    });

    it('should start descending when switching from title to date', () => {
      component.setSortField('title');
      component.setSortField('date');
      expect(component.sortField()).toBe('date');
      expect(component.sortDirection()).toBe('desc');
    });
  });

  describe('Combined search + type + sort', () => {
    it('should apply search, type filter, and sort together', () => {
      component.setSearch('Animation');
      vi.advanceTimersByTime(300);
      component.setType('animation');
      component.setSortField('title');
      const result = component.filteredAssets();
      expect(result.length).toBe(2);
      expect(result.map((a) => a.title)).toEqual(['Bounce Animation', 'Star Dust Animation']);
    });

    it('should respect all constraints simultaneously', () => {
      component.setType('image');
      component.setSortField('date');
      const result = component.filteredAssets();
      expect(result.length).toBe(2);
      expect(result[0].title).toBe('Star Sticker');
      expect(result[1].title).toBe('Apple Sticker');
    });

    it('should return empty when search+type produces no matches', () => {
      component.setSearch('Star');
      vi.advanceTimersByTime(300);
      component.setType('audio');
      expect(component.filteredAssets().length).toBe(0);
    });
  });

  describe('Counts and active filter', () => {
    it('should have correct totalCount', () => {
      expect(component.totalCount()).toBe(5);
    });

    it('should have correct filteredCount', () => {
      component.setType('image');
      expect(component.filteredCount()).toBe(2);
    });

    it('should flag hasActiveFilter true when searching', () => {
      component.setSearch('hi');
      vi.advanceTimersByTime(300);
      expect(component.hasActiveFilter()).toBe(true);
    });

    it('should flag hasActiveFilter true when type changed', () => {
      component.setType('audio');
      expect(component.hasActiveFilter()).toBe(true);
    });

    it('should flag hasActiveFilter true when sort changed', () => {
      component.setSortField('title');
      expect(component.hasActiveFilter()).toBe(true);
    });

    it('should flag hasActiveFilter false when no filters applied', () => {
      expect(component.hasActiveFilter()).toBe(false);
    });
  });

  describe('clearFilters', () => {
    it('should reset all filters to defaults', () => {
      component.setSearch('star');
      vi.advanceTimersByTime(300);
      component.setType('image');
      component.setSortField('title');
      component.clearFilters();
      expect(component.searchTerm()).toBe('');
      expect(component.selectedType()).toBe('all');
      expect(component.sortField()).toBe('date');
      expect(component.sortDirection()).toBe('desc');
    });

    it('should show all assets after clear', () => {
      component.setType('image');
      expect(component.filteredCount()).toBe(2);
      component.clearFilters();
      expect(component.filteredCount()).toBe(5);
    });

    it('should reset hasActiveFilter to false', () => {
      component.setType('image');
      component.setSearch('test');
      vi.advanceTimersByTime(300);
      expect(component.hasActiveFilter()).toBe(true);
      component.clearFilters();
      expect(component.hasActiveFilter()).toBe(false);
    });
  });

  describe('Empty state', () => {
    it('should show empty counts when server returns empty', () => {
      getAssetsSpy.mockReturnValueOnce(of([]));
      component.setType('image');
      expect(component.filteredCount()).toBe(0);
    });

    it('should return empty list when filter produces no results', () => {
      component.setSearch('zzzzz');
      vi.advanceTimersByTime(300);
      expect(component.filteredAssets()).toEqual([]);
      expect(component.filteredCount()).toBe(0);
    });
  });
});
