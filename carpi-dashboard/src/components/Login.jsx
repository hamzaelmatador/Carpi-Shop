import React, { useState } from 'react';
import axiosInstance from '../api/axiosInstance';

const Login = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setMessage('');

    try {
      const response = await axiosInstance.post('/auth/login', {
        email,
        password,
      });
      
      const { token } = response.data;
      if (token) {
        localStorage.setItem('token', token);
        setMessage('Login successful!');
        if (onLoginSuccess) {
          onLoginSuccess();
        }
      }
    } catch (error) {
      if (error.response && error.response.data && error.response.data.message) {
        setMessage(`Error: ${error.response.data.message}`);
      } else {
        setMessage('Login failed. Please verify your credentials and try again.');
      }
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '400px', margin: '0 auto' }}>
      <h2>Login</h2>
      {message && <p style={{ color: message.includes('successful') ? 'green' : 'red' }}>{message}</p>}
      <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div>
          <label htmlFor="email">Email: </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ width: '100%', padding: '8px' }}
          />
        </div>
        <div>
          <label htmlFor="password">Password: </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ width: '100%', padding: '8px' }}
          />
        </div>
        <button type="submit" style={{ padding: '10px', marginTop: '10px' }}>
          Login
        </button>
      </form>
    </div>
  );
};

export default Login;
