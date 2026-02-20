export type NotificationType = 
  | 'cancellation'   // Student cancelled a slot
  | 'reschedule'     // Request to move a slot
  | 'package_alert'  // Low credits warning
  | 'system';        // General app updates

export interface AppNotification {
  id: string;
  userId: string;          // Who receives this (Teacher ID or Student ID)
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: number;       // Timestamp
  
  // Optional action payloads (so clicking the notification can open a specific modal!)
  relatedLessonId?: string;
  relatedStudentId?: string;
}