import { Component, inject, signal, OnInit } from '@angular/core';
import { DatePipe, DecimalPipe, CurrencyPipe, UpperCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/auth/services/auth.service';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { SeverityLevel, ReviewStatus, ReviewerType, AdminActionStatus, AdminActionType } from '../../core/enums';
import { environment } from '../../../environments/environment';

interface PendingReview {
  id: string;
  tradeEntityId: string;
  tradeEntityName: string;
  reviewerId: string;
  reviewerName?: string;
  reviewerType: ReviewerType;
  title: string;
  severity: SeverityLevel;
  status: ReviewStatus;
  narrative: string;
  product?: string;
  productCategory?: string;
  incidentDate: string;
  orderValue?: number;
  evidenceLinks?: string;
  evidenceFiles: { id: string; fileName: string; contentType: string; fileSizeBytes: number }[];
  publicEvidenceNotes: { id: string; summary: string; verificationOutcome: number; createdAt: string }[];
  createdAt: string;
}

interface PendingAction {
  id: string;
  actionType: AdminActionType;
  targetType: string;
  targetId: string;
  payload?: string;
  proposedById: string;
  proposedByName?: string;
  status: AdminActionStatus;
  reviewedById?: string;
  reviewedAt?: string;
  createdAt: string;
}

interface TeamMember {
  id: string;
  fullName: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
}

interface SystemSetting {
  key: string;
  value: string;
  description?: string;
}

interface AnalyticsSummary {
  totalReviews: number;
  pendingReviews: number;
  publishedReviews: number;
  avgTurnaroundHours: number;
  totalEntities: number;
  verificationRate: number;
}

interface ContactMsg {
  id: string;
  fullName: string;
  email: string;
  subject: string;
  message: string;
  userId?: string;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
}

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [DatePipe, DecimalPipe, CurrencyPipe, UpperCasePipe, FormsModule, TranslateModule, LoadingSpinnerComponent, EmptyStateComponent],
  template: `
    <div class="admin-page" dir="ltr">
      <!-- Tab Bar -->
      <div class="tab-bar">
        <button class="tab-item" [class.active]="activeTab() === 'queue'" (click)="activeTab.set('queue')">
          {{ 'admin.reviewsRequests' | translate }}
          @if (pendingCount() > 0) {
            <span class="tab-badge">{{ pendingCount() }}</span>
          }
        </button>
        <button class="tab-item" [class.active]="activeTab() === 'analytics'" (click)="activeTab.set('analytics'); loadAnalytics()">
          {{ 'admin.analytics' | translate }}
        </button>
        <button class="tab-item" [class.active]="activeTab() === 'messages'" (click)="activeTab.set('messages'); loadContactMessages()">
          {{ 'admin.contactMessages' | translate }}
          @if (unreadMsgCount() > 0) {
            <span class="tab-badge">{{ unreadMsgCount() }}</span>
          }
        </button>
        <button class="tab-item" [class.active]="activeTab() === 'subscriptions'" (click)="activeTab.set('subscriptions'); loadSubscriptionRequests()">
          {{ 'admin.subscriptions' | translate }}
          @if (pendingSubCount() > 0) {
            <span class="tab-badge">{{ pendingSubCount() }}</span>
          }
        </button>
        @if (authService.isSuperAdmin()) {
          <button class="tab-item" [class.active]="activeTab() === 'approvals'" (click)="activeTab.set('approvals'); loadPendingActions()">
            {{ 'admin.approvals' | translate }}
            @if (pendingActionCount() > 0) {
              <span class="tab-badge">{{ pendingActionCount() }}</span>
            }
          </button>
          <button class="tab-item" [class.active]="activeTab() === 'team'" (click)="activeTab.set('team'); loadTeam()">
            {{ 'admin.team' | translate }}
          </button>
          <button class="tab-item" [class.active]="activeTab() === 'settings'" (click)="activeTab.set('settings'); loadSettings()">
            {{ 'admin.settings' | translate }}
          </button>
        }
      </div>

      <!-- Tab Content -->
      <div class="tab-content">

        <!-- ==================== MODERATION QUEUE ==================== -->
        @if (activeTab() === 'queue') {
          @if (loadingReviews()) {
            <div class="content-card"><app-loading-spinner [message]="'admin.loadingQueue' | translate" /></div>
          } @else if (pendingReviews().length === 0) {
            <div class="content-card empty-card">
              <app-empty-state [title]="'admin.queueEmpty' | translate" [subtitle]="'admin.queueEmptyDesc' | translate" />
            </div>
          } @else {
            <div class="queue-list">
              @for (review of pendingReviews(); track review.id) {
                <div class="queue-card" [class.selected]="selectedReview()?.id === review.id">
                  <div class="queue-card-header" (click)="toggleReview(review)">
                    <div class="card-left">
                      <span class="severity-dot" [class]="'dot-' + getSeverityString(review.severity)"></span>
                      <div class="card-title-group">
                        <h3 class="card-title">{{ review.title }}</h3>
                        <div class="card-meta">
                          <span>{{ review.tradeEntityName }}</span>
                          <span class="meta-sep">&middot;</span>
                          <span>{{ review.createdAt | date:'MMM d, yyyy' }}</span>
                          <span class="meta-sep">&middot;</span>
                          <span class="meta-severity" [class]="'sev-' + getSeverityString(review.severity)">
                            {{ getSeverityString(review.severity) | uppercase }}
                          </span>
                        </div>
                      </div>
                    </div>
                    <button class="expand-btn" [class.rotated]="selectedReview()?.id === review.id">
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                        <path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                      </svg>
                    </button>
                  </div>

                  @if (selectedReview()?.id === review.id) {
                    <div class="queue-card-body">
                      <div class="detail-section">
                        <h4 class="section-title">{{ 'admin.reviewDetails' | translate }}</h4>
                        <div class="detail-grid">
                          <div class="detail-item">
                            <span class="detail-key">{{ 'admin.entity' | translate }}</span>
                            <span class="detail-val">{{ review.tradeEntityName }}</span>
                          </div>
                          <div class="detail-item">
                            <span class="detail-key">{{ 'admin.reviewer' | translate }}</span>
                            <span class="detail-val">{{ review.reviewerName || ('admin.anonymous' | translate) }}</span>
                          </div>
                          <div class="detail-item">
                            <span class="detail-key">{{ 'admin.reviewerType' | translate }}</span>
                            <span class="detail-val">{{ getReviewerTypeLabel(review.reviewerType) }}</span>
                          </div>
                          <div class="detail-item">
                            <span class="detail-key">{{ 'admin.severity' | translate }}</span>
                            <span class="detail-val sev-badge" [class]="'sev-' + getSeverityString(review.severity)">
                              {{ getSeverityString(review.severity) | uppercase }}
                            </span>
                          </div>
                          <div class="detail-item">
                            <span class="detail-key">{{ 'admin.incidentDate' | translate }}</span>
                            <span class="detail-val">{{ review.incidentDate | date:'MMM d, yyyy' }}</span>
                          </div>
                          @if (review.orderValue) {
                            <div class="detail-item">
                              <span class="detail-key">{{ 'admin.orderValue' | translate }}</span>
                              <span class="detail-val">{{ review.orderValue | currency:'USD':'symbol':'1.0-0' }}</span>
                            </div>
                          }
                          @if (review.product) {
                            <div class="detail-item">
                              <span class="detail-key">{{ 'admin.product' | translate }}</span>
                              <span class="detail-val">{{ review.product }}</span>
                            </div>
                          }
                          @if (review.productCategory) {
                            <div class="detail-item">
                              <span class="detail-key">{{ 'admin.category' | translate }}</span>
                              <span class="detail-val">{{ review.productCategory }}</span>
                            </div>
                          }
                          <div class="detail-item">
                            <span class="detail-key">{{ 'admin.submitted' | translate }}</span>
                            <span class="detail-val">{{ review.createdAt | date:'MMM d, yyyy h:mm a' }}</span>
                          </div>
                        </div>
                      </div>

                      <div class="detail-section">
                        <h4 class="section-title">{{ 'admin.narrative' | translate }}</h4>
                        <div class="narrative-block">{{ review.narrative }}</div>
                      </div>

                      @if (review.evidenceFiles.length > 0) {
                        <div class="detail-section">
                          <h4 class="section-title">{{ 'admin.evidenceFiles' | translate }} ({{ review.evidenceFiles.length }})</h4>
                          <div class="file-list">
                            @for (file of review.evidenceFiles; track file.id) {
                              <div class="file-row">
                                <span class="file-name">{{ file.fileName }}</span>
                                <span class="file-size">{{ formatFileSize(file.fileSizeBytes) }}</span>
                              </div>
                            }
                          </div>
                        </div>
                      }

                      @if (review.publicEvidenceNotes.length > 0) {
                        <div class="detail-section">
                          <h4 class="section-title">{{ 'admin.existingNotes' | translate }}</h4>
                          @for (note of review.publicEvidenceNotes; track note.id) {
                            <div class="note-card">
                              <p>{{ note.summary }}</p>
                              <span class="note-date">{{ note.createdAt | date:'MMM d, yyyy h:mm a' }}</span>
                            </div>
                          }
                        </div>
                      }

                      <div class="action-toolbar">
                        <button class="toolbar-btn btn-approve" (click)="publishReview(review.id); $event.stopPropagation()">
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M13.3 4L6 11.3L2.7 8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                          {{ 'admin.publish' | translate }}
                        </button>
                        <button class="toolbar-btn btn-reject" (click)="rejectReview(review.id); $event.stopPropagation()">
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M12 4L4 12M4 4l8 8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
                          {{ 'admin.reject' | translate }}
                        </button>
                        <button class="toolbar-btn btn-message" (click)="openMessageForm(review); $event.stopPropagation()">
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M14 10.67A1.33 1.33 0 0 1 12.67 12H4.67L2 14.67V3.33A1.33 1.33 0 0 1 3.33 2h9.34A1.33 1.33 0 0 1 14 3.33v7.34z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
                          {{ 'admin.messageReviewer' | translate }}
                        </button>
                      </div>

                      @if (showMessageForm() && messageReviewId() === review.id) {
                        <div class="message-panel">
                          <h4 class="section-title">{{ 'admin.contactReviewer' | translate }}</h4>
                          <p class="message-desc">{{ 'admin.contactDesc' | translate }}</p>
                          <textarea
                            class="msg-textarea"
                            rows="4"
                            [(ngModel)]="messageText"
                            [placeholder]="'admin.placeholder.message' | translate"></textarea>
                          <div class="msg-actions">
                            <button class="toolbar-btn btn-approve" [disabled]="!messageText.trim() || sendingMessage()" (click)="sendMessage(review.id)">
                              {{ sendingMessage() ? ('admin.sending' | translate) : ('admin.sendMessage' | translate) }}
                            </button>
                            <button class="toolbar-btn" (click)="showMessageForm.set(false); messageText = ''">{{ messageSent() ? ('admin.close' | translate) : ('admin.cancel' | translate) }}</button>
                          </div>
                          @if (messageSent()) {
                            <div class="toast-success">{{ 'admin.messageSent' | translate }}</div>
                          }
                        </div>
                      }
                    </div>
                  }
                </div>
              }
            </div>
          }
        }

        <!-- ==================== ANALYTICS ==================== -->
        @if (activeTab() === 'analytics') {
          @if (loadingAnalytics()) {
            <div class="content-card"><app-loading-spinner [message]="'admin.loadingAnalytics' | translate" /></div>
          } @else if (analytics()) {
            <div class="kpi-grid">
              <div class="kpi-card clickable" (click)="activeTab.set('queue')">
                <div class="kpi-icon blue-bg"><svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
                <div class="kpi-data">
                  <span class="kpi-value">{{ analytics()!.totalReviews }}</span>
                  <span class="kpi-label">{{ 'admin.totalReviews' | translate }}</span>
                </div>
              </div>
              <div class="kpi-card clickable" (click)="activeTab.set('queue')">
                <div class="kpi-icon amber-bg"><svg width="24" height="24" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="white" stroke-width="2"/><path d="M12 6v6l4 2" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
                <div class="kpi-data">
                  <span class="kpi-value">{{ analytics()!.pendingReviews }}</span>
                  <span class="kpi-label">{{ 'admin.pendingReviews' | translate }}</span>
                </div>
              </div>
              <div class="kpi-card clickable" (click)="activeTab.set('queue')">
                <div class="kpi-icon green-bg"><svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M22 4L12 14.01l-3-3" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
                <div class="kpi-data">
                  <span class="kpi-value">{{ analytics()!.publishedReviews }}</span>
                  <span class="kpi-label">{{ 'admin.publishedReviews' | translate }}</span>
                </div>
              </div>
              <div class="kpi-card clickable" (click)="activeTab.set('queue')">
                <div class="kpi-icon purple-bg"><svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
                <div class="kpi-data">
                  <span class="kpi-value">{{ analytics()!.avgTurnaroundHours | number:'1.0-0' }}<small>h</small></span>
                  <span class="kpi-label">{{ 'admin.avgTurnaround' | translate }}</span>
                </div>
              </div>
              <div class="kpi-card">
                <div class="kpi-icon teal-bg"><svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="9" cy="7" r="4" stroke="white" stroke-width="2"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
                <div class="kpi-data">
                  <span class="kpi-value">{{ analytics()!.totalEntities }}</span>
                  <span class="kpi-label">{{ 'admin.totalEntities' | translate }}</span>
                </div>
              </div>
            </div>

            <div class="content-card">
              <h3 class="card-section-title">{{ 'admin.verificationRate' | translate }}</h3>
              <div class="progress-container">
                <div class="progress-bar">
                  <div class="progress-fill" [style.width.%]="analytics()!.verificationRate"></div>
                </div>
                <span class="progress-label">{{ analytics()!.verificationRate | number:'1.0-1' }}% {{ 'admin.verificationDesc' | translate }}</span>
              </div>
            </div>
          } @else {
            <div class="content-card empty-card">
              <app-empty-state [title]="'admin.noAnalytics' | translate" [subtitle]="'admin.noAnalyticsDesc' | translate" />
            </div>
          }
        }

        <!-- ==================== CONTACT MESSAGES ==================== -->
        @if (activeTab() === 'messages') {
          @if (loadingMessages()) {
            <div class="content-card"><app-loading-spinner [message]="'admin.loadingMessages' | translate" /></div>
          } @else if (contactMessages().length === 0) {
            <div class="content-card empty-card">
              <app-empty-state [title]="'admin.noMessages' | translate" [subtitle]="'admin.noMessagesDesc' | translate" />
            </div>
          } @else {
            <div class="queue-list">
              @for (msg of contactMessages(); track msg.id) {
                <div class="queue-card" [class.unread]="!msg.isRead" [class.selected]="selectedMsg()?.id === msg.id">
                  <div class="queue-card-header" (click)="toggleMsg(msg)">
                    <div class="card-left">
                      <span class="msg-dot" [class.unread-dot]="!msg.isRead"></span>
                      <div class="card-title-group">
                        <h3 class="card-title">{{ msg.subject }}</h3>
                        <div class="card-meta">
                          <span>{{ msg.fullName }}</span>
                          <span class="meta-sep">&middot;</span>
                          <span>{{ msg.email }}</span>
                          <span class="meta-sep">&middot;</span>
                          <span>{{ msg.createdAt | date:'MMM d, yyyy HH:mm' }}</span>
                        </div>
                      </div>
                    </div>
                    <button class="expand-btn" [class.rotated]="selectedMsg()?.id === msg.id">
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                        <path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                      </svg>
                    </button>
                  </div>

                  @if (selectedMsg()?.id === msg.id) {
                    <div class="queue-card-body">
                      <div class="detail-section">
                        <div class="msg-body">{{ msg.message }}</div>
                        <div class="msg-footer">
                          @if (!msg.isRead) {
                            <button class="btn-sm btn-mark-read" (click)="markMsgRead(msg.id)">
                              ? {{ 'admin.markRead' | translate }}
                            </button>
                          } @else {
                            <span class="read-badge">? {{ 'admin.readAt' | translate }}: {{ msg.readAt | date:'MMM d, yyyy HH:mm' }}</span>
                          }
                        </div>
                      </div>
                    </div>
                  }
                </div>
              }
            </div>
          }
        }

        <!-- ==================== APPROVALS (SuperAdmin) ==================== -->
        @if (activeTab() === 'approvals') {
          @if (loadingActions()) {
            <div class="content-card"><app-loading-spinner [message]="'admin.loadingPendingActions' | translate" /></div>
          } @else if (pendingActions().length === 0) {
            <div class="content-card empty-card">
              <app-empty-state [title]="'admin.noPendingActions' | translate" [subtitle]="'admin.noPendingActionsDesc' | translate" />
            </div>
          } @else {
            <div class="queue-list">
              @for (action of pendingActions(); track action.id) {
                <div class="queue-card">
                  <div class="queue-card-header">
                    <div class="card-left">
                      <span class="action-type-badge">{{ getActionTypeLabel(action.actionType) }}</span>
                      <div class="card-title-group">
                        <h3 class="card-title">{{ action.targetType }} #{{ action.targetId.substring(0, 8) }}</h3>
                        <div class="card-meta">
                          <span>{{ 'admin.proposedBy' | translate }}: {{ action.proposedByName || 'Admin' }}</span>
                          <span class="meta-sep">&middot;</span>
                          <span>{{ action.createdAt | date:'MMM d, yyyy HH:mm' }}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div class="queue-card-body">
                    @if (action.payload) {
                      <div class="detail-section">
                        <h4 class="section-title">{{ 'admin.actionPayload' | translate }}</h4>
                        <div class="narrative-block">{{ action.payload }}</div>
                      </div>
                    }
                    <div class="action-toolbar">
                      <button class="toolbar-btn btn-approve" (click)="approveAction(action.id)">
                        ? {{ 'admin.approveAction' | translate }}
                      </button>
                      <button class="toolbar-btn btn-reject" (click)="rejectAction(action.id)">
                        ? {{ 'admin.rejectAction' | translate }}
                      </button>
                    </div>
                  </div>
                </div>
              }
            </div>
          }
        }

        <!-- ==================== TEAM (SuperAdmin) ==================== -->
        @if (activeTab() === 'team') {
          <div class="team-section">
            <div class="team-header">
              <h3>{{ 'admin.teamMembers' | translate }}</h3>
              <button class="btn-primary-sm" (click)="showNewAdminForm.set(!showNewAdminForm())">
                {{ showNewAdminForm() ? ('admin.cancel' | translate) : ('admin.addAdmin' | translate) }}
              </button>
            </div>

            @if (showNewAdminForm()) {
              <div class="new-admin-form content-card">
                <div class="form-row">
                  <div class="form-field">
                    <label>{{ 'auth.fullName' | translate }}</label>
                    <input type="text" [(ngModel)]="newAdmin.fullName" />
                  </div>
                  <div class="form-field">
                    <label>{{ 'auth.email' | translate }}</label>
                    <input type="email" [(ngModel)]="newAdmin.email" />
                  </div>
                  <div class="form-field">
                    <label>{{ 'auth.password' | translate }}</label>
                    <input type="password" [(ngModel)]="newAdmin.password" />
                  </div>
                </div>
                <button class="toolbar-btn btn-approve" [disabled]="!newAdmin.fullName || !newAdmin.email || !newAdmin.password || creatingAdmin()"
                  (click)="createAdmin()">
                  {{ creatingAdmin() ? ('common.loading' | translate) : ('admin.createAdmin' | translate) }}
                </button>
              </div>
            }

            @if (loadingTeam()) {
              <app-loading-spinner [message]="'admin.loadingTeam' | translate" />
            } @else if (teamMembers().length === 0) {
              <div class="content-card empty-card"><app-empty-state [title]="'admin.noTeamMembers' | translate" [subtitle]="'admin.noTeamMembersDesc' | translate" /></div>
            } @else {
              <div class="team-grid">
                @for (member of teamMembers(); track member.id) {
                  <div class="team-card" [class.inactive]="!member.isActive">
                    <div class="team-card-top">
                      <div>
                        <h4 class="team-name">{{ member.fullName }}</h4>
                        <span class="team-email">{{ member.email }}</span>
                      </div>
                      <span class="team-role-badge" [class]="member.role === 'SuperAdmin' ? 'role-super' : 'role-admin'">
                        {{ member.role }}
                      </span>
                    </div>
                    <div class="team-card-meta">
                      <span>{{ 'admin.joined' | translate }}: {{ member.createdAt | date:'MMM d, yyyy' }}</span>
                      <span class="status-pill" [class]="member.isActive ? 'active-pill' : 'frozen-pill'">
                        {{ member.isActive ? ('admin.active' | translate) : ('admin.frozen' | translate) }}
                      </span>
                    </div>
                    @if (member.role !== 'SuperAdmin') {
                      <div class="team-actions">
                        <button class="btn-sm" [class]="member.isActive ? 'btn-warn' : 'btn-unfreeze'" (click)="toggleAdminActive(member.id, member.isActive)">
                          {{ member.isActive ? ('admin.freeze' | translate) : ('admin.unfreeze' | translate) }}
                        </button>
                        <button class="btn-sm btn-danger" (click)="deleteAdmin(member.id, member.fullName)">
                          {{ 'common.delete' | translate }}
                        </button>
                      </div>
                    }
                  </div>
                }
              </div>
            }
          </div>
        }

        <!-- ==================== SETTINGS (SuperAdmin) ==================== -->
        <!-- ==================== SUBSCRIPTIONS ==================== -->
        @if (activeTab() === 'subscriptions') {
          @if (loadingSubRequests()) {
            <div class="content-card"><app-loading-spinner [message]="'admin.loadingSubscriptions' | translate" /></div>
          } @else if (subRequests().length === 0) {
            <div class="content-card empty-card">
              <app-empty-state [title]="'admin.noSubscriptionRequests' | translate" [subtitle]="'admin.noSubscriptionRequestsDesc' | translate" />
            </div>
          } @else {
            <div class="queue-list">
              @for (req of subRequests(); track req.id) {
                <div class="queue-card" [class.selected]="selectedSubRequest()?.id === req.id">
                  <div class="queue-card-header" (click)="toggleSubRequest(req)">
                    <div class="card-left">
                      <span class="severity-dot" [class]="'dot-sub-' + getSubStatusClass(req.status)"></span>
                      <div class="card-title-group">
                        <h3 class="card-title">{{ req.userName || req.userEmail || 'User' }} — {{ getSubTierLabel(req.requestedTier) }}</h3>
                        <div class="card-meta">
                          <span>{{ req.durationYears }} {{ req.durationYears === 1 ? ('subscription.year' | translate) : ('subscription.years' | translate) }}</span>
                          <span class="meta-sep">&middot;</span>
                          <span>{{ req.createdAt | date:'MMM d, yyyy' }}</span>
                          <span class="meta-sep">&middot;</span>
                          <span class="meta-severity" [class]="'sev-sub-' + getSubStatusClass(req.status)">
                            {{ getSubStatusLabel(req.status) | uppercase }}
                          </span>
                        </div>
                      </div>
                    </div>
                    <button class="expand-btn" [class.rotated]="selectedSubRequest()?.id === req.id">
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                        <path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                      </svg>
                    </button>
                  </div>

                  @if (selectedSubRequest()?.id === req.id) {
                    <div class="queue-card-body">
                      <div class="detail-section">
                        <h4 class="section-title">{{ 'admin.requestDetails' | translate }}</h4>
                        <div class="detail-grid">
                          <div class="detail-item">
                            <span class="detail-key">{{ 'admin.requester' | translate }}</span>
                            <span class="detail-val">{{ req.userName || req.userEmail || 'Unknown' }}</span>
                          </div>
                          <div class="detail-item">
                            <span class="detail-key">{{ 'subscription.requestedTier' | translate }}</span>
                            <span class="detail-val">{{ getSubTierLabel(req.requestedTier) }}</span>
                          </div>
                          <div class="detail-item">
                            <span class="detail-key">{{ 'subscription.duration' | translate }}</span>
                            <span class="detail-val">{{ req.durationYears }} {{ req.durationYears === 1 ? ('subscription.year' | translate) : ('subscription.years' | translate) }}</span>
                          </div>
                          <div class="detail-item">
                            <span class="detail-key">{{ 'subscription.amount' | translate }}</span>
                            <span class="detail-val">{{ req.totalAmount | currency:'USD' }}</span>
                          </div>
                          @if (req.paymentProofStoragePath) {
                            <div class="detail-item">
                              <span class="detail-key">{{ 'subscription.paymentProof' | translate }}</span>
                              <a class="detail-val file-link" [href]="getPaymentProofUrl(req.paymentProofStoragePath)" target="_blank" rel="noopener">📎 {{ req.paymentProofFileName }}</a>
                            </div>
                          }
                          @if (req.paymentNotes) {
                            <div class="detail-item full-width">
                              <span class="detail-key">{{ 'subscription.paymentNotes' | translate }}</span>
                              <span class="detail-val">{{ req.paymentNotes }}</span>
                            </div>
                          }
                          @if (req.adminNotes) {
                            <div class="detail-item full-width">
                              <span class="detail-key">{{ 'subscription.adminNotes' | translate }}</span>
                              <span class="detail-val">{{ req.adminNotes }}</span>
                            </div>
                          }
                          @if (req.reviewedByName) {
                            <div class="detail-item">
                              <span class="detail-key">{{ 'admin.reviewedBy' | translate }}</span>
                              <span class="detail-val">{{ req.reviewedByName }}</span>
                            </div>
                          }
                        </div>
                      </div>

                      @if (req.status === 0) {
                        <div class="action-bar">
                          <div class="admin-notes-input">
                            <input type="text" [(ngModel)]="subAdminNotes" [placeholder]="'subscription.adminNotesPlaceholder' | translate" class="setting-input" />
                          </div>
                          <div class="action-buttons">
                            <button class="toolbar-btn btn-approve" [disabled]="processingSubId()" (click)="approveSubRequest(req.id)">
                              @if (processingSubId() === req.id + '-approve') { <span class="btn-spinner"></span> }
                              {{ 'admin.approve' | translate }}
                            </button>
                            <button class="toolbar-btn btn-reject" [disabled]="processingSubId()" (click)="rejectSubRequest(req.id)">
                              @if (processingSubId() === req.id + '-reject') { <span class="btn-spinner"></span> }
                              {{ 'admin.reject' | translate }}
                            </button>
                          </div>
                        </div>
                      }
                    </div>
                  }
                </div>
              }
            </div>
          }
        }

        @if (activeTab() === 'settings') {
          <div class="settings-section">
            <h3 class="settings-title">{{ 'admin.systemSettings' | translate }}</h3>
            @if (loadingSettings()) {
              <app-loading-spinner [message]="'admin.loadingSettings' | translate" />
            } @else {
              <div class="content-card settings-card-unified">
                <div class="settings-grid">
                  @for (setting of systemSettings(); track setting.key) {
                    <div class="setting-field">
                      <label class="setting-label">{{ getSettingLabel(setting.key) }}</label>
                      @if (setting.description) {
                        <span class="setting-desc">{{ getSettingDescription(setting.key, setting.description) }}</span>
                      }
                      <input type="text" [(ngModel)]="setting.value" class="setting-input" />
                    </div>
                  }
                </div>
                <div class="settings-actions">
                  <button class="toolbar-btn btn-approve settings-save-all" (click)="saveAllSettings()" [disabled]="savingAllSettings()">
                    @if (savingAllSettings()) {
                      <span class="btn-spinner"></span>
                    }
                    {{ 'common.save' | translate }}
                  </button>
                </div>
              </div>
            }
          </div>
        }
      </div>
    </div>
  `,
  styleUrl: './admin-dashboard.component.scss'
})
export class AdminDashboardComponent implements OnInit {
  private apiService = inject(ApiService);
  private translate = inject(TranslateService);
  authService = inject(AuthService);

