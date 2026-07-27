import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/auth/services/auth.service';
import { ModerationQueueComponent } from './components/moderation-queue/moderation-queue.component';
import { AdminAnalyticsComponent, AnalyticsNavigation } from './components/admin-analytics/admin-analytics.component';
import { ContactMessagesComponent } from './components/contact-messages/contact-messages.component';
import { SubscriptionRequestsComponent } from './components/subscription-requests/subscription-requests.component';
import { AdminApprovalsComponent } from './components/admin-approvals/admin-approvals.component';
import { AdminTeamComponent } from './components/admin-team/admin-team.component';
import { AdminSettingsComponent } from './components/admin-settings/admin-settings.component';
import { HiddenContentComponent } from './components/hidden-content/hidden-content.component';
import { ImportEntitiesComponent } from './components/import-entities/import-entities.component';
import { EntityManagementComponent } from './components/entity-management/entity-management.component';
import { UserManagementComponent } from './components/user-management/user-management.component';

/** Top-level admin areas — what you are working on. */
export type AdminSectionId = 'overview' | 'moderation' | 'entities' | 'users' | 'requests' | 'system';

/** Sub-tabs — which slice of that area. */
export type AdminTabId =
  | 'analytics'
  | 'queue' | 'hiddenReviews'
  | 'entityList' | 'hiddenEntities' | 'import'
  | 'userList' | 'pendingUsers' | 'team'
  | 'subscriptions' | 'messages'
  | 'approvals' | 'settings';

interface AdminTab {
  id: AdminTabId;
  labelKey: string;
  /** Work waiting on someone — rendered as a red badge and rolled up to the section. */
  badge?: () => number;
  /** Informational size of the list — rendered as a neutral chip, never rolled up. */
  count?: () => number;
}

/** Every count the admin navigation renders — GET /api/admin/nav-counts. */
interface AdminNavCounts {
  pendingReviews: number;
  hiddenReviews: number;
  totalEntities: number;
  hiddenEntities: number;
  pendingSubscriptions: number;
  unreadMessages: number;
  totalUsers: number;
  pendingActions: number;
  pendingUsers: number;
}

interface AdminSection {
  id: AdminSectionId;
  labelKey: string;
  superAdminOnly?: boolean;
  tabs: AdminTab[];
}

/**
 * Admin shell. Two levels of navigation: six sections across the top (what you are
 * working on), sub-tabs underneath (which slice of it). Sections roll up the badges of
 * their tabs so the top row still shows where work is waiting without having to open it.
 * The active section/tab pair is mirrored into the query string so a reload — or a link
 * from elsewhere in the app — lands back on the same screen.
 */
