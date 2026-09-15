import { useEffect, useState } from "react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useSettings } from "../context/SettingsContext";
import { useNotification } from "../context/NotificationContext";

function Suppliers() {
  const { user } = useAuth();
  const { currency } = useSettings();
  const { showSuccess, showError, confirm } = useNotification();
  const isAdmin = user?.role === "admin";

  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [openingBalance, setOpeningBalance] = useState("");

  const fetchSuppliers = async () => {
    try {
      const response = await api.get("/suppliers");

      setSuppliers(response.data.data);
    } catch (error) {
      console.error(
        error.response?.data?.message ||
          "Failed to load suppliers"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const resetForm = () => {
    setName("");
    setPhone("");
    setAddress("");
    setOpeningBalance("");
    setEditingSupplier(null);
    setShowForm(false);
  };

  const handleAddSupplier = async (e) => {
    e.preventDefault();

    if (!name.trim()) {
      showError("Supplier name is required");
      return;
    }

    const balance = Number(openingBalance || 0);

    if (balance < 0) {
      showError("Opening balance cannot be negative");
      return;
    }

    try {
      const response = await api.post("/suppliers", {
        name: name.trim(),
        phone: phone.trim() || null,
        address: address.trim() || null,
        opening_balance: balance,
      });

      showSuccess(
        response.data.message ||
          "Supplier added successfully"
      );

      resetForm();

      setLoading(true);
      await fetchSuppliers();
    } catch (error) {
      showError(
        error.response?.data?.message ||
          "Failed to add supplier"
      );
    }
  };

  const handleEditClick = (supplier) => {
    setEditingSupplier(supplier);

    setName(supplier.name || "");
    setPhone(supplier.phone || "");
    setAddress(supplier.address || "");
    setOpeningBalance(supplier.opening_balance || 0);

    setShowForm(true);
  };

  const handleUpdateSupplier = async (e) => {
    e.preventDefault();

    if (!name.trim()) {
      showError("Supplier name is required");
      return;
    }

    const balance = Number(openingBalance || 0);

    if (balance < 0) {
      showError("Opening balance cannot be negative");
      return;
    }

    try {
      const response = await api.put(
        `/suppliers/${editingSupplier.id}`,
        {
          name: name.trim(),
          phone: phone.trim() || null,
          address: address.trim() || null,
          opening_balance: balance,
        }
      );

      showSuccess(
        response.data.message ||
          "Supplier updated successfully"
      );

      resetForm();

      setLoading(true);
      await fetchSuppliers();
    } catch (error) {
      showError(
        error.response?.data?.message ||
          "Failed to update supplier"
      );
    }
  };

  const handleDeleteSupplier = async (supplier) => {
    const confirmed = await confirm(
      `Are you sure you want to delete "${supplier.name}"?`
    );

    if (!confirmed) {
      return;
    }

    try {
      const response = await api.delete(
        `/suppliers/${supplier.id}`
      );

      showSuccess(
        response.data.message ||
          "Supplier deleted successfully"
      );

      setLoading(true);
      await fetchSuppliers();
    } catch (error) {
      showError(
        error.response?.data?.message ||
          "Failed to delete supplier"
      );
    }
  };

  return (
    <div className="suppliers-page">

      {/* HEADER */}
      <div className="page-header">
        <div>
          <h1>Suppliers</h1>

          <p>
            Manage suppliers and their outstanding payables.
          </p>
        </div>

        {isAdmin && (
          <button
            className="primary-btn"
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
          >
            + Add Supplier
          </button>
        )}
      </div>

      {/* ADD / EDIT SUPPLIER FORM */}
      {isAdmin && showForm && (
        <div className="suppliers-card">

          <h2>
            {editingSupplier
              ? "Edit Supplier"
              : "Add Supplier"}
          </h2>

          <form
            onSubmit={
              editingSupplier
                ? handleUpdateSupplier
                : handleAddSupplier
            }
          >

            <div className="form-grid">

              <div className="form-group">
                <label>Supplier Name</label>

                <input
                  type="text"
                  value={name}
                  onChange={(e) =>
                    setName(e.target.value)
                  }
                  placeholder="Enter supplier name"
                />
              </div>

              <div className="form-group">
                <label>Phone</label>

                <input
                  type="text"
                  value={phone}
                  onChange={(e) =>
                    setPhone(e.target.value)
                  }
                  placeholder="03XXXXXXXXX"
                />
              </div>

              <div className="form-group">
                <label>Address</label>

                <input
                  type="text"
                  value={address}
                  onChange={(e) =>
                    setAddress(e.target.value)
                  }
                  placeholder="Enter address"
                />
              </div>

              <div className="form-group">
                <label>Opening Balance</label>

                <input
                  type="number"
                  min="0"
                  value={openingBalance}
                  onChange={(e) =>
                    setOpeningBalance(e.target.value)
                  }
                  placeholder="0"
                />
              </div>

            </div>

            <div className="form-actions">

              <button
                type="submit"
                className="primary-btn"
              >
                {editingSupplier
                  ? "Update Supplier"
                  : "Save Supplier"}
              </button>

              <button
                type="button"
                className="secondary-btn"
                onClick={resetForm}
              >
                Cancel
              </button>

            </div>

          </form>
        </div>
      )}

      {/* SUPPLIER LIST */}
      <div className="suppliers-card">

        <h2>Supplier List</h2>

        {loading ? (
          <p>Loading suppliers...</p>
        ) : suppliers.length === 0 ? (
          <p>No suppliers found.</p>
        ) : (
          <div className="table-wrapper">

            <table>

              <thead>
                <tr>
                  <th>Name</th>
                  <th>Phone</th>
                  <th>Address</th>
                  <th>Opening Balance</th>
                  <th>Current Payable</th>

                  {isAdmin && (
                    <th>Actions</th>
                  )}
                </tr>
              </thead>

              <tbody>

                {suppliers.map((supplier) => (
                  <tr key={supplier.id}>

                    <td>
                      {supplier.name}
                    </td>

                    <td>
                      {supplier.phone || "-"}
                    </td>

                    <td>
                      {supplier.address || "-"}
                    </td>

                    <td>
                      {currency}{" "}
                      {Number(
                        supplier.opening_balance || 0
                      ).toLocaleString()}
                    </td>

                    <td>
                      {currency}{" "}
                      {Number(
                        supplier.current_payable || 0
                      ).toLocaleString()}
                    </td>

                    {isAdmin && (
                      <td>

                        {/* EDIT */}
                        <button
                          className="secondary-btn"
                          onClick={() =>
                            handleEditClick(supplier)
                          }
                        >
                          Edit
                        </button>

                        {/* LEDGER */}
                        <button
                          className="secondary-btn"
                          onClick={() =>
                            (window.location.href =
                              `/suppliers/${supplier.id}/ledger`)
                          }
                        >
                          Ledger
                        </button>

                        {/* DELETE */}
                        <button
                          className="danger-btn"
                          onClick={() =>
                            handleDeleteSupplier(
                              supplier
                            )
                          }
                        >
                          Delete
                        </button>

                      </td>
                    )}

                  </tr>
                ))}

              </tbody>

            </table>

          </div>
        )}

      </div>

    </div>
  );
}

export default Suppliers;

