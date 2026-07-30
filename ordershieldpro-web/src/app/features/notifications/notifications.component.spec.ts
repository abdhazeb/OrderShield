import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TranslateModule } from '@ngx-translate/core';
import { NotificationsComponent } from './notifications.component';
import { NotificationType } from '../../core/enums';
import { AppNotification } from '../../core/models';

/**
 * `resolveDestination` is the single place that decides both whether a notification row
 * shows a nav arrow (`hasLink`) and where a click actually goes (`onNotifClick`). It used to
 * be two separate, drifting pieces of logic — a hardcoded `/admin/approvals` route that
 * stopped existing once the admin dashboard moved to `?section=&tab=` query params, so every
 * SuperAdmin alert silently went nowhere. This spec drives clicks through the real component
 * so a regression here fails a test instead of shipping a dead link again.
 */
describe('NotificationsComponent routing', () => {
  let fixture: ComponentFixture<NotificationsComponent>;
  let component: NotificationsComponent;
  let router: Router;
  let http: HttpTestingController;
  let navigateSpy: jasmine.Spy;

  /**
   * `isRead: true` by default so routing specs don't also trigger the mark-as-read PUT —
   * that path is covered separately and asserted with its own request expectation.
   */
  function baseNotif(overrides: Partial<AppNotification>): AppNotification {
    return {
      id: 'n1',
      type: NotificationType.ReviewApproved,
      title: 'Title',
      message: 'Message',
      isRead: true,
      createdAt: new Date().toISOString(),
      ...overrides,
    };
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NotificationsComponent, HttpClientTestingModule, TranslateModule.forRoot()],
      providers: [{ provide: Router, useValue: { navigate: () => Promise.resolve(true) } }],
    }).compileComponents();

    fixture = TestBed.createComponent(NotificationsComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    http = TestBed.inject(HttpTestingController);
    navigateSpy = spyOn(router, 'navigate');

    fixture.detectChanges();
    // The component polls `notifications` on init; flush it so no request leaks between specs.
    const req = http.match('/api/notifications');
    req.forEach(r => r.flush([]));
  });

  afterEach(() => http.verify());

  it('routes a new-review alert straight to the moderation dossier, not the dead /admin/approvals link', () => {
    const notif = baseNotif({
      type: NotificationType.NewReviewPendingApproval,
      referenceReviewId: 'review-123',
    });

    component.onNotifClick(notif);

    expect(navigateSpy).toHaveBeenCalledOnceWith(['/admin/reviews', 'review-123'], jasmine.any(Object));
  });

  it('falls back to the moderation queue when a new-review alert has no reviewId', () => {
    const notif = baseNotif({ type: NotificationType.NewReviewPendingApproval });

    component.onNotifClick(notif);

    expect(navigateSpy).toHaveBeenCalledOnceWith(['/admin'], {
      queryParams: { section: 'moderation', tab: 'queue' },
    });
  });

  it('routes a pending-registration alert to Users → Pending, not /admin/approvals', () => {
    const notif = baseNotif({ type: NotificationType.NewUserPendingApproval });

    component.onNotifClick(notif);

    expect(navigateSpy).toHaveBeenCalledOnceWith(['/admin'], {
      queryParams: { section: 'users', tab: 'pendingUsers' },
    });
  });

  it('routes a rejected-review notification to the profile, not the public entity page', () => {
    // Rejected reviews are never published, so /entity/:id — where entityRef would
    // otherwise send this — has nothing to show. It must not win over the profile route.
    const notif = baseNotif({
      type: NotificationType.ReviewRejected,
      referenceEntityId: 'entity-1',
      referenceReviewId: 'review-1',
    });

    component.onNotifClick(notif);

    expect(navigateSpy).toHaveBeenCalledOnceWith(['/profile'], jasmine.any(Object));
  });

  it('routes an approved-review notification to its entity page', () => {
    const notif = baseNotif({
      type: NotificationType.ReviewApproved,
      referenceEntityId: 'entity-1',
    });

    component.onNotifClick(notif);

    expect(navigateSpy).toHaveBeenCalledOnceWith(['/entity', 'entity-1'], jasmine.any(Object));
  });

  it('marks unread notifications as read on click, once', () => {
    const notif = baseNotif({ id: 'n42', type: NotificationType.ReviewApproved, isRead: false });

    component.onNotifClick(notif);

    const req = http.expectOne('/api/notifications/n42/read');
    expect(req.request.method).toBe('PUT');
    req.flush({});
  });

  it('does not show a nav arrow, and does not navigate, for a type with no real destination', () => {
    // AdminActionApproved/Rejected are defined but never emitted by any backend handler
    // today; with no entity or review reference either, there is genuinely nowhere to send
    // this click — hasLink and onNotifClick must agree on that instead of showing an arrow
    // that does nothing.
    const notif = baseNotif({ type: 999 as NotificationType });

    expect(component.hasLink(notif)).toBeFalse();

    component.onNotifClick(notif);
    expect(navigateSpy).not.toHaveBeenCalled();
  });

  it('agrees with itself: every type hasLink() approves actually navigates somewhere', () => {
    const allTypes = Object.values(NotificationType).filter((v): v is NotificationType => typeof v === 'number');

    for (const type of allTypes) {
      const notif = baseNotif({ type, referenceEntityId: 'e1', referenceReviewId: 'r1' });
      navigateSpy.calls.reset();

      const clickable = component.hasLink(notif);
      component.onNotifClick(notif);

      if (clickable) {
        expect(navigateSpy).toHaveBeenCalled();
      } else {
        expect(navigateSpy).not.toHaveBeenCalled();
      }
    }
  });
});
