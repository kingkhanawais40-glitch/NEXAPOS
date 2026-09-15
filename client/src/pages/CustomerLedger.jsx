import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../services/api";
import { useSettings } from "../context/SettingsContext";
import { useNotification } from "../context/NotificationContext";

function CustomerLedger() {
  const { currency } = useSettings();
  const { showSuccess, showError } = useNotification();
  const { customerId } = useParams();
  const navigate = useNavigate();

  const [ledger, setLedger] = useState(null);
  const [loading, setLoading] = useState(true);

  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [paymentDescription, setPaymentDescription] = useState("");
  const [processingPayment, setProcessingPayment] = useState(false);

  
const fetchLedger = async () => {
  try {
    setLoading(true);

    const response = await api.get(
      `/ledger/customer/${customerId}`
    );

    setLedger(response.data.data);
  } catch (error) {
    showError(
      error.response?.data?.message ||
        "Failed to load customer ledger"
    );
  } finally {
    setLoading(false);
  }
};



  useEffect(() => {
    fetchLedger();
  }, [customerId]);

  const handleCustomerPayment = async (e) => {
    e.preventDefault();

    const amount = Number(paymentAmount);

    if (!amount || amount <= 0) {
      showError("Enter a valid payment amount");
      return;
    }

    if (
      ledger &&
      amount > Number(ledger.summary?.current_due || 0)
    ) {
      showError("Payment cannot be greater than customer due");
      return;
    }

    try {
      setProcessingPayment(true);

      const response = await api.post(
  "/ledger/payment",
        {
          customer_id: Number(customerId),
          amount,
          payment_method: paymentMethod,
          description:
            paymentDescription.trim() || "Customer payment",
        }
      );

      showSuccess(
        response.data.message ||
          "Customer payment recorded successfully"
      );

      setPaymentAmount("");
      setPaymentMethod("cash");
      setPaymentDescription("");

      await fetchLedger();
    } catch (error) {
      showError(
        error.response?.data?.message ||
          "Failed to record customer payment"
      );
    } finally {
      setProcessingPayment(false);
    }
  };

  if (loading) {
    return (
      <div className="customers-page">
        <div className="customers-card">
          <p>Loading customer ledger...</p>
        </div>
      </div>
    );
  }

  if (!ledger) {
    return (
      <div className="customers-page">
        <div className="customers-card">
          <p>Customer ledger not found.</p>

          <button
            className="secondary-btn"
            onClick={() => navigate("/customers")}
          >
            Back to Customers
          </button>
        </div>
      </div>
    );
  }

  const customer = ledger.customer;
  const summary = ledger.summary;
  const rawTransactions = ledger.transactions || [];

  // transactions arrive newest-first; walk oldest-to-newest to build a
  // running balance, then map back onto the newest-first display order.
  const chronological = [...rawTransactions].reverse();
  let runningBalance = Number(summary.opening_balance || 0);

  const balanceById = {};
  chronological.forEach((t) => {
    const amt = Number(t.amount || 0);
    runningBalance +=
      t.transaction_type === "debit" ? amt : -amt;
    balanceById[t.id] = runningBalance;
  });

  const transactions = rawTransactions.map((t) => ({
    ...t,
    debit: t.transaction_type === "debit" ? Number(t.amount || 0) : 0,
    credit: t.transaction_type === "credit" ? Number(t.amount || 0) : 0,
    running_balance: balanceById[t.id],
  }));

  return (
    <div className="customers-page">

      <div className="page-header">
        <div>
          <h1>Customer Ledger</h1>

          <p>
            {customer.name}
            {customer.phone
              ? ` — ${customer.phone}`
              : ""}
          </p>
        </div>

        <button
          className="secondary-btn"
          onClick={() => navigate("/customers")}
        >
          Back to Customers
        </button>
      </div>

      {/* CUSTOMER SUMMARY */}

      <div className="reports-grid">

        <div className="dashboard-card">
          <h3>Opening Balance</h3>

          <strong>
            {currency}{" "}
            {Number(
              summary.opening_balance || 0
            ).toLocaleString()}
          </strong>
        </div>

        <div className="dashboard-card">
          <h3>Total Debit</h3>

          <strong>
            {currency}{" "}
            {Number(
              summary.total_debit || 0
            ).toLocaleString()}
          </strong>
        </div>

        <div className="dashboard-card">
          <h3>Total Credit</h3>

          <strong>
            {currency}{" "}
            {Number(
              summary.total_credit || 0
            ).toLocaleString()}
          </strong>
        </div>

        <div className="dashboard-card">
          <h3>Current Due</h3>

          <strong>
            {currency}{" "}
            {Number(
              summary.current_due || 0
            ).toLocaleString()}
          </strong>
        </div>

      </div>

      {/* RECEIVE PAYMENT */}

      <div className="customers-card">

        <h2>Receive Customer Payment</h2>

        <form onSubmit={handleCustomerPayment}>

          <div className="form-grid">

            <div className="form-group">
              <label>Payment Amount</label>

              <input
                type="number"
                min="1"
                value={paymentAmount}
                onChange={(e) =>
                  setPaymentAmount(e.target.value)
                }
                placeholder="Enter payment amount"
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
                <option value="easypaisa">
                  Easypaisa
                </option>
                <option value="jazzcash">
                  JazzCash
                </option>
              </select>
            </div>

            <div className="form-group">
              <label>Description</label>

              <input
                type="text"
                value={paymentDescription}
                onChange={(e) =>
                  setPaymentDescription(e.target.value)
                }
                placeholder="Optional description"
              />
            </div>

          </div>

          <div className="form-actions">

            <button
              type="submit"
              className="primary-btn"
              disabled={processingPayment}
            >
              {processingPayment
                ? "Processing..."
                : "Receive Payment"}
            </button>

          </div>

        </form>

      </div>

      {/* TRANSACTION HISTORY */}

      <div className="customers-card">

        <h2>Transaction History</h2>

        {transactions.length === 0 ? (
          <p>No transactions found.</p>
        ) : (
          <div className="table-wrapper">

            <table>

              <thead>
                <tr>
                  <th>Date</th>
                  <th>Invoice</th>
                  <th>Payment Method</th>
                  <th>Debit</th>
                  <th>Credit</th>
                  <th>Description</th>
                  <th>Running Balance</th>
                </tr>
              </thead>

              <tbody>

                {transactions.map((transaction) => (
                  <tr key={transaction.id}>

                    <td>
                      {transaction.created_at
                        ? new Date(
                            transaction.created_at
                          ).toLocaleString()
                        : "-"}
                    </td>

                    <td>
                      {transaction.invoice_number || "-"}
                    </td>

                    <td>
                      {transaction.payment_method || "-"}
                    </td>

                    <td>
                      {transaction.debit
                        ? `${currency} ${transaction.debit.toLocaleString()}`
                        : "-"}
                    </td>

                    <td>
                      {transaction.credit
                        ? `${currency} ${transaction.credit.toLocaleString()}`
                        : "-"}
                    </td>

                    <td>
                      {transaction.description || "-"}
                    </td>

                    <td>
                      <strong>
                        {currency}{" "}
                        {Number(
                          transaction.running_balance || 0
                        ).toLocaleString()}
                      </strong>
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

export default CustomerLedger;

