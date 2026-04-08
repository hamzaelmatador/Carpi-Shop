import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";
import { useNotify } from "../components/NotificationProvider";
import ConfirmModal from "../components/ConfirmModal";
import { Search, Package, Eye, Edit3, Trash2, AlertTriangle } from "lucide-react";


const CATEGORIES = ["All", "Electronics", "Fashion", "Home", "Luxury"];

export default function ManageStore() {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const { notify } = useNotify();
  
  // Filtering States
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);

  const fetchUserProducts = async () => {
    try {
      const res = await api.get("/products?limit=1000"); 
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Not authenticated");
      
      let user = {};
      try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        user = JSON.parse(jsonPayload);
      } catch (e) {
        console.error("Token decoding failed", e);
      }

      const isUserAdmin = user.role === 'admin';
      setIsAdmin(isUserAdmin);

      // If Admin: show EVERYTHING. If User: show only owned products.
      const myProducts = isUserAdmin 
        ? res.data.products 
        : res.data.products.filter(p => p.owner === user.id);

      setProducts(myProducts);
      setFilteredProducts(myProducts);
    } catch (err) {
      console.error("Error fetching store products:", err);
      setError("Failed to load store.");
      notify("Could not load products.", "error");
    } finally {
      setLoading(false);
    }
  };

  // Real-time filtering logic
  useEffect(() => {
    let result = products;
    if (activeCategory !== "All") result = result.filter(p => p.category === activeCategory);
    if (search) result = result.filter(p => p.title.toLowerCase().includes(search.toLowerCase()));
    setFilteredProducts(result);
  }, [search, activeCategory, products]);

  const openDeleteModal = (id) => {
    setProductToDelete(id);
    setIsModalOpen(true);
  };

  const handleDelete = async () => {
    if (!productToDelete) return;
    try {
      await api.delete(`/products/${productToDelete}`);
      setProducts(products.filter(p => p._id !== productToDelete));
      notify("Product removed successfully.");
    } catch (err) {
      notify("Failed to delete product.", "error");
    } finally {
      setIsModalOpen(false);
      setProductToDelete(null);
    }
  };

  const timeAgo = (date) => {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " years ago";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " months ago";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " days ago";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " hours ago";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " minutes ago";
    return "Just now";
  };

  useEffect(() => {
    fetchUserProducts();
  }, []);

  if (loading) return <div className="container loading-state-premium"><div className="spinner-gold"></div><p>Accessing your inventory...</p></div>;

  const totalValue = products.reduce((acc, p) => acc + p.price, 0);

  return (
    <div className="container manage-store-page">
      {/* MODERN STORE HEADER */}
      <header className="store-dashboard-header">
        <div className="header-text">
          <h1 className="page-title-modern">{isAdmin ? "Admin Control Center" : "Your Premium Store"}</h1>
          <p className="page-subtitle-modern">
            {isAdmin ? "Overseeing global marketplace inventory" : "Manage your high-end listings and performance"}
          </p>
        </div>
        
        {/* QUICK STATS */}
        <div className="store-stats-grid">
          <div className="stat-card-mini">
            <span className="stat-label">Active Items</span>
            <span className="stat-value">{products.length}</span>
          </div>
          <div className="stat-card-mini">
            <span className="stat-label">Inventory Value</span>
            <span className="stat-value">${totalValue.toLocaleString()}</span>
          </div>
        </div>
      </header>

      {/* REFINED FILTER BAR */}
      <div className="store-management-controls">
        <div className="search-container store-search-modern">
          <Search className="search-icon" size={20} />
          <input 
            type="text" 
            placeholder="Filter your inventory..." 
            className="search-input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="category-list-modern">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              className={`category-pill-modern ${activeCategory === cat ? "active" : ""}`}
              onClick={() => setActiveCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* GRID SECTION */}
      <section className="manage-inventory-section">
        {filteredProducts.length === 0 ? (
          <div className="empty-state-premium">
            <span className="empty-icon"><Package size={48} /></span>
            <h3>Inventory is clear</h3>
            <p>No products match your current filters.</p>
          </div>
        ) : (
          <div className="product-grid">
            {filteredProducts.map((product) => (
              <div key={product._id} className="card manage-product-card-modern">
                <div className={`product-image-container ${product.treatedImages && product.treatedImages[0] ? 'is-treated' : ''}`}>
                  <img src={product.images[0]} alt={product.title} className="product-image" />
                  <div className="manage-card-overlay">
                    <div className="time-badge-modern">{timeAgo(product.createdAt)}</div>
                    <div className="price-tag-floating">${product.price.toLocaleString()}</div>
                  </div>
                </div>
                
                <div className="manage-info-modern">
                  <div className="manage-meta-top">
                    <span className="product-category-pill">{product.category}</span>
                    {isAdmin && <span className="admin-owner-tag">Owner: {product.user?.name || "ID: "+product.owner}</span>}
                  </div>
                  
                  <h3 className="product-title-modern">{product.title}</h3>
                  
                  <div className="manage-action-footer">
                    <Link to={`/product/${product._id}`} className="action-btn-icon" title="View Public Page">
                      <Eye size={20} />
                    </Link>
                    <Link to={`/edit/${product._id}`} className="action-btn-icon" title="Edit Listing">
                      <Edit3 size={20} />
                    </Link>
                    <button onClick={() => openDeleteModal(product._id)} className="action-btn-icon danger" title="Delete Listing">
                      <Trash2 size={20} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <ConfirmModal 
        isOpen={isModalOpen}
        title={isAdmin ? "Admin: Force Delete?" : "Delete Listing?"}
        message="Are you sure? This premium listing will be permanently removed from the marketplace."
        onConfirm={handleDelete}
        onCancel={() => setIsModalOpen(false)}
        icon={<AlertTriangle size={48} color="#FFC107" />}
      />
    </div>
  );
}
