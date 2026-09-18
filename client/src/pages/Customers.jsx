import { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useSettings } from "../context/SettingsContext";
import { useNotification } from "../context/NotificationContext";
import {
  Plus,
  Search,
  Users,
  UserCheck,
  Wallet,
  Pencil,
  Trash2,
  BookOpen,
  X,
  Phone,
  MapPin,
} from "lucide-react";

function Customers() {
  const { user } = useAuth();
  const { currency } = useSettings();
  const { showSuccess, showError, confirm } = useNotification();
  const isAdmin = user?.role === "admin";

  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [openingBalance, setOpeningBalance] = useState("");

  const [search, setSearch] = useState("");

  const fetchCustomers = async () => {
    try {
      const response = await api.get("/customers");
      setCustomers(response.data.data);
    } catch (error) {
      console.error(
        error.response?.data?.message ||
          "Failed to load customers"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const resetForm = () => {
    setName("");
    setPhone("");
    setAddress("");
    setOpeningBalance("");
    setEditingCustomer(null);
    setShowForm(false);
  };

  const handleAddCustomer = async (e) => {
    e.preventDefault();

    if (!name.trim()) {
      showError("Customer name is required");
      return;
    }

    const balance = Number(openingBalance || 0);

    if (balance < 0) {
      showError("Opening balance cannot be negative");
      return;
    }

    try {
      const response = await api.post("/customers", {
        name: name.trim(),
        phone: phone.trim() || null,
        address: address.trim() || null,
        opening_balance: balance,
      });

      showSuccess(
        response.data.message ||
          "Customer added successfully"
      );

      resetForm();
      setLoading(true);
      await fetchCustomers();
    } catch (error) {
      showError(
        error.response?.data?.message ||
          "Failed to add customer"
      );
    }
  };

  const handleEditClick = (customer) => {
    setEditingCustomer(customer);

    setName(customer.name || "");
    setPhone(customer.phone || "");
    setAddress(customer.address || "");
    setOpeningBalance(customer.opening_balance || 0);

    setShowForm(true);
  };

  const handleUpdateCustomer = async (e) => {
    e.preventDefault();

    if (!name.trim()) {
      showError("Customer name is required");
      return;
    }

    const balance = Number(openingBalance || 0);

    if (balance < 0) {
      showError("Opening balance cannot be negative");
      return;
    }

    try {
      const response = await api.put(
        `/customers/${editingCustomer.id}`,
        {
          name: name.trim(),
          phone: phone.trim() || null,
          address: address.trim() || null,
          opening_balance: balance,
        }
      );

      showSuccess(
        response.data.message ||
          "Customer updated successfully"
      );

      resetForm();
      setLoading(true);
      await fetchCustomers();
    } catch (error) {
      showError(
        error.response?.data?.message ||
          "Failed to update customer"
      );
    }
  };

  const handleDeleteCustomer = async (customer) => {
    const confirmed = await confirm(
      `Are you sure you want to delete "${customer.name}"?`
    );

    if (!confirmed) {
      return;
    }

    try {
      const response = await api.delete(
        `/customers/${customer.id}`
      );

      showSuccess(
        response.data.message ||
          "Customer deleted successfully"
      );

      setLoading(true);
      await fetchCustomers();
    } catch (error) {
      showError(
        error.response?.data?.message ||
          "Failed to delete customer"
      );
    }
  };

  const filteredCustomers = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return customers;
    }

    return customers.filter((customer) => {
      return (
        customer.name?.toLowerCase().includes(query) ||
        customer.phone?.toLowerCase().includes(query) ||
        customer.address?.toLowerCase().includes(query)
      );
    });
  }, [customers, search]);

  const totalCustomers = customers.length;

  const customersWithDue = customers.filter(
    (customer) => Number(customer.current_due || 0) > 0
  ).length;

  const totalDue = customers.reduce(
    (sum, customer) =>
      sum + Number(customer.current_due || 0),
    0
  );

  const formatMoney = (amount) => {
    return `${currency} ${Number(amount || 0).toLocaleString()}`;
  };

  return (
    <div className="customers-page">
      {/* PAGE HEADER */}
      <div className="page-header customers-page-header">
        <div>
          <span className="page-eyebrow">CUSTOMER MANAGEMENT</span>

          <h1>Customers</h1>

          <p>
            Manage customer accounts, contact details and outstanding dues.
          </p>
        </div>

        {isAdmin && (
          <button
            className="primary-btn customers-add-btn"
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
          >
            <Plus size={18} />
            Add Customer
          </button>
        )}
      </div>

      {/* SUMMARY CARDS */}
      <div className="customers-summary-grid">
        <div className="customers-summary-card">
          <div className="customers-summary-icon blue">
            <Users size={25} />
          </div>

          <div>
            <span>Total Customers</span>
            <strong>{totalCustomers}</strong>
            <small>Registered accounts</small>
          </div>
        </div>

        <div className="customers-summary-card">
          <div className="customers-summary-icon warning">
            <UserCheck size={25} />
          </div>

          <div>
            <span>Customers With Due</span>
            <strong>{customersWithDue}</strong>
            <small>Outstanding accounts</small>
          </div>
        </div>

        <div className="customers-summary-card">
          <div className="customers-summary-icon danger">
            <Wallet size={25} />
          </div>

          <div>
            <span>Total Current Due</span>
            <strong>{formatMoney(totalDue)}</strong>
            <small>Receivable amount</small>
          </div>
        </div>
      </div>

      {/* ADD / EDIT FORM */}
      {isAdmin && showForm && (
        <div className="customers-form-card">
          <div className="customers-form-header">
            <div>
              <span className="page-eyebrow">
                {editingCustomer
                  ? "UPDATE ACCOUNT"
                  : "NEW ACCOUNT"}
              </span>

              <h2>
                {editingCustomer
                  ? "Edit Customer"
                  : "Add Customer"}
              </h2>

              <p>
                {editingCustomer
                  ? "Update customer account information."
                  : "Create a new customer account."}
              </p>
            </div>

            <button
              type="button"
              className="customers-close-btn"
              onClick={resetForm}
              aria-label="Close"
            >
              <X size={19} />
            </button>
          </div>

          <form
            onSubmit={
              editingCustomer
                ? handleUpdateCustomer
                : handleAddCustomer
            }
          >
            <div className="form-grid">
              <div className="form-group">
                <label>Customer Name</label>

                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter customer name"
                />
              </div>

              <div className="form-group">
                <label>Phone</label>

                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="03XXXXXXXXX"
                />
              </div>

              <div className="form-group">
                <label>Address</label>

                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Enter customer address"
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

            <div className="form-actions customers-form-actions">
              <button
                type="submit"
                className="primary-btn"
              >
                {editingCustomer
                  ? "Update Customer"
                  : "Save Customer"}
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

      {/* CUSTOMER TABLE CARD */}
      <div className="customers-card customers-list-card">
        <div className="customers-list-header">
          <div>
            <h2>Customer Directory</h2>
            <p>
              {filteredCustomers.length} customer
              {filteredCustomers.length !== 1 ? "s" : ""} displayed
            </p>
          </div>
        </div>

        {/* SEARCH TOOLBAR */}
        <div className="customers-toolbar">
          <div className="customers-search">
            <Search size={18} />

            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, phone or address..."
            />

            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="customers-search-clear"
              >
                <X size={15} />
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="customers-state">
            <div className="customers-state-icon">
              <Users size={25} />
            </div>

            <h3>Loading customers...</h3>
            <p>Please wait while customer data is loaded.</p>
          </div>
        ) : customers.length === 0 ? (
          <div className="customers-state">
            <div className="customers-state-icon">
              <Users size={25} />
            </div>

            <h3>No customers found</h3>
            <p>
              Add your first customer to start managing customer accounts.
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
                Add Customer
              </button>
            )}
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="customers-state">
            <div className="customers-state-icon">
              <Search size={25} />
            </div>

            <h3>No matching customers</h3>
            <p>Try a different name, phone number or address.</p>
          </div>
        ) : (
          <div className="table-wrapper customers-table-wrapper">
            <table className="customers-table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Phone</th>
                  <th>Address</th>
                  <th>Opening Balance</th>
                  <th>Current Due</th>
                  {isAdmin && <th>Actions</th>}
                </tr>
              </thead>

              <tbody>
                {filteredCustomers.map((customer) => {
                  const currentDue = Number(
                    customer.current_due || 0
                  );

                  return (
                    <tr key={customer.id}>
                      <td>
                        <div className="customer-name-cell">
                          <div className="customer-avatar">
                            {customer.name
                              ?.charAt(0)
                              ?.toUpperCase() || "C"}
                          </div>

                          <div>
                            <strong>{customer.name}</strong>

                            <span>
                              Customer #{customer.id}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td>
                        <div className="customer-contact">
                          <Phone size={14} />
                          <span>
                            {customer.phone || "-"}
                          </span>
                        </div>
                      </td>

                      <td>
                        <div className="customer-contact">
                          {customer.address ? (
                            <>
                              <MapPin size={14} />
                              <span>
                                {customer.address}
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
                        <span className="customer-money">
                          {formatMoney(
                            customer.opening_balance || 0
                          )}
                        </span>
                      </td>

                      <td>
                        <span
                          className={
                            currentDue > 0
                              ? "customer-due due-active"
                              : "customer-due due-clear"
                          }
                        >
                          {formatMoney(currentDue)}
                        </span>
                      </td>

                      {isAdmin && (
                        <td>
                          <div className="customer-actions">
                            <button
                              type="button"
                              className="table-action-btn edit-btn"
                              onClick={() =>
                                handleEditClick(customer)
                              }
                            >
                              <Pencil size={14} />
                              Edit
                            </button>

                            <button
                              type="button"
                              className="table-action-btn ledger-btn"
                              onClick={() =>
                                (window.location.href = `/customers/${customer.id}/ledger`)
                              }
                            >
                              <BookOpen size={14} />
                              Ledger
                            </button>

                            <button
                              type="button"
                              className="table-action-btn delete-btn"
                              onClick={() =>
                                handleDeleteCustomer(customer)
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

export default Customers;