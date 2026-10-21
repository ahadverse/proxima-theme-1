export type NotificationType = 'low_stock' | 'fraud_risk' | 'new_order';

export interface NotificationItem {
  id: string;
  type: NotificationType;
  message: string;
  link: string;
  createdAt: string;
}
