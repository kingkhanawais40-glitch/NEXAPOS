import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowDownLeft,
  ArrowUpRight,
  CreditCard,
  User,
  Phone,
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
      <div className="customer-ledger-page">
        <div className="ledger-loading-card">
          <div className="ledger-loading-icon">
            <Loader2 size={28} />
          </div>

          <h3>Loading Customer Ledger</h3>
          <p>Please wait while the account information is loaded.</p>
        </div>
      </div>
    );
  }

  if (!ledger) {
    return (
      <div className="customer-ledger-page">
        <div className="ledger-empty-card">
          <div className="ledger-empty-icon">
            <User size={30} />
          </div>

          <h3>Customer Ledger Not Found</h3>
          <p>
            The requested customer account could not be loaded.
          </p>

          <button
            className="ledger-back-btn"
            onClick={() => navigate("/customers")}
          >
            <ArrowLeft size={17} />
            Back to Customers
          </button>
        </div>
      </div>
    );
  }

  const customer = ledger.customer;
  const summary = ledger.summary;
  const rawTransactions = ledger.transactions || [];

  // Transactions arrive newest-first.
  // Build running balance from oldest-to-newest.
  const chronological = [...rawTransactions].reverse();

  let runningBalance = Number(
    summary.opening_balance || 0
  );

  const balanceById = {};

  chronological.forEach((t) => {
    const amt = Number(t.amount || 0);

    runningBalance +=
      t.transaction_type === "debit"
        ? amt
        : -amt;

    balanceById[t.id] = runningBalance;
  });

  const transactions = rawTransactions.map((t) => ({
    ...t,
    debit:
      t.transaction_type === "debit"
        ? Number(t.amount || 0)
        : 0,
    credit:
      t.transaction_type === "credit"
        ? Number(t.amount || 0)
        : 0,
    running_balance: balanceById[t.id],
  }));

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
    <div className="customer-ledger-page">

      {/* PAGE HEADER */}

      <div className="customer-ledger-header">

        <div className="customer-ledger-header-left">

          <button
            className="ledger-back-icon-btn"
            onClick={() => navigate("/customers")}
            title="Back to Customers"
          >
            <ArrowLeft size={19} />
          </button>

          <div className="customer-ledger-heading">

            <div className="ledger-eyebrow">
              <ReceiptText size={14} />
              ACCOUNT LEDGER
            </div>

            <h1>Customer Ledger</h1>

            <div className="ledger-customer-meta">

              <span className="ledger-customer-name">
                <User size={15} />
                {customer.name}
              </span>

              {customer.phone && (
                <span className="ledger-customer-phone">
                  <Phone size={14} />
                  {customer.phone}
                </span>
              )}

            </div>

          </div>

        </div>

        <div className="ledger-header-badge">
          <Wallet size={17} />
          Financial Statement
        </div>

      </div>

      {/* SUMMARY CARDS */}

      <div className="ledger-summary-grid">

        <div className="ledger-summary-card opening">

          <div className="ledger-summary-top">
            <div className="ledger-summary-icon">
              <Wallet size={20} />
            </div>

            <span className="ledger-summary-label">
              Opening Balance
            </span>
          </div>

          <div className="ledger-summary-value">
            {formatMoney(summary.opening_balance)}
          </div>

          <div className="ledger-summary-footer">
            Starting account balance
          </div>

        </div>

        <div className="ledger-summary-card debit">

          <div className="ledger-summary-top">
            <div className="ledger-summary-icon">
              <ArrowUpRight size={20} />
            </div>

            <span className="ledger-summary-label">
              Total Debit
            </span>
          </div>

          <div className="ledger-summary-value">
            {formatMoney(summary.total_debit)}
          </div>

          <div className="ledger-summary-footer">
            Amount charged to customer
          </div>

        </div>

        <div className="ledger-summary-card credit">

          <div className="ledger-summary-top">
            <div className="ledger-summary-icon">
              <ArrowDownLeft size={20} />
            </div>

            <span className="ledger-summary-label">
              Total Credit
            </span>
          </div>

          <div className="ledger-summary-value">
            {formatMoney(summary.total_credit)}
          </div>

          <div className="ledger-summary-footer">
            Payments received
          </div>

        </div>

        <div className="ledger-summary-card due">

          <div className="ledger-summary-top">
            <div className="ledger-summary-icon">
              <CreditCard size={20} />
            </div>

            <span className="ledger-summary-label">
              Current Due
            </span>
          </div>

          <div className="ledger-summary-value">
            {formatMoney(summary.current_due)}
          </div>

          <div className="ledger-summary-footer">
            Outstanding customer balance
          </div>

        </div>

      </div>

      {/* RECEIVE PAYMENT */}

      <div className="ledger-payment-card">

        <div className="ledger-section-header">

          <div className="ledger-section-heading">

            <div className="ledger-section-icon payment">
              <ArrowDownLeft size={20} />
            </div>

            <div>
              <h2>Receive Customer Payment</h2>
              <p>
                Record a payment against this customer's outstanding balance.
              </p>
            </div>

          </div>

          <div className="ledger-due-indicator">
            <span>Current Due</span>
            <strong>
              {formatMoney(summary.current_due)}
            </strong>
          </div>

        </div>

        <form
          onSubmit={handleCustomerPayment}
          className="ledger-payment-form"
        >

          <div className="ledger-form-group amount">

            <label>
              Payment Amount
            </label>

            <div className="ledger-input-wrapper money-input">

              <span className="currency-prefix">
                {currency}
              </span>

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

          <div className="ledger-form-group">

            <label>
              Payment Method
            </label>

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

          <div className="ledger-form-group description">

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

          <div className="ledger-payment-action">

            <button
              type="submit"
              className="ledger-receive-btn"
              disabled={processingPayment}
            >
              {processingPayment ? (
                <>
                  <Loader2 size={17} className="spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle2 size={17} />
                  Receive Payment
                </>
              )}
            </button>

          </div>

        </form>

      </div>

      {/* TRANSACTION HISTORY */}

      <div className="ledger-history-card">

        <div className="ledger-history-header">

          <div className="ledger-section-heading">

            <div className="ledger-section-icon history">
              <ReceiptText size={20} />
            </div>

            <div>
              <h2>Transaction History</h2>
              <p>
                Complete debit and credit activity for this account.
              </p>
            </div>

          </div>

          <div className="ledger-transaction-count">
            {transactions.length}{" "}
            {transactions.length === 1
              ? "Transaction"
              : "Transactions"}
          </div>

        </div>

        {transactions.length === 0 ? (
          <div className="ledger-empty-history">

            <div className="ledger-empty-history-icon">
              <ReceiptText size={28} />
            </div>

            <h3>No Transactions Found</h3>

            <p>
              There are no transactions recorded for this customer yet.
            </p>

          </div>
        ) : (
          <div className="ledger-table-wrapper">

            <table className="ledger-table">

              <thead>
                <tr>
                  <th>Date</th>
                  <th>Invoice</th>
                  <th>Payment Method</th>
                  <th className="ledger-th-right">
                    Debit
                  </th>
                  <th className="ledger-th-right">
                    Credit
                  </th>
                  <th>Description</th>
                  <th className="ledger-th-right">
                    Running Balance
                  </th>
                </tr>
              </thead>

              <tbody>

                {transactions.map((transaction) => (

                  <tr key={transaction.id}>

                    <td>
                      <div className="ledger-date-cell">
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
                      {transaction.invoice_number ? (
                        <span className="ledger-invoice">
                          {transaction.invoice_number}
                        </span>
                      ) : (
                        <span className="ledger-muted">
                          —
                        </span>
                      )}
                    </td>

                    <td>

                      {transaction.payment_method ? (
                        <span
                          className={`ledger-payment-method ${transaction.payment_method}`}
                        >
                          {getPaymentIcon(
                            transaction.payment_method
                          )}

                          {formatPaymentMethod(
                            transaction.payment_method
                          )}
                        </span>
                      ) : (
                        <span className="ledger-muted">
                          —
                        </span>
                      )}

                    </td>

                    <td className="ledger-amount-cell debit-amount">

                      {transaction.debit ? (
                        <>
                          <ArrowUpRight size={14} />
                          {formatMoney(transaction.debit)}
                        </>
                      ) : (
                        "—"
                      )}

                    </td>

                    <td className="ledger-amount-cell credit-amount">

                      {transaction.credit ? (
                        <>
                          <ArrowDownLeft size={14} />
                          {formatMoney(transaction.credit)}
                        </>
                      ) : (
                        "—"
                      )}

                    </td>

                    <td>
                      <span className="ledger-description">
                        {transaction.description || "—"}
                      </span>
                    </td>

                    <td className="ledger-balance-cell">

                      <strong>
                        {formatMoney(
                          transaction.running_balance
                        )}
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