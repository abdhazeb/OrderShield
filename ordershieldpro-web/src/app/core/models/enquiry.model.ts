export interface PublicEnquiry {
  id: string;
  entityName: string;
  entityCountry?: string;
  enquiryChecklist?: string;
  status: string;
  replyMessage?: string;
  repliedAt?: string;
  createdAt: string;
  subscriberCount: number;
  resultEntityId?: string;
}
