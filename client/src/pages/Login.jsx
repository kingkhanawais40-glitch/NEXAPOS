import { useNavigate } from "react-router-dom";
import { useState } from "react";
import {
  ArrowRight,
  BarChart3,
  Eye,
  EyeOff,
  LockKeyhole,
  Package,
  ShieldCheck,
  ShoppingCart,
  UserRound,
} from "lucide-react";

import api from "../services/api";
import { useAuth } from "../context/AuthContext";

function Login() {
  const navigate = useNavigate();
  const { setUser } = useAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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

      localStorage.setItem(
        "user",
        JSON.stringify({
          id: userData.id,
          username: userData.username,
          role: userData.role,
        })
      );

      setUser({
        id: userData.id,
        username: userData.username,
        role: userData.role,
      });

      navigate("/dashboard");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Invalid username or password."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      {/* =========================================
          BRAND PANEL
      ========================================== */}
      <section className="login-brand-panel">
        <div className="login-brand-grid"></div>

        <div className="login-brand-inner">
          <div className="login-brand-top">
            <div className="login-logo-mark">
              NX
            </div>

            <div>
              <div className="login-brand-name">
                NEXA
              </div>

              <div className="login-brand-label">
                POS SYSTEM
              </div>
            </div>
          </div>

          <div className="login-brand-content">
            <div className="login-brand-eyebrow">
              <span></span>
              BUSINESS MANAGEMENT PLATFORM
            </div>

            <h1>
              Run your business
              <strong>with clarity.</strong>
            </h1>

            <p>
              A modern point-of-sale and business management
              system designed to keep your sales, inventory,
              customers and finances connected.
            </p>
          </div>

          <div className="login-feature-list">
            <div className="login-feature-item">
              <div className="login-feature-icon">
                <ShoppingCart size={18} />
              </div>

              <div>
                <strong>Smart Point of Sale</strong>
                <span>
                  Fast billing with barcode support.
                </span>
              </div>
            </div>

            <div className="login-feature-item">
              <div className="login-feature-icon">
                <Package size={18} />
              </div>

              <div>
                <strong>Inventory Management</strong>
                <span>
                  Track products, stock and batches.
                </span>
              </div>
            </div>

            <div className="login-feature-item">
              <div className="login-feature-icon">
                <BarChart3 size={18} />
              </div>

              <div>
                <strong>Business Analytics</strong>
                <span>
                  Reports, expenses and cash closing.
                </span>
              </div>
            </div>
          </div>

          <div className="login-brand-footer">
            <ShieldCheck size={15} />
            <span>Secure business management</span>
          </div>
        </div>
      </section>

      {/* =========================================
          LOGIN PANEL
      ========================================== */}
      <section className="login-form-panel">
        <div className="login-form-container">
          <div className="login-mobile-logo">
            <div className="login-logo-mark">
              NX
            </div>

            <div>
              <div className="login-brand-name">
                NEXA
              </div>

              <div className="login-brand-label">
                POS SYSTEM
              </div>
            </div>
          </div>

          <div className="login-card">
            <div className="login-card-header">
              <div className="login-card-icon">
                <LockKeyhole size={20} />
              </div>

              <div>
                <div className="login-card-eyebrow">
                  SECURE ACCESS
                </div>

                <h2>Welcome back</h2>
              </div>
            </div>

            <p className="login-subtitle">
              Sign in to continue to your business dashboard.
            </p>

            {error && (
              <div className="login-error">
                <div className="login-error-dot"></div>
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleLogin}>
              <div className="login-form-group">
                <label>Username</label>

                <div className="login-input-wrapper">
                  <UserRound size={18} />

                  <input
                    type="text"
                    placeholder="Enter your username"
                    value={username}
                    onChange={(e) =>
                      setUsername(e.target.value)
                    }
                    autoFocus
                    autoComplete="username"
                  />
                </div>
              </div>

              <div className="login-form-group">
                <label>Password</label>

                <div className="login-input-wrapper">
                  <LockKeyhole size={18} />

                  <input
                    type={
                      showPassword
                        ? "text"
                        : "password"
                    }
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) =>
                      setPassword(e.target.value)
                    }
                    autoComplete="current-password"
                  />

                  <button
                    type="button"
                    className="login-password-toggle"
                    onClick={() =>
                      setShowPassword(
                        (current) => !current
                      )
                    }
                    aria-label={
                      showPassword
                        ? "Hide password"
                        : "Show password"
                    }
                  >
                    {showPassword ? (
                      <EyeOff size={18} />
                    ) : (
                      <Eye size={18} />
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="login-submit-btn"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="login-spinner"></span>
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign in
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </form>

            <div className="login-security-note">
              <ShieldCheck size={15} />
              <span>
                Your session is protected with secure
                authentication.
              </span>
            </div>
          </div>

          <div className="login-copyright">
            <span>© {new Date().getFullYear()} NEXA POS</span>
            <span>Business Management System</span>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Login;