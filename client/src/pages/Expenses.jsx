import { useEffect, useState } from "react";
import api from "../services/api";
import { useSettings } from "../context/SettingsContext";
import { useNotification } from "../context/NotificationContext";

function Expenses() {
  const { currency } = useSettings();
  const { showSuccess, showError } = useNotification();
  const [expenses, setExpenses] = useState([]);

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [description, setDescription] = useState("");

  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  const fetchExpenses = async () => {
    try {
      setLoading(true);

      const response = await api.get("/expenses");

      setExpenses(response.data.data || []);
    } catch (error) {
      showError(
        error.response?.data?.message ||
          "Failed to load expenses"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

  const handleAddExpense = async (e) => {
    e.preventDefault();

    if (!title.trim()) {
      showError("Expense title is required");
      return;
    }

    if (!amount || Number(amount) <= 0) {
      showError("Enter a valid expense amount");
      return;
    }

    try {
      setProcessing(true);

      await api.post("/expenses", {
        title: title.trim(),
        category: category.trim() || "General",
        amount: Number(amount),
        payment_method: paymentMethod,
        description: description.trim(),
      });

      showSuccess("Expense added successfully");

      setTitle("");
      setCategory("");
      setAmount("");
      setPaymentMethod("cash");
      setDescription("");

      await fetchExpenses();
    } catch (error) {
      showError(
        error.response?.data?.message ||
          "Failed to add expense"
      );
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="expenses-page">
        <div className="page-header">
          <div>
            <h1>Expenses</h1>
            <p>Manage store expenses and payments.</p>
          </div>
        </div>

        <div className="suppliers-card">
          <p>Loading expenses...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="expenses-page">

      <div className="page-header">
        <div>
          <h1>Expenses</h1>
          <p>Manage store expenses and payments.</p>
        </div>
      </div>

      {/* ADD EXPENSE */}

      <div className="suppliers-card">

        <h2>Add Expense</h2>

        <form onSubmit={handleAddExpense}>

          <div className="form-grid">

            <div className="form-group">
              <label>Expense Title</label>

              <input
                type="text"
                value={title}
                onChange={(e) =>
                  setTitle(e.target.value)
                }
                placeholder="e.g. Electricity Bill"
              />
            </div>

            <div className="form-group">
              <label>Category</label>

              <input
                type="text"
                value={category}
                onChange={(e) =>
                  setCategory(e.target.value)
                }
                placeholder="e.g. Utility"
              />
            </div>

            <div className="form-group">
              <label>Amount</label>

              <input
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) =>
                  setAmount(e.target.value)
                }
                placeholder="Amount"
              />
            </div>

            <div className="form-group">
              <label>Payment Method</label>

              <select
                value={paymentMethod}
                onChange={(e) =>
                  setPaymentMethod(e.target.value)
                }
              >
                <option value="cash">Cash</option>
                <option value="bank">Bank</option>
                <option value="easypaisa">Easypaisa</option>
                <option value="jazzcash">JazzCash</option>
              </select>
            </div>

          </div>

          <div className="form-group">

            <label>Description</label>

            <textarea
              value={description}
              onChange={(e) =>
                setDescription(e.target.value)
              }
              placeholder="Optional description"
              rows="3"
            />

          </div>

          <div className="form-actions">

            <button
              type="submit"
              className="primary-btn"
              disabled={processing}
            >
              {processing
                ? "Adding..."
                : "Add Expense"}
            </button>

          </div>

        </form>

      </div>

      {/* EXPENSE HISTORY */}

      <div className="suppliers-card">

        <h2>Expense History</h2>

        {expenses.length === 0 ? (
          <p>No expenses found.</p>
        ) : (
          <div className="table-wrapper">

            <table>

              <thead>
                <tr>
                  <th>ID</th>
                  <th>Title</th>
                  <th>Category</th>
                  <th>Amount</th>
                  <th>Payment Method</th>
                  <th>Description</th>
                  <th>Date</th>
                </tr>
              </thead>

              <tbody>

                {expenses.map((expense) => (
                  <tr key={expense.id}>

                    <td>{expense.id}</td>

                    <td>
                      {expense.title || "-"}
                    </td>

                    <td>
                      {expense.category || "-"}
                    </td>

                    <td>
                      {currency}{" "}
                      {Number(
                        expense.amount || 0
                      ).toLocaleString()}
                    </td>

                    <td>
                      {expense.payment_method || "-"}
                    </td>

                    <td>
                      {expense.description || "-"}
                    </td>

                    <td>
                      {expense.created_at
                        ? new Date(
                            expense.created_at
                          ).toLocaleString()
                        : "-"}
                    </td>

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

export default Expenses;