  readonly AdminActionStatus = AdminActionStatus;

  activeTab = signal<'queue' | 'analytics' | 'messages' | 'subscriptions' | 'approvals' | 'team' | 'settings'>('queue');

  // Moderation Queue
  pendingReviews = signal<PendingReview[]>([]);
  pendingCount = signal(0);
  loadingReviews = signal(false);
  selectedReview = signal<PendingReview | null>(null);

  // Message Reviewer
  showMessageForm = signal(false);
  messageReviewId = signal('');
  messageText = '';
  messageSent = signal(false);
  sendingMessage = signal(false);

  // Analytics
  analytics = signal<AnalyticsSummary | null>(null);
  loadingAnalytics = signal(false);

  // Contact Messages
  contactMessages = signal<ContactMsg[]>([]);
  loadingMessages = signal(false);
  unreadMsgCount = signal(0);
  selectedMsg = signal<ContactMsg | null>(null);

  // Approvals (SuperAdmin)
  pendingActions = signal<PendingAction[]>([]);
  pendingActionCount = signal(0);
  loadingActions = signal(false);

  // Team (SuperAdmin)
  teamMembers = signal<TeamMember[]>([]);
  loadingTeam = signal(false);
  showNewAdminForm = signal(false);
  creatingAdmin = signal(false);
  newAdmin = { fullName: '', email: '', password: '' };

