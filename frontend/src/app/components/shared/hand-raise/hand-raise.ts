import { TranslatePipe } from '@ngx-translate/core';
import { Component, inject, signal, OnDestroy, input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  CanvasCollaborationService,
  HandRaiseEvent,
} from '../../../services/canvas/canvas-collaboration.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-hand-raise',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  templateUrl: './hand-raise.html',
  styleUrls: ['./hand-raise.css'],
})
export class HandRaiseComponent implements OnDestroy, OnInit {
  private collabService = inject(CanvasCollaborationService);
  private subscription: Subscription | null = null;

  isRaised = signal(false);
  raisedHands = signal<Map<number, HandRaiseEvent>>(new Map());
  userRole = input<'mentor' | 'student' | 'staff' | 'parent' | null>(null);
  showList = signal(false);

  ngOnInit() {
    this.subscription = this.collabService.getHandRaises().subscribe((event) => {
      this.raisedHands.update((map) => {
        const newMap = new Map(map);
        if (event.raised && event.userId) {
          newMap.set(event.userId, event);
        } else if (event.userId) {
          newMap.delete(event.userId);
        }
        return newMap;
      });
    });
  }

  ngOnDestroy() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  toggleHand() {
    const newState = !this.isRaised();
    this.isRaised.set(newState);
    this.collabService.raiseHand(newState);
  }

  toggleList() {
    this.showList.update((v) => !v);
  }

  getRaisedHandsList(): HandRaiseEvent[] {
    return Array.from(this.raisedHands().values());
  }

  getRaisedCount(): number {
    return this.raisedHands().size;
  }

  getInitial(username: string): string {
    return username?.charAt(0).toUpperCase() || '?';
  }
}
