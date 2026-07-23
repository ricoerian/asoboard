import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface Notification {
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  id: number;
}

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  private notificationsSubject = new BehaviorSubject<Notification[]>([]);
  public notifications$ = this.notificationsSubject.asObservable();
  private nextId = 0;

  show(message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') {
    const id = this.nextId++;
    const current = this.notificationsSubject.value;
    this.notificationsSubject.next([...current, { message, type, id }]);

    setTimeout(() => {
      this.remove(id);
    }, 5000);
  }

  success(message: string) {
    this.show(message, 'success');
  }

  error(message: string) {
    this.show(message, 'error');
  }

  warning(message: string) {
    this.show(message, 'warning');
  }

  remove(id: number) {
    const current = this.notificationsSubject.value;
    this.notificationsSubject.next(current.filter((n) => n.id !== id));
  }
}
