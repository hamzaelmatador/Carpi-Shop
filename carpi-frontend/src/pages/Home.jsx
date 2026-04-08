import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";
import { Search, Filter, X, ArrowRight, SearchX } from "lucide-react";

const CATEGORIES = ["Electronics", "Fashion", "Home", "Luxury", "Collectibles", "Art"];
const SORT_OPTIONS = [
  { label: "Price: Low", value: "price_asc" },
  { label: "Price: High", value: "price_desc" },
  { label: "Newest", value: "newest" },
  { label: "Oldest", value: "oldest" }
];

export default function Home() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // APPLIED FILTERS (The source of truth for fetching)
  const [filters, setAppliedFilters] = useState({
    search: "",
    category: "All",
    sort: "newest",
    maxPrice: 5000
  });

  // DRAFT FILTERS (Temporary state inside the drawer)
  const [draft, setDraft] = useState({ ...filters });

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      let query = `/products?search=${filters.search}&limit=100`;
      if (filters.category !== "All") query += `&category=${filters.category}`;
      
      const res = await api.get(query);
      let result = res.data.products;

      // Filter by Price locally
      result = result.filter(p => p.price <= filters.maxPrice);

      // Sort locally
      if (filters.sort === "price_asc") result.sort((a, b) => a.price - b.price);
      if (filters.sort === "price_desc") result.sort((a, b) => b.price - a.price);
      if (filters.sort === "oldest") result.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      // newest is default from backend

      setProducts(result);
    } catch (err) {
      console.error("Fetch Error:", err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const applyFilters = () => {
    setAppliedFilters({ ...draft });
    setIsSidebarOpen(false);
  };

  const resetFilters = () => {
    const initial = { search: "", category: "All", sort: "newest", maxPrice: 5000 };
    setDraft(initial);
    setAppliedFilters(initial);
  };

  const removeFilter = (key, defaultValue) => {
    const updated = { ...filters, [key]: defaultValue };
    setAppliedFilters(updated);
    setDraft(updated);
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

  return (
    <div className="home-container main-content-area">
      <div className="container main-content-area">
        {/* UNIFIED SEARCH & FILTER BAR */}
        <header className="home-top-bar">
          <div className="search-container store-search">
            <Search className="search-icon" size={20} />
            <input 
              type="text" 
              placeholder="Search" 
              className="search-input"
              value={filters.search}
              onChange={(e) => {
                const val = e.target.value;
                setAppliedFilters(prev => ({ ...prev, search: val }));
                setDraft(prev => ({ ...prev, search: val }));
              }}
            />
          </div>
          <button className="open-filters-trigger" onClick={() => setIsSidebarOpen(true)}>
            <span>Filter</span>
            <Filter size={18} />
          </button>
        </header>

        {/* ACTIVE FILTER CHIPS */}
        <div className="active-filters-chips">
          {filters.category !== "All" && (
            <div className="filter-chip">
              {filters.category}
              <button className="remove-chip-btn" onClick={() => removeFilter("category", "All")}><X size={14} /></button>
            </div>
          )}
          {filters.maxPrice < 5000 && (
            <div className="filter-chip">
              Under ${filters.maxPrice}
              <button className="remove-chip-btn" onClick={() => removeFilter("maxPrice", 5000)}><X size={14} /></button>
            </div>
          )}
          {filters.sort !== "newest" && (
            <div className="filter-chip">
              {SORT_OPTIONS.find(s => s.value === filters.sort)?.label}
              <button className="remove-chip-btn" onClick={() => removeFilter("sort", "newest")}><X size={14} /></button>
            </div>
          )}
          {(filters.category !== "All" || filters.maxPrice < 5000 || filters.sort !== "newest") && (
            <span className="clear-all-link" onClick={resetFilters}>Clear All</span>
          )}
        </div>

        {/* PRODUCTS SECTION */}
        <section className="products-listing">
        
          {loading ? (
            <div className="loading-state-premium">
              <div className="spinner-gold"></div>
              <p>Curating Collection...</p>
            </div>
          ) : (
            <div className="product-grid">
              {products.map((product) => (
                <Link key={product._id} to={`/product/${product._id}`} className="card product-card">
                  <div className={`product-image-container ${product.treatedImages && product.treatedImages[0] ? 'is-treated' : ''}`}>
                    <img src={product.images[0]} alt={product.title} className="product-image" />
                    <div className="product-card-overlay">
                      <div className="time-badge-modern">{timeAgo(product.createdAt)}</div>
                      <div className="price-tag-floating">${product.price.toLocaleString()}</div>
                    </div>
                  </div>
                  
                  <div className="product-info-modern">
                    <div className="product-meta-top">
                      <span className="product-category-pill">{product.category}</span>
                    </div>
                    
                    <h3 className="product-title-modern">{product.title}</h3>
                    
                    <div className="product-card-footer">
                      <div className="seller-profile-mini">
                        {product.user?.profilePicture ? (
                          <img src={product.user.profilePicture} alt="Seller" className="seller-avatar-img" />
                        ) : (
                          <div className="seller-avatar-initial">{product.user?.name?.charAt(0)}</div>
                        )}
                        <div className="seller-details-mini">
                          <span className="seller-name-modern">{product.user?.name || "Premium Seller"}</span>
                          <span className="seller-status-dot"></span>
                        </div>
                      </div>
                      <div className="card-action-icon">
                        <ArrowRight size={20} />
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
          
          {!loading && products.length === 0 && (
            <div className="empty-state-premium">
              <span className="empty-icon"><SearchX size={48} /></span>
              <h3>No match found</h3>
              <p>Try adjusting your filters to find what you're looking for.</p>
              <button className="btn-secondary" onClick={resetFilters}>Clear All Filters</button>
            </div>
          )}
        </section>
      </div>

      {/* LUXURY FILTER DRAWER */}
      <div className={`filter-drawer-overlay ${isSidebarOpen ? 'open' : ''}`} onClick={() => setIsSidebarOpen(false)}>
        <aside className="filter-sidebar-drawer" onClick={(e) => e.stopPropagation()}>
          <div className="drawer-header">
            <h2>ADVANCED FILTERS</h2>
            <button className="close-drawer-btn" onClick={() => setIsSidebarOpen(false)}><X size={24} /></button>
          </div>

          <div className="drawer-content">
            {/* SORT BY SECTION */}
            <div className="filter-section">
              <label className="sidebar-label">SORT BY</label>
              <div className="filter-grid-2x2">
                {SORT_OPTIONS.map(opt => (
                  <button 
                    key={opt.value}
                    className={`toggle-btn ${draft.sort === opt.value ? 'active' : ''}`}
                    onClick={() => setDraft(prev => ({ ...prev, sort: opt.value }))}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* CONDITION / CATEGORY SECTION */}
            <div className="filter-section">
              <label className="sidebar-label">CATEGORY</label>
              <div className="filter-row-3col">
                {CATEGORIES.slice(0, 6).map(cat => (
                  <button 
                    key={cat}
                    className={`toggle-btn ${draft.category === cat ? 'active' : ''}`}
                    onClick={() => setDraft(prev => ({ ...prev, category: draft.category === cat ? "All" : cat }))}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* PRICE RANGE SECTION */}
            <div className="filter-section">
              <div className="price-range-label">
                <label className="sidebar-label" style={{ marginBottom: 0 }}>PRICE RANGE</label>
                <span style={{ color: '#FFC107', fontWeight: 700, fontSize: '0.85rem' }}>$0 - ${draft.maxPrice}</span>
              </div>
              <div className="range-slider-container">
                <input 
                  type="range"
                  min="10"
                  max="5000"
                  step="50"
                  className="luxury-slider"
                  value={draft.maxPrice}
                  onChange={(e) => setDraft(prev => ({ ...prev, maxPrice: parseInt(e.target.value) }))}
                />
              </div>
            </div>
          </div>

          <div className="drawer-footer">
            <button className="btn-secondary reset-btn" onClick={resetFilters}>RESET</button>
            <button className="btn-primary apply-btn" onClick={applyFilters}>APPLY FILTERS</button>
          </div>
        </aside>
      </div>
    </div>
  );
}