  // Settings (SuperAdmin)
  systemSettings = signal<SystemSetting[]>([]);
  loadingSettings = signal(false);
  savingAllSettings = signal(false);

  // Subscriptions
  subRequests = signal<any[]>([]);
  pendingSubCount = signal(0);
  loadingSubRequests = signal(false);
  selectedSubRequest = signal<any | null>(null);
  subAdminNotes = '';
  processingSubId = signal<string | null>(null);

  ngOnInit(): void {
    this.loadPendingReviews();
    // Load pending action count badge for SuperAdmin
    if (this.authService.isSuperAdmin()) {
      this.loadPendingActionCount();
    }
  }

  // ==================== DATA LOADING ====================

  private loadPendingReviews(): void {
    this.loadingReviews.set(true);
    this.apiService.get<any>('reviews/pending?page=1&pageSize=50').subscribe({
      next: (res) => {
        const items = res.items || res.data || [];
        this.pendingReviews.set(items);
        this.pendingCount.set(res.totalCount ?? items.length);
        this.loadingReviews.set(false);
      },
      error: () => {
        this.loadingReviews.set(false);
        this.pendingReviews.set([]);
        this.pendingCount.set(0);
      }
    });
  }

  loadAnalytics(): void {
    this.loadingAnalytics.set(true);
    this.apiService.get<AnalyticsSummary>('admin/analytics').subscribe({
      next: (data) => {
        this.analytics.set(data);
        this.loadingAnalytics.set(false);
      },
      error: () => {
        this.loadingAnalytics.set(false);
        this.analytics.set(null);
      }
    });
  }

