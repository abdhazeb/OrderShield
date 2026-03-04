import { Component, inject, signal, OnInit } from '@angular/core';
import { DatePipe, DecimalPipe, CurrencyPipe, UpperCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/auth/services/auth.service';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { SeverityLevel, ReviewStatus, InvestigationStatus, ReviewerType, AdminActionStatus, AdminActionType } from '../../core/enums';

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

interface Investigation {
  id: string;
  entityName: string;
  entityPhone?: string;
  entityWeChat?: string;
  entityCountry?: string;
  entityWebsite?: string;
  additionalDetails?: string;
  enquiryChecklist?: string;
  requestedById: string;
  requestedByName?: string;
  status: InvestigationStatus;
  assignedToId?: string;
  serviceTeamNotes?: string;
  replyMessage?: string;
  repliedAt?: string;
  subscriberCount?: number;
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
  totalInvestigations: number;
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
          {{ 'admin.moderationQueue' | translate }}
          @if (pendingCount() > 0) {
            <span class="tab-badge">{{ pendingCount() }}</span>
          }
        </button>
        <button class="tab-item" [class.active]="activeTab() === 'investigations'" (click)="activeTab.set('investigations')">
          {{ 'admin.investigations' | translate }}
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
                            <span class="detail-val">{{ review.reviewerName || 'Anonymous' }}</span>
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
                            placeholder="e.g. Could you provide more details about the defective units?"></textarea>
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

        <!-- ==================== INVESTIGATIONS ==================== -->
        @if (activeTab() === 'investigations') {
          @if (loadingInvestigations()) {
            <div class="content-card"><app-loading-spinner [message]="'admin.loadingInvestigations' | translate" /></div>
          } @else if (investigations().length === 0) {
            <div class="content-card empty-card">
              <app-empty-state [title]="'admin.noInvestigations' | translate" [subtitle]="'admin.noInvestigationsDesc' | translate" />
            </div>
          } @else {
            <div class="inv-grid">
              @for (inv of investigations(); track inv.id) {
                <div class="inv-card">
                  <div class="inv-card-top">
                    <h3 class="inv-title">{{ inv.entityName }}</h3>
                    <span class="inv-status" [class]="'status-' + getStatusClass(inv.status)">
                      {{ getStatusLabel(inv.status) }}
                    </span>
                  </div>
                  <div class="inv-info-row">
                    <span>{{ 'admin.requestedBy' | translate }} {{ inv.requestedByName || 'Unknown' }}</span>
                    <span>{{ inv.createdAt | date:'MMM d, yyyy' }}</span>
                  </div>
                  <div class="inv-tags">
                    @if (inv.entityCountry) {
                      <span class="inv-tag">?? {{ inv.entityCountry }}</span>
                    }
                    @if (inv.entityPhone) {
                      <span class="inv-tag">?? {{ inv.entityPhone }}</span>
                    }
                    @if (inv.entityWeChat) {
                      <span class="inv-tag">?? {{ inv.entityWeChat }}</span>
                    }
                    @if (inv.entityWebsite) {
                      <span class="inv-tag">?? {{ inv.entityWebsite }}</span>
                    }
                  </div>
                  @if (inv.enquiryChecklist) {
                    <div class="checklist-display">
                      <span class="checklist-label">{{ 'admin.requestedInfo' | translate }}:</span>
                      <div class="checklist-tags">
                        @for (item of inv.enquiryChecklist.split(','); track item) {
                          <span class="checklist-tag">{{ getChecklistLabel(item) }}</span>
                        }
                      </div>
                    </div>
                  }
                  @if (inv.subscriberCount && inv.subscriberCount > 0) {
                    <div class="subscriber-info">?? {{ inv.subscriberCount }} {{ 'admin.subscribersWaiting' | translate }}</div>
                  }
                  @if (inv.additionalDetails) {
                    <p class="inv-details">{{ inv.additionalDetails }}</p>
                  }
                  @if (inv.serviceTeamNotes) {
                    <div class="inv-notes-block">
                      <span class="inv-notes-label">{{ 'admin.serviceTeamNotes' | translate }}</span>
                      <p>{{ inv.serviceTeamNotes }}</p>
                    </div>
                  }
                  @if (inv.replyMessage) {
                    <div class="inv-reply-block">
                      <span class="inv-notes-label">{{ 'admin.replyToUser' | translate }}</span>
                      <p>{{ inv.replyMessage }}</p>
                      @if (inv.repliedAt) {
                        <span class="reply-date-small">{{ inv.repliedAt | date:'MMM d, yyyy' }}</span>
                      }
                    </div>
                  }
                  <div class="inv-actions">
                    @if (inv.status === InvestigationStatus.Pending) {
                      <button class="toolbar-btn btn-approve" (click)="updateInvestigation(inv.id, InvestigationStatus.InProgress)">{{ 'admin.accept' | translate }}</button>
                      <button class="toolbar-btn btn-reject" (click)="updateInvestigation(inv.id, InvestigationStatus.Cancelled)">{{ 'admin.dismiss' | translate }}</button>
                    }
                    @if (inv.status === InvestigationStatus.InProgress) {
                      <button class="toolbar-btn btn-approve" (click)="updateInvestigation(inv.id, InvestigationStatus.Completed)">{{ 'admin.markComplete' | translate }}</button>
                    }
                    @if (inv.status !== InvestigationStatus.Cancelled && !inv.replyMessage) {
                      <button class="toolbar-btn btn-message" (click)="openReplyForm(inv)">
                        ?? {{ 'admin.replyEnquiry' | translate }}
                      </button>
                    }
                  </div>
                  @if (replyingToInvId() === inv.id) {
                    <div class="reply-form-panel">
                      <h4>{{ 'admin.replyEnquiry' | translate }}</h4>
                      <textarea class="msg-textarea" rows="4" [(ngModel)]="invReplyText" [placeholder]="'admin.replyPlaceholder' | translate"></textarea>
                      <div class="msg-actions">
                        <button class="toolbar-btn btn-approve" [disabled]="!invReplyText.trim() || sendingReply()" (click)="sendEnquiryReply(inv.id)">
                          {{ sendingReply() ? ('admin.sending' | translate) : ('admin.sendReply' | translate) }}
                        </button>
                        <button class="toolbar-btn" (click)="replyingToInvId.set(''); invReplyText = ''">{{ 'admin.cancel' | translate }}</button>
                      </div>
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
              <div class="kpi-card">
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
              <div class="kpi-card">
                <div class="kpi-icon green-bg"><svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M22 4L12 14.01l-3-3" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
                <div class="kpi-data">
                  <span class="kpi-value">{{ analytics()!.publishedReviews }}</span>
                  <span class="kpi-label">{{ 'admin.publishedReviews' | translate }}</span>
                </div>
              </div>
              <div class="kpi-card">
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
              <div class="kpi-card clickable" (click)="activeTab.set('investigations')">
                <div class="kpi-icon red-bg"><svg width="24" height="24" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="8" stroke="white" stroke-width="2"/><path d="M21 21l-4.35-4.35" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
                <div class="kpi-data">
                  <span class="kpi-value">{{ analytics()!.totalInvestigations }}</span>
                  <span class="kpi-label">{{ 'admin.totalInvestigations' | translate }}</span>
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
            <div class="content-card"><app-loading-spinner message="Loading pending actions..." /></div>
          } @else if (pendingActions().length === 0) {
            <div class="content-card empty-card">
              <app-empty-state title="No Pending Actions" subtitle="All admin actions have been reviewed." />
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
              <app-loading-spinner message="Loading team..." />
            } @else if (teamMembers().length === 0) {
              <div class="content-card empty-card"><app-empty-state title="No team members" subtitle="Create an admin to get started." /></div>
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
                        {{ member.isActive ? 'Active' : 'Frozen' }}
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
        @if (activeTab() === 'settings') {
          <div class="settings-section">
            <h3 class="settings-title">{{ 'admin.systemSettings' | translate }}</h3>
            @if (loadingSettings()) {
              <app-loading-spinner message="Loading settings..." />
            } @else {
              <div class="settings-grid">
                @for (setting of systemSettings(); track setting.key) {
                  <div class="setting-card content-card">
                    <div class="setting-header">
                      <span class="setting-key">{{ setting.key }}</span>
                      @if (setting.description) {
                        <span class="setting-desc">{{ setting.description }}</span>
                      }
                    </div>
                    <div class="setting-input-row">
                      <input type="text" [(ngModel)]="setting.value" class="setting-input" />
                      <button class="toolbar-btn btn-approve" (click)="saveSetting(setting)">
                        {{ 'common.save' | translate }}
                      </button>
                    </div>
                  </div>
                }
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

  readonly InvestigationStatus = InvestigationStatus;
  readonly AdminActionStatus = AdminActionStatus;

  activeTab = signal<'queue' | 'investigations' | 'analytics' | 'messages' | 'approvals' | 'team' | 'settings'>('queue');

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

  // Investigations
  investigations = signal<Investigation[]>([]);
  loadingInvestigations = signal(false);
  replyingToInvId = signal('');
  invReplyText = '';
  sendingReply = signal(false);

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

  ngOnInit(): void {
    this.loadPendingReviews();
    this.loadInvestigations();
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

  private loadInvestigations(): void {
    this.loadingInvestigations.set(true);
    this.apiService.get<any>('admin/watch-requests?page=1&pageSize=50').subscribe({
      next: (res) => {
        const items = res.items || res.data || [];
        this.investigations.set(items);
        this.loadingInvestigations.set(false);
      },
      error: () => {
        this.loadingInvestigations.set(false);
        this.investigations.set([]);
      }
    });
  }

  loadAnalytics(): void {
    if (this.analytics()) return;
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
      error: () => alert('Failed to publish review')
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
      error: () => alert('Failed to reject review')
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
        alert('Failed to send message');
      }
    });
  }

  // ==================== INVESTIGATIONS ====================

  updateInvestigation(id: string, status: InvestigationStatus): void {
    this.apiService.put(`watch-requests/${id}/status`, {
      newStatus: status,
      serviceTeamNotes: null,
      resultEntityId: null
    }).subscribe({
      next: () => {
        this.investigations.update(list => list.map(inv =>
          inv.id === id ? { ...inv, status } : inv
        ));
      },
      error: () => alert('Failed to update investigation')
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
      error: () => alert('Failed to mark as read')
    });
  }

  // ==================== HELPERS ====================

  getStatusClass(status: InvestigationStatus): string {
    switch (status) {
      case InvestigationStatus.Pending: return 'pending';
      case InvestigationStatus.InProgress: return 'active';
      case InvestigationStatus.Completed: return 'completed';
      case InvestigationStatus.Cancelled: return 'dismissed';
      default: return 'pending';
    }
  }

  getStatusLabel(status: InvestigationStatus): string {
    switch (status) {
      case InvestigationStatus.Pending: return this.translate.instant('admin.pending');
      case InvestigationStatus.InProgress: return this.translate.instant('admin.inProgress');
      case InvestigationStatus.Completed: return this.translate.instant('admin.completed');
      case InvestigationStatus.Cancelled: return this.translate.instant('admin.dismissed');
      default: return 'Unknown';
    }
  }

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
      default: return 'Unknown';
    }
  }

  formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  // ==================== ENQUIRY REPLY ====================

  openReplyForm(inv: Investigation): void {
    this.replyingToInvId.set(inv.id);
    this.invReplyText = '';
  }

  sendEnquiryReply(invId: string): void {
    if (!this.invReplyText.trim()) return;
    this.sendingReply.set(true);
    this.apiService.post<any>(`admin/watch-requests/${invId}/reply`, {
      replyMessage: this.invReplyText.trim()
    }).subscribe({
      next: (res) => {
        this.sendingReply.set(false);
        this.replyingToInvId.set('');
        this.invReplyText = '';
        // Update the investigation in-place
        if (res.queued) {
          alert('Your reply has been queued for SuperAdmin approval.');
        } else {
          this.investigations.update(list => list.map(inv =>
            inv.id === invId ? { ...inv, replyMessage: this.invReplyText || res.replyMessage, repliedAt: new Date().toISOString() } : inv
          ));
        }
        this.loadInvestigations();
      },
      error: () => {
        this.sendingReply.set(false);
        alert('Failed to send reply');
      }
    });
  }

  getChecklistLabel(key: string): string {
    const map: Record<string, string> = {
      'legitimacy': 'Business Legitimacy',
      'quality': 'Product Quality',
      'payment': 'Payment Reliability',
      'delivery': 'Delivery Track Record',
      'other': 'Other',
    };
    return map[key.trim()] || key;
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
      error: () => alert('Failed to approve action'),
    });
  }

  rejectAction(id: string): void {
    this.apiService.put<any>(`admin/actions/${id}/reject`, {}).subscribe({
      next: () => {
        this.pendingActions.update(list => list.filter(a => a.id !== id));
        this.pendingActionCount.update(c => Math.max(0, c - 1));
      },
      error: () => alert('Failed to reject action'),
    });
  }

  getActionTypeLabel(type: AdminActionType): string {
    switch (type) {
      case AdminActionType.PublishReview: return 'Publish Review';
      case AdminActionType.RejectReview: return 'Reject Review';
      case AdminActionType.EditReview: return 'Edit Review';
      case AdminActionType.DeleteReview: return 'Delete Review';
      case AdminActionType.ReplyEnquiry: return 'Reply to Enquiry';
      default: return 'Unknown';
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
        alert(err?.error?.message || 'Failed to create admin');
      },
    });
  }

  toggleAdminActive(userId: string, isCurrentlyActive: boolean): void {
    const action = isCurrentlyActive ? 'freeze' : 'unfreeze';
    if (!confirm(`Are you sure you want to ${action} this admin?`)) return;
    this.apiService.put<any>(`admin/team/${userId}/toggle-active`, {}).subscribe({
      next: () => {
        this.teamMembers.update(list => list.map(m =>
          m.id === userId ? { ...m, isActive: !m.isActive } : m
        ));
      },
      error: () => alert(`Failed to ${action} admin`),
    });
  }

  deleteAdmin(userId: string, name: string): void {
    if (!confirm(`Are you sure you want to delete admin "${name}"? This cannot be undone.`)) return;
    this.apiService.delete<any>(`admin/team/${userId}`).subscribe({
      next: () => {
        this.teamMembers.update(list => list.filter(m => m.id !== userId));
      },
      error: () => alert('Failed to delete admin'),
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
      error: () => alert('Failed to save setting'),
    });
  }
}
