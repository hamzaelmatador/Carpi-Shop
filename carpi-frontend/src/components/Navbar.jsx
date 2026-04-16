// src/components/Navbar.jsx
import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { PlusCircle, Home, Store, User, LogOut, Menu, X, Gavel, Package, Bell } from "lucide-react";
import api from "../api/axios";
import { useNotificationBadge } from "./NotificationBadgeContext";

export default function Navbar() {
  const { notifications, unreadCount, markAllAsRead, markAsRead } = useNotificationBadge();
  const [showNotifications, setShowNotifications] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [balance, setBalance] = useState(0);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);

    const handleCreditUpdate = (e) => {
      setBalance(e.detail);
    };
    window.addEventListener("creditUpdated", handleCreditUpdate);

    const fetchBalance = async () => {
      try {
        const token = localStorage.getItem("token");
        if (token) {
          const res = await api.get("/auth/profile");
          setBalance(res.data.creditBalance || 0);
        }
      } catch (err) {
        console.error("Failed to fetch balance");
      }
    };
    fetchBalance();

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("creditUpdated", handleCreditUpdate);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    setIsMenuOpen(false);
    navigate("/login");
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
    setShowNotifications(false);
  };

  const handleNotificationClick = (n) => {
    markAsRead(n._id);
    setShowNotifications(false);
    if (n.link) navigate(n.link);
  };

  const hasOfferNotifs = notifications.some(n => !n.isRead && n.type.startsWith('offer'));
  const hasDealNotifs = notifications.some(n => !n.isRead && (n.type === 'order_update' || n.type === 'message_new'));

  return (
    <>
      <nav
        className={`navbar ${scrolled ? "scrolled" : ""} ${isMenuOpen ? "menu-active" : ""}`}
      >
        <div className="container nav-content">
          <Link to="/" className="logo" onClick={closeMenu}>
            CARPI SHOP
          </Link>

          {/* Desktop Links */}
          <div className="nav-links desktop-only">
            <Link to="/" className="nav-link">
              Home
            </Link>
            <Link to="/manage" className="nav-link">
              Store
            </Link>
            <Link to="/offers" className="nav-link relative">
              Offers
              {hasOfferNotifs && <span className="notification-dot"></span>}
            </Link>
            <Link to="/deals" className="nav-link relative">
              Deals
              {hasDealNotifs && <span className="notification-dot"></span>}
            </Link>
            <Link to="/profile" className="nav-link">
              Profile
            </Link>
            <Link to="/create" className="nav-link">
              Create
            </Link>
            
            {/* Notification Bell */}
            <div className="nav-link relative" style={{ cursor: 'pointer' }} onClick={() => setShowNotifications(!showNotifications)}>
              <Bell size={20} />
              {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
              
              {showNotifications && (
                <div className="notification-dropdown">
                  <div className="notification-header">
                    <span>Notifications</span>
                    <button onClick={(e) => { e.stopPropagation(); markAllAsRead(); }}>Mark all read</button>
                  </div>
                  <div className="notification-list">
                    {notifications.length === 0 ? (
                      <div className="notification-empty">No notifications</div>
                    ) : (
                      notifications.map(n => (
                        <div 
                          key={n._id} 
                          className={`notification-item ${n.isRead ? 'read' : 'unread'}`}
                          onClick={(e) => { e.stopPropagation(); handleNotificationClick(n); }}
                        >
                          <div className="notification-item-title">{n.title}</div>
                          <div className="notification-item-message">{n.message}</div>
                          <div className="notification-item-time">{new Date(n.createdAt).toLocaleDateString()}</div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <div
              className="nav-link"
              style={{
                color: "var(--primary-gold)",
                fontWeight: 800,
                cursor: "default",
              }}
            >
              💰 {balance}
            </div>
            <button onClick={handleLogout} className="btn-secondary nav-btn">
              <LogOut size={16} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
              Logout
            </button>
          </div>

          {/* Hamburger Button (Mobile) */}
          <button
            className="hamburger-btn mobile-only"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            <div className="hamburger-icon-wrapper">
              {isMenuOpen ? <X size={28} color="var(--primary-gold)" /> : (
                <div className="relative">
                  <Menu size={28} color="var(--primary-gold)" />
                  {unreadCount > 0 && <span className="notification-dot-mobile"></span>}
                </div>
              )}
            </div>
          </button>
        </div>
      </nav>

      {/* Fullscreen Mobile Menu Overlay */}
      <div
        className={`mobile-menu-overlay ${isMenuOpen ? "open" : ""}`}
        onClick={closeMenu}
      >
        <div
          className="mobile-menu-content"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mobile-menu-header">
            <div className="credit-badge-large">
              <div
                style={{
                  fontSize: "0.65rem",
                  fontWeight: 800,
                  textTransform: "uppercase",
                  color: "#000",
                }}
              >
                Balance
              </div>
              <div
                style={{ fontSize: "1.4rem", fontWeight: 900, color: "#000" }}
              >
                💰 {balance}
              </div>
            </div>
          </div>

          <div className="mobile-menu-links">
            <Link to="/" className="mobile-menu-link" onClick={closeMenu}>
              <span className="link-icon"><Home size={20} /></span> Home
            </Link>
            <Link to="/manage" className="mobile-menu-link" onClick={closeMenu}>
              <span className="link-icon"><Store size={20} /></span> My Store
            </Link>
            <Link to="/offers" className="mobile-menu-link relative" onClick={closeMenu}>
              <span className="link-icon"><Gavel size={20} /></span> Negotiation Hub
              {hasOfferNotifs && <span className="notification-dot-menu"></span>}
            </Link>
            <Link to="/deals" className="mobile-menu-link relative" onClick={closeMenu}>
              <span className="link-icon"><Package size={20} /></span> Active Deals
              {hasDealNotifs && <span className="notification-dot-menu"></span>}
            </Link>
            <Link
              to="/profile"
              className="mobile-menu-link"
              onClick={closeMenu}
            >
              <span className="link-icon"><User size={20} /></span> Account Settings
            </Link>
            <Link to="/create" className="mobile-menu-link" onClick={closeMenu}>
              <span className="link-icon"><PlusCircle size={20} /></span> List New Item
            </Link>
          </div>

          <div className="mobile-menu-footer">
            <button
              onClick={handleLogout}
              className="btn-primary logout-btn-full"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}
            >
              <LogOut size={20} />
              Sign Out
            </button>
          </div>
        </div>
      </div>

      <div className="mobile-bottom-nav mobile-only">
        <Link to="/create" className="add-btn">
          <PlusCircle size={32} />
        </Link>
      </div>
    </>
  );
}
