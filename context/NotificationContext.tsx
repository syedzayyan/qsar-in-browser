import { ReactNode, createContext, useState } from "react";

export interface AppNotification {
  id: string;
  message: string;
  type?: 'success' | 'error' | 'warning' | 'info'; // ✅ Add this
  autoClose?: boolean;
  duration?: number;
}



interface NotificationContextProps {
  notifications: AppNotification[];
  pushNotification: (n: Omit<AppNotification, "id"> | AppNotification) => void;  // ✅ Overload
  removeNotification: (id: string) => void;
}


const NotificationContext = createContext<NotificationContextProps>({
  notifications: [],
  pushNotification: () => { },
  removeNotification: () => { },
});

export function NotificationContextProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  // In NotificationContext
  // NotificationContext.tsx
  const pushNotification = (n: Omit<AppNotification, "id"> | AppNotification) => {
    setNotifications((prev) => {
      const notification = 'id' in n && n.id
        ? {
          ...n,
          updatedAt: Date.now()  // Track updates
        }
        : {
          ...n,
          id: crypto.randomUUID(),
          createdAt: Date.now()
        };

      // ✅ UPDATE if ID exists, else ADD new
      const index = prev.findIndex(notif => notif.id === notification.id);
      if (index !== -1) {
        // UPDATE existing notification
        const updated = [...prev];
        updated[index] = notification;
        return updated;
      }

      // ADD new notification
      return [...prev, notification];
    });
  };




  const removeNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  return (
    <NotificationContext.Provider
      value={{ notifications, pushNotification, removeNotification }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export default NotificationContext;