  // ==================== REVIEW MODERATION ====================

  toggleReview(review: PendingReview): void {
    if (this.selectedReview()?.id === review.id) {
      this.selectedReview.set(null);
    } else {
      this.selectedReview.set(review);
    }
    this.showMessageForm.set(false);
    this.messageSent.set(false);
    this.messageText = '';
  }

  publishReview(id: string): void {
    if (!confirm(this.translate.instant('admin.publishConfirm'))) return;
    this.apiService.put(`reviews/${id}/status`, { newStatus: ReviewStatus.Published }).subscribe({
      next: () => {
        this.pendingReviews.update(list => list.filter(r => r.id !== id));
        this.pendingCount.update(c => Math.max(0, c - 1));
        this.selectedReview.set(null);
      },
      error: () => alert(this.translate.instant('admin.failedPublish'))
    });
  }

  rejectReview(id: string): void {
    if (!confirm(this.translate.instant('admin.rejectConfirm'))) return;
    this.apiService.put(`reviews/${id}/status`, { newStatus: ReviewStatus.Rejected }).subscribe({
      next: () => {
        this.pendingReviews.update(list => list.filter(r => r.id !== id));
        this.pendingCount.update(c => Math.max(0, c - 1));
        this.selectedReview.set(null);
      },
      error: () => alert(this.translate.instant('admin.failedReject'))
    });
  }

