import { ReactNode, createContext, useState } from 'react';

interface NotificationContextProps {
    notification: string; // Replace 'any' with the appropriate type for your theme
    setNotification: React.Dispatch<React.SetStateAction<string>>; // Replace 'any' with the appropriate type for your theme
}

const NotificationContext = createContext<NotificationContextProps>({
    notification: "",
    setNotification: () => {},
});

interface NotificationProviderContextProps {
    children: ReactNode;
}

export function NotificationContextProvider({ children }: NotificationProviderContextProps) {
    const [notification, setNotification] = useState<string>();

    return (
        <NotificationContext.Provider value={{ notification, setNotification }}>
            {children}
        </NotificationContext.Provider>
    );
}


export default NotificationContext;
