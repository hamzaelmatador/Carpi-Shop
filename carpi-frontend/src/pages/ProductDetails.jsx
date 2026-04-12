import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import api from "../api/axios";
import { useNotify } from "../components/NotificationProvider";
import ConfirmModal from "../components/ConfirmModal";
import { ChevronLeft, ChevronRight, Sparkles, Clock, Trash2, Edit3, ShieldAlert, BadgeDollarSign, Gavel } from "lucide-react";

export default function ProductDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { notify } = useNotify();
  
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeImage, setActiveImage] = useState(0);
  const [isOwner, setIsOwner] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Offer States
  const [hasPendingOffer, setHasPendingOffer] = useState(false);
  const [pendingOffer, setPendingOffer] = useState(null);
  const [isOfferModalOpen, setIsOfferModalOpen] = useState(false);
  const [offerAmount, setOfferAmount] = useState("");
  const [isSubmittingOffer, setIsSubmittingOffer] = useState(false);

  const nextImage = (e) => {
    e.preventDefault();
    if (product?.images?.length) {
      setActiveImage((prev) => (prev + 1) % product.images.length);
    }
  };

  const prevImage = (e) => {
    e.preventDefault();
    if (product?.images?.length) {
      setActiveImage((prev) => (prev - 1 + product.images.length) % product.images.length);
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/products/${id}`);
      notify("Listing removed successfully.");
      navigate("/");
    } catch (err) {
      notify("Failed to delete the listing.", "error");
    } finally {
      setIsModalOpen(false);
    }
  };

  const handleMakeOffer = async (e) => {
    e.preventDefault();
    if (!offerAmount || isNaN(offerAmount) || Number(offerAmount) <= 0) {
      notify("Please enter a valid offer amount.", "error");
      return;
    }

    setIsSubmittingOffer(true);
    try {
      const res = await api.post("/offers", {
        productId: id,
        amount: Number(offerAmount)
      });
      notify("Offer submitted successfully! Wait for seller's response.");
      setHasPendingOffer(true);
      setPendingOffer(res.data);
      setIsOfferModalOpen(false);
    } catch (err) {
      notify(err.response?.data?.message || "Failed to submit offer.", "error");
    } finally {
      setIsSubmittingOffer(false);
    }
  };

  useEffect(() => {
    const fetchProductAndOffer = async () => {
      try {
        const productRes = await api.get(`/products/${id}`);
        setProduct(productRes.data);
        setOfferAmount(productRes.data.price); // Default offer amount to current price
        
        const token = localStorage.getItem("token");
        if (token) {
          try {
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));

            let user = JSON.parse(jsonPayload);
            
            if (!user.role) {
              const profileRes = await api.get("/auth/profile");
              user.role = profileRes.data.role;
            }

            const ownerStatus = user.id === productRes.data.owner || user.role === 'admin';
            setIsOwner(ownerStatus);

            // If not owner, check for pending offers
            if (!ownerStatus) {
              const offerRes = await api.get(`/offers/check/${id}`);
              setHasPendingOffer(offerRes.data.hasPendingOffer);
              setPendingOffer(offerRes.data.offer);
            }
          } catch (e) {
            console.error("Token decoding failed", e);
          }
        }
      } catch (err) {
        console.error("Error fetching data:", err);
        setError("Product not found.");
        notify("Could not fetch details.", "error");
      } finally {
        setLoading(false);
      }
    };
    fetchProductAndOffer();
  }, [id, notify]);

  if (loading) return <div className="container loading-state">Fetching product details...</div>;
  if (error) return <div className="container no-results"><h3>{error}</h3><Link to="/" className="auth-link">Back to Home</Link></div>;
  if (!product) return null;

  return (
    <div className="container product-details-page">
      <div className="back-navigation">
        <Link to="/" className="back-link">
          <ChevronLeft size={18} />
          Back to Marketplace
        </Link>
      </div>

      <div className="details-main-grid">
        {/* LEFT COLUMN: GALLERY */}
        <div className="details-gallery-column">
          <div className={`details-main-image-container product-image-container ${product.treatedImages?.[activeImage] ? 'is-treated' : ''}`}>
            {product.images && product.images.length > 0 ? (
              <>
                <img src={product.images[activeImage]} alt={product.title} className="details-active-img" />
                
                {product.images.length > 1 && (
                  <div className="gallery-nav-overlay">
                    <button className="gallery-arrow-btn prev" onClick={prevImage} title="Previous Image">
                      <ChevronLeft size={24} />
                    </button>
                    <button className="gallery-arrow-btn next" onClick={nextImage} title="Next Image">
                      <ChevronRight size={24} />
                    </button>
                    <div className="gallery-pagination">
                      {activeImage + 1} / {product.images.length}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="product-image-placeholder">No Image Available</div>
            )}
          </div>
          
          {product.images && product.images.length > 1 && (
            <div className="details-thumbnails-strip">
              {product.images.map((img, index) => (
                <div 
                  key={index} 
                  className={`details-thumb-box product-image-container ${activeImage === index ? "active" : ""} ${product.treatedImages?.[index] ? 'is-treated' : ''}`}
                  onClick={() => setActiveImage(index)}
                >
                  <img src={img} alt={`Thumb ${index}`} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: INFORMATION */}
        <div className="details-info-column">
          <div className="details-header">
            <span className="premium-badge">{product.category}</span>
            <h1 className="details-main-title">{product.title}</h1>
            <div className="details-price-tag">${product.price.toLocaleString()}</div>
          </div>

          <div className="details-content-block">
            <h3 className="details-section-label">Product Description</h3>
            <p className="details-description-text">{product.description}</p>
          </div>

          <div className="details-content-block">
            <h3 className="details-section-label">Listed By</h3>
            <div className="details-seller-card">
              {product.user?.profilePicture ? (
                <img src={product.user.profilePicture} alt="Seller" className="details-seller-avatar" />
              ) : (
                <div className="details-seller-placeholder">{product.user?.name?.charAt(0).toUpperCase()}</div>
              )}
              <div className="details-seller-meta">
                <span className="details-seller-name">{product.user?.name || "Premium Seller"}</span>
                <span className="details-listing-date">Active since {new Date(product.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          <div className="details-action-footer">
            {isOwner ? (
              <div className="details-owner-tools">
                <Link to={`/edit/${id}`} className="btn-secondary details-tool-btn">Edit Product</Link>
                <button onClick={() => setIsModalOpen(true)} className="btn-secondary details-tool-btn danger">Delete Listing</button>
              </div>
            ) : (
              <div className="details-buyer-actions" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {hasPendingOffer ? (
                  <div className="pending-offer-status" style={{ 
                    padding: '20px', 
                    background: 'rgba(212, 160, 23, 0.05)', 
                    border: '1px solid var(--primary-gold)', 
                    borderRadius: '12px',
                    textAlign: 'center'
                  }}>
                    <div style={{ color: 'var(--primary-gold)', fontWeight: 800, fontSize: '0.8rem', textTransform: 'uppercase', marginBottom: '5px' }}>
                      Offer Pending Response
                    </div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 900 }}>${pendingOffer?.amount?.toLocaleString()}</div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '5px' }}>
                      You cannot make another offer until this one is resolved.
                    </p>
                  </div>
                ) : (
                  <button onClick={() => setIsOfferModalOpen(true)} className="btn-primary details-cta-btn" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                    <Gavel size={20} />
                    Make a Premium Offer
                  </button>
                )}
                <button className="btn-secondary details-cta-btn">Contact Premium Seller</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* DELETE MODAL */}
      <ConfirmModal 
        isOpen={isModalOpen}
        title="Permanently Delete?"
        message="This action will remove the listing from the marketplace forever."
        onConfirm={handleDelete}
        onCancel={() => setIsModalOpen(false)}
        icon={<ShieldAlert size={48} color="#ff4d4d" />}
      />

      {/* OFFER MODAL */}
      {isOfferModalOpen && (
        <div className="modal-overlay" onClick={() => setIsOfferModalOpen(false)}>
          <div className="custom-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '450px' }}>
            <span className="modal-icon"><BadgeDollarSign size={64} color="var(--primary-gold)" /></span>
            <h2 className="modal-title">Make an Offer</h2>
            <p className="modal-text">Proposed price for <strong>{product.title}</strong>. The seller will be notified immediately.</p>
            
            <form onSubmit={handleMakeOffer}>
              <div className="form-group" style={{ marginBottom: '24px', textAlign: 'left' }}>
                <label className="form-label">Your Offer Amount ($)</label>
                <input 
                  type="number" 
                  className="form-input" 
                  style={{ fontSize: '1.5rem', fontWeight: 800, textAlign: 'center', padding: '15px' }}
                  value={offerAmount}
                  onChange={(e) => setOfferAmount(e.target.value)}
                  placeholder="Enter amount"
                  required
                  autoFocus
                />
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '8px', textAlign: 'center' }}>
                  Listed Price: ${product.price.toLocaleString()}
                </p>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary modal-btn" onClick={() => setIsOfferModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn-primary modal-btn" disabled={isSubmittingOffer}>
                  {isSubmittingOffer ? "Submitting..." : "Send Offer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
