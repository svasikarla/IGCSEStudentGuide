/**
 * Unified Notification System
 *
 * Replaces inconsistent alert() and toast implementations across
 * QuizGeneratorForm, FlashcardGeneratorForm, and ExamPaperGeneratorForm.
 *
 * Usage:
 *   import { notify } from '../utils/notifications';
 *   notify.success('Quiz generated successfully!');
 *   notify.error('Failed to generate content');
 */

export type NotificationType = 'success' | 'error' | 'info' | 'warning';

interface NotificationOptions {
  duration?: number;
  position?: 'top-right' | 'top-center' | 'bottom-right' | 'bottom-center';
  action?: {
    label: string;
    onClick: () => void;
  };
}

// Simple in-memory notification state
let notificationListeners: Array<(notification: Notification) => void> = [];

export interface Notification {
  id: string;
  type: NotificationType;
  message: string;
  duration: number;
  timestamp: number;
}

/**
 * Show a notification
 */
const showNotification = (
  type: NotificationType,
  message: string,
  options: NotificationOptions = {}
) => {
  const notification: Notification = {
    id: `notification-${Date.now()}-${Math.random()}`,
    type,
    message,
    duration: options.duration || 5000,
    timestamp: Date.now(),
  };

  // Notify all listeners
  notificationListeners.forEach(listener => listener(notification));

  // For now, use native alerts as fallback if no listeners
  if (notificationListeners.length === 0) {
    const prefix = type === 'error' ? '❌ ' : type === 'success' ? '✅ ' : type === 'warning' ? '⚠️ ' : 'ℹ️ ';
    alert(prefix + message);
  }

  return notification.id;
};

/**
 * Subscribe to notifications
 */
export const subscribeToNotifications = (
  callback: (notification: Notification) => void
): (() => void) => {
  notificationListeners.push(callback);

  // Return unsubscribe function
  return () => {
    notificationListeners = notificationListeners.filter(listener => listener !== callback);
  };
};

/**
 * Unified notification API
 */
export const notify = {
  /**
   * Show success notification
   */
  success: (message: string, options?: NotificationOptions) => {
    return showNotification('success', message, options);
  },

  /**
   * Show error notification
   */
  error: (message: string, options?: NotificationOptions) => {
    return showNotification('error', message, options);
  },

  /**
   * Show info notification
   */
  info: (message: string, options?: NotificationOptions) => {
    return showNotification('info', message, options);
  },

  /**
   * Show warning notification
   */
  warning: (message: string, options?: NotificationOptions) => {
    return showNotification('warning', message, options);
  },
};

/**
 * Notification component helper for React
 * This can be used to create a toast notification component
 */
export { subscribeToNotifications as useNotifications };
