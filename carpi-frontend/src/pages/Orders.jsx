import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";
import { useNotify } from "../components/NotificationProvider";
import { 
  Package, 
  ChevronRight, 
  BadgeDollarSign, 
  ShieldCheck, 
  Lock, 
  CheckCircle2, 
  Clock, 
  ArrowRight,
  User,
  ExternalLink,
  QrCode
} from "lucide-react";

export default function Orders() {
  const { notify } = useNotify();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [secretCodeInput, setSecretCodeInput] = useState("");

  useEffect(() => {
    const fetchOrders = async () => {
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

        const res = await api.get("/orders");
        setOrders(res.data);
      } catch (err) {
        notify("Failed to load deals.", "error");
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, [notify]);

  const handlePay = async (orderId) => {
    try {
      const res = await api.put(`/orders/${orderId}/pay`);
      notify(res.data.message);
      // Update local state
      setOrders(prev => prev.map(o => o._id === orderId ? { ...o, status: 'escrow', secretCode: res.data.order.secretCode } : o));
      if (selectedOrder && selectedOrder._id === orderId) {
        setSelectedOrder({ ...selectedOrder, status: 'escrow', secretCode: res.data.order.secretCode });
      }
    } catch (err) {
      notify(err.response?.data?.message || "Payment simulation failed.", "error");
    }
  };

  const handleComplete = async (orderId) => {
    if (!secretCodeInput) return notify("Please enter the secret code.", "error");
    try {
      const res = await api.put(`/orders/${orderId}/complete`, { secretCode: secretCodeInput });
      notify(res.data.message);
      setOrders(prev => prev.map(o => o._id === orderId ? { ...o, status: 'completed' } : o));
      setSelectedOrder({ ...selectedOrder, status: 'completed' });
      setSecretCodeInput("");
    } catch (err) {
      notify(err.response?.data?.message || "Failed to complete deal.", "error");
    }
  };

  if (loading) return <div className="container loading-state-premium"><div className="spinner-gold"></div><p>Syncing secure ledger...</p></div>;

  return (
    <div className="container orders-page" style={{ paddingBottom: '100px' }}>
      <header className="page-header" style={{ textAlign: 'left', marginBottom: '40px' }}>
        <h1 className="page-title-modern">Deal Management</h1>
        <p className="page-subtitle-modern">Track escrow status and complete handshakes</p>
      </header>

      <div className="orders-container" style={{ display: 'grid', gridTemplateColumns: selectedOrder ? '1fr 400px' : '1fr', gap: '30px', transition: 'all 0.3s ease' }}>
        
        {/* Orders List */}
        <div className="orders-list" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {orders.length === 0 ? (
            <div className="empty-state-premium">
              <Package size={48} />
              <h3>No active deals</h3>
              <p>When an offer is accepted, it will appear here for processing.</p>
            </div>
          ) : (
            orders.map(order => (
              <div 
                key={order._id} 
                onClick={() => setSelectedOrder(order)}
                className={`order-list-item ${selectedOrder?._id === order._id ? 'active' : ''}`}
                style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: `1px solid ${selectedOrder?._id === order._id ? 'var(--primary-gold)' : 'rgba(255, 255, 255, 0.1)'}`,
                  borderRadius: '16px',
                  padding: '16px',
                  cursor: 'pointer',
                  display: 'grid',
                  gridTemplateColumns: '80px 1fr auto',
                  alignItems: 'center',
                  gap: '20px',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ width: '80px', height: '80px', borderRadius: '12px', overflow: 'hidden', background: '#111' }}>
                  <img src={order.product?.images?.[0]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                    <span className={`status-pill ${order.status}`} style={{
                      fontSize: '0.6rem',
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      background: order.status === 'completed' ? 'rgba(76, 175, 80, 0.1)' : 'rgba(255, 193, 7, 0.1)',
                      color: order.status === 'completed' ? '#4CAF50' : '#FFC107'
                    }}>
                      {order.status.replace('_', ' ')}
                    </span>
                    <span style={{ fontSize: '0.8rem', opacity: 0.5 }}>#{order.escrowId}</span>
                  </div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>{order.product?.title}</h3>
                  <p style={{ fontSize: '0.9rem', color: 'var(--primary-gold)', fontWeight: 700 }}>${order.finalPrice?.toLocaleString()}</p>
                </div>
                <ChevronRight size={20} style={{ opacity: 0.3 }} />
              </div>
            ))
          )}
        </div>

        {/* Order Details Sidebar */}
        {selectedOrder && (
          <div className="order-details-sidebar" style={{ 
            background: 'rgba(255, 255, 255, 0.05)', 
            borderRadius: '24px', 
            padding: '30px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            height: 'fit-content',
            position: 'sticky',
            top: '100px'
          }}>
            <button 
              onClick={() => setSelectedOrder(null)}
              style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '0.8rem', cursor: 'pointer', marginBottom: '20px' }}
            >
              ← Close Details
            </button>

            <div style={{ textAlign: 'center', marginBottom: '30px' }}>
              <div style={{ width: '100%', aspectRatio: '16/9', borderRadius: '16px', overflow: 'hidden', marginBottom: '20px' }}>
                <img src={selectedOrder.product?.images?.[0]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '5px' }}>{selectedOrder.product?.title}</h2>
              <p style={{ opacity: 0.5, fontSize: '0.9rem' }}>Final Agreed Price: <span style={{ color: 'var(--primary-gold)', fontWeight: 700 }}>${selectedOrder.finalPrice}</span></p>
            </div>

            <div className="deal-flow" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* STATUS TRACKER */}
              <div className="status-tracker-premium" style={{ display: 'flex', justifyContent: 'space-between', padding: '0 10px', position: 'relative' }}>
                <div className={`step ${['payment_pending', 'escrow', 'completed'].includes(selectedOrder.status) ? 'active' : ''}`} title="Payment Pending">
                   <BadgeDollarSign size={20} color={selectedOrder.status === 'payment_pending' ? 'var(--primary-gold)' : '#4CAF50'} />
                </div>
                <div className={`step ${['escrow', 'completed'].includes(selectedOrder.status) ? 'active' : ''}`} title="Escrow Hold">
                   <ShieldCheck size={20} color={selectedOrder.status === 'escrow' ? 'var(--primary-gold)' : (selectedOrder.status === 'completed' ? '#4CAF50' : '#333')} />
                </div>
                <div className={`step ${selectedOrder.status === 'completed' ? 'active' : ''}`} title="Completed">
                   <CheckCircle2 size={20} color={selectedOrder.status === 'completed' ? '#4CAF50' : '#333'} />
                </div>
              </div>

              <div style={{ height: '1px', background: 'rgba(255, 255, 255, 0.1)', margin: '10px 0' }}></div>

              {/* BUYER VIEW */}
              {selectedOrder.buyer._id === userId && (
                <div className="buyer-actions">
                  {selectedOrder.status === 'payment_pending' && (
                    <div style={{ textAlign: 'center' }}>
                      <p style={{ fontSize: '0.85rem', opacity: 0.7, marginBottom: '15px' }}>The seller accepted your offer. Please move funds to escrow to start the meeting phase.</p>
                      <button onClick={() => handlePay(selectedOrder._id)} className="btn-primary" style={{ width: '100%', padding: '15px' }}>
                        Simulate Payment ($ {selectedOrder.finalPrice})
                      </button>
                    </div>
                  )}

                  {selectedOrder.status === 'escrow' && (
                    <div style={{ 
                      background: 'rgba(76, 175, 80, 0.05)', 
                      border: '1px dashed rgba(76, 175, 80, 0.3)', 
                      borderRadius: '16px', 
                      padding: '20px', 
                      textAlign: 'center' 
                    }}>
                      <QrCode size={40} style={{ marginBottom: '10px', color: '#4CAF50' }} />
                      <h4 style={{ color: '#4CAF50', marginBottom: '10px' }}>Funds in Escrow</h4>
                      <p style={{ fontSize: '0.75rem', opacity: 0.8, marginBottom: '15px' }}>Your secret handshake code is below. Provide this to the seller only AFTER you have seen and approved the product.</p>
                      <div style={{ 
                        background: '#111', 
                        padding: '15px', 
                        borderRadius: '12px', 
                        fontSize: '1.8rem', 
                        fontWeight: 900, 
                        letterSpacing: '8px',
                        color: 'var(--primary-gold)',
                        border: '1px solid var(--primary-gold)'
                      }}>
                        {selectedOrder.secretCode || "XXXXXX"}
                      </div>
                    </div>
                  )}

                  {selectedOrder.status === 'completed' && (
                    <div style={{ textAlign: 'center', color: '#4CAF50' }}>
                      <CheckCircle2 size={48} style={{ marginBottom: '10px' }} />
                      <h3>Deal Completed</h3>
                      <p style={{ fontSize: '0.8rem' }}>Transaction finished. The item is now yours!</p>
                    </div>
                  )}
                </div>
              )}

              {/* SELLER VIEW */}
              {selectedOrder.seller._id === userId && (
                <div className="seller-actions">
                  {selectedOrder.status === 'payment_pending' && (
                    <div style={{ textAlign: 'center', opacity: 0.7 }}>
                      <Clock size={40} style={{ marginBottom: '10px' }} />
                      <p>Waiting for the buyer to simulate payment into escrow...</p>
                    </div>
                  )}

                  {selectedOrder.status === 'escrow' && (
                    <div style={{ textAlign: 'center' }}>
                      <Lock size={40} style={{ marginBottom: '10px', color: 'var(--primary-gold)' }} />
                      <h4>Funds Secured</h4>
                      <p style={{ fontSize: '0.85rem', opacity: 0.7, marginBottom: '20px' }}>The buyer has paid. Once you meet and they approve the item, ask them for the 6-digit secret code.</p>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <input 
                          type="text" 
                          placeholder="Enter 6-digit secret code" 
                          value={secretCodeInput}
                          onChange={(e) => setSecretCodeInput(e.target.value)}
                          maxLength={6}
                          style={{
                            background: '#000',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            padding: '12px',
                            borderRadius: '8px',
                            textAlign: 'center',
                            fontSize: '1.2rem',
                            fontWeight: 700,
                            letterSpacing: '4px'
                          }}
                        />
                        <button onClick={() => handleComplete(selectedOrder._id)} className="btn-primary" style={{ width: '100%', padding: '12px' }}>
                          Release Funds
                        </button>
                      </div>
                    </div>
                  )}

                  {selectedOrder.status === 'completed' && (
                    <div style={{ textAlign: 'center', color: '#4CAF50' }}>
                      <CheckCircle2 size={48} style={{ marginBottom: '10px' }} />
                      <h3>Payment Released</h3>
                      <p style={{ fontSize: '0.8rem' }}>The deal is complete. Funds have been added to your balance.</p>
                    </div>
                  )}
                </div>
              )}

              <div style={{ height: '1px', background: 'rgba(255, 255, 255, 0.1)', margin: '10px 0' }}></div>

              {/* COMMON ACTIONS */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <Link to={`/chat/${selectedOrder._id}`} className="btn-secondary" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px' }}>
                   Contact {selectedOrder.buyer._id === userId ? 'Seller' : 'Buyer'}
                </Link>
              </div>

            </div>
          </div>
        )}
      </div>

      <style>{`
        .order-list-item:hover {
          background: rgba(255, 255, 255, 0.05) !important;
          transform: translateX(5px);
        }
        .step {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: #111;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid #333;
          z-index: 2;
        }
        .step.active {
          border-color: currentColor;
          background: rgba(255, 215, 0, 0.05);
        }
        .status-tracker-premium::after {
          content: '';
          position: absolute;
          top: 50%;
          left: 10%;
          right: 10%;
          height: 2px;
          background: #333;
          transform: translateY(-50%);
          z-index: 1;
        }
        @media (max-width: 900px) {
          .orders-container {
            grid-template-columns: 1fr !important;
          }
          .order-details-sidebar {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            right: 0 !important;
            bottom: 0 !important;
            z-index: 1000;
            border-radius: 0 !important;
            overflow-y: auto;
          }
        }
      `}</style>
    </div>
  );
}
