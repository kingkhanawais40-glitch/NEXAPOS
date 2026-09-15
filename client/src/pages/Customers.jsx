import { useEffect, useState } from "react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useSettings } from "../context/SettingsContext";
import { useNotification } from "../context/NotificationContext";

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

  return (
    <div className="customers-page">
      <div className="page-header">
        <div>
          <h1>Customers</h1>
          <p>Manage customers and their outstanding dues.</p>
        </div>

        {isAdmin && (
          <button
            className="primary-btn"
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
          >
            + Add Customer
          </button>
        )}
      </div>

      {isAdmin && showForm && (
        <div className="customers-card">
          <h2>
            {editingCustomer
              ? "Edit Customer"
              : "Add Customer"}
          </h2>

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

      <div className="customers-card">
        <h2>Customer List</h2>

        {loading ? (
          <p>Loading customers...</p>
        ) : customers.length === 0 ? (
          <p>No customers found.</p>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Phone</th>
                  <th>Address</th>
                  <th>Opening Balance</th>
                  <th>Current Due</th>
                  {isAdmin && <th>Actions</th>}
                </tr>
              </thead>

              <tbody>
                {customers.map((customer) => (
                  <tr key={customer.id}>
                    <td>{customer.name}</td>

                    <td>
                      {customer.phone || "-"}
                    </td>

                    <td>
                      {customer.address || "-"}
                    </td>

                    <td>
                      {currency} {customer.opening_balance || 0}
                    </td>

                    <td>
  {currency} {customer.current_due || 0}
</td>

                    {isAdmin && (
                      <td>
                        <button
                          className="secondary-btn"
                          onClick={() =>
                            handleEditClick(customer)
                          }
                        >
                          Edit
                        </button>

                        <button
                          className="danger-btn"
                          onClick={() =>
                            handleDeleteCustomer(customer)
                          }
                        >
                          Delete
                        </button>
                        <button
  className="secondary-btn"
  onClick={() =>
    (window.location.href = `/customers/${customer.id}/ledger`)
  }
>
  Ledger
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

export default Customers;

