import { NotificationType } from '../enums';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  /** Key of a localized template under notification.templates; null for free-text notifications. */
  templateKey?: string;
  /** Free text the template interpolates (a review title, an entity name, etc.). */
  subject?: string;
  referenceEntityId?: string;
  referenceReviewId?: string;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
}

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  /** Key of a localized template under notification.templates; null for free-text notifications. */
  templateKey?: string;
  /** Free text the template interpolates (a review title, an entity name, etc.). */
  subject?: string;
  isRead: boolean;
  createdAt: string;
  referenceEntityId?: string;
  referenceReviewId?: string;
  entityId?: string;
  reviewId?: string;
}
