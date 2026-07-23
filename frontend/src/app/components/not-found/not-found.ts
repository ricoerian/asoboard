import { TranslatePipe } from '@ngx-translate/core';
import { Component } from '@angular/core';

import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [RouterLink, TranslatePipe],
  templateUrl: './not-found.html',
})
export class NotFoundComponent {}
