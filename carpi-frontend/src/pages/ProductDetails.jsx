import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import api from "../api/axios";
import { useNotify } from "../components/NotificationProvider";
import ConfirmModal from "../components/ConfirmModal";
import { ChevronLeft, ChevronRight, Sparkles, Clock, Trash2, Edit3, ShieldAlert } from "lucide-react";

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

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const res = await api.get(`/products/${id}`);
        setProduct(res.data);
        
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

            setIsOwner(user.id === res.data.owner || user.role === 'admin');
          } catch (e) {
            console.error("Token decoding failed", e);
          }
        }
      } catch (err) {
        console.error("Error fetching product:", err);
        setError("Product not found.");
        notify("Could not fetch product details.", "error");
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
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
              <button className="btn-primary details-cta-btn">Contact Premium Seller</button>
            )}
          </div>
        </div>
      </div>

      <ConfirmModal 
        isOpen={isModalOpen}
        title="Permanently Delete?"
        message="This action will remove the listing from the marketplace forever."
        onConfirm={handleDelete}
        onCancel={() => setIsModalOpen(false)}
        icon={<ShieldAlert size={48} color="#ff4d4d" />}
      />
    </div>
  );
}
