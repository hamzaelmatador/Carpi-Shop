import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";
import { useNotify } from "../components/NotificationProvider";
import { Gavel, Check, X, Clock, Package, ExternalLink, BadgeDollarSign, ArrowRight } from "lucide-react";

export default function Offers() {
  const { notify } = useNotify();
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("received"); // 'received' or 'sent'
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    const fetchOffers = async () => {
      try {
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

        const res = await api.get("/offers");
        setOffers(res.data);
      } catch (err) {
        notify("Failed to load offers.", "error");
      } finally {
        setLoading(false);
      }
    };
    fetchOffers();
  }, [notify]);

  const handleUpdateStatus = async (id, status) => {
    try {
      await api.put(`/offers/${id}/status`, { status });
      notify(`Offer ${status === 'accepted' ? 'accepted' : 'rejected'} successfully.`);
      
      // Update local state
      setOffers(prev => prev.map(off => off._id === id ? { ...off, status } : off));
    } catch (err) {
      notify(err.response?.data?.message || "Action failed.", "error");
    }
  };

  const filteredOffers = offers.filter(off => {
    if (activeTab === "received") return off.seller._id === userId;
    return off.buyer._id === userId;
  });

  if (loading) return <div className="container loading-state-premium"><div className="spinner-gold"></div><p>Accessing offer ledger...</p></div>;

  return (
    <div className="container offers-page" style={{ paddingBottom: '100px' }}>
      <header className="page-header" style={{ textAlign: 'left', marginBottom: '40px' }}>
        <h1 className="page-title-modern">Offer Center</h1>
        <p className="page-subtitle-modern">Negotiate and manage your premium deals</p>
      </header>

      {/* TABS */}
      <div className="category-list-modern offers-tabs">
        <button 
          className={`category-pill-modern ${activeTab === "received" ? "active" : ""}`}
          onClick={() => setActiveTab("received")}
        >
          Received ({offers.filter(o => o.seller._id === userId).length})
        </button>
        <button 
          className={`category-pill-modern ${activeTab === "sent" ? "active" : ""}`}
          onClick={() => setActiveTab("sent")}
        >
          Sent ({offers.filter(o => o.buyer._id === userId).length})
        </button>
      </div>

      {filteredOffers.length === 0 ? (
        <div className="empty-state-premium">
          <span className="empty-icon"><Gavel size={48} /></span>
          <h3>No offers yet</h3>
          <p>You have no {activeTab} offers in your history.</p>
          <Link to="/" className="btn-primary" style={{ display: 'inline-block', marginTop: '20px' }}>Marketplace</Link>
        </div>
      ) : (
        <div className="offers-grid">
          {filteredOffers.map(off => (
            <div key={off._id} className="card offer-card-modern">
              {/* Product Thumbnail */}
              <div className="offer-image-container">
                <img src={off.product?.images?.[0]} alt={off.product?.title} />
              </div>

              {/* Offer Info */}
              <div className="offer-main-info">
                <div className="offer-header-tags">
                  <span className="product-category-pill">{off.product?.category}</span>
                  <span className={`status-badge ${off.status}`}>
                    {off.status}
                  </span>
                </div>
                <h3 className="offer-title">{off.product?.title}</h3>
                <p className="offer-user-link">
                  {activeTab === 'received' ? `From: ${off.buyer?.name}` : `To Seller: ${off.seller?.name}`}
                </p>
                <div className="offer-price-comparison">
                  <div className="price-box">
                    <span className="price-label">Market</span>
                    <span className="price-value">${off.product?.price?.toLocaleString()}</span>
                  </div>
                  <ArrowRight size={16} className="price-arrow" />
                  <div className="price-box highlight">
                    <span className="price-label gold">Offered</span>
                    <span className="price-value gold big">${off.amount?.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="offer-actions">
                {activeTab === 'received' && off.status === 'pending' ? (
                  <div className="action-buttons-group">
                    <button 
                      onClick={() => handleUpdateStatus(off._id, 'accepted')}
                      className="btn-primary flex-center action-btn"
                    >
                      <Check size={18} /> Accept
                    </button>
                    <button 
                      onClick={() => handleUpdateStatus(off._id, 'rejected')}
                      className="btn-secondary flex-center action-btn reject-btn"
                    >
                      <X size={18} /> Decline
                    </button>
                  </div>
                ) : (
                  <Link to={`/product/${off.product?._id}`} className="btn-secondary flex-center full-width">
                    <ExternalLink size={18} /> View Product
                  </Link>
                )}
                
                {off.status === 'accepted' && (
                  <div className="transaction-badge">
                    Transaction Initialized
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <style>{`
        .offers-tabs {
          margin-bottom: 40px;
          justify-content: flex-start;
          gap: 10px;
        }
        .offers-grid {
          display: grid;
          gap: 20px;
        }
        .offer-card-modern {
          display: grid; 
          grid-template-columns: 120px 1fr auto; 
          align-items: center; 
          padding: 20px; 
          gap: 24px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 20px;
        }
        .offer-image-container {
          width: 120px;
          height: 120px;
          border-radius: 12px;
          overflow: hidden;
          background: #1a1a1a;
        }
        .offer-image-container img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .offer-header-tags {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 8px;
        }
        .status-badge {
          font-size: 0.6rem; 
          font-weight: 800; 
          text-transform: uppercase;
          padding: 2px 8px;
          border-radius: 4px;
        }
        .status-badge.pending { background: rgba(255, 193, 7, 0.1); color: #FFC107; }
        .status-badge.accepted { background: rgba(76, 175, 80, 0.1); color: #4CAF50; }
        .status-badge.rejected { background: rgba(244, 67, 54, 0.1); color: #f44336; }

        .offer-title { font-size: 1.2rem; font-weight: 700; margin-bottom: 4px; }
        .offer-user-link { color: var(--text-secondary); fontSize: 0.9rem; marginBottom: 12px; }
        
        .offer-price-comparison { display: flex; align-items: center; gap: 20px; }
        .price-box { display: flex; flex-direction: column; }
        .price-label { font-size: 0.65rem; font-weight: 800; text-transform: uppercase; opacity: 0.5; }
        .price-label.gold { color: var(--primary-gold); opacity: 1; }
        .price-value { font-weight: 700; }
        .price-value.gold { color: var(--primary-gold); }
        .price-value.big { font-size: 1.2rem; font-weight: 900; }
        .price-arrow { opacity: 0.3; }

        .offer-actions { min-width: 180px; }
        .action-buttons-group { display: flex; flexDirection: column; gap: 10px; }
        .action-btn { width: 100%; padding: 10px; }
        .reject-btn { color: #f44336; borderColor: rgba(244, 67, 54, 0.3); }
        .flex-center { display: flex; align-items: center; justify-content: center; gap: 8px; }
        .full-width { width: 100%; }

        .transaction-badge {
          margin-top: 10px; 
          padding: 8px; 
          background: rgba(76, 175, 80, 0.1); 
          color: #4CAF50; 
          borderRadius: 8px;
          font-size: 0.75rem;
          textAlign: center;
          fontWeight: 600;
          border: 1px solid rgba(76, 175, 80, 0.2);
        }

        @media (max-width: 768px) {
          .offers-tabs {
            justify-content: center;
          }
          .offer-card-modern {
            grid-template-columns: 1fr !important;
            gap: 20px;
            padding: 15px;
            text-align: center;
          }
          .offer-image-container {
            margin: 0 auto;
            width: 100%;
            height: 180px;
          }
          .offer-header-tags {
            justify-content: center;
          }
          .offer-price-comparison {
            justify-content: center;
            background: rgba(0,0,0,0.2);
            padding: 15px;
            border-radius: 12px;
          }
          .offer-actions {
            min-width: unset;
            width: 100%;
          }
          .action-buttons-group {
            flex-direction: row;
          }
          .action-btn {
            flex: 1;
          }
        }
        @media (max-width: 480px) {
          .action-buttons-group {
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
}
