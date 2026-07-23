import { Component, OnInit, OnDestroy, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';
import { Api } from '../../services/api';
import { NotificationCenterComponent } from '../../components/shared/notification-center/notification-center';
import {
  Course,
  User,
  Enrollment,
  ApiListResponse,
  UserStreak,
  UserLevel,
  SystemAnalytics,
  MentorAnalytics,
} from '../../models/types';
import { ModalComponent } from '../shared/modal/modal';
import { StreakBadgeComponent } from '../shared/streak-badge/streak-badge';
import { LevelBadgeComponent } from '../shared/level-badge/level-badge';
import { NotificationService } from '../../services/notification.service';
import { TranslatePipe } from '@ngx-translate/core';
import { LanguageSwitcherComponent } from '../shared/language-switcher/language-switcher.component';

type SortOption =
  | '-created_at'
  | 'created_at'
  | 'title'
  | '-title'
  | '-session_count'
  | 'session_count';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    RouterLink,
    ModalComponent,
    StreakBadgeComponent,
    LevelBadgeComponent,

    NotificationCenterComponent,
    TranslatePipe,
    LanguageSwitcherComponent,
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard implements OnInit, OnDestroy {
  courses: Course[] = [];
  filteredCourses: Course[] = [];
  currentUser: User | null = null;
  isLoading = true;

  searchQuery = '';
  sortOption: SortOption = '-created_at';

  showCreateModal = false;
  courseForm: FormGroup;

  showEditModal = false;
  editingCourse: Course | null = null;

  showDeleteConfirm = false;
  courseToDeleteId: number | null = null;

  enrolledCourseIds: Set<number> = new Set();
  isEnrolling: Set<number> = new Set();
  showMyCourses = false;

  streak: UserStreak | null = null;
  streakLeveledUp = false;

  levelData: UserLevel | null = null;
  children: import('../../models/types').ChildProfile[] = [];

  systemAnalytics: SystemAnalytics | null = null;
  mentorAnalytics: MentorAnalytics | null = null;

  get totalChildrenXP(): number {
    return this.children.reduce((total, child) => total + (child.total_points || 0), 0);
  }

  get averageChildrenStreak(): number {
    if (this.children.length === 0) return 0;
    const totalStreak = this.children.reduce(
      (total, child) => total + (child.streak_info?.current_streak || 0),
      0,
    );
    return Math.round(totalStreak / this.children.length);
  }

  private searchSubject = new Subject<string>();
  private destroy$ = new Subject<void>();

  private apiService = inject(Api);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private fb = inject(FormBuilder);
  private notificationService = inject(NotificationService);

  constructor() {
    this.courseForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(100)]],
      description: ['', [Validators.maxLength(500)]],
    });
  }

  ngOnInit() {
    this.apiService.checkAuthStatus().subscribe({
      next: (user: User) => {
        const parsedUser = typeof user === 'string' ? JSON.parse(user as string) : user;
        this.currentUser = parsedUser;
        this.cdr.detectChanges();
        if (parsedUser.role === 'student') {
          this.loadEnrollments();
          this.loadStreak();
          this.loadLevel();
        } else if (parsedUser.role === 'parent') {
          this.loadChildren();
        } else if (this.currentUser?.role === 'staff') {
          this.loadSystemAnalytics();
        } else if (this.currentUser?.role === 'mentor') {
          this.loadMentorAnalytics();
        }
      },
      error: () => {
        this.currentUser = null;
        this.cdr.detectChanges();
      },
    });

    this.searchSubject
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(() => {
        this.loadCourses();
      });

    this.loadCourses();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadChildren() {
    this.apiService.getChildren().subscribe({
      next: (data) => {
        this.children = data;
        this.cdr.detectChanges();
      },
    });
  }

  loadSystemAnalytics() {
    this.apiService.getSystemAnalytics().subscribe({
      next: (data) => {
        const parsedData = typeof data === 'string' ? JSON.parse(data as string) : data;
        this.systemAnalytics = parsedData.data || parsedData;
        this.cdr.detectChanges();
      },
    });
  }

  loadMentorAnalytics() {
    this.apiService.getMentorAnalytics().subscribe({
      next: (data) => {
        this.mentorAnalytics = data;
        this.cdr.detectChanges();
      },
    });
  }

  exportCsv(type: 'users' | 'courses' | 'students') {
    this.apiService.exportCsvReport(type);
  }

  viewChildProgress(childId: number) {
    this.router.navigate(['/progress'], { queryParams: { student_id: childId } });
  }

  loadCourses() {
    this.apiService
      .getCourses({
        search: this.searchQuery.trim() || undefined,
        ordering: this.sortOption,
        enrolled: this.showMyCourses ? true : undefined,
      })
      .subscribe({
        next: (data) => {
          const parsedData = typeof data === 'string' ? JSON.parse(data as string) : data;

          if (Array.isArray(parsedData)) {
            this.courses = parsedData;
          } else if (parsedData && typeof parsedData === 'object') {
            this.courses = parsedData.results || parsedData.data || [parsedData];
          } else {
            this.courses = [];
          }
          this.filteredCourses = this.courses;
          this.isLoading = false;
          this.cdr.detectChanges();
        },
        error: () => {
          this.isLoading = false;
          this.cdr.detectChanges();
        },
      });
  }

  toggleMyCourses() {
    this.showMyCourses = !this.showMyCourses;
    this.loadCourses();
  }

  loadEnrollments() {
    if (this.currentUser?.role !== 'student') return;
    this.apiService.getEnrollments().subscribe({
      next: (data) => {
        const parsedData = typeof data === 'string' ? JSON.parse(data as string) : data;
        const items = Array.isArray(parsedData)
          ? parsedData
          : (parsedData as ApiListResponse<Enrollment>).results || [];
        this.enrolledCourseIds = new Set(items.map((e: Enrollment) => e.course));
        this.cdr.detectChanges();
      },
    });
  }

  loadStreak() {
    this.apiService.getStreak().subscribe({
      next: (data: UserStreak) => {
        this.streak = data;
        this.streakLeveledUp = !!data.leveled_up;
        this.cdr.detectChanges();
      },
      error: () => {
        this.streak = null;
      },
    });
  }

  loadLevel() {
    this.apiService.getLevel().subscribe({
      next: (data: UserLevel) => {
        this.levelData = data;
        this.cdr.detectChanges();
      },
      error: () => {
        this.levelData = null;
      },
    });
  }

  isEnrolled(courseId: number): boolean {
    return this.enrolledCourseIds.has(courseId);
  }

  enrollInCourse(courseId: number) {
    this.isEnrolling.add(courseId);
    this.apiService.enrollInCourse(courseId).subscribe({
      next: () => {
        this.enrolledCourseIds.add(courseId);
        this.isEnrolling.delete(courseId);
        this.notificationService.success('You enrolled in the course!');
        this.cdr.detectChanges();
      },
      error: () => {
        this.isEnrolling.delete(courseId);
        this.notificationService.error('Could not enroll. Please try again.');
        this.cdr.detectChanges();
      },
    });
  }

  onSearchChange(value: string) {
    this.searchQuery = value;
    this.searchSubject.next(value);
  }

  onSortChange(value: SortOption) {
    this.sortOption = value;
    this.loadCourses();
  }

  clearSearch() {
    this.searchQuery = '';
    this.searchSubject.next('');
  }

  logout() {
    this.apiService.logout().subscribe({
      next: () => {
        this.notificationService.success('Logged out successfully!');
        this.router.navigate(['/login']);
      },
      error: () => this.router.navigate(['/login']),
    });
  }

  openCreateModal() {
    this.courseForm.reset();
    this.showCreateModal = true;
  }

  closeCreateModal() {
    this.showCreateModal = false;
  }

  submitCreateCourse() {
    if (this.courseForm.invalid) return;

    this.apiService.createCourse(this.courseForm.value).subscribe({
      next: () => {
        this.closeCreateModal();
        this.notificationService.success('Course created successfully!');
        this.loadCourses();
      },
    });
  }

  openEditModal(course: Course) {
    this.editingCourse = { ...course };
    this.courseForm.patchValue({
      title: course.title,
      description: course.description,
    });
    this.showEditModal = true;
  }

  closeEditModal() {
    this.showEditModal = false;
    this.editingCourse = null;
  }

  submitEditCourse() {
    if (!this.editingCourse || this.courseForm.invalid) return;

    this.apiService.updateCourse(this.editingCourse.id, this.courseForm.value).subscribe({
      next: () => {
        this.closeEditModal();
        this.notificationService.success('Course updated successfully!');
        this.loadCourses();
      },
    });
  }

  deleteCourse(id: number) {
    this.courseToDeleteId = id;
    this.showDeleteConfirm = true;
  }

  closeDeleteConfirm() {
    this.showDeleteConfirm = false;
    this.courseToDeleteId = null;
  }

  confirmDeleteCourse() {
    if (this.courseToDeleteId === null) return;

    this.apiService.deleteCourse(this.courseToDeleteId).subscribe({
      next: () => {
        this.notificationService.success('Course deleted. Poof!');
        this.closeDeleteConfirm();
        this.loadCourses();
      },
      error: () => {
        this.notificationService.error('Failed to delete course.');
        this.closeDeleteConfirm();
        this.cdr.detectChanges();
      },
    });
  }
}
