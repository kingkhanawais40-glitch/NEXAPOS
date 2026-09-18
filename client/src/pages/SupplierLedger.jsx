import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowDownLeft,
  ArrowUpRight,
  CreditCard,
  Truck,
  Phone,
  MapPin,
  Wallet,
  ReceiptText,
  CalendarDays,
  CheckCircle2,
  Loader2,
  Banknote,
  Smartphone,
} from "lucide-react";

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
        <div className="supplier-ledger-loading">
          <div className="supplier-ledger-loading-icon">
            <Loader2 size={28} />
          </div>

          <h3>Loading Supplier Ledger</h3>

          <p>
            Please wait while the account information is loaded.
          </p>
        </div>
      </div>
    );
  }

  if (!supplier) {
    return (
      <div className="supplier-ledger-page">
        <div className="supplier-ledger-empty">
          <div className="supplier-ledger-empty-icon">
            <Truck size={30} />
          </div>

          <h3>Supplier Ledger Not Found</h3>

          <p>
            The requested supplier account could not be loaded.
          </p>

          <button
            className="supplier-ledger-back-btn"
            onClick={() => navigate("/suppliers")}
          >
            <ArrowLeft size={17} />
            Back to Suppliers
          </button>
        </div>
      </div>
    );
  }

  const formatMoney = (value) => {
    return `${currency} ${Number(value || 0).toLocaleString()}`;
  };

  const formatPaymentMethod = (method) => {
    if (!method) return "-";

    const labels = {
      cash: "Cash",
      bank: "Bank",
      easypaisa: "Easypaisa",
      jazzcash: "JazzCash",
    };

    return labels[method] || method;
  };

  const getPaymentIcon = (method) => {
    if (method === "cash") {
      return <Banknote size={15} />;
    }

    if (
      method === "easypaisa" ||
      method === "jazzcash"
    ) {
      return <Smartphone size={15} />;
    }

    return <CreditCard size={15} />;
  };

  return (
    <div className="supplier-ledger-page">

      {/* HEADER */}

      <div className="supplier-ledger-header">

        <div className="supplier-ledger-header-left">

          <button
            className="supplier-ledger-back-icon"
            onClick={() => navigate("/suppliers")}
            title="Back to Suppliers"
          >
            <ArrowLeft size={19} />
          </button>

          <div className="supplier-ledger-heading">

            <div className="supplier-ledger-eyebrow">
              <ReceiptText size={14} />
              SUPPLIER ACCOUNT
            </div>

            <h1>Supplier Ledger</h1>

            <div className="supplier-ledger-meta">

              <span className="supplier-ledger-name">
                <Truck size={15} />
                {supplier.name}
              </span>

              {supplier.phone && (
                <span className="supplier-ledger-phone">
                  <Phone size={14} />
                  {supplier.phone}
                </span>
              )}

            </div>

          </div>

        </div>

        <div className="supplier-ledger-header-badge">
          <Wallet size={17} />
          Payable Statement
        </div>

      </div>

      {/* SUPPLIER INFORMATION */}

      <div className="supplier-info-card">

        <div className="supplier-info-main">

          <div className="supplier-info-avatar">
            <Truck size={22} />
          </div>

          <div>
            <span className="supplier-info-label">
              Supplier
            </span>

            <h2>{supplier.name}</h2>
          </div>

        </div>

        <div className="supplier-info-details">

          <div className="supplier-info-detail">

            <Phone size={16} />

            <div>
              <span>Phone</span>
              <strong>
                {supplier.phone || "Not provided"}
              </strong>
            </div>

          </div>

          <div className="supplier-info-detail">

            <MapPin size={16} />

            <div>
              <span>Address</span>
              <strong>
                {supplier.address || "Not provided"}
              </strong>
            </div>

          </div>

        </div>

      </div>

      {/* SUMMARY */}

      {summary && (
        <div className="supplier-ledger-summary-grid">

          <div className="supplier-ledger-summary-card opening">

            <div className="supplier-ledger-summary-top">

              <div className="supplier-ledger-summary-icon">
                <Wallet size={20} />
              </div>

              <span>Opening Balance</span>

            </div>

            <div className="supplier-ledger-summary-value">
              {formatMoney(summary.opening_balance)}
            </div>

            <div className="supplier-ledger-summary-footer">
              Starting supplier balance
            </div>

          </div>

          <div className="supplier-ledger-summary-card debit">

            <div className="supplier-ledger-summary-top">

              <div className="supplier-ledger-summary-icon">
                <ArrowUpRight size={20} />
              </div>

              <span>Total Debit</span>

            </div>

            <div className="supplier-ledger-summary-value">
              {formatMoney(summary.total_debit)}
            </div>

            <div className="supplier-ledger-summary-footer">
              Purchases and payable added
            </div>

          </div>

          <div className="supplier-ledger-summary-card credit">

            <div className="supplier-ledger-summary-top">

              <div className="supplier-ledger-summary-icon">
                <ArrowDownLeft size={20} />
              </div>

              <span>Total Credit</span>

            </div>

            <div className="supplier-ledger-summary-value">
              {formatMoney(summary.total_credit)}
            </div>

            <div className="supplier-ledger-summary-footer">
              Payments made to supplier
            </div>

          </div>

          <div className="supplier-ledger-summary-card payable">

            <div className="supplier-ledger-summary-top">

              <div className="supplier-ledger-summary-icon">
                <CreditCard size={20} />
              </div>

              <span>Current Payable</span>

            </div>

            <div className="supplier-ledger-summary-value">
              {formatMoney(summary.current_payable)}
            </div>

            <div className="supplier-ledger-summary-footer">
              Outstanding supplier payable
            </div>

          </div>

        </div>
      )}

      {/* PAYMENT FORM */}

      <div className="supplier-payment-card">

        <div className="supplier-ledger-section-header">

          <div className="supplier-ledger-section-heading">

            <div className="supplier-ledger-section-icon payment">
              <ArrowDownLeft size={20} />
            </div>

            <div>
              <h2>Record Supplier Payment</h2>

              <p>
                Record a payment against this supplier's outstanding payable.
              </p>
            </div>

          </div>

          {summary && (
            <div className="supplier-payable-indicator">

              <span>Current Payable</span>

              <strong>
                {formatMoney(summary.current_payable)}
              </strong>

            </div>
          )}

        </div>

        <form
          onSubmit={handleSupplierPayment}
          className="supplier-payment-form"
        >

          <div className="supplier-ledger-form-group">

            <label>
              Payment Amount
            </label>

            <div className="supplier-money-input">

              <span>{currency}</span>

              <input
                type="number"
                min="1"
                value={paymentAmount}
                onChange={(e) =>
                  setPaymentAmount(e.target.value)
                }
                placeholder="0"
              />

            </div>

          </div>

          <div className="supplier-ledger-form-group">

            <label>
              Payment Method
            </label>

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

          <div className="supplier-ledger-form-group supplier-description-group">

            <label>
              Description
            </label>

            <input
              type="text"
              value={paymentDescription}
              onChange={(e) =>
                setPaymentDescription(e.target.value)
              }
              placeholder="Optional payment description"
            />

          </div>

          <div className="supplier-payment-action">

            <button
              type="submit"
              className="supplier-record-payment-btn"
              disabled={processingPayment}
            >
              {processingPayment ? (
                <>
                  <Loader2
                    size={17}
                    className="supplier-ledger-spin"
                  />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle2 size={17} />
                  Record Payment
                </>
              )}
            </button>

          </div>

        </form>

      </div>

      {/* TRANSACTION HISTORY */}

      <div className="supplier-history-card">

        <div className="supplier-ledger-section-header">

          <div className="supplier-ledger-section-heading">

            <div className="supplier-ledger-section-icon history">
              <ReceiptText size={20} />
            </div>

            <div>
              <h2>Transaction History</h2>

              <p>
                Complete debit and credit activity for this supplier.
              </p>
            </div>

          </div>

          <div className="supplier-transaction-count">
            {transactions.length}{" "}
            {transactions.length === 1
              ? "Transaction"
              : "Transactions"}
          </div>

        </div>

        {transactions.length === 0 ? (
          <div className="supplier-empty-history">

            <div className="supplier-empty-history-icon">
              <ReceiptText size={28} />
            </div>

            <h3>No Transactions Found</h3>

            <p>
              There are no transactions recorded for this supplier yet.
            </p>

          </div>
        ) : (
          <div className="supplier-ledger-table-wrapper">

            <table className="supplier-ledger-table">

              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th className="supplier-th-right">
                    Amount
                  </th>
                  <th>Payment Method</th>
                  <th>Purchase Invoice</th>
                  <th>Description</th>
                </tr>
              </thead>

              <tbody>

                {transactions.map((transaction) => {

                  const isDebit =
                    transaction.transaction_type ===
                    "debit";

                  return (
                    <tr key={transaction.id}>

                      <td>

                        <div className="supplier-ledger-date">

                          <CalendarDays size={14} />

                          <span>
                            {transaction.created_at
                              ? new Date(
                                  transaction.created_at
                                ).toLocaleString()
                              : "-"}
                          </span>

                        </div>

                      </td>

                      <td>

                        <span
                          className={
                            isDebit
                              ? "supplier-ledger-type debit"
                              : "supplier-ledger-type credit"
                          }
                        >
                          {isDebit ? (
                            <ArrowUpRight size={14} />
                          ) : (
                            <ArrowDownLeft size={14} />
                          )}

                          {isDebit
                            ? "Debit"
                            : "Credit"}
                        </span>

                      </td>

                      <td className="supplier-ledger-amount">

                        <span
                          className={
                            isDebit
                              ? "supplier-amount-debit"
                              : "supplier-amount-credit"
                          }
                        >
                          {formatMoney(
                            transaction.amount
                          )}
                        </span>

                      </td>

                      <td>

                        {transaction.payment_method ? (
                          <span
                            className={`supplier-payment-method ${transaction.payment_method}`}
                          >
                            {getPaymentIcon(
                              transaction.payment_method
                            )}

                            {formatPaymentMethod(
                              transaction.payment_method
                            )}
                          </span>
                        ) : (
                          <span className="supplier-ledger-muted">
                            —
                          </span>
                        )}

                      </td>

                      <td>

                        {transaction.invoice_number ? (
                          <span className="supplier-invoice">
                            {transaction.invoice_number}
                          </span>
                        ) : (
                          <span className="supplier-ledger-muted">
                            —
                          </span>
                        )}

                      </td>

                      <td>

                        <span className="supplier-ledger-description">
                          {transaction.description || "—"}
                        </span>

                      </td>

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

export default SupplierLedger;