  // ==================== MESSAGE REVIEWER ====================

  openMessageForm(review: PendingReview): void {
    this.messageReviewId.set(review.id);
    this.showMessageForm.set(true);
    this.messageSent.set(false);
    this.messageText = '';
  }

  sendMessage(reviewId: string): void {
    if (!this.messageText.trim()) return;
    this.sendingMessage.set(true);
    this.apiService.post(`admin/reviews/${reviewId}/message`, {
      message: this.messageText.trim(),
      addAsNote: true
    }).subscribe({
      next: () => {
        this.sendingMessage.set(false);
        this.messageSent.set(true);
        this.messageText = '';
        setTimeout(() => this.messageSent.set(false), 3000);
      },
      error: () => {
        this.sendingMessage.set(false);
        alert(this.translate.instant('admin.failedSendMessage'));
      }
    });
  }

  // ==================== CONTACT MESSAGES ====================

  loadContactMessages(): void {
    if (this.contactMessages().length > 0) return;
    this.loadingMessages.set(true);
    this.apiService.get<any>('contact?page=1&pageSize=100').subscribe({
      next: (res) => {
        const items: ContactMsg[] = res.items || [];
        this.contactMessages.set(items);
        this.unreadMsgCount.set(items.filter((m: ContactMsg) => !m.isRead).length);
        this.loadingMessages.set(false);
      },
      error: () => {
        this.loadingMessages.set(false);
        this.contactMessages.set([]);
      }
    });
  }

