import { ReactNode, createContext, useState, useEffect } from "react";

export interface AppNotification {
  id: string;
  message: string;
  done?: boolean; // ✅ Marks notification as completed
  type?: 'success' | 'error' | 'warning' | 'info';
  autoClose?: boolean;
  duration?: number; // milliseconds before autoClose
  createdAt?: number;
  updatedAt?: number;
}

interface NotificationContextProps {
  notifications: AppNotification[];
  pushNotification: (n: Omit<AppNotification, "id"> | AppNotification) => void;
  removeNotification: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextProps>({
  notifications: [],
  pushNotification: () => {},
  removeNotification: () => {},
});

export function NotificationContextProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  // Push or update notification
  const pushNotification = (n: Omit<AppNotification, "id"> | AppNotification) => {
    setNotifications((prev) => {
      const notification = "id" in n && n.id
        ? { ...n, updatedAt: Date.now() }
        : { ...n, id: crypto.randomUUID(), createdAt: Date.now() };

      const index = prev.findIndex((notif) => notif.id === notification.id);
      if (index !== -1) {
        const updated = [...prev];
        updated[index] = notification;
        return updated;
      }

      return [...prev, notification];
    });
  };

  // Remove notification by ID
  const removeNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  // Watch for notifications marked done and remove them after a timeout
  useEffect(() => {
    const doneNotifications = notifications.filter((n) => n.done);

    doneNotifications.forEach((n) => {
      const timeout = setTimeout(() => {
        setNotifications((prev) => prev.filter((notif) => notif.id !== n.id));
      }, 2000); // ✅ remove after 2 seconds (adjust as needed)

      // Cleanup timeout if notification is removed before timeout
      return () => clearTimeout(timeout);
    });
  }, [notifications]);

  return (
    <NotificationContext.Provider
      value={{ notifications, pushNotification, removeNotification }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export default NotificationContext;
