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

      <div className="orders-container">
        
        {/* Orders List */}
        <div className="orders-list">
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
              >
                <div className="order-item-img">
                  <img src={order.product?.images?.[0]} alt="" />
                </div>
                <div className="order-item-info">
                  <div className="order-item-meta">
                    <span className={`status-pill ${order.status}`}>
                      {order.status.replace('_', ' ')}
                    </span>
                    <span className="order-escrow-id">#{order.escrowId}</span>
                  </div>
                  <h3 className="order-item-title">{order.product?.title}</h3>
                  <p className="order-item-price">${order.finalPrice?.toLocaleString()}</p>
                </div>
                <ChevronRight size={20} className="order-item-arrow" />
              </div>
            ))
          )}
        </div>

        {/* Order Details Sidebar / Overlay */}
        {selectedOrder && (
          <div className="order-details-overlay">
            <div className="order-details-content">
              <div className="mobile-detail-header">
                <button onClick={() => setSelectedOrder(null)} className="back-button">
                  <ChevronRight size={24} style={{ transform: 'rotate(180deg)' }} />
                  <span>Back to List</span>
                </button>
                <div className="header-status">
                  <span className={`status-pill ${selectedOrder.status}`}>{selectedOrder.status.replace('_', ' ')}</span>
                </div>
              </div>

              <div className="detail-scroll-area">
                <div className="detail-hero">
                  <div className="detail-img-container">
                    <img src={selectedOrder.product?.images?.[0]} alt="" />
                  </div>
                  <h2 className="detail-title">{selectedOrder.product?.title}</h2>
                  <p className="detail-price-label">Final Agreed Price: <span className="gold-text">${selectedOrder.finalPrice}</span></p>
                </div>

                <div className="deal-flow">
                  {/* STATUS TRACKER */}
                  <div className="status-tracker-premium">
                    <div className={`step ${['payment_pending', 'escrow', 'completed'].includes(selectedOrder.status) ? 'active' : ''}`} title="Payment Pending">
                       <BadgeDollarSign size={20} color={selectedOrder.status === 'payment_pending' ? 'var(--primary-gold)' : '#4CAF50'} />
                       <span className="step-label">Payment</span>
                    </div>
                    <div className={`step ${['escrow', 'completed'].includes(selectedOrder.status) ? 'active' : ''}`} title="Escrow Hold">
                       <ShieldCheck size={20} color={selectedOrder.status === 'escrow' ? 'var(--primary-gold)' : (selectedOrder.status === 'completed' ? '#4CAF50' : '#333')} />
                       <span className="step-label">Escrow</span>
                    </div>
                    <div className={`step ${selectedOrder.status === 'completed' ? 'active' : ''}`} title="Completed">
                       <CheckCircle2 size={20} color={selectedOrder.status === 'completed' ? '#4CAF50' : '#333'} />
                       <span className="step-label">Done</span>
                    </div>
                  </div>

                  <div className="separator"></div>

                  {/* BUYER VIEW */}
                  {selectedOrder.buyer._id === userId && (
                    <div className="buyer-actions">
                      {selectedOrder.status === 'payment_pending' && (
                        <div className="action-card">
                          <p className="action-text">The seller accepted your offer. Please move funds to escrow to start the meeting phase.</p>
                          <button onClick={() => handlePay(selectedOrder._id)} className="btn-primary full-width">
                            Simulate Payment ($ {selectedOrder.finalPrice})
                          </button>
                        </div>
                      )}

                      {selectedOrder.status === 'escrow' && (
                        <div className="escrow-card">
                          <QrCode size={40} className="escrow-icon" />
                          <h4 className="escrow-title">Funds in Escrow</h4>
                          <p className="escrow-text">Your secret handshake code is below. Provide this to the seller only AFTER you have seen and approved the product.</p>
                          <div className="secret-code-display">
                            {selectedOrder.secretCode || "XXXXXX"}
                          </div>
                        </div>
                      )}

                      {selectedOrder.status === 'completed' && (
                        <div className="success-state">
                          <CheckCircle2 size={48} />
                          <h3>Deal Completed</h3>
                          <p>Transaction finished. The item is now yours!</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* SELLER VIEW */}
                  {selectedOrder.seller._id === userId && (
                    <div className="seller-actions">
                      {selectedOrder.status === 'payment_pending' && (
                        <div className="waiting-state">
                          <Clock size={40} />
                          <p>Waiting for the buyer to simulate payment into escrow...</p>
                        </div>
                      )}

                      {selectedOrder.status === 'escrow' && (
                        <div className="action-card">
                          <Lock size={40} className="gold-text" style={{ marginBottom: '10px' }} />
                          <h4>Funds Secured</h4>
                          <p className="action-text">The buyer has paid. Once you meet and they approve the item, ask them for the 6-digit secret code.</p>
                          
                          <div className="code-input-group">
                            <input 
                              type="text" 
                              placeholder="Enter Code" 
                              value={secretCodeInput}
                              onChange={(e) => setSecretCodeInput(e.target.value)}
                              maxLength={6}
                              className="code-input"
                            />
                            <button onClick={() => handleComplete(selectedOrder._id)} className="btn-primary full-width">
                              Release Funds
                            </button>
                          </div>
                        </div>
                      )}

                      {selectedOrder.status === 'completed' && (
                        <div className="success-state">
                          <CheckCircle2 size={48} />
                          <h3>Payment Released</h3>
                          <p>The deal is complete. Funds have been added to your balance.</p>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="separator"></div>

                  {/* COMMON ACTIONS */}
                  <div className="common-actions">
                    <Link to={`/chat/${selectedOrder._id}`} className="btn-secondary full-width flex-center">
                       Contact {selectedOrder.buyer._id === userId ? 'Seller' : 'Buyer'}
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        .orders-container {
          display: grid;
          grid-template-columns: 1fr 400px;
          gap: 30px;
          transition: all 0.3s ease;
        }
        .orders-list {
          display: flex;
          flex-direction: column;
          gap: 15px;
        }
        .order-list-item {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 16px;
          padding: 16px;
          cursor: pointer;
          display: grid;
          grid-template-columns: 80px 1fr auto;
          alignItems: center;
          gap: 20px;
          transition: all 0.2s ease;
        }
        .order-list-item.active {
          border-color: var(--primary-gold);
          background: rgba(255, 255, 255, 0.06);
        }
        .order-list-item:hover {
          background: rgba(255, 255, 255, 0.05);
          transform: translateX(5px);
        }
        .order-item-img {
          width: 80px;
          height: 80px;
          border-radius: 12px;
          overflow: hidden;
          background: #111;
        }
        .order-item-img img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .order-item-meta {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 4px;
        }
        .order-escrow-id {
          font-size: 0.8rem;
          opacity: 0.5;
        }
        .order-item-title {
          font-size: 1.1rem;
          font-weight: 700;
          margin-bottom: 2px;
        }
        .order-item-price {
          font-size: 0.9rem;
          color: var(--primary-gold);
          font-weight: 700;
        }
        .order-item-arrow {
          opacity: 0.3;
        }

        /* Detail Sidebar Default */
        .order-details-content {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 24px;
          padding: 30px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          height: fit-content;
          position: sticky;
          top: 100px;
        }
        .mobile-detail-header {
          display: none;
        }
        .detail-hero {
          text-align: center;
          margin-bottom: 30px;
        }
        .detail-img-container {
          width: 100%;
          aspect-ratio: 16/9;
          border-radius: 16px;
          overflow: hidden;
          margin-bottom: 20px;
        }
        .detail-img-container img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .detail-title {
          font-size: 1.4rem;
          font-weight: 800;
          margin-bottom: 5px;
        }
        .detail-price-label {
          opacity: 0.5;
          font-size: 0.9rem;
        }
        .gold-text {
          color: var(--primary-gold);
          font-weight: 700;
        }

        .status-tracker-premium {
          display: flex;
          justify-content: space-between;
          padding: 0 10px;
          position: relative;
          margin-bottom: 20px;
        }
        .status-tracker-premium::after {
          content: '';
          position: absolute;
          top: 20px;
          left: 10%;
          right: 10%;
          height: 2px;
          background: #333;
          z-index: 1;
        }
        .step {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          z-index: 2;
        }
        .step-label {
          font-size: 0.65rem;
          font-weight: 700;
          text-transform: uppercase;
          opacity: 0.5;
        }
        .step.active .step-label {
          opacity: 1;
          color: var(--primary-gold);
        }
        .step > svg {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: #111;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid #333;
          padding: 8px;
        }
        .step.active > svg {
          border-color: currentColor;
          background: rgba(255, 215, 0, 0.05);
        }

        .separator {
          height: 1px;
          background: rgba(255, 255, 255, 0.1);
          margin: 20px 0;
        }
        .full-width { width: 100%; }
        .flex-center { display: flex; align-items: center; justify-content: center; gap: 8px; }
        .action-card { text-align: center; }
        .action-text { fontSize: 0.85rem; opacity: 0.7; marginBottom: 15px; }
        
        .escrow-card {
          background: rgba(76, 175, 80, 0.05);
          border: 1px dashed rgba(76, 175, 80, 0.3);
          border-radius: 16px;
          padding: 20px;
          text-align: center;
        }
        .escrow-icon { color: #4CAF50; margin-bottom: 10px; }
        .escrow-title { color: #4CAF50; margin-bottom: 10px; }
        .escrow-text { font-size: 0.75rem; opacity: 0.8; margin-bottom: 15px; }
        .secret-code-display {
          background: #111;
          padding: 15px;
          border-radius: 12px;
          font-size: 1.8rem;
          font-weight: 900;
          letter-spacing: 8px;
          color: var(--primary-gold);
          border: 1px solid var(--primary-gold);
        }
        .success-state { text-align: center; color: #4CAF50; }
        .waiting-state { text-align: center; opacity: 0.7; }
        
        .code-input-group { display: flex; flex-direction: column; gap: 10px; }
        .code-input {
          background: #000;
          border: 1px solid rgba(255, 255, 255, 0.2);
          padding: 12px;
          border-radius: 8px;
          text-align: center;
          font-size: 1.2rem;
          font-weight: 700;
          letter-spacing: 4px;
          color: white;
        }

        .status-pill {
          font-size: 0.6rem;
          font-weight: 800;
          text-transform: uppercase;
          padding: 2px 8px;
          border-radius: 4px;
        }
        .status-pill.payment_pending { background: rgba(255, 193, 7, 0.1); color: #FFC107; }
        .status-pill.escrow { background: rgba(33, 150, 243, 0.1); color: #2196F3; }
        .status-pill.completed { background: rgba(76, 175, 80, 0.1); color: #4CAF50; }

        @media (max-width: 900px) {
          .orders-container {
            grid-template-columns: 1fr !important;
          }
          .order-details-overlay {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            right: 0 !important;
            bottom: 0 !important;
            z-index: 2000;
            background: #000;
          }
          .order-details-content {
            height: 100%;
            border-radius: 0;
            padding: 0;
            border: none;
            position: relative;
            top: 0;
            display: flex;
            flex-direction: column;
          }
          .mobile-detail-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 15px 20px;
            background: rgba(255, 255, 255, 0.05);
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          }
          .back-button {
            background: none;
            border: none;
            color: var(--primary-gold);
            display: flex;
            align-items: center;
            gap: 5px;
            font-weight: 700;
            cursor: pointer;
          }
          .detail-scroll-area {
            flex: 1;
            overflow-y: auto;
            padding: 20px;
          }
          .order-list-item {
            grid-template-columns: 60px 1fr auto;
            gap: 15px;
            padding: 12px;
          }
          .order-item-img {
            width: 60px;
            height: 60px;
          }
          .order-item-title {
            font-size: 1rem;
          }
          .status-tracker-premium::after {
            top: 18px;
          }
          .step > svg {
            width: 36px;
            height: 36px;
            padding: 8px;
          }
        }
      `}</style>
    </div>
  );
}
