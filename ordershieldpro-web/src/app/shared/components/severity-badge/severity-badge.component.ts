import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-severity-badge',
  standalone: true,
  imports: [TranslateModule],
  templateUrl: './severity-badge.component.html',
  styleUrl: './severity-badge.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SeverityBadgeComponent {
  severity = input.required<string>();
  count = input<number>();
}
