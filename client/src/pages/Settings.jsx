import { useEffect, useState } from "react";
import {
  Settings as SettingsIcon,
  Store,
  Phone,
  MapPin,
  Receipt,
  Percent,
  Save,
  ShieldCheck,
  AlertTriangle,
  LockKeyhole,
  Database,
  Trash2,
  CheckCircle2,
} from "lucide-react";

import api from "../services/api";
import { useNotification } from "../context/NotificationContext";
import { useAuth } from "../context/AuthContext";

function Settings() {
  const { showSuccess, showError } = useNotification();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [resetting, setResetting] = useState(false);
  const [resetPassword, setResetPassword] = useState("");
  const [resetConfirmation, setResetConfirmation] = useState("");

  const [form, setForm] = useState({
    store_name: "",
    store_phone: "",
    store_address: "",
    invoice_footer: "",
    currency: "PKR",
    default_tax: 0,
  });

  const isAdmin = user?.role === "admin";

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await api.get("/settings");

        setForm({
          store_name: response.data.data?.store_name || "",
          store_phone: response.data.data?.store_phone || "",
          store_address:
            response.data.data?.store_address || "",
          invoice_footer:
            response.data.data?.invoice_footer || "",
          currency:
            response.data.data?.currency || "PKR",
          default_tax:
            response.data.data?.default_tax || 0,
        });
      } catch (error) {
        showError(
          error.response?.data?.message ||
            "Failed to load settings"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.store_name.trim()) {
      showError("Store name is required");
      return;
    }

    const tax = Number(form.default_tax || 0);

    if (Number.isNaN(tax) || tax < 0 || tax > 100) {
      showError("Default tax must be between 0 and 100");
      return;
    }

    try {
      setSaving(true);

      const response = await api.put("/settings", {
        ...form,
        default_tax: tax,
      });

      setForm({
        store_name:
          response.data.data?.store_name || "",
        store_phone:
          response.data.data?.store_phone || "",
        store_address:
          response.data.data?.store_address || "",
        invoice_footer:
          response.data.data?.invoice_footer || "",
        currency:
          response.data.data?.currency || "PKR",
        default_tax:
          response.data.data?.default_tax || 0,
      });

      showSuccess(
        response.data.message ||
          "Settings updated successfully"
      );
    } catch (error) {
      showError(
        error.response?.data?.message ||
          "Failed to update settings"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleBusinessReset = async () => {
    if (resetConfirmation !== "RESET BUSINESS DATA") {
      showError(
        'Please type exactly: "RESET BUSINESS DATA"'
      );
      return;
    }

    if (!resetPassword.trim()) {
      showError("Admin password is required");
      return;
    }

    const confirmed = window.confirm(
      "WARNING!\n\nThis will permanently delete all business data including products, categories, customers, suppliers, invoices, purchases, returns, expenses, employees and ledgers.\n\nUsers and store settings will NOT be deleted.\n\nAre you absolutely sure?"
    );

    if (!confirmed) {
      return;
    }

    try {
      setResetting(true);

      const response = await api.post(
        "/system/reset-business-data",
        {
          confirmation: resetConfirmation,
          password: resetPassword,
        }
      );

      showSuccess(
        response.data.message ||
          "Business data reset successfully"
      );

      setResetPassword("");
      setResetConfirmation("");
    } catch (error) {
      showError(
        error.response?.data?.message ||
          "Business data reset failed"
      );
    } finally {
      setResetting(false);
    }
  };

  if (loading) {
    return (
      <div className="settings-page">
        <div className="settings-loading-card">
          <div className="settings-loading-icon">
            <SettingsIcon size={26} />
          </div>

          <div>
            <h3>Loading Settings</h3>
            <p>Please wait while your store settings are loaded.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="settings-page">
      {/* =========================================
          PAGE HEADER
      ========================================== */}
      <div className="settings-page-header">
        <div className="settings-header-content">
          <div>
            <div className="settings-eyebrow">
              <SettingsIcon size={14} />
              SYSTEM CONFIGURATION
            </div>

            <h1>Settings</h1>

            <p>
              Manage your store information, invoice
              preferences and business configuration.
            </p>
          </div>

          <div className="settings-header-badge">
            <ShieldCheck size={18} />
            <span>Admin Configuration</span>
          </div>
        </div>
      </div>

      {/* =========================================
          STORE SETTINGS
      ========================================== */}
      <div className="settings-workspace">
        <div className="settings-workspace-header">
          <div className="settings-section-title">
            <div className="settings-section-icon blue">
              <Store size={20} />
            </div>

            <div>
              <h2>Store Information</h2>
              <p>
                Configure the information displayed across
                your POS and invoices.
              </p>
            </div>
          </div>

          <div className="settings-status-badge">
            <CheckCircle2 size={15} />
            Configuration
          </div>
        </div>

        <form
          className="settings-form"
          onSubmit={handleSubmit}
        >
          {/* STORE IDENTITY */}
          <div className="settings-form-section">
            <div className="settings-form-section-title">
              <Store size={17} />
              Store Identity
            </div>

            <div className="settings-form-grid">
              <div className="settings-form-group">
                <label>
                  Store Name
                  <span>*</span>
                </label>

                <div className="settings-input-wrapper">
                  <Store size={17} />

                  <input
                    type="text"
                    name="store_name"
                    value={form.store_name}
                    onChange={handleChange}
                    placeholder="General Store"
                  />
                </div>
              </div>

              <div className="settings-form-group">
                <label>Store Phone</label>

                <div className="settings-input-wrapper">
                  <Phone size={17} />

                  <input
                    type="text"
                    name="store_phone"
                    value={form.store_phone}
                    onChange={handleChange}
                    placeholder="03XXXXXXXXX"
                  />
                </div>
              </div>

              <div className="settings-form-group full-width">
                <label>Store Address</label>

                <div className="settings-input-wrapper">
                  <MapPin size={17} />

                  <input
                    type="text"
                    name="store_address"
                    value={form.store_address}
                    onChange={handleChange}
                    placeholder="Enter store address"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* INVOICE SETTINGS */}
          <div className="settings-form-section">
            <div className="settings-form-section-title">
              <Receipt size={17} />
              Invoice & Financial Settings
            </div>

            <div className="settings-form-grid">
              <div className="settings-form-group">
                <label>Currency</label>

                <div className="settings-input-wrapper">
                  <span className="settings-currency-symbol">
                    ₨
                  </span>

                  <select
                    name="currency"
                    value={form.currency}
                    onChange={handleChange}
                  >
                    <option value="PKR">PKR</option>
                  </select>
                </div>
              </div>

              <div className="settings-form-group">
                <label>Default Tax (%)</label>

                <div className="settings-input-wrapper">
                  <Percent size={17} />

                  <input
                    type="number"
                    name="default_tax"
                    min="0"
                    max="100"
                    step="0.01"
                    value={form.default_tax}
                    onChange={handleChange}
                    placeholder="0"
                  />
                </div>

                <small>
                  Applied as the default tax percentage.
                </small>
              </div>

              <div className="settings-form-group full-width">
                <label>Invoice Footer</label>

                <div className="settings-input-wrapper">
                  <Receipt size={17} />

                  <input
                    type="text"
                    name="invoice_footer"
                    value={form.invoice_footer}
                    onChange={handleChange}
                    placeholder="Thank you for shopping with us!"
                  />
                </div>

                <small>
                  This message appears at the bottom of
                  printed invoices.
                </small>
              </div>
            </div>
          </div>

          {/* SAVE */}
          <div className="settings-form-footer">
            <div className="settings-form-note">
              <ShieldCheck size={16} />

              <span>
                Your configuration is securely saved to the
                business settings.
              </span>
            </div>

            <button
              type="submit"
              className="settings-save-btn"
              disabled={saving}
            >
              {saving ? (
                <>
                  <span className="settings-spinner"></span>
                  Saving...
                </>
              ) : (
                <>
                  <Save size={17} />
                  Save Settings
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* =========================================
          DANGER ZONE
          ADMIN ONLY
      ========================================== */}
      {isAdmin && (
        <div className="settings-danger-zone">
          <div className="settings-danger-header">
            <div className="settings-section-title">
              <div className="settings-section-icon red">
                <AlertTriangle size={20} />
              </div>

              <div>
                <div className="settings-danger-eyebrow">
                  ADMIN ONLY
                </div>

                <h2>Danger Zone</h2>

                <p>
                  Permanently reset all business data and
                  start with a fresh store database.
                </p>
              </div>
            </div>

            <div className="settings-danger-badge">
              <LockKeyhole size={15} />
              Restricted
            </div>
          </div>

          {/* WARNING */}
          <div className="settings-danger-warning">
            <div className="settings-danger-warning-icon">
              <AlertTriangle size={20} />
            </div>

            <div>
              <strong>Permanent Data Deletion</strong>

              <p>
                This operation cannot be undone. The
                following business data will be permanently
                deleted:
              </p>

              <div className="settings-delete-grid">
                <span>Categories</span>
                <span>Products</span>
                <span>Customers</span>
                <span>Suppliers</span>
                <span>Invoices</span>
                <span>Purchases</span>
                <span>Returns</span>
                <span>Customer & Supplier Ledgers</span>
                <span>Stock Movements</span>
                <span>Expenses</span>
                <span>Employees & Salary Payments</span>
                <span>Daily Closings</span>
              </div>

              <div className="settings-preserved-note">
                <ShieldCheck size={16} />

                <span>
                  User accounts and store settings will be
                  preserved.
                </span>
              </div>
            </div>
          </div>

          {/* RESET FORM */}
          <div className="settings-reset-section">
            <div className="settings-reset-heading">
              <Database size={17} />
              Reset Authorization
            </div>

            <div className="settings-reset-grid">
              <div className="settings-form-group">
                <label>Admin Password</label>

                <div className="settings-input-wrapper danger-input">
                  <LockKeyhole size={17} />

                  <input
                    type="password"
                    value={resetPassword}
                    onChange={(e) =>
                      setResetPassword(e.target.value)
                    }
                    placeholder="Enter your admin password"
                    autoComplete="current-password"
                  />
                </div>
              </div>

              <div className="settings-form-group">
                <label>
                  Confirmation
                  <span>*</span>
                </label>

                <div className="settings-input-wrapper danger-input">
                  <Trash2 size={17} />

                  <input
                    type="text"
                    value={resetConfirmation}
                    onChange={(e) =>
                      setResetConfirmation(e.target.value)
                    }
                    placeholder="RESET BUSINESS DATA"
                  />
                </div>

                <small>
                  Type exactly: RESET BUSINESS DATA
                </small>
              </div>
            </div>

            <div className="settings-reset-footer">
              <div className="settings-reset-note">
                <AlertTriangle size={16} />

                <span>
                  Only perform this action when you are
                  certain all business records should be
                  removed.
                </span>
              </div>

              <button
                type="button"
                onClick={handleBusinessReset}
                disabled={resetting}
                className="settings-reset-btn"
              >
                {resetting ? (
                  <>
                    <span className="settings-spinner"></span>
                    Resetting...
                  </>
                ) : (
                  <>
                    <Trash2 size={17} />
                    Reset Business Data
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Settings;