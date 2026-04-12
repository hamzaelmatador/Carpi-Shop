import { useState, useEffect } from "react";
import api from "../api/axios";
import { useNotify } from "../components/NotificationProvider";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix default icon issue with Leaflet in React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
});

function LocationMarker({ position, setPosition }) {
  const map = useMapEvents({
    click(e) {
      setPosition([e.latlng.lat, e.latlng.lng]);
      map.flyTo(e.latlng, map.getZoom());
    },
  });

  return position === null ? null : <Marker position={position} />;
}

export default function Profile() {
  const { notify } = useNotify();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [transactions, setTransactions] = useState([]);

  // Profile Info
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [profilePicture, setProfilePicture] = useState("");
  
  // Location Info
  const [coords, setCoords] = useState(null); // [lat, lng]
  const [address, setAddress] = useState("");

  // Security Info
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get("/auth/profile");
        setUser(res.data);
        setName(res.data.name);
        setEmail(res.data.email);
        setProfilePicture(res.data.profilePicture || "");
        
        if (res.data.location?.coordinates) {
          setCoords([res.data.location.coordinates[1], res.data.location.coordinates[0]]);
        }
        setAddress(res.data.location?.address || "");
        
        // Fetch transactions
        const transRes = await api.get(`/credits/transactions/${res.data._id}`);
        setTransactions(transRes.data);
      } catch (err) {
        notify("Failed to load profile", "error");
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [notify]);

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      notify("Geolocation is not supported by your browser", "error");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords([position.coords.latitude, position.coords.longitude]);
        notify("Location detected! ✨");
      },
      () => {
        notify("Unable to retrieve your location", "error");
      }
    );
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        notify("Image too large (max 2MB)", "error");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => setProfilePicture(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Standard Validations
    if (name.trim().length < 3) {
      notify("Name must be at least 3 characters long", "error");
      return;
    }

    if (newPassword) {
      if (newPassword.length < 8) {
        notify("New password must be at least 8 characters long", "error");
        return;
      }
      if (newPassword !== confirmPassword) {
        notify("New passwords do not match", "error");
        return;
      }
    }

    setSubmitting(true);
    try {
      await api.put(`/users/${user._id}`, {
        name,
        email,
        profilePicture,
        location: coords ? {
          type: 'Point',
          coordinates: [coords[1], coords[0]], // [lng, lat] for GeoJSON
          address
        } : undefined,
        currentPassword: currentPassword || undefined,
        newPassword: newPassword || undefined
      });
      
      notify("Profile updated successfully! ✨");
      // Reset security fields
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      notify(err.response?.data?.message || "Update failed", "error");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="container loading-state">Accessing profile...</div>;

  return (
    <div className="container auth-container">
      <div className="card auth-card profile-card" style={{ maxWidth: '600px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 className="auth-title">Account Settings</h2>
            <p className="auth-subtitle">Update your personal and security information</p>
          </div>
          <div className="credit-badge-large" style={{ 
            background: 'var(--primary-gold)', 
            color: 'black', 
            padding: '1rem', 
            borderRadius: '12px',
            textAlign: 'center',
            minWidth: '120px'
          }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase' }}>Available Credits</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 900 }}>{user?.creditBalance || 0}</div>
          </div>
        </div>

        <form className="auth-form" onSubmit={handleSubmit} autoComplete="off">
          {/* PROFILE SECTION */}
          <div className="profile-image-section">
            <div className="profile-avatar-wrapper">
              {profilePicture ? (
                <img src={profilePicture} alt="Avatar" className="profile-avatar" />
              ) : (
                <div className="profile-avatar-placeholder">{name?.charAt(0).toUpperCase()}</div>
              )}
              <label htmlFor="avatar-upload" className="avatar-edit-btn"><span>📷</span></label>
              <input type="file" id="avatar-upload" hidden accept="image/*" onChange={handleImageChange} />
            </div>
            <p className="avatar-hint">Profile Picture</p>
          </div>

          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input type="text" className="form-input" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input type="email" className="form-input" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
          </div>

          {user.role === 'admin' && (
            <div className="form-group">
              <label className="form-label">Account Role</label>
              <input type="text" className="form-input" value="ADMINISTRATOR" disabled style={{ color: '#FFC107', fontWeight: 800, border: '1px solid #FFC107' }} />
            </div>
          )}

          <hr className="profile-divider" />

          {/* LOCATION SECTION */}
          <h3 className="sidebar-title" style={{ fontSize: '0.8rem', color: 'var(--primary-gold)' }}>Marketplace Location</h3>
          <p className="auth-subtitle" style={{ textAlign: 'left', marginBottom: '1rem' }}>Set your shop location so local buyers can find you.</p>
          
          <div className="form-group">
            <label className="form-label">Shop Address / Area</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="e.g. Downtown Market, Street 5" 
              value={address} 
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>

          <div className="location-section">
            <button type="button" className="btn-secondary get-location-btn" onClick={handleGetLocation}>
              📍 Get My Current Location
            </button>
            <div className="map-container-wrapper">
              <MapContainer 
                center={coords || [35.8256, 10.6084]} // Default to a neutral location (e.g. Sousse, Tunisia)
                zoom={coords ? 13 : 6} 
                style={{ height: '100%', width: '100%' }}
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />
                <LocationMarker position={coords} setPosition={setCoords} />
              </MapContainer>
            </div>
            <p className="avatar-hint" style={{ marginTop: '8px' }}>Click on the map to manually set your shop location.</p>
          </div>

          <hr className="profile-divider" />

          {/* SECURITY SECTION */}
          <h3 className="sidebar-title" style={{ fontSize: '0.8rem', color: 'var(--primary-gold)' }}>Security & Password</h3>
          
          <div className="form-group">
            <label className="form-label">Current Password</label>
            <input 
              type="password" 
              className="form-input" 
              placeholder="Must type manually to change password" 
              value={currentPassword} 
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="new-password" 
            />
          </div>

          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">New Password</label>
              <input 
                type="password" 
                className="form-input" 
                placeholder="New password" 
                value={newPassword} 
                onChange={(e) => setNewPassword(e.target.value)} 
                autoComplete="new-password"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Confirm New Password</label>
              <input 
                type="password" 
                className="form-input" 
                placeholder="Confirm new password" 
                value={confirmPassword} 
                onChange={(e) => setConfirmPassword(e.target.value)} 
                autoComplete="new-password"
              />
            </div>
          </div>

          <button type="submit" className="btn-primary auth-btn" disabled={submitting}>
            {submitting ? "Processing..." : "Save All Changes"}
          </button>
        </form>

        <hr className="profile-divider" style={{ margin: '2rem 0' }} />
        <h3 className="sidebar-title" style={{ fontSize: '0.8rem', color: 'var(--primary-gold)' }}>Credit Transaction History</h3>
        
        <div className="transaction-list" style={{ marginTop: '1rem', maxHeight: '300px', overflowY: 'auto' }}>
          {transactions.length === 0 ? (
            <p style={{ textAlign: 'center', opacity: 0.5, padding: '2rem' }}>No transactions yet</p>
          ) : (
            transactions.map(t => (
              <div key={t._id} style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                padding: '1rem', 
                borderBottom: '1px solid rgba(255,255,255,0.05)',
                fontSize: '0.85rem'
              }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{t.description}</div>
                  <div style={{ fontSize: '0.7rem', opacity: 0.5 }}>{new Date(t.createdAt).toLocaleDateString()} - {t.type.toUpperCase()}</div>
                </div>
                <div style={{ 
                  fontWeight: 800, 
                  color: t.amount > 0 ? '#4CAF50' : '#f44336' 
                }}>
                  {t.amount > 0 ? `+${t.amount}` : t.amount}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
