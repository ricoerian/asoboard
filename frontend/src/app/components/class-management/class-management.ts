import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Api } from '../../services/api';
import { ClassGroup } from '../../models/types';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-class-management',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './class-management.html',
})
export class ClassManagementComponent implements OnInit {
  private api = inject(Api);

  classGroups: ClassGroup[] = [];
  loading = false;
  error = '';

  showCreateModal = false;
  newClassName = '';
  newClassDesc = '';

  showImportModal = false;
  selectedGroup: ClassGroup | null = null;
  csvFile: File | null = null;
  importing = false;

  ngOnInit() {
    this.loadClassGroups();
  }

  loadClassGroups() {
    this.loading = true;
    this.api.getClassGroups().subscribe({
      next: (res) => {
        this.classGroups = Array.isArray(res)
          ? res
          : ((res as Record<string, unknown>)['results'] as ClassGroup[]) || [];
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Failed to load class groups';
        this.loading = false;
        console.error(err);
      },
    });
  }

  createClass() {
    if (!this.newClassName.trim()) return;

    this.api
      .createClassGroup({
        name: this.newClassName,
        description: this.newClassDesc,
      })
      .subscribe({
        next: (newClass) => {
          this.classGroups.unshift(newClass);
          this.closeCreateModal();
        },
        error: (err) => {
          alert('Failed to create class group');
          console.error(err);
        },
      });
  }

  deleteClass(id: number) {
    if (confirm('Are you sure you want to delete this class group?')) {
      this.api.deleteClassGroup(id).subscribe({
        next: () => {
          this.classGroups = this.classGroups.filter((c) => c.id !== id);
        },
        error: (err) => {
          alert('Failed to delete class group');
          console.error(err);
        },
      });
    }
  }

  openCreateModal() {
    this.newClassName = '';
    this.newClassDesc = '';
    this.showCreateModal = true;
  }

  closeCreateModal() {
    this.showCreateModal = false;
  }

  openImportModal(group: ClassGroup) {
    this.selectedGroup = group;
    this.csvFile = null;
    this.showImportModal = true;
  }

  closeImportModal() {
    this.showImportModal = false;
    this.selectedGroup = null;
    this.csvFile = null;
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file && file.type === 'text/csv') {
      this.csvFile = file;
    } else {
      alert('Please select a valid CSV file.');
      this.csvFile = null;
    }
  }

  importCsv() {
    if (!this.selectedGroup || !this.csvFile) return;

    this.importing = true;
    this.api.importStudentsCSV(this.selectedGroup.id, this.csvFile).subscribe({
      next: (res) => {
        alert(res.message || 'Import successful!');
        this.importing = false;
        this.closeImportModal();
        this.loadClassGroups(); // Reload to get updated student count
      },
      error: (err) => {
        alert('Import failed: ' + (err.error?.error || 'Unknown error'));
        this.importing = false;
        console.error(err);
      },
    });
  }
}
