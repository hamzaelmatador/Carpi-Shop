
import { useState, useEffect } from "react";
import Login from "./components/Login.jsx";
import Dashboard from "./components/Dashboard.jsx";
import axiosInstance from "./api/axiosInstance";

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = async () => {
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const response = await axiosInstance.get("/auth/profile");
        const currentUser = response.data;
        if (currentUser.role === "admin") {
          setUser(currentUser);
          setIsAuthenticated(true);
        } else {
          localStorage.removeItem("token");
          alert("Access denied. Admins only.");
        }
      } catch (err) {
        console.error("Auth check failed", err);
        localStorage.removeItem("token");
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const handleLoginSuccess = () => {
    checkAuth();
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    setIsAuthenticated(false);
    setUser(null);
  };

  if (loading) {
    return <div style={{ textAlign: "center", marginTop: "50px" }}>Loading...</div>;
  }

  return (
    <>
      <div className="app-container">
        {isAuthenticated && user ? (
          <Dashboard user={user} onLogout={handleLogout} />
        ) : (
          <div style={{ textAlign: "center", marginTop: "50px" }}>
            <h1>Carpi Admin Dashboard</h1>
            <Login onLoginSuccess={handleLoginSuccess} />
          </div>
        )}
      </div>
    </>
  );
}

export default App;
