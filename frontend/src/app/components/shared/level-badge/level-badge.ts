import { Component, Input } from '@angular/core';
import { UserLevel } from '../../../models/types';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-level-badge',
  standalone: true,
  imports: [TranslatePipe],
  templateUrl: './level-badge.html',
  styleUrl: './level-badge.css',
})
export class LevelBadgeComponent {
  @Input() levelData: UserLevel | null = null;
}
