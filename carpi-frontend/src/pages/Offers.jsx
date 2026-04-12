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
      <div className="category-list-modern" style={{ marginBottom: '40px', justifyContent: 'flex-start' }}>
        <button 
          className={`category-pill-modern ${activeTab === "received" ? "active" : ""}`}
          onClick={() => setActiveTab("received")}
        >
          Received Offers ({offers.filter(o => o.seller._id === userId).length})
        </button>
        <button 
          className={`category-pill-modern ${activeTab === "sent" ? "active" : ""}`}
          onClick={() => setActiveTab("sent")}
        >
          Sent Offers ({offers.filter(o => o.buyer._id === userId).length})
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
        <div className="offers-grid" style={{ display: 'grid', gap: '20px' }}>
          {filteredOffers.map(off => (
            <div key={off._id} className="card offer-card-modern" style={{ 
              display: 'grid', 
              gridTemplateColumns: '120px 1fr auto', 
              alignItems: 'center', 
              padding: '20px', 
              gap: '24px'
            }}>
              {/* Product Thumbnail */}
              <div className="offer-image-container" style={{ width: '120px', height: '120px', borderRadius: '12px', overflow: 'hidden', background: '#1a1a1a' }}>
                <img src={off.product?.images?.[0]} alt={off.product?.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>

              {/* Offer Info */}
              <div className="offer-main-info">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                  <span className="product-category-pill">{off.product?.category}</span>
                  <span className={`status-badge ${off.status}`} style={{ 
                    fontSize: '0.6rem', 
                    fontWeight: 800, 
                    textTransform: 'uppercase',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    background: off.status === 'pending' ? 'rgba(255, 193, 7, 0.1)' : off.status === 'accepted' ? 'rgba(76, 175, 80, 0.1)' : 'rgba(244, 67, 54, 0.1)',
                    color: off.status === 'pending' ? '#FFC107' : off.status === 'accepted' ? '#4CAF50' : '#f44336'
                  }}>
                    {off.status}
                  </span>
                </div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '4px' }}>{off.product?.title}</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '12px' }}>
                  {activeTab === 'received' ? `From: ${off.buyer?.name}` : `To Seller: ${off.seller?.name}`}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                  <div>
                    <span style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', opacity: 0.5, display: 'block' }}>Market Price</span>
                    <span style={{ fontWeight: 700 }}>${off.product?.price?.toLocaleString()}</span>
                  </div>
                  <ArrowRight size={16} style={{ opacity: 0.3 }} />
                  <div>
                    <span style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--primary-gold)', display: 'block' }}>Offered Price</span>
                    <span style={{ fontWeight: 900, color: 'var(--primary-gold)', fontSize: '1.2rem' }}>${off.amount?.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="offer-actions" style={{ display: 'flex', flexDirection: 'column', gap: '10px', minWidth: '180px' }}>
                {activeTab === 'received' && off.status === 'pending' ? (
                  <>
                    <button 
                      onClick={() => handleUpdateStatus(off._id, 'accepted')}
                      className="btn-primary" 
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px' }}
                    >
                      <Check size={18} /> Accept Offer
                    </button>
                    <button 
                      onClick={() => handleUpdateStatus(off._id, 'rejected')}
                      className="btn-secondary" 
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px', color: '#f44336', borderColor: 'rgba(244, 67, 54, 0.3)' }}
                    >
                      <X size={18} /> Decline
                    </button>
                  </>
                ) : (
                  <Link to={`/product/${off.product?._id}`} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px' }}>
                    <ExternalLink size={18} /> View Product
                  </Link>
                )}
                
                {off.status === 'accepted' && (
                  <div style={{ 
                    marginTop: '10px', 
                    padding: '8px', 
                    background: 'rgba(76, 175, 80, 0.1)', 
                    color: '#4CAF50', 
                    borderRadius: '8px',
                    fontSize: '0.75rem',
                    textAlign: 'center',
                    fontWeight: 600,
                    border: '1px solid rgba(76, 175, 80, 0.2)'
                  }}>
                    Transaction Initialized
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Mobile view adjustments (simplified) */}
      <style>{`
        @media (max-width: 768px) {
          .offer-card-modern {
            grid-template-columns: 1fr !important;
            text-align: center;
          }
          .offer-image-container {
            margin: 0 auto;
          }
          .offer-main-info {
            display: flex;
            flex-direction: column;
            align-items: center;
          }
          .offer-actions {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
