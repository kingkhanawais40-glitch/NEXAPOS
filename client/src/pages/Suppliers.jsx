import { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useSettings } from "../context/SettingsContext";
import { useNotification } from "../context/NotificationContext";
import {
  Plus,
  Search,
  Truck,
  UserCheck,
  Wallet,
  Pencil,
  Trash2,
  BookOpen,
  X,
  Phone,
  MapPin,
} from "lucide-react";

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

  const [search, setSearch] = useState("");

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

  const filteredSuppliers = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return suppliers;
    }

    return suppliers.filter((supplier) => {
      return (
        supplier.name?.toLowerCase().includes(query) ||
        supplier.phone?.toLowerCase().includes(query) ||
        supplier.address?.toLowerCase().includes(query)
      );
    });
  }, [suppliers, search]);

  const totalSuppliers = suppliers.length;

  const suppliersWithPayable = suppliers.filter(
    (supplier) =>
      Number(supplier.current_payable || 0) > 0
  ).length;

  const totalPayable = suppliers.reduce(
    (sum, supplier) =>
      sum + Number(supplier.current_payable || 0),
    0
  );

  const formatMoney = (amount) => {
    return `${currency} ${Number(
      amount || 0
    ).toLocaleString()}`;
  };

  return (
    <div className="suppliers-page">

      {/* PAGE HEADER */}
      <div className="page-header suppliers-page-header">
        <div>
          <span className="page-eyebrow">
            SUPPLIER MANAGEMENT
          </span>

          <h1>Suppliers</h1>

          <p>
            Manage supplier accounts, contact details and outstanding payables.
          </p>
        </div>

        {isAdmin && (
          <button
            className="primary-btn suppliers-add-btn"
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
          >
            <Plus size={18} />
            Add Supplier
          </button>
        )}
      </div>

      {/* SUMMARY CARDS */}
      <div className="suppliers-summary-grid">

        <div className="suppliers-summary-card">
          <div className="suppliers-summary-icon blue">
            <Truck size={25} />
          </div>

          <div>
            <span>Total Suppliers</span>
            <strong>{totalSuppliers}</strong>
            <small>Registered accounts</small>
          </div>
        </div>

        <div className="suppliers-summary-card">
          <div className="suppliers-summary-icon warning">
            <UserCheck size={25} />
          </div>

          <div>
            <span>Suppliers With Payable</span>
            <strong>{suppliersWithPayable}</strong>
            <small>Outstanding accounts</small>
          </div>
        </div>

        <div className="suppliers-summary-card">
          <div className="suppliers-summary-icon danger">
            <Wallet size={25} />
          </div>

          <div>
            <span>Total Current Payable</span>
            <strong>{formatMoney(totalPayable)}</strong>
            <small>Amount payable</small>
          </div>
        </div>

      </div>

      {/* ADD / EDIT FORM */}
      {isAdmin && showForm && (
        <div className="suppliers-form-card">

          <div className="suppliers-form-header">
            <div>
              <span className="page-eyebrow">
                {editingSupplier
                  ? "UPDATE ACCOUNT"
                  : "NEW ACCOUNT"}
              </span>

              <h2>
                {editingSupplier
                  ? "Edit Supplier"
                  : "Add Supplier"}
              </h2>

              <p>
                {editingSupplier
                  ? "Update supplier account information."
                  : "Create a new supplier account."}
              </p>
            </div>

            <button
              type="button"
              className="suppliers-close-btn"
              onClick={resetForm}
              aria-label="Close"
            >
              <X size={19} />
            </button>
          </div>

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
                  placeholder="Enter supplier address"
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

            <div className="form-actions suppliers-form-actions">

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
      <div className="suppliers-card suppliers-list-card">

        <div className="suppliers-list-header">
          <div>
            <h2>Supplier Directory</h2>

            <p>
              {filteredSuppliers.length} supplier
              {filteredSuppliers.length !== 1 ? "s" : ""} displayed
            </p>
          </div>
        </div>

        {/* SEARCH */}
        <div className="suppliers-toolbar">

          <div className="suppliers-search">
            <Search size={18} />

            <input
              type="text"
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
              placeholder="Search by name, phone or address..."
            />

            {search && (
              <button
                type="button"
                className="suppliers-search-clear"
                onClick={() => setSearch("")}
              >
                <X size={15} />
              </button>
            )}
          </div>

        </div>

        {loading ? (
          <div className="suppliers-state">

            <div className="suppliers-state-icon">
              <Truck size={25} />
            </div>

            <h3>Loading suppliers...</h3>

            <p>
              Please wait while supplier data is loaded.
            </p>

          </div>
        ) : suppliers.length === 0 ? (
          <div className="suppliers-state">

            <div className="suppliers-state-icon">
              <Truck size={25} />
            </div>

            <h3>No suppliers found</h3>

            <p>
              Add your first supplier to start managing supplier accounts.
            </p>

            {isAdmin && (
              <button
                className="primary-btn"
                onClick={() => {
                  resetForm();
                  setShowForm(true);
                }}
              >
                <Plus size={17} />
                Add Supplier
              </button>
            )}

          </div>
        ) : filteredSuppliers.length === 0 ? (
          <div className="suppliers-state">

            <div className="suppliers-state-icon">
              <Search size={25} />
            </div>

            <h3>No matching suppliers</h3>

            <p>
              Try a different name, phone number or address.
            </p>

          </div>
        ) : (
          <div className="table-wrapper suppliers-table-wrapper">

            <table className="suppliers-table">

              <thead>
                <tr>
                  <th>Supplier</th>
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

                {filteredSuppliers.map((supplier) => {

                  const currentPayable = Number(
                    supplier.current_payable || 0
                  );

                  return (
                    <tr key={supplier.id}>

                      <td>
                        <div className="supplier-name-cell">

                          <div className="supplier-avatar">
                            {supplier.name
                              ?.charAt(0)
                              ?.toUpperCase() || "S"}
                          </div>

                          <div>
                            <strong>
                              {supplier.name}
                            </strong>

                            <span>
                              Supplier #{supplier.id}
                            </span>
                          </div>

                        </div>
                      </td>

                      <td>
                        <div className="supplier-contact">

                          <Phone size={14} />

                          <span>
                            {supplier.phone || "-"}
                          </span>

                        </div>
                      </td>

                      <td>
                        <div className="supplier-contact">

                          {supplier.address ? (
                            <>
                              <MapPin size={14} />

                              <span>
                                {supplier.address}
                              </span>
                            </>
                          ) : (
                            <span className="muted-cell">
                              -
                            </span>
                          )}

                        </div>
                      </td>

                      <td>
                        <span className="supplier-money">
                          {formatMoney(
                            supplier.opening_balance || 0
                          )}
                        </span>
                      </td>

                      <td>
                        <span
                          className={
                            currentPayable > 0
                              ? "supplier-payable payable-active"
                              : "supplier-payable payable-clear"
                          }
                        >
                          {formatMoney(currentPayable)}
                        </span>
                      </td>

                      {isAdmin && (
                        <td>

                          <div className="supplier-actions">

                            <button
                              type="button"
                              className="table-action-btn edit-btn"
                              onClick={() =>
                                handleEditClick(supplier)
                              }
                            >
                              <Pencil size={14} />
                              Edit
                            </button>

                            <button
                              type="button"
                              className="table-action-btn ledger-btn"
                              onClick={() =>
                                (window.location.href =
                                  `/suppliers/${supplier.id}/ledger`)
                              }
                            >
                              <BookOpen size={14} />
                              Ledger
                            </button>

                            <button
                              type="button"
                              className="table-action-btn delete-btn"
                              onClick={() =>
                                handleDeleteSupplier(
                                  supplier
                                )
                              }
                            >
                              <Trash2 size={14} />
                              Delete
                            </button>

                          </div>

                        </td>
                      )}

                    </tr>
                  );
                })}

              </tbody>

            </table>

          </div>
        )}

      </div>

    </div>
  );
}

export default Suppliers;