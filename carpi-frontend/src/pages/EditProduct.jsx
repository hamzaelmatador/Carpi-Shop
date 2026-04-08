import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../api/axios";
import { useNotify } from "../components/NotificationProvider";
import ConfirmModal from "../components/ConfirmModal";
import { Sparkles, X } from "lucide-react";

export default function EditProduct() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { notify } = useNotify();

  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  
  const [existingImages, setExistingImages] = useState([]);
  const [existingTreatedFlags, setExistingTreatedFlags] = useState([]);

  const [newImages, setNewImages] = useState([]);
  const [newPreviews, setNewPreviews] = useState([]);
  const [newImageOptions, setNewImageOptions] = useState({});

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [userBalance, setUserBalance] = useState(0);
  const [processingAI, setProcessingAI] = useState({}); // { type-index: true/false }

  // Modal state for AI confirmation
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [pendingAI, setPendingAI] = useState(null); // { index, isExisting }

  const categories = ["Electronics", "Fashion", "Home", "Luxury"];

  useEffect(() => {
    const fetchProductAndBalance = async () => {
      try {
        const [prodRes, userRes] = await Promise.all([
          api.get(`/products/${id}`),
          api.get("/auth/profile")
        ]);
        
        setTitle(prodRes.data.title);
        setPrice(prodRes.data.price);
        setDescription(prodRes.data.description);
        setCategory(prodRes.data.category);
        setExistingImages(prodRes.data.images || []);
        setExistingTreatedFlags(prodRes.data.treatedImages || []);
        
        setUserBalance(userRes.data.creditBalance || 0);
      } catch (err) {
        notify("Failed to load data", "error");
        navigate("/manage");
      } finally {
        setLoading(false);
      }
    };
    fetchProductAndBalance();
  }, [id, navigate, notify]);

  const triggerAIConfirmation = (index, isExisting) => {
    if (userBalance < 1) {
      notify("You need at least 1 credit to remove background.", "error");
      return;
    }
    setPendingAI({ index, isExisting });
    setIsConfirmModalOpen(true);
  };

  const handleRemoveBackground = async () => {
    const { index, isExisting } = pendingAI;
    setIsConfirmModalOpen(false);
    
    const key = isExisting ? `existing-${index}` : `new-${index}`;
    setProcessingAI(prev => ({ ...prev, [key]: true }));
    
    const formData = new FormData();
    if (isExisting) {
      // For existing images, we need to fetch the image as a blob first
      try {
        const imageRes = await fetch(existingImages[index]);
        const blob = await imageRes.blob();
        formData.append("image", blob, "image.png");
      } catch (err) {
        notify("Could not process existing image", "error");
        setProcessingAI(prev => ({ ...prev, [key]: false }));
        return;
      }
    } else {
      formData.append("image", newImages[index]);
    }

    try {
      const res = await api.post("/tools/remove-background", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (res.data.success) {
        const newUrl = res.data.url;
        
        if (isExisting) {
          setExistingImages(prev => {
            const next = [...prev];
            next[index] = newUrl;
            return next;
          });
          setExistingTreatedFlags(prev => {
            const next = [...prev];
            next[index] = true;
            return next;
          });
        } else {
          setNewPreviews(prev => {
            const next = [...prev];
            next[index] = newUrl;
            return next;
          });
          
          const imageRes = await fetch(newUrl);
          const blob = await imageRes.blob();
          const file = new File([blob], `ai_${newImages[index].name || 'image.png'}`, { type: "image/png" });
          
          setNewImages(prev => {
            const next = [...prev];
            next[index] = file;
            return next;
          });
        }

        setUserBalance(res.data.remainingCredits);
        // Dispatch event to update navbar
        window.dispatchEvent(new CustomEvent('creditUpdated', { detail: res.data.remainingCredits }));
        notify("Background removed! 1 Credit deducted. ✨");
      }
    } catch (err) {
      notify(err.response?.data?.message || "Failed to remove background", "error");
    } finally {
      setProcessingAI(prev => ({ ...prev, [key]: false }));
      setPendingAI(null);
    }
  };

  const handleNewImageChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    if (existingImages.length + newImages.length + selectedFiles.length > 5) {
      notify("Maximum 5 images allowed total", "error");
      return;
    }
    setNewImages((prev) => [...prev, ...selectedFiles]);
    const previews = selectedFiles.map((file) => URL.createObjectURL(file));
    setNewPreviews((prev) => [...prev, ...previews]);
  };

  const removeExistingImage = (index) => {
    setExistingImages((prev) => prev.filter((_, i) => i !== index));
    setExistingTreatedFlags((prev) => prev.filter((_, i) => i !== index));
  };

  const removeNewImage = (index) => {
    URL.revokeObjectURL(newPreviews[index]);
    setNewImages((prev) => prev.filter((_, i) => i !== index));
    setNewPreviews((prev) => prev.filter((_, i) => i !== index));
    setNewImageOptions(prev => {
      const next = { ...prev };
      delete next[index];
      const reindexed = {};
      Object.keys(next).forEach(key => {
        const k = parseInt(key);
        if (k > index) reindexed[k - 1] = next[k];
        else reindexed[k] = next[k];
      });
      return reindexed;
    });
  };

  const toggleNewImageAI = (index) => {
    setNewImageOptions(prev => ({
      ...prev,
      [index]: { ...prev[index], removed: !prev[index]?.removed }
    }));
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

    if (existingImages.length + newImages.length === 0) {
      notify("Please keep at least one image", "error");
      return;
    }

    setSubmitting(true);
    
    // Crucial: Use FormData for everything during update
    const formData = new FormData();
    formData.append("title", title);
    formData.append("price", price);
    formData.append("description", description);
    formData.append("category", category);
    
    // Existing images logic
    formData.append("existingImages", JSON.stringify(existingImages));
    formData.append("existingTreatedFlags", JSON.stringify(existingTreatedFlags));

    // New images logic
    const newTreatedFlags = newImages.map((_, i) => !!newImageOptions[i]?.removed);
    formData.append("treatedImages", JSON.stringify(newTreatedFlags));
    newImages.forEach((img) => formData.append("images", img));

    try {
      // Direct call to update endpoint
      const res = await api.put(`/products/${id}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (res.data) {
        notify("Product updated successfully! ✨");
        // Use a small timeout to ensure state is clear before redirect
        setTimeout(() => {
          navigate(`/product/${id}`);
        }, 500);
      }
    } catch (err) {
      console.error("Update Error:", err);
      notify(err.response?.data?.message || "Update failed", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container auth-container">
      <div className="card auth-card create-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <h2 className="auth-title" style={{ marginBottom: 0 }}>Edit Product</h2>
            <p className="auth-subtitle">Keep your listing updated and fresh</p>
          </div>
          <div className="credit-badge" style={{ background: 'var(--primary-gold)', color: 'black', padding: '0.5rem 1rem', borderRadius: '8px', fontWeight: 'bold', fontSize: '0.9rem' }}>
            💰 {userBalance} Credits
          </div>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Title</label>
            <input type="text" className="form-input" value={title} onChange={(e) => setTitle(e.target.value)} required disabled={submitting} />
          </div>

          <div className="form-group">
            <label className="form-label">Category</label>
            <select className="form-input" value={category} onChange={(e) => setCategory(e.target.value)} required disabled={submitting}>
              <option value="" disabled>Select Category</option>
              {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Price ($)</label>
            <input type="number" className="form-input" value={price} onChange={(e) => setPrice(e.target.value)} required min="0" step="0.01" disabled={submitting} />
          </div>

          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea className="form-input" rows="4" value={description} onChange={(e) => setDescription(e.target.value)} required disabled={submitting} />
          </div>

          <div className="form-group">
            <label className="form-label">Manage Images ({existingImages.length + newImages.length}/5)</label>
            
            <div className="image-preview-grid">
              {existingImages.map((url, index) => (
                <div key={`existing-${index}`} className={`preview-item ${existingTreatedFlags[index] ? 'is-enhanced' : ''}`}>
                  <div className="preview-img-container" style={{ backgroundColor: existingTreatedFlags[index] ? '#ffffff' : 'transparent' }}>
                    <img src={url} alt="Existing" className={`preview-img ${existingTreatedFlags[index] ? 'ai-cutout' : ''}`} />
                    {processingAI[`existing-${index}`] && (
                      <div className="ai-loading-overlay">
                        <div className="spinner-small"></div>
                        <span>Processing...</span>
                      </div>
                    )}
                  </div>
                  {!submitting && !processingAI[`existing-${index}`] && (
                    <div className="preview-actions">
                      {!existingTreatedFlags[index] && (
                        <button 
                          type="button" 
                          onClick={() => triggerAIConfirmation(index, true)} 
                          className="ai-magic-btn" 
                          title="Remove Background (Costs 1 Credit)"
                          disabled={userBalance < 1}
                        >
                          <Sparkles size={14} />
                        </button>
                      )}
                      <button type="button" onClick={() => removeExistingImage(index)} className="remove-img-btn-small"><X size={14} /></button>
                    </div>
                  )}
                  {existingTreatedFlags[index] && <div className="ai-badge">ENHANCED</div>}
                </div>
              ))}

              {newPreviews.map((url, index) => (
                <div key={`new-${index}`} className="preview-item">
                  <div className="preview-img-container">
                    <img src={url} alt="New" className="preview-img" />
                    {processingAI[`new-${index}`] && (
                      <div className="ai-loading-overlay">
                        <div className="spinner-small"></div>
                        <span>Processing...</span>
                      </div>
                    )}
                  </div>
                  {!submitting && !processingAI[`new-${index}`] && (
                    <div className="preview-actions">
                      <button 
                        type="button" 
                        onClick={() => triggerAIConfirmation(index, false)} 
                        className="ai-magic-btn" 
                        title="Remove Background (Costs 1 Credit)"
                        disabled={userBalance < 1}
                      >
                        <Sparkles size={14} />
                      </button>
                      <button type="button" onClick={() => removeNewImage(index)} className="remove-img-btn-small"><X size={14} /></button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {existingImages.length + newImages.length < 5 && !submitting && (
              <div className="file-upload-wrapper" style={{ marginTop: '16px' }}>
                <input type="file" multiple accept="image/*" onChange={handleNewImageChange} className="file-input" id="edit-upload" />
                <label htmlFor="edit-upload" className="file-upload-label">
                  <span>Add More Images</span>
                </label>
              </div>
            )}
          </div>

          <div className="modal-actions" style={{ marginTop: '20px' }}>
            <button type="button" onClick={() => navigate(-1)} className="btn-secondary modal-btn" disabled={submitting}>Cancel</button>
            <button type="submit" className="btn-primary modal-btn" disabled={submitting}>
              {submitting ? "Updating Listing..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>

      <ConfirmModal 
        isOpen={isConfirmModalOpen}
        title="AI Background Removal"
        message="Transform this photo with a professional white background? This costs 1 Credit."
        onConfirm={handleRemoveBackground}
        onCancel={() => {
          setIsConfirmModalOpen(false);
          setPendingAI(null);
        }}
        icon={<Sparkles size={48} color="var(--primary-gold)" />}
      />
    </div>
  );
}
