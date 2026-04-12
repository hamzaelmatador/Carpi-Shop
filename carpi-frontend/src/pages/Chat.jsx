import { useEffect, useState, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { io } from "socket.io-client";
import api from "../api/axios";
import { useNotify } from "../components/NotificationProvider";
import { 
  Send, 
  ArrowLeft, 
  User, 
  ShieldCheck, 
  Package,
  MapPin,
  Clock,
  CheckCheck
} from "lucide-react";

// The server URL should match your backend
const SOCKET_URL = "http://localhost:5000";

export default function Chat() {
  const { orderId } = useParams();
  const { notify } = useNotify();
  const [order, setOrder] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const socketRef = useRef();
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    // 1. Get User ID from Token
    const token = localStorage.getItem("token");
    if (token) {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      const user = JSON.parse(jsonPayload);
      setUserId(user.id);
    }

    // 2. Fetch Order and Initial Messages
    const fetchData = async () => {
      try {
        const [orderRes, messagesRes] = await Promise.all([
          api.get(`/orders/${orderId}`),
          api.get(`/chats/${orderId}`)
        ]);
        setOrder(orderRes.data);
        setMessages(messagesRes.data);
      } catch (err) {
        notify("Failed to load chat.", "error");
      } finally {
        setLoading(false);
      }
    };
    fetchData();

    // 3. Initialize Socket
    socketRef.current = io(SOCKET_URL);

    socketRef.current.on("connect", () => {
      socketRef.current.emit("joinOrder", orderId);
    });

    socketRef.current.on("receiveMessage", (message) => {
      setMessages((prev) => [...prev, message]);
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [orderId, notify]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const messageData = {
      order: orderId,
      sender: userId,
      content: newMessage,
      type: "text"
    };

    socketRef.current.emit("sendMessage", messageData);
    setNewMessage("");
  };

  if (loading) return <div className="container loading-state-premium"><div className="spinner-gold"></div><p>Opening secure channel...</p></div>;
  if (!order) return <div className="container"><h3>Order not found.</h3></div>;

  const partner = order.buyer._id === userId ? order.seller : order.buyer;

  return (
    <div className="chat-page-container">
      {/* CHAT HEADER */}
      <header className="chat-header">
        <div className="container chat-header-content">
          <Link to="/deals" className="back-link">
            <ArrowLeft size={20} />
          </Link>
          <div className="partner-info">
            <div className="partner-avatar">
              {partner.profilePicture ? (
                <img src={partner.profilePicture} alt="" />
              ) : (
                <User size={20} />
              )}
            </div>
            <div>
              <h3 className="partner-name">{partner.name}</h3>
              <p className="order-context">Dealing: {order.product?.title}</p>
            </div>
          </div>
          <div className="order-status-badge">
            <ShieldCheck size={16} />
            <span>Escrow Protected</span>
          </div>
        </div>
      </header>

      {/* MESSAGES AREA */}
      <div className="messages-area">
        <div className="container messages-wrapper">
          
          <div className="system-notice">
            <div className="notice-icon"><ShieldCheck size={18} /></div>
            <p>You are now in a secure channel. Use this space to coordinate your meeting for <strong>{order.product?.title}</strong>. Avoid sharing personal data outside of this deal.</p>
          </div>

          {messages.map((msg, idx) => {
            const isMe = msg.sender === userId || (msg.sender?._id === userId);
            return (
              <div key={idx} className={`message-row ${isMe ? 'me' : 'them'}`}>
                <div className="message-bubble">
                  {msg.type === 'system' && <div className="system-tag">SYSTEM</div>}
                  <p className="message-text">{msg.content}</p>
                  <div className="message-meta">
                    <span className="message-time">{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    {isMe && <CheckCheck size={14} className="status-icon" />}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* MESSAGE INPUT */}
      <footer className="chat-input-area">
        <div className="container">
          <form onSubmit={handleSendMessage} className="chat-form">
            <input 
              type="text" 
              placeholder="Write a message..." 
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              className="chat-input"
            />
            <button type="submit" className="send-btn" disabled={!newMessage.trim()}>
              <Send size={20} />
            </button>
          </form>
        </div>
      </footer>

      <style>{`
        .chat-page-container {
          height: calc(100vh - 80px);
          display: flex;
          flex-direction: column;
          background: #000;
          color: #fff;
        }
        .chat-header {
          background: rgba(255, 255, 255, 0.05);
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          padding: 15px 0;
          backdrop-filter: blur(10px);
        }
        .chat-header-content {
          display: flex;
          align-items: center;
          gap: 15px;
        }
        .back-link {
          color: #fff;
          opacity: 0.6;
          transition: 0.2s;
        }
        .back-link:hover {
          opacity: 1;
          color: var(--primary-gold);
        }
        .partner-info {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .partner-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: #222;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(255, 215, 0, 0.3);
        }
        .partner-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .partner-name {
          font-size: 1rem;
          font-weight: 700;
          margin: 0;
        }
        .order-context {
          font-size: 0.75rem;
          opacity: 0.5;
          margin: 0;
        }
        .order-status-badge {
          display: flex;
          align-items: center;
          gap: 6px;
          background: rgba(76, 175, 80, 0.1);
          color: #4CAF50;
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 0.7rem;
          font-weight: 800;
          text-transform: uppercase;
          border: 1px solid rgba(76, 175, 80, 0.2);
        }

        .messages-area {
          flex: 1;
          overflow-y: auto;
          padding: 20px 0;
          background: radial-gradient(circle at top right, rgba(255, 215, 0, 0.03), transparent 400px);
        }
        .messages-wrapper {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .system-notice {
          background: rgba(255, 215, 0, 0.05);
          border: 1px solid rgba(255, 215, 0, 0.1);
          padding: 15px;
          border-radius: 12px;
          margin-bottom: 20px;
          display: flex;
          gap: 12px;
          align-items: center;
          font-size: 0.8rem;
          color: rgba(255, 255, 255, 0.7);
        }
        .notice-icon {
          color: var(--primary-gold);
        }

        .message-row {
          display: flex;
          width: 100%;
        }
        .message-row.me {
          justify-content: flex-end;
        }
        .message-row.them {
          justify-content: flex-start;
        }
        .message-bubble {
          max-width: 70%;
          padding: 12px 16px;
          border-radius: 18px;
          position: relative;
        }
        .me .message-bubble {
          background: var(--primary-gold);
          color: #000;
          border-bottom-right-radius: 4px;
        }
        .them .message-bubble {
          background: #222;
          color: #fff;
          border-bottom-left-radius: 4px;
          border: 1px solid rgba(255, 255, 255, 0.05);
        }
        .message-text {
          margin: 0;
          font-size: 0.95rem;
          line-height: 1.4;
          word-wrap: break-word;
        }
        .message-meta {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 4px;
          margin-top: 4px;
          font-size: 0.65rem;
          opacity: 0.6;
        }
        .system-tag {
          font-size: 0.6rem;
          font-weight: 900;
          margin-bottom: 4px;
          opacity: 0.5;
        }

        .chat-input-area {
          padding: 20px 0;
          background: #000;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
        }
        .chat-form {
          display: flex;
          gap: 10px;
          background: #111;
          padding: 8px;
          border-radius: 30px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          transition: 0.3s;
        }
        .chat-form:focus-within {
          border-color: var(--primary-gold);
          box-shadow: 0 0 15px rgba(255, 215, 0, 0.1);
        }
        .chat-input {
          flex: 1;
          background: none;
          border: none;
          color: #fff;
          padding: 0 15px;
          font-size: 0.95rem;
        }
        .chat-input:focus {
          outline: none;
        }
        .send-btn {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: var(--primary-gold);
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #000;
          cursor: pointer;
          transition: 0.2s;
        }
        .send-btn:disabled {
          background: #333;
          color: #666;
          cursor: not-allowed;
        }
        .send-btn:hover:not(:disabled) {
          transform: scale(1.05);
          box-shadow: 0 0 10px rgba(255, 215, 0, 0.3);
        }
      `}</style>
    </div>
  );
}
