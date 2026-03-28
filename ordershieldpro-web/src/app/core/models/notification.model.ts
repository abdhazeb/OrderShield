import { NotificationType } from '../enums';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
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
  isRead: boolean;
  createdAt: string;
  referenceEntityId?: string;
  referenceReviewId?: string;
  entityId?: string;
  reviewId?: string;
}
