import React, { useEffect, useState } from 'react';
import axiosInstance from '../api/axiosInstance';
import '../styles/dashboard.css';
import EditUserModal from './EditUserModal';
import CreateUserModal from './CreateUserModal';

const Dashboard = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [users, setUsers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [isEditUserModalOpen, setIsEditUserModalOpen] = useState(false);
  const [isCreateUserModalOpen, setIsCreateUserModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [creditAmount, setCreditAmount] = useState(0);
  const [creditDesc, setCreditDesc] = useState('');
  const [userSearch, setUserSearch] = useState('');

  const fetchUsers = async () => {
    try {
      const res = await axiosInstance.get('/users');
      setUsers(Array.isArray(res.data) ? res.data : res.data.data || []);
    } catch (err) {
      console.error("Failed to fetch users", err);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await axiosInstance.get('/products?showSold=true');
      setProducts(res.data.products || []);
    } catch (err) {
      console.error("Failed to fetch products", err);
    }
  };

  useEffect(() => {
    const initDashboard = async () => {
      setLoading(true);
      await Promise.all([fetchUsers(), fetchProducts()]);
      setLoading(false);
    };
    initDashboard();
  }, []);

  const handleCreditAction = async (action) => {
    if (!selectedUser || creditAmount <= 0) {
      alert("Please select a user and enter a valid amount");
      return;
    }
    try {
      const endpoint = action === 'add' ? '/credits/admin/add' : '/credits/admin/deduct';
      await axiosInstance.post(endpoint, {
        userId: selectedUser._id,
        amount: Number(creditAmount),
        description: creditDesc || `Credits ${action}ed by admin`
      });
      alert(`Credits ${action}ed successfully`);
      setCreditAmount(0);
      setCreditDesc('');
      fetchUsers(); 
    } catch (err) {
      alert(err.response?.data?.message || "Error processing credits");
    }
  };

  const filteredUsers = users.filter(u => 
    (u.name && u.name.toLowerCase().includes(userSearch.toLowerCase())) || 
    (u.email && u.email.toLowerCase().includes(userSearch.toLowerCase()))
  );

  const handleDeleteUser = async (id) => {
    if (!window.confirm("Are you sure you want to delete this user?")) return;
    try {
      await axiosInstance.delete(`/users/${id}`);
      fetchUsers();
    } catch (err) {
      alert("Error deleting user");
    }
  };

  const handleDeleteProduct = async (id) => {
    if (!window.confirm("Are you sure you want to delete this product?")) return;
    try {
      await axiosInstance.delete(`/products/${id}`);
      fetchProducts();
    } catch (err) {
      alert("Error deleting product");
    }
  };

  const handleEditUser = (u) => {
    setSelectedUser(u);
    setIsEditUserModalOpen(true);
  };

  const handleSaveUser = async (id, updatedData) => {
    try {
      await axiosInstance.put(`/users/${id}`, updatedData);
      fetchUsers();
      setIsEditUserModalOpen(false);
    } catch (err) {
      alert("Error saving user");
    }
  };

  const handleCreateUser = async (formData) => {
    try {
      await axiosInstance.post('/auth/signup', formData);
      fetchUsers();
      setIsCreateUserModalOpen(false);
    } catch (err) {
      alert("Error creating user");
    }
  };

  const [expandedUsers, setExpandedUsers] = useState({});

  const toggleUserProducts = (userId) => {
    setExpandedUsers(prev => ({
      ...prev,
      [userId]: !prev[userId]
    }));
  };

  const groupedProducts = products.reduce((acc, product) => {
    const userId = product.user?._id || 'unknown';
    if (!acc[userId]) {
      acc[userId] = {
        user: product.user || { name: 'Unknown User', email: 'N/A' },
        items: []
      };
    }
    acc[userId].items.push(product);
    return acc;
  }, {});

  if (loading) {
    return <div className="loading">Loading Admin Dashboard...</div>;
  }

  return (
    <div className="dashboard-container">
      <aside className="sidebar">
        <div className="sidebar-brand">Carpi Admin</div>
        <div className="sidebar-nav">
          <div 
            className={`sidebar-item ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            Overview
            {unreadCount > 0 && <span className="notification-dot"></span>}
          </div>
          <div 
            className={`sidebar-item ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => setActiveTab('users')}
          >
            Users Management
          </div>
          <div 
            className={`sidebar-item ${activeTab === 'products' ? 'active' : ''}`}
            onClick={() => setActiveTab('products')}
          >
            Products Management
          </div>
          <div 
            className={`sidebar-item ${activeTab === 'credits' ? 'active' : ''}`}
            onClick={() => setActiveTab('credits')}
          >
            Credit Management
          </div>
        </div>
        <div className="sidebar-footer">
          <button className="btn btn-outline" onClick={onLogout} style={{ width: '100%' }}>
            Logout
          </button>
        </div>
      </aside>

      <main className="main-content">
        <header className="navbar">
          <div className="navbar-title">
            {activeTab === 'overview' && 'System Overview'}
            {activeTab === 'users' && 'Users Management'}
            {activeTab === 'products' && 'Products Management'}
            {activeTab === 'credits' && 'Credit Management'}
          </div>
          <div className="navbar-actions" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            {/* Notification Bell */}
            <div className="notification-bell-container" style={{ position: 'relative', cursor: 'pointer' }} onClick={() => setShowNotifications(!showNotifications)}>
              <span style={{ fontSize: '1.2rem' }}>🔔</span>
              {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
              
              {showNotifications && (
                <div className="notification-dropdown">
                  <div className="notification-header">
                    <span>Admin Notifications</span>
                    <button onClick={(e) => { e.stopPropagation(); markAllAsRead(); }}>Mark all read</button>
                  </div>
                  <div className="notification-list">
                    {notifications.length === 0 ? (
                      <div className="notification-empty">No system alerts</div>
                    ) : (
                      notifications.map(n => (
                        <div 
                          key={n._id} 
                          className={`notification-item ${n.isRead ? 'read' : 'unread'}`}
                          onClick={(e) => { e.stopPropagation(); handleNotificationClick(n); }}
                        >
                          <div className="notification-item-title">{n.title}</div>
                          <div className="notification-item-message">{n.message}</div>
                          <div className="notification-item-time">{new Date(n.createdAt).toLocaleDateString()}</div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="user-profile">
              <span className="user-name">{user.name}</span>
              <span className="badge badge-admin">{user.role}</span>
            </div>
          </div>
        </header>

        <div className="content-body">
          {activeTab === 'overview' && (
            <div className="overview-section">
              <div className="cards-container">
                <div className="card">
                  <div className="card-title">Total Users</div>
                  <div className="card-value">{users.length}</div>
                </div>
                <div className="card">
                  <div className="card-title">Total Products</div>
                  <div className="card-value">{products.length}</div>
                </div>
                <div className="card">
                  <div className="card-title">Sold Products</div>
                  <div className="card-value">
                    {products.filter(p => p.isSold).length}
                  </div>
                </div>
                <div className="card">
                  <div className="card-title">Active Inventory</div>
                  <div className="card-value">
                    {products.reduce((acc, p) => acc + (p.quantity || 0), 0)}
                  </div>
                </div>
              </div>
              
              <div className="overview-grid">
                <div className="table-container">
                   <div className="table-header-row">
                     <h3 className="table-title">Recent Users</h3>
                   </div>
                   <div className="data-table-wrapper">
                     <table className="data-table">
                       <thead>
                         <tr>
                           <th>Name</th>
                           <th>Role</th>
                         </tr>
                       </thead>
                       <tbody>
                         {users.slice(0, 5).map(u => (
                           <tr key={u._id}>
                             <td>{u.name}</td>
                             <td><span className={`badge ${u.role === 'admin' ? 'badge-admin' : 'badge-user'}`}>{u.role}</span></td>
                           </tr>
                         ))}
                       </tbody>
                     </table>
                   </div>
                </div>

                <div className="table-container">
                   <div className="table-header-row">
                     <h3 className="table-title">Recent Products</h3>
                   </div>
                   <div className="data-table-wrapper">
                     <table className="data-table">
                       <thead>
                         <tr>
                           <th>Title</th>
                           <th>Price</th>
                         </tr>
                       </thead>
                       <tbody>
                         {products.slice(0, 5).map(p => (
                           <tr key={p._id}>
                             <td>{p.title}</td>
                             <td>${p.price}</td>
                           </tr>
                         ))}
                       </tbody>
                     </table>
                   </div>
                </div>
              </div>

              <div className="recent-activity" style={{ marginTop: '2rem' }}>
                <h3>System Status</h3>
                <div className="status-grid">
                  <div className="status-item">
                    <strong>API Status:</strong> <span style={{ color: 'green' }}>Online</span>
                  </div>
                  <div className="status-item">
                    <strong>Admin Session:</strong> Active
                  </div>
                  <div className="status-item">
                    <strong>Database:</strong> Connected
                  </div>
                  <div className="status-item">
                    <strong>Environment:</strong> Production
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="table-container">
              <div className="table-header-row">
                <h3 className="table-title">All Users</h3>
                <button className="btn btn-primary" onClick={() => setIsCreateUserModalOpen(true)}>
                  ➕ Add New User
                </button>
              </div>
              <div className="data-table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Balance</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u._id}>
                        <td>{u.name}</td>
                        <td>{u.email}</td>
                        <td><span className={`badge ${u.role === 'admin' ? 'badge-admin' : 'badge-user'}`}>{u.role}</span></td>
                        <td style={{ fontWeight: 'bold' }}>{u.creditBalance || 0}</td>
                        <td>
                          <button className="btn btn-sm btn-edit" onClick={() => handleEditUser(u)}>Edit</button>
                          <button className="btn btn-sm btn-danger" onClick={() => handleDeleteUser(u._id)}>Delete</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'products' && (
            <div className="table-container">
              <div className="table-header-row">
                <h3 className="table-title">Products Organized by User</h3>
              </div>
              <div className="grouped-products-container">
                {Object.keys(groupedProducts).length === 0 ? (
                  <div className="empty-state">No products found.</div>
                ) : (
                  Object.keys(groupedProducts).map(userId => {
                    const group = groupedProducts[userId];
                    const isExpanded = !!expandedUsers[userId];
                    return (
                      <div key={userId} className="user-group">
                        <div 
                          className={`user-group-header ${isExpanded ? 'expanded' : ''}`}
                          onClick={() => toggleUserProducts(userId)}
                        >
                          <div className="user-info">
                            <span className="user-group-name">{group.user.name}</span>
                            <span className="user-group-email">{group.user.email}</span>
                            <span className="user-product-count">({group.items.length} Products)</span>
                          </div>
                          <span className={`toggle-arrow ${isExpanded ? 'up' : 'down'}`}>
                            {isExpanded ? '▲' : '▼'}
                          </span>
                        </div>
                        
                        {isExpanded && (
                          <div className="user-products-list">
                            <table className="data-table">
                              <thead>
                                <tr>
                                  <th>Title</th>
                                  <th>Price</th>
                                  <th>Status</th>
                                  <th>Actions</th>
                                </tr>
                              </thead>
                              <tbody>
                                {group.items.map(p => (
                                  <tr key={p._id}>
                                    <td>{p.title}</td>
                                    <td>${p.price}</td>
                                    <td>
                                      {p.isSold ? 
                                        <span className="badge badge-danger">Sold</span> : 
                                        <span className="badge badge-success">Available</span>
                                      }
                                    </td>
                                    <td>
                                      <button className="btn btn-sm btn-danger" onClick={() => handleDeleteProduct(p._id)}>Delete</button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {activeTab === 'credits' && (
            <div className="credits-section">
              <div className="credit-management-layout" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                <div className="table-container">
                  <div className="table-header-row">
                    <h3 className="table-title">Select User</h3>
                    <input 
                      type="text" 
                      placeholder="Search users..." 
                      className="search-input"
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      style={{ padding: '0.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}
                    />
                  </div>
                  <div className="data-table-wrapper" style={{ maxHeight: '500px', overflowY: 'auto' }}>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Balance</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredUsers.map(u => (
                          <tr 
                            key={u._id} 
                            onClick={() => setSelectedUser(u)}
                            className={selectedUser?._id === u._id ? 'selected-row' : ''}
                            style={{ cursor: 'pointer', backgroundColor: selectedUser?._id === u._id ? 'rgba(79, 70, 229, 0.1)' : '' }}
                          >
                            <td>
                              <div style={{ fontWeight: 600 }}>{u.name}</div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{u.email}</div>
                            </td>
                            <td style={{ fontWeight: 'bold' }}>{u.creditBalance || 0}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="card" style={{ height: 'fit-content' }}>
                  <h3 className="table-title" style={{ marginBottom: '1.5rem' }}>Update Balance</h3>
                  {selectedUser ? (
                    <div className="credit-form">
                      <div className="selected-user-badge" style={{ marginBottom: '1rem', padding: '1rem', background: '#F9FAFB', borderRadius: 'var(--radius-md)' }}>
                        <strong>User:</strong> {selectedUser.name} <br/>
                        <strong>Current Balance:</strong> {selectedUser.creditBalance || 0}
                      </div>
                      <div className="form-group">
                        <label>Amount</label>
                        <input 
                          type="number" 
                          value={creditAmount} 
                          onChange={(e) => setCreditAmount(e.target.value)}
                          placeholder="0"
                        />
                      </div>
                      <div className="form-group">
                        <label>Description (Optional)</label>
                        <input 
                          type="text" 
                          value={creditDesc} 
                          onChange={(e) => setCreditDesc(e.target.value)}
                          placeholder="Reason for update"
                        />
                      </div>
                      <div className="credit-actions" style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                        <button className="btn btn-primary" onClick={() => handleCreditAction('add')} style={{ flex: 1 }}>
                          Add Credits
                        </button>
                        <button className="btn btn-danger" onClick={() => handleCreditAction('deduct')} style={{ flex: 1 }}>
                          Deduct Credits
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                      Select a user from the list to manage credits.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      <EditUserModal 
        user={selectedUser} 
        isOpen={isEditUserModalOpen} 
        onClose={() => setIsEditUserModalOpen(false)} 
        onSave={handleSaveUser} 
      />

      <CreateUserModal
        isOpen={isCreateUserModalOpen}
        onClose={() => setIsCreateUserModalOpen(false)}
        onCreate={handleCreateUser}
      />
    </div>
  );
};

export default Dashboard;
