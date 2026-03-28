import { Component, inject, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { ReviewCardComponent } from '../../shared/components/review-card/review-card.component';
import { StatCardComponent } from '../../shared/components/stat-card/stat-card.component';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/auth/services/auth.service';
import { EntityDetail, Review, PaginatedResult } from '../../core/models';
import { VerificationStatus } from '../../core/enums';

@Component({
  selector: 'app-entity-profile',
  standalone: true,
  imports: [
    RouterLink,
    DatePipe,
    TranslateModule,
    ReviewCardComponent,
    StatCardComponent,
    LoadingSpinnerComponent,
  ],
  templateUrl: './entity-profile.component.html',
  styleUrl: './entity-profile.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EntityProfileComponent implements OnInit {
  private apiService = inject(ApiService);
  private route = inject(ActivatedRoute);
  authService = inject(AuthService);

  entity = signal<EntityDetail | null>(null);
  reviews = signal<Review[]>([]);
  loading = signal(true);
  reviewsLoading = signal(true);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadEntity(id);
      this.loadReviews(id);
    }
  }

  get isVerified(): () => boolean {
    return () => this.entity()?.verificationStatus === VerificationStatus.Verified;
  }

  private loadEntity(id: string): void {
    this.apiService.get<EntityDetail>(`entities/${id}`).subscribe({
      next: (entity) => {
        this.entity.set(entity);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  private loadReviews(entityId: string): void {
    this.apiService
      .get<PaginatedResult<Review>>(`reviews?entityId=${entityId}&page=1&pageSize=20`)
      .subscribe({
        next: (result) => {
          this.reviews.set(result.items);
          this.reviewsLoading.set(false);
        },
        error: () => this.reviewsLoading.set(false),
      });
  }

  toggleFollow(): void {
    const e = this.entity();
    if (!e) return;

    if (e.isFollowed) {
      this.apiService.delete(`entities/${e.id}/follow`).subscribe({
        next: () => {
          this.entity.set({ ...e, isFollowed: false, followerCount: e.followerCount - 1 });
        },
      });
    } else {
      this.apiService.post(`entities/${e.id}/follow`, {}).subscribe({
        next: () => {
          this.entity.set({ ...e, isFollowed: true, followerCount: e.followerCount + 1 });
        },
      });
    }
  }
}
