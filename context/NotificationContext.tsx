import { ReactNode, createContext, useState } from "react";

export interface AppNotification {
  id: string;
  message: string;
  autoClose?: boolean;
  duration?: number;
}

interface NotificationContextProps {
  notifications: AppNotification[];
  pushNotification: (n: Omit<AppNotification, "id">) => void;
  removeNotification: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextProps>({
  notifications: [],
  pushNotification: () => {},
  removeNotification: () => {},
});

export function NotificationContextProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  const pushNotification = (n: Omit<AppNotification, "id">) => {
    setNotifications((prev) => [
      ...prev,
      { ...n, id: crypto.randomUUID() },
    ]);
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
