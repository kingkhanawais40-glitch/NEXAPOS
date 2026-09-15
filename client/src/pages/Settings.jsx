import { useEffect, useState } from "react";
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
        <p>Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="settings-page">
      <div className="page-header">
        <div>
          <h1>Settings</h1>
          <p>
            Manage your store information and invoice settings.
          </p>
        </div>
      </div>

      {/* ================================
          STORE INFORMATION
      ================================= */}
      <div className="suppliers-card">
        <h2>Store Information</h2>

        <form onSubmit={handleSubmit}>
          <div className="form-grid">

            <div className="form-group">
              <label>Store Name</label>

              <input
                type="text"
                name="store_name"
                value={form.store_name}
                onChange={handleChange}
                placeholder="General Store"
              />
            </div>

            <div className="form-group">
              <label>Store Phone</label>

              <input
                type="text"
                name="store_phone"
                value={form.store_phone}
                onChange={handleChange}
                placeholder="03XXXXXXXXX"
              />
            </div>

            <div className="form-group">
              <label>Store Address</label>

              <input
                type="text"
                name="store_address"
                value={form.store_address}
                onChange={handleChange}
                placeholder="Enter store address"
              />
            </div>

            <div className="form-group">
              <label>Currency</label>

              <select
                name="currency"
                value={form.currency}
                onChange={handleChange}
              >
                <option value="PKR">PKR</option>
              </select>
            </div>

            <div className="form-group">
              <label>Default Tax (%)</label>

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

            <div className="form-group">
              <label>Invoice Footer</label>

              <input
                type="text"
                name="invoice_footer"
                value={form.invoice_footer}
                onChange={handleChange}
                placeholder="Thank you for shopping with us!"
              />
            </div>

          </div>

          <div className="form-actions">
            <button
              type="submit"
              className="primary-btn"
              disabled={saving}
            >
              {saving
                ? "Saving..."
                : "Save Settings"}
            </button>
          </div>
        </form>
      </div>

      {/* ================================
          BUSINESS DATA RESET
          ADMIN ONLY
      ================================= */}
      {isAdmin && (
        <div
          className="suppliers-card"
          style={{
            marginTop: "30px",
            border: "1px solid #dc2626",
          }}
        >
          <div style={{ marginBottom: "20px" }}>
            <h2 style={{ color: "#dc2626" }}>
              Danger Zone
            </h2>

            <p style={{ marginTop: "8px" }}>
              Reset all business data and start with a
              fresh store database.
            </p>
          </div>

          <div
            style={{
              padding: "16px",
              marginBottom: "20px",
              borderRadius: "8px",
              background: "#fef2f2",
              border: "1px solid #fecaca",
            }}
          >
            <strong style={{ color: "#b91c1c" }}>
              Warning
            </strong>

            <p style={{ marginTop: "8px", marginBottom: 0 }}>
              This action permanently deletes:
            </p>

            <ul style={{ marginTop: "8px" }}>
              <li>Categories</li>
              <li>Products</li>
              <li>Customers</li>
              <li>Suppliers</li>
              <li>Invoices</li>
              <li>Purchases</li>
              <li>Returns</li>
              <li>Customer & supplier ledgers</li>
              <li>Stock movements</li>
              <li>Expenses</li>
              <li>Employees & salary payments</li>
              <li>Daily closings</li>
            </ul>

            <p style={{ marginBottom: 0 }}>
              <strong>
                User accounts and store settings will be
                preserved.
              </strong>
            </p>
          </div>

          <div className="form-grid">

            <div className="form-group">
              <label>
                Admin Password
              </label>

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

            <div className="form-group">
              <label>
                Confirmation
              </label>

              <input
                type="text"
                value={resetConfirmation}
                onChange={(e) =>
                  setResetConfirmation(e.target.value)
                }
                placeholder="RESET BUSINESS DATA"
              />
            </div>

          </div>

          <div
            className="form-actions"
            style={{ marginTop: "20px" }}
          >
            <button
              type="button"
              onClick={handleBusinessReset}
              disabled={resetting}
              style={{
                background: "#dc2626",
                color: "#fff",
                border: "none",
                padding: "10px 18px",
                borderRadius: "6px",
                cursor: resetting
                  ? "not-allowed"
                  : "pointer",
                fontWeight: "600",
                opacity: resetting ? 0.7 : 1,
              }}
            >
              {resetting
                ? "Resetting..."
                : "Reset Business Data"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Settings;