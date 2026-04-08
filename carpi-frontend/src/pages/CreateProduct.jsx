import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import { useNotify } from "../components/NotificationProvider";
import ConfirmModal from "../components/ConfirmModal";
import { Sparkles, X } from "lucide-react";

export default function CreateProduct() {
  const navigate = useNavigate();
  const { notify } = useNotify();
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Electronics");
  
  const [images, setImages] = useState([]);
  const [previews, setPreviews] = useState([]);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [userBalance, setUserBalance] = useState(0);
  const [processingAI, setProcessingAI] = useState({}); // { index: true/false }

  // Modal state for AI confirmation
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [pendingAIIndex, setPendingAIIndex] = useState(null);

  const categories = ["Electronics", "Fashion", "Home", "Luxury"];

  useEffect(() => {
    const fetchBalance = async () => {
      try {
        const res = await api.get("/auth/profile");
        setUserBalance(res.data.creditBalance || 0);
      } catch (err) {
        console.error("Failed to fetch balance");
      }
    };
    fetchBalance();

    return () => {
      previews.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [previews]);

  const triggerAIConfirmation = (index) => {
    if (userBalance < 1) {
      notify("You need at least 1 credit to remove background.", "error");
      return;
    }
    setPendingAIIndex(index);
    setIsConfirmModalOpen(true);
  };

  const handleRemoveBackground = async () => {
    const index = pendingAIIndex;
    setIsConfirmModalOpen(false);
    
    setProcessingAI(prev => ({ ...prev, [index]: true }));
    
    const formData = new FormData();
    formData.append("image", images[index]);

    try {
      const res = await api.post("/tools/remove-background", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (res.data.success) {
        const newUrl = res.data.url;
        
        // Update previews
        setPreviews(prev => {
          const next = [...prev];
          next[index] = newUrl;
          return next;
        });
        
        // Convert the URL back to a File for the main form submission
        const imageRes = await fetch(newUrl);
        const blob = await imageRes.blob();
        const file = new File([blob], `ai_${images[index].name || 'image.png'}`, { type: "image/png" });
        
        setImages(prev => {
          const next = [...prev];
          next[index] = file;
          return next;
        });

        setUserBalance(res.data.remainingCredits);
        // Dispatch event to update navbar
        window.dispatchEvent(new CustomEvent('creditUpdated', { detail: res.data.remainingCredits }));
        notify("Background removed! 1 Credit deducted. ✨");
      }
    } catch (err) {
      notify(err.response?.data?.message || "Failed to remove background", "error");
    } finally {
      setProcessingAI(prev => ({ ...prev, [index]: false }));
      setPendingAIIndex(null);
    }
  };

  const handleImageChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    setError("");

    if (images.length + selectedFiles.length > 5) {
      setError("Maximum 5 images allowed.");
      return;
    }

    const overSized = selectedFiles.some(file => file.size > 10 * 1024 * 1024);
    if (overSized) {
      setError("Some images are too large (max 10MB).");
      return;
    }
    
    setImages((prev) => [...prev, ...selectedFiles]);
    const newPreviews = selectedFiles.map((file) => URL.createObjectURL(file));
    setPreviews((prev) => [...prev, ...newPreviews]);
  };

  const removeImage = (index) => {
    URL.revokeObjectURL(previews[index]);
    setImages((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Standard Validations
    if (title.trim().length < 3) {
      notify("Title must be at least 3 characters long", "error");
      return;
    }
    if (description.trim().length < 10) {
      notify("Description must be at least 10 characters long", "error");
      return;
    }
    if (Number(price) <= 0) {
      notify("Price must be greater than 0", "error");
      return;
    }

    if (images.length === 0) {
      notify("Please select at least one image.", "error");
      return;
    }

    setLoading(true);
    setError("");

    const formData = new FormData();
    formData.append("title", title);
    formData.append("price", Number(price));
    formData.append("description", description);
    formData.append("category", category);

    images.forEach((image) => {
      formData.append("images", image);
    });

    try {
      await api.post("/products", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      notify("Product created successfully! 🚀");
      navigate("/");
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.message || "Error creating product.";
      setError(msg);
      notify(msg, "error");
      setLoading(false);
    }
  };

  return (
    <div className="container auth-container">
      <div className="card auth-card create-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <h2 className="auth-title" style={{ marginBottom: 0 }}>List New Product</h2>
            <p className="auth-subtitle">Add your item to the premium marketplace</p>
          </div>
          <div className="credit-badge" style={{ background: 'var(--primary-gold)', color: 'black', padding: '0.5rem 1rem', borderRadius: '8px', fontWeight: 'bold', fontSize: '0.9rem' }}>
            💰 {userBalance} Credits
          </div>
        </div>

        {error && <div className="error-banner">{error}</div>}

        <form className="auth-form" onSubmit={handleSubmit}>
          {/* Inputs */}
          <div className="form-group">
            <label className="form-label">Product Title</label>
            <input type="text" className="form-input" value={title} onChange={(e) => setTitle(e.target.value)} required disabled={loading} />
          </div>

          <div className="form-group">
            <label className="form-label">Category</label>
            <select className="form-input" value={category} onChange={(e) => setCategory(e.target.value)} required disabled={loading}>
              {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Price ($)</label>
            <input type="number" className="form-input" value={price} onChange={(e) => setPrice(e.target.value)} required disabled={loading} min="0" step="0.01" />
          </div>

          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea className="form-input" rows="4" value={description} onChange={(e) => setDescription(e.target.value)} required disabled={loading} />
          </div>

          {/* Images Section */}
          <div className="form-group">
            <label className="form-label">Product Images ({images.length}/5)</label>
            <div className="file-upload-wrapper">
              <input type="file" multiple accept="image/*" onChange={handleImageChange} className="file-input" id="file-upload" disabled={loading || images.length >= 5} />
              <label htmlFor="file-upload" className={`file-upload-label ${images.length >= 5 ? "disabled" : ""}`}>
                <span>{images.length >= 5 ? "Limit reached" : "Select Images"}</span>
              </label>
            </div>

            <div className="image-preview-grid">
              {previews.map((url, index) => (
                <div key={index} className="preview-item">
                  <div className="preview-img-container">
                    <img src={url} alt="Preview" className="preview-img" />
                    {processingAI[index] && (
                      <div className="ai-loading-overlay">
                        <div className="spinner-small"></div>
                        <span>Processing AI...</span>
                      </div>
                    )}
                  </div>

                  {!loading && !processingAI[index] && (
                    <div className="preview-actions">
                      <button 
                        type="button" 
                        onClick={() => triggerAIConfirmation(index)} 
                        className="ai-magic-btn" 
                        title="Remove Background (Costs 1 Credit)"
                        disabled={userBalance < 1}
                      >
                        <Sparkles size={14} />
                      </button>
                      <button type="button" onClick={() => removeImage(index)} className="remove-img-btn-small"><X size={14} /></button>
                    </div>
                  )}
                </div>
              ))}
            </div>
            {userBalance < 1 && images.length > 0 && (
              <p style={{ fontSize: '0.75rem', color: '#f44336', marginTop: '0.5rem' }}>
                Insufficient credits for AI background removal.
              </p>
            )}
          </div>

          <button type="submit" className="btn-primary auth-btn" disabled={images.length === 0 || loading}>
            {loading ? "Uploading..." : `Create Product (${images.length})`}
          </button>
        </form>
      </div>

      <ConfirmModal 
        isOpen={isConfirmModalOpen}
        title="AI Background Removal"
        message="Transform this photo with a professional white background? This costs 1 Credit."
        onConfirm={handleRemoveBackground}
        onCancel={() => {
          setIsConfirmModalOpen(false);
          setPendingAIIndex(null);
        }}
        icon={<Sparkles size={48} color="var(--primary-gold)" />}
      />
    </div>
  );
}
