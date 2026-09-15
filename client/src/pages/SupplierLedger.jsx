import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../services/api";
import { useSettings } from "../context/SettingsContext";
import { useNotification } from "../context/NotificationContext";

function SupplierLedger() {
  const { currency } = useSettings();
  const { showSuccess, showError } = useNotification();
  const { supplierId } = useParams();
  const navigate = useNavigate();

  const [supplier, setSupplier] = useState(null);
  const [summary, setSummary] = useState(null);
  const [transactions, setTransactions] = useState([]);

  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [paymentDescription, setPaymentDescription] = useState("");

  const [loading, setLoading] = useState(true);
  const [processingPayment, setProcessingPayment] = useState(false);

  const fetchLedger = async () => {
    try {
      setLoading(true);

      const response = await api.get(
        `/supplier-ledger/supplier/${supplierId}`
      );

      const data = response.data.data;

      setSupplier(data.supplier);
      setSummary(data.summary);
      setTransactions(data.transactions);
    } catch (error) {
      console.error(
        error.response?.data?.message ||
          "Failed to load supplier ledger"
      );

      showError(
        error.response?.data?.message ||
          "Failed to load supplier ledger"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLedger();
  }, [supplierId]);

  const handleSupplierPayment = async (e) => {
    e.preventDefault();

    const amount = Number(paymentAmount);

    if (!amount || amount <= 0) {
      showError("Enter a valid payment amount");
      return;
    }

    if (
      summary &&
      amount > Number(summary.current_payable || 0)
    ) {
      showError(
        "Payment cannot be greater than supplier payable"
      );
      return;
    }

    try {
      setProcessingPayment(true);

      const response = await api.post(
        "/supplier-ledger/payment",
        {
          supplier_id: Number(supplierId),
          amount,
          payment_method: paymentMethod,
          description:
            paymentDescription.trim() ||
            "Supplier payment",
        }
      );

      showSuccess(
        response.data.message ||
          "Supplier payment recorded successfully"
      );

      setPaymentAmount("");
      setPaymentMethod("cash");
      setPaymentDescription("");

      await fetchLedger();
    } catch (error) {
      showError(
        error.response?.data?.message ||
          "Failed to record supplier payment"
      );
    } finally {
      setProcessingPayment(false);
    }
  };

  if (loading) {
    return (
      <div className="supplier-ledger-page">
        <div className="page-header">
          <div>
            <h1>Supplier Ledger</h1>
            <p>Loading supplier information...</p>
          </div>
        </div>

        <div className="suppliers-card">
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (!supplier) {
    return (
      <div className="supplier-ledger-page">
        <div className="page-header">
          <div>
            <h1>Supplier Ledger</h1>
            <p>Supplier could not be found.</p>
          </div>
        </div>

        <div className="suppliers-card">
          <p>Supplier not found.</p>

          <button
            className="secondary-btn"
            onClick={() => navigate("/suppliers")}
          >
            ← Back to Suppliers
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="supplier-ledger-page">

      {/* HEADER */}
      <div className="page-header">
        <div>
          <h1>Supplier Ledger</h1>

          <p>
            View supplier transactions and outstanding
            payable.
          </p>
        </div>

        <button
          className="secondary-btn"
          onClick={() => navigate("/suppliers")}
        >
          ← Back to Suppliers
        </button>
      </div>

      {/* SUPPLIER INFORMATION */}
      <div className="suppliers-card">
        <h2>{supplier.name}</h2>

        <div className="form-grid">
          <div>
            <strong>Phone</strong>
            <p>{supplier.phone || "-"}</p>
          </div>

          <div>
            <strong>Address</strong>
            <p>{supplier.address || "-"}</p>
          </div>
        </div>
      </div>

      {/* SUMMARY */}
      {summary && (
        <div className="dashboard-grid">

          <div className="dashboard-card">
            <div>
              <p>Opening Balance</p>

              <h2>
                {currency}{" "}
                {Number(
                  summary.opening_balance || 0
                ).toLocaleString()}
              </h2>
            </div>
          </div>

          <div className="dashboard-card">
            <div>
              <p>Total Debit</p>

              <h2>
                {currency}{" "}
                {Number(
                  summary.total_debit || 0
                ).toLocaleString()}
              </h2>
            </div>
          </div>

          <div className="dashboard-card">
            <div>
              <p>Total Credit</p>

              <h2>
                {currency}{" "}
                {Number(
                  summary.total_credit || 0
                ).toLocaleString()}
              </h2>
            </div>
          </div>

          <div className="dashboard-card">
            <div>
              <p>Current Payable</p>

              <h2>
                {currency}{" "}
                {Number(
                  summary.current_payable || 0
                ).toLocaleString()}
              </h2>
            </div>
          </div>

        </div>
      )}

      {/* PAYMENT FORM */}
      <div className="suppliers-card">

        <h2>Record Supplier Payment</h2>

        <form onSubmit={handleSupplierPayment}>

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
                <option value="cash">
                  Cash
                </option>

                <option value="bank">
                  Bank
                </option>

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
                  setPaymentDescription(
                    e.target.value
                  )
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
                : "Record Payment"}
            </button>

          </div>

        </form>
      </div>

      {/* TRANSACTION HISTORY */}
      <div className="suppliers-card">

        <h2>Transaction History</h2>

        {transactions.length === 0 ? (
          <p>No transactions found.</p>
        ) : (
          <div className="table-wrapper">

            <table>

              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Amount</th>
                  <th>Payment Method</th>
                  <th>Purchase Invoice</th>
                  <th>Description</th>
                </tr>
              </thead>

              <tbody>

                {transactions.map(
                  (transaction) => (
                    <tr key={transaction.id}>

                      <td>
                        {transaction.created_at
                          ? new Date(
                              transaction.created_at
                            ).toLocaleString()
                          : "-"}
                      </td>

                      <td>
                        <span
                          className={
                            transaction.transaction_type ===
                            "debit"
                              ? "status-danger"
                              : "status-success"
                          }
                        >
                          {transaction.transaction_type}
                        </span>
                      </td>

                      <td>
                        {currency}{" "}
                        {Number(
                          transaction.amount || 0
                        ).toLocaleString()}
                      </td>

                      <td>
                        {transaction.payment_method ||
                          "-"}
                      </td>

                      <td>
                        {transaction.invoice_number ||
                          "-"}
                      </td>

                      <td>
                        {transaction.description ||
                          "-"}
                      </td>

                    </tr>
                  )
                )}

              </tbody>

            </table>

          </div>
        )}

      </div>

    </div>
  );
}

export default SupplierLedger;

