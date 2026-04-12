// src/components/Navbar.jsx
import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { PlusCircle, Home, Store, User, LogOut, Menu, X, Gavel, Package } from "lucide-react";
import api from "../api/axios";

export default function Navbar() {
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

  const closeMenu = () => setIsMenuOpen(false);

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
            <Link to="/offers" className="nav-link">
              Offers
            </Link>
            <Link to="/deals" className="nav-link">
              Deals
            </Link>
            <Link to="/profile" className="nav-link">
              Profile
            </Link>
            <Link to="/create" className="nav-link">
              Create
            </Link>
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
              {isMenuOpen ? <X size={28} color="var(--primary-gold)" /> : <Menu size={28} color="var(--primary-gold)" />}
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
            <Link to="/offers" className="mobile-menu-link" onClick={closeMenu}>
              <span className="link-icon"><Gavel size={20} /></span> Negotiation Hub
            </Link>
            <Link to="/deals" className="mobile-menu-link" onClick={closeMenu}>
              <span className="link-icon"><Package size={20} /></span> Active Deals
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
