import type { Notification } from './types';

export function isChatNotification(notification: Notification) {
  return notification.type === 'NEW_MESSAGE';
}

export function getGeneralNotifications(notifications: Notification[]) {
  return notifications.filter((notification) => !isChatNotification(notification));
}

export function getUnreadChatNotifications(notifications: Notification[]) {
  return notifications.filter((notification) => isChatNotification(notification) && !notification.read);
}

export function getUnreadGeneralNotifications(notifications: Notification[]) {
  return getGeneralNotifications(notifications).filter((notification) => !notification.read);
}
