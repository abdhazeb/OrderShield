import { InvestigationStatus } from '../enums';

export interface WatchRequest {
  id: string;
  requestedById: string;
  entityName: string;
  entityPhone?: string;
  entityWeChat?: string;
  entityCountry?: string;
  entityWebsite?: string;
  additionalDetails?: string;
  enquiryChecklist?: string;
  status: InvestigationStatus;
  assignedToId?: string;
  serviceTeamNotes?: string;
  replyMessage?: string;
  repliedAt?: string;
  resultEntityId?: string;
  resolvedDate?: string;
  subscriberCount?: number;
  createdAt: string;
}

export interface CreateWatchRequest {
  entityName: string;
  entityPhone?: string;
  entityWeChat?: string;
  entityCountry?: string;
  entityWebsite?: string;
  additionalDetails?: string;
  enquiryChecklist?: string;
}

export interface WatchRequestCheckResult {
  exists: boolean;
  watchRequest?: WatchRequest;
  alreadySubscribed?: boolean;
}

export interface SlaSetting {
  value: string;
}
