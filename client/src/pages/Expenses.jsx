import { useEffect, useState } from "react";
import api from "../services/api";
import { useSettings } from "../context/SettingsContext";
import { useNotification } from "../context/NotificationContext";
import {
  Wallet,
  Plus,
  Receipt,
  CircleDollarSign,
  CreditCard,
  Banknote,
  Smartphone,
  CalendarDays,
  FileText,
  Tag,
} from "lucide-react";

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

  const totalExpenses = expenses.reduce(
    (total, expense) =>
      total + Number(expense.amount || 0),
    0
  );

  const cashExpenses = expenses
    .filter((expense) => expense.payment_method === "cash")
    .reduce(
      (total, expense) =>
        total + Number(expense.amount || 0),
      0
    );

  const bankExpenses = expenses
    .filter((expense) => expense.payment_method === "bank")
    .reduce(
      (total, expense) =>
        total + Number(expense.amount || 0),
      0
    );

  const mobileExpenses = expenses
    .filter(
      (expense) =>
        expense.payment_method === "easypaisa" ||
        expense.payment_method === "jazzcash"
    )
    .reduce(
      (total, expense) =>
        total + Number(expense.amount || 0),
      0
    );

  const getPaymentIcon = (method) => {
    switch (method) {
      case "cash":
        return <Banknote size={14} />;

      case "bank":
        return <CreditCard size={14} />;

      case "easypaisa":
      case "jazzcash":
        return <Smartphone size={14} />;

      default:
        return <Wallet size={14} />;
    }
  };

  const formatPaymentMethod = (method) => {
    if (!method) return "-";

    if (method === "easypaisa") {
      return "Easypaisa";
    }

    if (method === "jazzcash") {
      return "JazzCash";
    }

    return method.charAt(0).toUpperCase() + method.slice(1);
  };

  if (loading) {
    return (
      <div className="expenses-page">
        <div className="expenses-page-header">
          <div>
            <span className="expenses-eyebrow">
              FINANCIAL MANAGEMENT
            </span>

            <h1>Expenses</h1>

            <p>
              Track store expenses, payments and financial
              activity.
            </p>
          </div>
        </div>

        <div className="expenses-loading-card">
          <div className="expenses-loading-icon">
            <Wallet size={26} />
          </div>

          <h3>Loading expenses...</h3>

          <p>
            Please wait while expense data is loaded.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="expenses-page">

      {/* PAGE HEADER */}

      <div className="expenses-page-header">

        <div>
          <span className="expenses-eyebrow">
            FINANCIAL MANAGEMENT
          </span>

          <h1>Expenses</h1>

          <p>
            Manage store expenses, payment methods and
            financial records.
          </p>
        </div>

        <div className="expenses-header-badge">
          <Wallet size={18} />
          <span>Expense Management</span>
        </div>

      </div>

      {/* SUMMARY CARDS */}

      <div className="expenses-summary-grid">

        <div className="expenses-summary-card">

          <div className="expenses-summary-icon blue">
            <Receipt size={21} />
          </div>

          <div>
            <span>Total Records</span>

            <strong>
              {expenses.length}
            </strong>

            <small>Expense transactions</small>
          </div>

        </div>

        <div className="expenses-summary-card">

          <div className="expenses-summary-icon red">
            <CircleDollarSign size={21} />
          </div>

          <div>
            <span>Total Expenses</span>

            <strong>
              {currency}{" "}
              {totalExpenses.toLocaleString()}
            </strong>

            <small>Recorded expenses</small>
          </div>

        </div>

        <div className="expenses-summary-card">

          <div className="expenses-summary-icon green">
            <Banknote size={21} />
          </div>

          <div>
            <span>Cash Expenses</span>

            <strong>
              {currency}{" "}
              {cashExpenses.toLocaleString()}
            </strong>

            <small>Paid by cash</small>
          </div>

        </div>

        <div className="expenses-summary-card">

          <div className="expenses-summary-icon purple">
            <CreditCard size={21} />
          </div>

          <div>
            <span>Other Payments</span>

            <strong>
              {currency}{" "}
              {(
                bankExpenses + mobileExpenses
              ).toLocaleString()}
            </strong>

            <small>Bank & digital payments</small>
          </div>

        </div>

      </div>

      {/* ADD EXPENSE */}

      <div className="expense-workspace">

        <div className="expense-workspace-header">

          <div className="expense-section-title">

            <div className="expense-section-icon">
              <Plus size={20} />
            </div>

            <div>
              <h2>Add Expense</h2>

              <p>
                Record a new store expense and payment.
              </p>
            </div>

          </div>

          <span className="expense-status-badge">
            New Expense
          </span>

        </div>

        <form
          onSubmit={handleAddExpense}
          className="expense-form"
        >

          <div className="expense-form-section">

            <div className="expense-form-section-title">
              <FileText size={18} />
              <span>Expense Information</span>
            </div>

            <div className="form-grid">

              <div className="form-group">
                <label>Expense Title</label>

                <div className="expense-input-icon">
                  <Receipt size={16} />

                  <input
                    type="text"
                    value={title}
                    onChange={(e) =>
                      setTitle(e.target.value)
                    }
                    placeholder="e.g. Electricity Bill"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Category</label>

                <div className="expense-input-icon">
                  <Tag size={16} />

                  <input
                    type="text"
                    value={category}
                    onChange={(e) =>
                      setCategory(e.target.value)
                    }
                    placeholder="e.g. Utility"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Amount</label>

                <div className="expense-input-icon">
                  <CircleDollarSign size={16} />

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={amount}
                    onChange={(e) =>
                      setAmount(e.target.value)
                    }
                    placeholder="Expense amount"
                  />
                </div>
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
                  <option value="easypaisa">
                    Easypaisa
                  </option>
                  <option value="jazzcash">
                    JazzCash
                  </option>
                </select>
              </div>

            </div>

            <div className="form-group expense-description-group">

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

          </div>

          <div className="expense-form-footer">

            <div className="expense-form-note">
              <Wallet size={16} />

              <span>
                Expense will be recorded in your financial
                history.
              </span>
            </div>

            <button
              type="submit"
              className="expense-add-btn"
              disabled={processing}
            >
              {processing ? (
                "Adding..."
              ) : (
                <>
                  <Plus size={18} />
                  Add Expense
                </>
              )}
            </button>

          </div>

        </form>

      </div>

      {/* EXPENSE HISTORY */}

      <div className="expense-history-card">

        <div className="expense-history-header">

          <div className="expense-section-title">

            <div className="expense-section-icon">
              <Receipt size={20} />
            </div>

            <div>
              <h2>Expense History</h2>

              <p>
                Review all recorded store expenses.
              </p>
            </div>

          </div>

          <span className="expense-history-count">
            {expenses.length} Records
          </span>

        </div>

        {expenses.length === 0 ? (

          <div className="expense-empty-history">

            <div className="expense-empty-icon">
              <Wallet size={27} />
            </div>

            <h4>No expenses found</h4>

            <p>
              Your expense history will appear here after
              adding an expense.
            </p>

          </div>

        ) : (

          <div className="expense-table-wrapper">

            <table className="expense-table">

              <thead>
                <tr>
                  <th>ID</th>
                  <th>Expense</th>
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

                    <td>
                      <span className="expense-id">
                        #{expense.id}
                      </span>
                    </td>

                    <td>
                      <div className="expense-title-cell">

                        <div className="expense-row-icon">
                          <Receipt size={16} />
                        </div>

                        <div>
                          <strong>
                            {expense.title || "-"}
                          </strong>

                          <span>
                            Expense #{expense.id}
                          </span>
                        </div>

                      </div>
                    </td>

                    <td>
                      <span className="expense-category-badge">
                        <Tag size={13} />
                        {expense.category || "General"}
                      </span>
                    </td>

                    <td>
                      <strong className="expense-amount">
                        {currency}{" "}
                        {Number(
                          expense.amount || 0
                        ).toLocaleString()}
                      </strong>
                    </td>

                    <td>
                      <span
                        className={`expense-payment-badge ${
                          expense.payment_method || "cash"
                        }`}
                      >
                        {getPaymentIcon(
                          expense.payment_method
                        )}

                        {formatPaymentMethod(
                          expense.payment_method
                        )}
                      </span>
                    </td>

                    <td>
                      <span className="expense-description">
                        {expense.description || "-"}
                      </span>
                    </td>

                    <td>
                      <span className="expense-date">
                        <CalendarDays size={14} />

                        {expense.created_at
                          ? new Date(
                              expense.created_at
                            ).toLocaleString()
                          : "-"}
                      </span>
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