  toggleMsg(msg: ContactMsg): void {
    if (this.selectedMsg()?.id === msg.id) {
      this.selectedMsg.set(null);
    } else {
      this.selectedMsg.set(msg);
    }
  }

  markMsgRead(id: string): void {
    this.apiService.put(`contact/${id}/read`, {}).subscribe({
      next: () => {
        this.contactMessages.update(list => list.map(m =>
          m.id === id ? { ...m, isRead: true, readAt: new Date().toISOString() } : m
        ));
        this.unreadMsgCount.update(c => Math.max(0, c - 1));
        this.selectedMsg.update(m => m && m.id === id ? { ...m, isRead: true, readAt: new Date().toISOString() } : m);
      },
      error: () => alert(this.translate.instant('admin.failedMarkRead'))
    });
  }

  // ==================== HELPERS ====================

  getSeverityString(severity: SeverityLevel): string {
    switch (severity) {
      case SeverityLevel.Info: return 'info';
      case SeverityLevel.Warning: return 'warning';
      case SeverityLevel.Critical: return 'critical';
      case SeverityLevel.Behavior: return 'behavior';
      case SeverityLevel.Fraud: return 'fraud';
      case SeverityLevel.Quality: return 'quality';
      case SeverityLevel.Delivery: return 'delivery';
      case SeverityLevel.Payment: return 'payment';
      default: return 'info';
    }
  }

