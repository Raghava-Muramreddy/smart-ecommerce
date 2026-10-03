import api from "./client";

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  data?: Record<string, any>;
  created_at: string;
}

const notificationsApi = {
  list: async (params?: { unread_only?: boolean; page?: number }) => {
    const response = await api.get("/notifications", { params });
    return response.data.data;
  },

  markRead: async (id: string): Promise<void> => {
    await api.patch(`/notifications/${id}/read`);
  },

  markAllRead: async (): Promise<void> => {
    await api.patch("/notifications/read-all");
  },
};

export default notificationsApi;
