import { TranslatePipe } from '@ngx-translate/core';
import { Component, Input } from '@angular/core';
import { UserStreak } from '../../../models/types';

@Component({
  selector: 'app-streak-badge',
  standalone: true,
  imports: [TranslatePipe],
  templateUrl: './streak-badge.html',
  styleUrl: './streak-badge.css',
})
export class StreakBadgeComponent {
  @Input() streak: UserStreak | null = null;
  @Input() leveledUp = false;
}
