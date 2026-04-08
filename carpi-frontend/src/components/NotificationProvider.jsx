import { createContext, useContext, useState, useCallback } from "react";
import { X, CheckCircle, AlertCircle } from "lucide-react";

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);

  const notify = useCallback((message, type = "success") => {
    const id = Math.random().toString(36).substr(2, 9);
    setNotifications((prev) => [...prev, { id, message, type }]);
    
    // Auto-remove after 4 seconds
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 4000);
  }, []);

  const removeNotification = (id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  return (
    <NotificationContext.Provider value={{ notify }}>
      {children}
      <div className="notification-container">
        {notifications.map((n) => (
          <div key={n.id} className={`notification ${n.type}`}>
             <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {n.type === "success" ? <CheckCircle size={18} color="#D4A017" /> : <AlertCircle size={18} color="#ff4d4d" />}
              <div className="notification-content">{n.message}</div>
            </div>
            <button className="notification-close" onClick={() => removeNotification(n.id)}>
              <X size={18} />
            </button>
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
};

export const useNotify = () => useContext(NotificationContext);
