import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';

import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Api } from '../../services/api';
import { User, ParentStudentLink, ApiListResponse } from '../../models/types';
import { NotificationService } from '../../services/notification.service';
import { ModalComponent } from '../shared/modal/modal';

@Component({
  selector: 'app-parent-student-manager',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, ModalComponent],
  templateUrl: './parent-student-manager.html',
})
export class ParentStudentManager implements OnInit {
  currentUser: User | null = null;
  isLoading = true;

  parentStudentLinks: ParentStudentLink[] = [];
  filteredLinks: ParentStudentLink[] = [];

  availableParents: User[] = [];
  availableStudents: User[] = [];

  searchQuery = '';

  linkForm: FormGroup;
  showCreateModal = false;
  isCreating = false;

  showDeleteModal = false;
  linkToDelete: number | null = null;
  isDeleting = false;

  private apiService = inject(Api);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private cdr = inject(ChangeDetectorRef);
  private notificationService = inject(NotificationService);

  constructor() {
    this.linkForm = this.fb.group({
      parent_id: ['', Validators.required],
      student_id: ['', Validators.required],
    });
  }

  ngOnInit() {
    this.apiService.currentUser$.subscribe((user) => {
      this.currentUser = user;
      if (!user) {
        this.router.navigate(['/login']);
        return;
      }
      if (user.role !== 'staff') {
        this.router.navigate(['/dashboard']);
        return;
      }
      this.loadData();
    });
  }

  loadData() {
    this.isLoading = true;
    this.cdr.detectChanges();

    // Fetch Links
    this.apiService.getParentStudentLinks().subscribe({
      next: (response: ParentStudentLink[] | ApiListResponse<ParentStudentLink>) => {
        const links = ('results' in response ? response.results : response) as ParentStudentLink[];
        this.parentStudentLinks = links;
        this.filterLinks();
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.notificationService.error('Failed to load parent-student links');
        this.isLoading = false;
        this.cdr.detectChanges();
      },
    });

    // Fetch Parents
    this.apiService.getUsersByRole('parent').subscribe({
      next: (response) => {
        this.availableParents = ('results' in response ? response.results : response) as User[];
        this.cdr.detectChanges();
      },
    });

    // Fetch Students
    this.apiService.getUsersByRole('student').subscribe({
      next: (response) => {
        this.availableStudents = ('results' in response ? response.results : response) as User[];
        this.cdr.detectChanges();
      },
    });
  }

  onSearch(event: Event) {
    this.searchQuery = (event.target as HTMLInputElement).value.toLowerCase();
    this.filterLinks();
  }

  filterLinks() {
    if (!this.searchQuery) {
      this.filteredLinks = [...this.parentStudentLinks];
    } else {
      this.filteredLinks = this.parentStudentLinks.filter(
        (link) =>
          link.parent_username?.toLowerCase().includes(this.searchQuery) ||
          false ||
          link.student_username?.toLowerCase().includes(this.searchQuery) ||
          false,
      );
    }
  }

  openCreateModal() {
    this.linkForm.reset({ parent_id: '', student_id: '' });
    this.showCreateModal = true;
  }

  closeCreateModal() {
    this.showCreateModal = false;
  }

  createLink() {
    if (this.linkForm.invalid) return;

    this.isCreating = true;
    const { parent_id, student_id } = this.linkForm.value;

    this.apiService.createParentStudentLink(Number(parent_id), Number(student_id)).subscribe({
      next: (newLink) => {
        this.parentStudentLinks.unshift(newLink);
        this.filterLinks();
        this.isCreating = false;
        this.closeCreateModal();
        this.notificationService.success('Family link created successfully!');
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isCreating = false;
        const msg =
          err.error?.non_field_errors?.[0] ||
          'Failed to create link. They might already be linked.';
        this.notificationService.error(msg);
        this.cdr.detectChanges();
      },
    });
  }

  confirmDelete(linkId: number) {
    this.linkToDelete = linkId;
    this.showDeleteModal = true;
  }

  closeDeleteModal() {
    this.showDeleteModal = false;
    this.linkToDelete = null;
  }

  deleteLink() {
    if (!this.linkToDelete) return;

    this.isDeleting = true;
    this.apiService.deleteParentStudentLink(this.linkToDelete).subscribe({
      next: () => {
        this.parentStudentLinks = this.parentStudentLinks.filter((l) => l.id !== this.linkToDelete);
        this.filterLinks();
        this.isDeleting = false;
        this.closeDeleteModal();
        this.notificationService.success('Link removed successfully!');
        this.cdr.detectChanges();
      },
      error: () => {
        this.isDeleting = false;
        this.notificationService.error('Failed to remove link');
        this.cdr.detectChanges();
      },
    });
  }
}