@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [
    TranslateModule,
    ModerationQueueComponent,
    AdminAnalyticsComponent,
    ContactMessagesComponent,
    SubscriptionRequestsComponent,
    AdminApprovalsComponent,
    AdminTeamComponent,
    AdminSettingsComponent,
    HiddenContentComponent,
    ImportEntitiesComponent,
    EntityManagementComponent,
    UserManagementComponent,
  ],
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminDashboardComponent implements OnInit {
  private apiService = inject(ApiService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  authService = inject(AuthService);

  activeSection = signal<AdminSectionId>('overview');
  activeTab = signal<AdminTabId>('analytics');

  // Badge counts — work waiting.
  pendingCount = signal(0);
  unreadMsgCount = signal(0);
  pendingSubCount = signal(0);
  pendingActionCount = signal(0);
  pendingUserCount = signal(0);

  // Neutral counts — list sizes.
  hiddenEntityCount = signal(0);
  hiddenReviewCount = signal(0);
  entityCount = signal(0);
  userCount = signal(0);

  private readonly sections: AdminSection[] = [
    {
      id: 'overview',
      labelKey: 'admin.nav.overview',
      tabs: [
        { id: 'analytics', labelKey: 'admin.analytics' },
      ],
    },
    {
      id: 'moderation',
      labelKey: 'admin.nav.moderation',
      tabs: [
        { id: 'queue', labelKey: 'admin.nav.reviewQueue', badge: () => this.pendingCount() },
        { id: 'hiddenReviews', labelKey: 'admin.nav.hiddenReviews', count: () => this.hiddenReviewCount() },
      ],
    },
    {
      id: 'entities',
      labelKey: 'admin.nav.entities',
      tabs: [
        { id: 'entityList', labelKey: 'admin.nav.allEntities', count: () => this.entityCount() },
        { id: 'hiddenEntities', labelKey: 'admin.nav.hiddenEntities', count: () => this.hiddenEntityCount() },
        { id: 'import', labelKey: 'admin.importEntities' },
      ],
    },
    {
      id: 'users',
      labelKey: 'admin.nav.users',
      tabs: [
        { id: 'userList', labelKey: 'admin.nav.allUsers', count: () => this.userCount() },
        { id: 'pendingUsers', labelKey: 'admin.nav.pendingUsers', badge: () => this.pendingUserCount() },
        { id: 'team', labelKey: 'admin.team' },
      ],
    },
    {
      id: 'requests',
      labelKey: 'admin.nav.requests',
      tabs: [
        { id: 'subscriptions', labelKey: 'admin.subscriptions', badge: () => this.pendingSubCount() },
        { id: 'messages', labelKey: 'admin.contactMessages', badge: () => this.unreadMsgCount() },
      ],
    },
    {
      id: 'system',
      labelKey: 'admin.nav.system',
      superAdminOnly: true,
      tabs: [
        { id: 'approvals', labelKey: 'admin.approvals', badge: () => this.pendingActionCount() },
        { id: 'settings', labelKey: 'admin.settings' },
      ],
    },
  ];

  /**
   * Users and Team are SuperAdmin-only concerns even though the Users section itself is
   * visible to moderators — a moderator sees only the directory, not approvals or team.
   */
  private readonly superAdminOnlyTabs = new Set<AdminTabId>(['pendingUsers', 'team']);

  visibleSections = computed<AdminSection[]>(() => {
    const isSuper = this.authService.isSuperAdmin();
    return this.sections.filter(s => !s.superAdminOnly || isSuper);
  });

  visibleTabs = computed<AdminTab[]>(() => {
    const isSuper = this.authService.isSuperAdmin();
    const section = this.sections.find(s => s.id === this.activeSection());
    if (!section) return [];
    return section.tabs.filter(t => isSuper || !this.superAdminOnlyTabs.has(t.id));
  });

  ngOnInit(): void {
    this.restoreFromQueryParams();
    this.loadNavCounts();
  }

  /** Section badge = sum of the badges of the tabs the current user can actually see. */
  sectionBadge(section: AdminSection): number {
    const isSuper = this.authService.isSuperAdmin();
    return section.tabs
      .filter(t => isSuper || !this.superAdminOnlyTabs.has(t.id))
      .reduce((sum, t) => sum + (t.badge?.() ?? 0), 0);
  }

  tabBadge(tab: AdminTab): number {
    return tab.badge?.() ?? 0;
  }

  tabCount(tab: AdminTab): number {
    return tab.count?.() ?? 0;
  }

  /** Selecting a section lands on its first tab the current user is allowed to see. */
  selectSection(id: AdminSectionId): void {
    if (this.activeSection() === id) return;
    this.activeSection.set(id);
    const first = this.visibleTabs()[0];
    if (first) this.activeTab.set(first.id);
    this.syncQueryParams();
  }

  selectTab(id: AdminTabId): void {
    this.activeTab.set(id);
    this.syncQueryParams();
  }

  /** Jump straight to a section/tab pair — used by cross-links such as the analytics cards. */
  goTo(section: AdminSectionId, tab: AdminTabId): void {
    this.activeSection.set(section);
    this.activeTab.set(tab);
    this.syncQueryParams();
  }

  onAnalyticsNavigate(target: AnalyticsNavigation): void {
    switch (target) {
      case 'queue':
        this.goTo('moderation', 'queue');
        break;
      case 'entities':
        this.goTo('entities', 'entityList');
        break;
    }
  }

  private restoreFromQueryParams(): void {
    const params = this.route.snapshot.queryParamMap;
    const section = params.get('section') as AdminSectionId | null;
    const tab = params.get('tab') as AdminTabId | null;

    const match = this.visibleSections().find(s => s.id === section);
    if (!match) return;

    this.activeSection.set(match.id);
    const tabMatch = this.visibleTabs().find(t => t.id === tab);
    this.activeTab.set(tabMatch ? tabMatch.id : this.visibleTabs()[0]?.id ?? 'analytics');
  }

  private syncQueryParams(): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { section: this.activeSection(), tab: this.activeTab() },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  /**
   * Seeds every badge in one call. Tabs still emit their own count as they load, which
   * keeps the number live while you work in a tab; this is only about having the badges
   * right before anything has been opened.
   */
  private loadNavCounts(): void {
    this.apiService.get<AdminNavCounts>('admin/nav-counts').subscribe({
      next: (res) => {
        this.pendingCount.set(res.pendingReviews ?? 0);
        this.hiddenReviewCount.set(res.hiddenReviews ?? 0);
        this.entityCount.set(res.totalEntities ?? 0);
        this.hiddenEntityCount.set(res.hiddenEntities ?? 0);
        this.pendingSubCount.set(res.pendingSubscriptions ?? 0);
        this.unreadMsgCount.set(res.unreadMessages ?? 0);
        this.userCount.set(res.totalUsers ?? 0);
        this.pendingActionCount.set(res.pendingActions ?? 0);
        this.pendingUserCount.set(res.pendingUsers ?? 0);
      },
      error: () => {},
    });
  }
}
