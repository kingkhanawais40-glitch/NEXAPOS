import { useNavigate } from "react-router-dom";
import { useState } from "react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

function Login() {
  const navigate = useNavigate();

  const { setUser } = useAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    if (!username.trim() || !password) {
      setError("Please enter both username and password.");
      return;
    }

    setLoading(true);

    try {
      const response = await api.post("/users/login", {
        username,
        password,
      });

      const userData = response.data.data;

      localStorage.setItem("token", userData.token);
      localStorage.setItem("user", JSON.stringify({
        id: userData.id,
        username: userData.username,
        role: userData.role,
      }));

      setUser({
        id: userData.id,
        username: userData.username,
        role: userData.role,
      });

      navigate("/dashboard");
    } catch (err) {
      setError(
        err.response?.data?.message || "Invalid username or password."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-brand-panel">
        <div className="login-brand-inner">
          <div className="login-logo-mark">NEXA</div>
          <h1> NexaPOS</h1>
          <p>Business management, simplified.</p>
          <ul className="login-feature-list">
            <li>Point of Sale &amp; Barcode Billing</li>
            <li>Inventory &amp; Supplier Ledgers</li>
            <li>Reports &amp; Daily Cash Closing</li>
          </ul>
        </div>
      </div>

      <div className="login-form-panel">
        <div className="login-card">
          <h2>Welcome back</h2>
          <p className="login-subtitle">Sign in to continue to your dashboard</p>

          {error && <div className="login-error">{error}</div>}

          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label>Username</label>
              <input
                type="text"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoFocus
              />
            </div>

            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button type="submit" className="login-submit-btn" disabled={loading}>
              {loading ? "Signing in..." : "Login"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Login;