  getReviewerTypeLabel(type: ReviewerType): string {
    switch (type) {
      case ReviewerType.Broker: return this.translate.instant('admin.broker');
      case ReviewerType.Buyer: return this.translate.instant('admin.buyer');
      default: return this.translate.instant('admin.unknown');
    }
  }

  formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  getSettingLabel(key: string): string {
    const tKey = `admin.settingLabel.${key}`;
    const translated = this.translate.instant(tKey);
    return translated !== tKey ? translated : key;
  }

  getSettingDescription(key: string, fallback: string): string {
    const tKey = `admin.settingDesc.${key}`;
    const translated = this.translate.instant(tKey);
    return translated !== tKey ? translated : fallback;
  }

  // ==================== APPROVALS (SuperAdmin) ====================

  private loadPendingActionCount(): void {
    this.apiService.get<any>('admin/actions/pending-count').subscribe({
      next: (res) => this.pendingActionCount.set(res.count ?? 0),
      error: () => {},
    });
  }

  loadPendingActions(): void {
    this.loadingActions.set(true);
    this.apiService.get<any>('admin/actions/pending').subscribe({
      next: (res) => {
        this.pendingActions.set(res || []);
        this.pendingActionCount.set((res || []).length);
        this.loadingActions.set(false);
      },
      error: () => {
        this.loadingActions.set(false);
        this.pendingActions.set([]);
      },
    });
  }

  approveAction(id: string): void {
    this.apiService.put<any>(`admin/actions/${id}/approve`, {}).subscribe({
      next: () => {
        this.pendingActions.update(list => list.filter(a => a.id !== id));
        this.pendingActionCount.update(c => Math.max(0, c - 1));
      },
      error: () => alert(this.translate.instant('admin.failedApproveAction')),
    });
  }

  rejectAction(id: string): void {
    this.apiService.put<any>(`admin/actions/${id}/reject`, {}).subscribe({
      next: () => {
        this.pendingActions.update(list => list.filter(a => a.id !== id));
        this.pendingActionCount.update(c => Math.max(0, c - 1));
      },
      error: () => alert(this.translate.instant('admin.failedRejectAction')),
    });
  }

  getActionTypeLabel(type: AdminActionType): string {
    switch (type) {
      case AdminActionType.PublishReview: return this.translate.instant('admin.actionType.publishReview');
      case AdminActionType.RejectReview: return this.translate.instant('admin.actionType.rejectReview');
      case AdminActionType.EditReview: return this.translate.instant('admin.actionType.editReview');
      case AdminActionType.DeleteReview: return this.translate.instant('admin.actionType.deleteReview');
      case AdminActionType.ReplyEnquiry: return this.translate.instant('admin.actionType.replyEnquiry');
      default: return this.translate.instant('admin.actionType.unknown');
    }
  }

  // ==================== TEAM (SuperAdmin) ====================

  loadTeam(): void {
    if (this.teamMembers().length > 0) return;
    this.loadingTeam.set(true);
    this.apiService.get<any>('admin/team').subscribe({
      next: (res) => {
        this.teamMembers.set(res || []);
        this.loadingTeam.set(false);
      },
      error: () => {
        this.loadingTeam.set(false);
        this.teamMembers.set([]);
      },
    });
  }

