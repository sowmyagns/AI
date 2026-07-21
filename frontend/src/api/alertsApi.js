import api from "./axiosConfig";
import {
  clearAllNotifications,
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "./notificationService";

export const getAlerts = (params = {}) =>
  api.get("/alerts", { params: { ...params } });

export const getAlert = (alertId) => api.get(`/alerts/${alertId}`);

/** @deprecated Use notificationService.fetchNotifications */
export const getNotifications = () => fetchNotifications();

/** @deprecated Use notificationService.markNotificationRead / markAllNotificationsRead */
export const markNotificationsRead = (notificationIds = null) => {
  if (!notificationIds?.length) return markAllNotificationsRead();
  return markNotificationRead(notificationIds[0]);
};

/** @deprecated Use notificationService.clearAllNotifications */
export const clearNotifications = () => clearAllNotifications();

export const syncLowStockAlerts = () => api.post("/alerts/sync-low-stock");

export const createAlert = (payload) => api.post("/alerts", payload);

export const acknowledgeAlert = (alertId) =>
  api.put(`/alerts/${alertId}/acknowledge`);

export const resolveAlert = (alertId) => api.put(`/alerts/${alertId}/resolve`);

export const deleteAlert = (alertId) => api.delete(`/alerts/${alertId}`);
