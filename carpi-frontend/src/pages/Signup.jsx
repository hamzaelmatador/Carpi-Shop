import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../api/axios";

export default function Signup() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const validate = () => {
    const newErrors = {};
    if (name.trim().length < 3) newErrors.name = "Name must be at least 3 characters";
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) newErrors.email = "Please enter a valid email address";
    
    if (password.length < 8) newErrors.password = "Password must be at least 8 characters";
    if (password !== confirmPassword) newErrors.confirmPassword = "Passwords do not match";
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    setErrors({});
    
    try {
      const response = await api.post("/auth/signup", {
        name,
        email,
        password,
      });
      localStorage.setItem("token", response.data.token);
      navigate("/");
    } catch (err) {
      if (err.response && err.response.status === 409) {
        const serverMsg = err.response.data.message?.toLowerCase() || "";
        const newErrors = {};

        if (serverMsg.includes("email")) {
          newErrors.email = "This email is already registered.";
        } else if (serverMsg.includes("name") || serverMsg.includes("user")) {
          newErrors.name = "This name is already taken.";
        } else {
          newErrors.server = err.response.data.message || "Conflict occurred. Please check your details.";
        }
        setErrors(newErrors);
      } else {
        setErrors({ server: "An error occurred during signup. Please try again." });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container auth-container">
      <div className="card auth-card">
        <h2 className="auth-title">Create Account</h2>
        <p className="auth-subtitle">Join the exclusive Carpi community</p>

        {errors.server && <div className="error-banner">{errors.server}</div>}

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input
              type="text"
              placeholder="Your name"
              className={`form-input ${errors.name ? "error" : ""}`}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            {errors.name && <span className="error-text">{errors.name}</span>}
          </div>

          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              type="email"
              placeholder="your@email.com"
              className={`form-input ${errors.email ? "error" : ""}`}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            {errors.email && <span className="error-text">{errors.email}</span>}
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              placeholder="Min. 8 characters"
              className={`form-input ${errors.password ? "error" : ""}`}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {errors.password && <span className="error-text">{errors.password}</span>}
          </div>

          <div className="form-group">
            <label className="form-label">Confirm Password</label>
            <input
              type="password"
              placeholder="Repeat your password"
              className={`form-input ${errors.confirmPassword ? "error" : ""}`}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
            {errors.confirmPassword && <span className="error-text">{errors.confirmPassword}</span>}
          </div>

          <button 
            type="submit" 
            className="btn-primary auth-btn" 
            disabled={loading}
          >
            {loading ? "Creating Account..." : "Sign Up"}
          </button>
        </form>

        <p className="auth-footer">
          Already have an account? <Link to="/login" className="auth-link">Login</Link>
        </p>
      </div>
    </div>
  );
}