  createAdmin(): void {
    this.creatingAdmin.set(true);
    this.apiService.post<any>('admin/team', this.newAdmin).subscribe({
      next: () => {
        this.creatingAdmin.set(false);
        this.showNewAdminForm.set(false);
        this.newAdmin = { fullName: '', email: '', password: '' };
        // Reload team
        this.teamMembers.set([]);
        this.loadTeam();
      },
      error: (err) => {
        this.creatingAdmin.set(false);
        alert(err?.error?.message || this.translate.instant('admin.failedCreateAdmin'));
      },
    });
  }

  toggleAdminActive(userId: string, isCurrentlyActive: boolean): void {
    const action = isCurrentlyActive ? 'freeze' : 'unfreeze';
    if (!confirm(this.translate.instant('admin.confirmToggleAdmin', { action }))) return;
    this.apiService.put<any>(`admin/team/${userId}/toggle-active`, {}).subscribe({
      next: () => {
        this.teamMembers.update(list => list.map(m =>
          m.id === userId ? { ...m, isActive: !m.isActive } : m
        ));
      },
      error: () => alert(this.translate.instant('admin.failedToggleAdmin')),
    });
  }

  deleteAdmin(userId: string, name: string): void {
    if (!confirm(this.translate.instant('admin.confirmDeleteAdmin', { name }))) return;
    this.apiService.delete<any>(`admin/team/${userId}`).subscribe({
      next: () => {
        this.teamMembers.update(list => list.filter(m => m.id !== userId));
      },
      error: () => alert(this.translate.instant('admin.failedDeleteAdmin')),
    });
  }

  // ==================== SETTINGS (SuperAdmin) ====================

  loadSettings(): void {
    this.loadingSettings.set(true);
    this.apiService.get<any>('admin/settings').subscribe({
      next: (res) => {
        this.systemSettings.set(res || []);
        this.loadingSettings.set(false);
      },
      error: () => {
        this.loadingSettings.set(false);
        this.systemSettings.set([]);
      },
    });
  }

  saveSetting(setting: SystemSetting): void {
    this.apiService.put<any>('admin/settings', { key: setting.key, value: setting.value }).subscribe({
      next: () => {
        // silently saved
      },
      error: () => alert(this.translate.instant('admin.failedSaveSetting')),
    });
  }

  saveAllSettings(): void {
    this.savingAllSettings.set(true);
    const settings = this.systemSettings();
    let completed = 0;
    let hasError = false;
    settings.forEach(setting => {
      this.apiService.put<any>('admin/settings', { key: setting.key, value: setting.value }).subscribe({
        next: () => {
          completed++;
          if (completed === settings.length) {
            this.savingAllSettings.set(false);
            if (!hasError) {
              alert(this.translate.instant('admin.settingsSaved'));
            }
          }
        },
        error: () => {
          completed++;
          hasError = true;
          if (completed === settings.length) {
            this.savingAllSettings.set(false);
          }
          alert(this.translate.instant('admin.failedSaveSetting'));
        },
      });
    });
  }

  // ==================== SUBSCRIPTIONS ====================

  loadSubscriptionRequests(): void {
    this.loadingSubRequests.set(true);
    this.apiService.get<any[]>('subscriptions/pending-requests').subscribe({
      next: (res) => {
        this.subRequests.set(res || []);
        this.pendingSubCount.set((res || []).filter((r: any) => r.status === 0).length);
        this.loadingSubRequests.set(false);
      },
      error: () => {
        this.loadingSubRequests.set(false);
        this.subRequests.set([]);
      },
    });
  }

  toggleSubRequest(req: any): void {
    this.selectedSubRequest.set(this.selectedSubRequest()?.id === req.id ? null : req);
    this.subAdminNotes = '';
  }

  getSubTierLabel(tier: number): string {
    switch (tier) {
      case 1: return 'Pro';
      default: return 'Free';
    }
  }

  getPaymentProofUrl(storagePath: string): string {
    return `${environment.apiBaseUrl}/subscriptions/download/${encodeURIComponent(storagePath)}`;
  }

  getSubStatusClass(status: number): string {
    switch (status) {
      case 1: return 'approved';
      case 2: return 'rejected';
      default: return 'pending';
    }
  }

  getSubStatusLabel(status: number): string {
    switch (status) {
      case 1: return this.translate.instant('subscription.statusApproved');
      case 2: return this.translate.instant('subscription.statusRejected');
      default: return this.translate.instant('subscription.statusPending');
    }
  }

  approveSubRequest(id: string): void {
    this.processingSubId.set(id + '-approve');
    this.apiService.post<any>(`subscriptions/approve/${id}`, { adminNotes: this.subAdminNotes || null }).subscribe({
      next: () => {
        this.processingSubId.set(null);
        this.subAdminNotes = '';
        this.loadSubscriptionRequests();
      },
      error: (err) => {
        this.processingSubId.set(null);
        const errors = err?.error?.errors;
        alert(Array.isArray(errors) ? errors.join(', ') : (errors || this.translate.instant('admin.failedApproveSubscription')));
      },
    });
  }

  rejectSubRequest(id: string): void {
    this.processingSubId.set(id + '-reject');
    this.apiService.post<any>(`subscriptions/reject/${id}`, { adminNotes: this.subAdminNotes || null }).subscribe({
      next: () => {
        this.processingSubId.set(null);
        this.subAdminNotes = '';
        this.loadSubscriptionRequests();
      },
      error: (err) => {
        this.processingSubId.set(null);
        const errors = err?.error?.errors;
        alert(Array.isArray(errors) ? errors.join(', ') : (errors || this.translate.instant('admin.failedRejectSubscription')));
      },
    });
  }
}
