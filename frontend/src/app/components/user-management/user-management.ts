import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Api } from '../../services/api';
import { User, AuditLog } from '../../models/types';

import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './user-management.html',
})
export class UserManagementComponent implements OnInit {
  private api = inject(Api);

  users: User[] = [];
  auditLogs: AuditLog[] = [];
  loading = false;
  error = '';

  selectedUser: User | null = null;
  showAuditModal = false;

  filterRole: string = 'all';
  searchQuery: string = '';

  ngOnInit() {
    this.loadUsers();
  }

  loadUsers() {
    this.loading = true;
    this.api.getManageUsers().subscribe({
      next: (res) => {
        // Handle both paginated and non-paginated just in case
        this.users = Array.isArray(res)
          ? res
          : ((res as Record<string, unknown>)['results'] as User[]) || [];
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Failed to load users';
        this.loading = false;
        console.error(err);
      },
    });
  }

  get filteredUsers() {
    return this.users.filter((u) => {
      const matchRole = this.filterRole === 'all' || u.role === this.filterRole;
      const matchSearch =
        u.username.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(this.searchQuery.toLowerCase());
      return matchRole && matchSearch;
    });
  }

  toggleUserStatus(user: User) {
    const newStatus = !user.is_active;
    if (
      confirm(
        `Are you sure you want to ${newStatus ? 'activate' : 'deactivate'} user ${user.username}?`,
      )
    ) {
      this.api.updateManageUser(user.id, { is_active: newStatus }).subscribe({
        next: (updatedUser) => {
          user.is_active = updatedUser.is_active;
        },
        error: (err) => {
          console.error(err);
          alert('Failed to update user status');
        },
      });
    }
  }

  viewAuditLogs(user: User) {
    this.selectedUser = user;
    this.showAuditModal = true;
    this.api.getAuditLogs(user.id).subscribe({
      next: (res) => {
        this.auditLogs = Array.isArray(res)
          ? (res as AuditLog[])
          : ((res as Record<string, unknown>)['results'] as AuditLog[]) || [];
      },
      error: (err) => {
        console.error(err);
        alert('Failed to load audit logs');
      },
    });
  }

  closeAuditModal() {
    this.showAuditModal = false;
    this.selectedUser = null;
    this.auditLogs = [];
  }
}
