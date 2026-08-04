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

  /**
   * Other names and phone numbers the entity is known by. Search matches on both, so a
   * result can otherwise look unrelated to what was typed. Capped because an imported
   * entity can carry a dozen numbers and the card is a summary, not the profile.
   */
  private static readonly ChipLimit = 3;

  alternativeNames = computed(() =>
    (this.entity().alternativeNames ?? []).slice(0, EntityCardComponent.ChipLimit));

  phoneNumbers = computed(() =>
    (this.entity().phoneNumbers ?? []).slice(0, EntityCardComponent.ChipLimit));
}
