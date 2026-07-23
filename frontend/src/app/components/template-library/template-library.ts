import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Api } from '../../services/api';
import { SessionTemplate, User, GameType, ApiListResponse } from '../../models/types';
import { ModalComponent } from '../shared/modal/modal';
import { NotificationService } from '../../services/notification.service';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-template-library',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, ModalComponent, TranslatePipe],
  templateUrl: './template-library.html',
})
export class TemplateLibrary implements OnInit {
  private apiService = inject(Api);
  private cdr = inject(ChangeDetectorRef);
  private fb = inject(FormBuilder);
  private notificationService = inject(NotificationService);

  currentUser: User | null = null;
  templates: SessionTemplate[] = [];
  isLoading = true;
  filterType: GameType | 'all' = 'all';

  showCreateModal = false;
  showDeleteConfirm = false;
  templateToDelete: SessionTemplate | null = null;

  templateForm: FormGroup = this.fb.group({
    title: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(100)]],
    description: ['', [Validators.maxLength(500)]],
    template_type: ['trivia', [Validators.required]],
    is_public: [false],
  });

  gameTypeOptions: { value: GameType; label: string; icon: string }[] = [
    { value: 'trivia', label: 'Trivia', icon: 'fa-circle-question' },
    { value: 'puzzle', label: 'Puzzle', icon: 'fa-puzzle-piece' },
    { value: 'math', label: 'Math Balance', icon: 'fa-scale-balanced' },
    { value: 'physics', label: 'Physics', icon: 'fa-atom' },
    { value: 'color', label: 'Color Mix', icon: 'fa-palette' },
    { value: 'chemistry', label: 'Chemistry', icon: 'fa-flask' },
    { value: 'memory', label: 'Memory Match', icon: 'fa-clone' },
    { value: 'maze', label: 'Maze', icon: 'fa-route' },
    { value: 'word_scramble', label: 'Word Scramble', icon: 'fa-shuffle' },
  ];

  ngOnInit() {
    this.apiService.checkAuthStatus().subscribe({
      next: (user: User) => {
        this.currentUser = user;
        this.loadTemplates();
      },
      error: () => {
        this.currentUser = null;
        this.cdr.detectChanges();
      },
    });
  }

  loadTemplates() {
    this.isLoading = true;
    this.apiService.getSessionTemplates().subscribe({
      next: (data) => {
        const parsedData = typeof data === 'string' ? JSON.parse(data as string) : data;
        if (Array.isArray(parsedData)) {
          this.templates = parsedData;
        } else if (parsedData && typeof parsedData === 'object') {
          this.templates = (parsedData as ApiListResponse<SessionTemplate>).results || [];
        }
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.notificationService.error('Failed to load templates.');
        this.isLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  get filteredTemplates(): SessionTemplate[] {
    if (this.filterType === 'all') {
      return this.templates;
    }
    return this.templates.filter((t) => t.template_type === this.filterType);
  }

  isMyTemplate(template: SessionTemplate): boolean {
    return this.currentUser?.id === template.mentor;
  }

  openCreateModal() {
    this.templateForm.reset({
      title: '',
      description: '',
      template_type: 'trivia',
      is_public: false,
    });
    this.showCreateModal = true;
  }

  closeCreateModal() {
    this.showCreateModal = false;
  }

  submitCreateTemplate() {
    if (this.templateForm.invalid) return;

    const value = this.templateForm.value;
    const defaultConfig = this.getDefaultConfig(value.template_type);

    this.apiService
      .createSessionTemplate({
        title: value.title,
        description: value.description,
        template_type: value.template_type,
        game_config: defaultConfig,
        is_public: value.is_public,
      })
      .subscribe({
        next: (template) => {
          this.templates = [template, ...this.templates];
          this.closeCreateModal();
          this.notificationService.success('Template created!');
          this.cdr.detectChanges();
        },
        error: () => {
          this.notificationService.error('Failed to create template.');
          this.cdr.detectChanges();
        },
      });
  }

  private getDefaultConfig(gameType: GameType): Record<string, unknown> {
    switch (gameType) {
      case 'trivia':
        return { question: '', options: ['', '', '', ''], correctIndex: 0 };
      case 'puzzle':
        return { puzzleItems: [] };
      case 'math':
        return { leftWeight: '1000g', availableWeights: [], correctCombination: [] };
      case 'physics':
        return { gravity: 9.8, wind: 0, question: '', options: [], correctIndex: 0 };
      case 'color':
        return { targetColor: '', availableColors: [], correctCombination: [] };
      case 'chemistry':
        return { formula: '', components: [], decoys: [] };
      case 'memory':
        return { pairs: [] };
      case 'maze':
        return {
          rows: 7,
          cols: 7,
          grid: [],
          start: { row: 0, col: 0 },
          end: { row: 6, col: 6 },
          solutionPath: [],
        };
      case 'word_scramble':
        return { answer: '', hint: '' };
      default:
        return {};
    }
  }

  confirmDelete(template: SessionTemplate) {
    this.templateToDelete = template;
    this.showDeleteConfirm = true;
  }

  closeDeleteConfirm() {
    this.showDeleteConfirm = false;
    this.templateToDelete = null;
  }

  submitDelete() {
    if (!this.templateToDelete) return;
    const id = this.templateToDelete.id;

    this.apiService.deleteSessionTemplate(id).subscribe({
      next: () => {
        this.templates = this.templates.filter((t) => t.id !== id);
        this.notificationService.success('Template deleted. 👋');
        this.closeDeleteConfirm();
        this.cdr.detectChanges();
      },
      error: () => {
        this.notificationService.error('Failed to delete template.');
        this.closeDeleteConfirm();
        this.cdr.detectChanges();
      },
    });
  }

  getGameTypeIcon(type: string): string {
    const found = this.gameTypeOptions.find((g) => g.value === type);
    return found?.icon || 'fa-star';
  }

  getGameTypeColor(type: string): string {
    const colors: Record<string, string> = {
      trivia: 'orange',
      puzzle: 'sky',
      math: 'green',
      physics: 'orange',
      color: 'pink',
      chemistry: 'teal',
      memory: 'cyan',
      maze: 'emerald',
      word_scramble: 'amber',
    };
    return colors[type] || 'slate';
  }
}
