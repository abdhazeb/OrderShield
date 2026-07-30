import { Component, ChangeDetectionStrategy, input, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { SeverityBadgeComponent } from '../severity-badge/severity-badge.component';
import { EntitySearchResult } from '../../../core/models';
import { VerificationStatus } from '../../../core/enums';
import { LocalizeValuePipe } from '../../pipes/localize-value.pipe';

@Component({
  selector: 'app-entity-card',
  standalone: true,
  imports: [RouterLink, TranslateModule, SeverityBadgeComponent, LocalizeValuePipe],
  templateUrl: './entity-card.component.html',
  styleUrl: './entity-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EntityCardComponent {
  entity = input.required<EntitySearchResult>();

  isVerified = computed(() => this.entity().verificationStatus === VerificationStatus.Verified);
}
