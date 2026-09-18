import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BadgeDollarSign,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  FileCheck2,
  FileText,
  History,
  Package,
  RefreshCcw,
  RotateCcw,
  Search,
  UserRound,
  WalletCards,
  X,
} from "lucide-react";

import api from "../services/api";
import { useSettings } from "../context/SettingsContext";
import { useNotification } from "../context/NotificationContext";

function Returns() {
  const { currency } = useSettings();
  const { showSuccess, showError } = useNotification();

  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);

  const [invoices, setInvoices] = useState([]);
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [invoiceId, setInvoiceId] = useState("");

  const [returnQuantities, setReturnQuantities] = useState({});
  const [refundMethod, setRefundMethod] = useState("cash");
  const [reason, setReason] = useState("");

  const [processingReturn, setProcessingReturn] = useState(false);

  const fetchReturns = async () => {
    try {
      setLoading(true);

      const response = await api.get("/returns");

      setReturns(response.data.data || []);
    } catch (error) {
      showError(
        error.response?.data?.message ||
          "Failed to load returns"
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchInvoices = async () => {
    try {
      const response = await api.get("/invoices");

      setInvoices(response.data.data || []);
    } catch (error) {
      showError(
        error.response?.data?.message ||
          "Failed to load invoices"
      );
    }
  };

  const handleInvoiceSelect = async (id) => {
    setInvoiceId(id);

    setReturnQuantities({});
    setRefundMethod("cash");
    setReason("");

    if (!id) {
      setSelectedInvoice(null);
      return;
    }

    try {
      setInvoiceLoading(true);

      const response = await api.get(`/invoices/${id}`);

      setSelectedInvoice(response.data.data);
    } catch (error) {
      showError(
        error.response?.data?.message ||
          "Failed to load invoice"
      );

      setSelectedInvoice(null);
    } finally {
      setInvoiceLoading(false);
    }
  };

  useEffect(() => {
    fetchReturns();
    fetchInvoices();
  }, []);

  const refundTotal =
    selectedInvoice?.items?.reduce((total, item) => {
      const quantity = Number(
        returnQuantities[item.product_id] || 0
      );

      return (
        total +
        quantity * Number(item.unit_price || 0)
      );
    }, 0) || 0;

  const selectedReturnItems = Object.values(
    returnQuantities
  ).filter((quantity) => Number(quantity) > 0).length;

  const handleReturnQuantityChange = (
    productId,
    quantity,
    maxQuantity
  ) => {
    let value = Number(quantity);

    if (value < 0) {
      value = 0;
    }

    if (value > maxQuantity) {
      value = maxQuantity;
    }

    setReturnQuantities((current) => ({
      ...current,
      [productId]: value,
    }));
  };

  const handleSubmitReturn = async (e) => {
    e.preventDefault();

    if (!invoiceId) {
      showError("Please select an invoice");
      return;
    }

    const items = Object.entries(returnQuantities)
      .filter(([, quantity]) => Number(quantity) > 0)
      .map(([productId, quantity]) => ({
        product_id: Number(productId),
        quantity: Number(quantity),
      }));

    if (items.length === 0) {
      showError("Please select at least one product to return");
      return;
    }

    if (refundTotal <= 0) {
      showError("Refund amount must be greater than zero");
      return;
    }

    try {
      setProcessingReturn(true);

      const response = await api.post("/returns", {
        invoice_id: Number(invoiceId),
        items,
        refund_method: refundMethod,
        reason: reason.trim() || "Customer return",
      });

      showSuccess(
        response.data.message ||
          "Return processed successfully"
      );

      setInvoiceId("");
      setSelectedInvoice(null);
      setReturnQuantities({});
      setRefundMethod("cash");
      setReason("");

      await fetchReturns();
      await fetchInvoices();
    } catch (error) {
      showError(
        error.response?.data?.message ||
          "Failed to process return"
      );
    } finally {
      setProcessingReturn(false);
    }
  };

  const formatMoney = (amount) =>
    Number(amount || 0).toLocaleString();

  const getPaymentLabel = (method) => {
    const labels = {
      cash: "Cash",
      bank: "Bank",
      easypaisa: "Easypaisa",
      jazzcash: "JazzCash",
    };

    return labels[method] || method || "-";
  };

  const getPaymentClass = (method) => {
    const classes = {
      cash: "return-payment-badge cash",
      bank: "return-payment-badge bank",
      easypaisa: "return-payment-badge easypaisa",
      jazzcash: "return-payment-badge jazzcash",
    };

    return classes[method] || "return-payment-badge";
  };

  return (
    <div className="returns-page">
      {/* PAGE HEADER */}

      <div className="returns-page-header">
        <div className="returns-header-content">
          <div className="returns-eyebrow">
            <RotateCcw size={14} />
            RETURN MANAGEMENT
          </div>

          <h1>Returns & Refunds</h1>

          <p>
            Process customer returns, manage refunds, and review
            return history.
          </p>
        </div>

        <div className="returns-header-badge">
          <RefreshCcw size={18} />
          <span>Return Processing</span>
        </div>
      </div>

      {/* SUMMARY CARDS */}

      <div className="returns-summary-grid">
        <div className="returns-summary-card blue">
          <div className="returns-summary-top">
            <div className="returns-summary-icon blue">
              <History size={21} />
            </div>

            <span className="returns-summary-label">
              Total Returns
            </span>
          </div>

          <strong className="returns-summary-value">
            {returns.length}
          </strong>

          <span className="returns-summary-footer">
            Recorded return transactions
          </span>
        </div>

        <div className="returns-summary-card red">
          <div className="returns-summary-top">
            <div className="returns-summary-icon red">
              <BadgeDollarSign size={21} />
            </div>

            <span className="returns-summary-label">
              Total Refunds
            </span>
          </div>

          <strong className="returns-summary-value">
            {currency}{" "}
            {formatMoney(
              returns.reduce(
                (total, item) =>
                  total + Number(item.total_refund || 0),
                0
              )
            )}
          </strong>

          <span className="returns-summary-footer">
            Refund amount processed
          </span>
        </div>

        <div className="returns-summary-card amber">
          <div className="returns-summary-top">
            <div className="returns-summary-icon amber">
              <FileCheck2 size={21} />
            </div>

            <span className="returns-summary-label">
              Available Invoices
            </span>
          </div>

          <strong className="returns-summary-value">
            {invoices.length}
          </strong>

          <span className="returns-summary-footer">
            Invoices available for returns
          </span>
        </div>
      </div>

      {/* SELECT INVOICE */}

      <div className="return-workspace">
        <div className="return-workspace-header">
          <div>
            <div className="return-section-title">
              <span className="return-section-icon blue">
                <Search size={18} />
              </span>

              Select Invoice
            </div>

            <p>
              Select the original invoice to start processing a
              customer return.
            </p>
          </div>

          <div className="return-status-badge">
            <span />
            Ready
          </div>
        </div>

        <div className="return-invoice-selector">
          <div className="return-form-group">
            <label>
              <FileText size={14} />
              Invoice
            </label>

            <select
              value={invoiceId}
              onChange={(e) =>
                handleInvoiceSelect(e.target.value)
              }
              disabled={invoiceLoading || processingReturn}
            >
              <option value="">
                Select an invoice
              </option>

              {invoices.map((invoice) => (
                <option
                  key={invoice.id}
                  value={invoice.id}
                >
                  {invoice.invoice_number} -{" "}
                  {invoice.customer_name ||
                    "Walk-in Customer"}{" "}
                  - {currency}{" "}
                  {formatMoney(invoice.grand_total)}
                </option>
              ))}
            </select>
          </div>

          {invoiceLoading && (
            <div className="return-loading-inline">
              <RefreshCcw size={16} className="return-spin" />
              Loading invoice details...
            </div>
          )}
        </div>
      </div>

      {/* INVOICE DETAILS */}

      {selectedInvoice && (
        <div className="return-workspace return-details-workspace">
          <div className="return-workspace-header">
            <div>
              <div className="return-section-title">
                <span className="return-section-icon blue">
                  <FileCheck2 size={18} />
                </span>

                Invoice Details
              </div>

              <p>
                Review invoice information and choose products
                to return.
              </p>
            </div>

            <div className="return-invoice-number">
              <FileText size={15} />
              {selectedInvoice.invoice.invoice_number}
            </div>
          </div>

          {/* INVOICE INFO */}

          <div className="return-invoice-info-grid">
            <div className="return-info-card">
              <div className="return-info-icon blue">
                <FileText size={18} />
              </div>

              <div>
                <span>Invoice</span>
                <strong>
                  {selectedInvoice.invoice.invoice_number}
                </strong>
              </div>
            </div>

            <div className="return-info-card">
              <div className="return-info-icon purple">
                <UserRound size={18} />
              </div>

              <div>
                <span>Customer</span>
                <strong>
                  {selectedInvoice.invoice.customer_name ||
                    "Walk-in Customer"}
                </strong>
              </div>
            </div>

            <div className="return-info-card">
              <div className="return-info-icon green">
                <CircleDollarSign size={18} />
              </div>

              <div>
                <span>Invoice Total</span>
                <strong>
                  {currency}{" "}
                  {formatMoney(
                    selectedInvoice.invoice.grand_total
                  )}
                </strong>
              </div>
            </div>

            <div className="return-info-card">
              <div className="return-info-icon amber">
                <WalletCards size={18} />
              </div>

              <div>
                <span>Paid</span>
                <strong>
                  {currency}{" "}
                  {formatMoney(
                    selectedInvoice.invoice.paid_amount
                  )}
                </strong>
              </div>
            </div>

            <div className="return-info-card">
              <div className="return-info-icon red">
                <BadgeDollarSign size={18} />
              </div>

              <div>
                <span>Due</span>
                <strong>
                  {currency}{" "}
                  {formatMoney(
                    selectedInvoice.invoice.due_amount
                  )}
                </strong>
              </div>
            </div>
          </div>

          {/* PRODUCTS */}

          <form onSubmit={handleSubmitReturn}>
            <div className="return-products-section">
              <div className="return-section-heading-row">
                <div>
                  <h3>
                    <Package size={18} />
                    Products
                  </h3>

                  <p>
                    Enter the quantity you want to return for
                    each product.
                  </p>
                </div>

                <span className="return-selected-count">
                  {selectedReturnItems} selected
                </span>
              </div>

              <div className="return-table-wrapper">
                <table className="return-table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Quantity Sold</th>
                      <th>Return Quantity</th>
                      <th>Unit Price</th>
                      <th className="return-th-right">
                        Return Total
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {selectedInvoice.items.map((item) => {
                      const returnQuantity = Number(
                        returnQuantities[item.product_id] || 0
                      );

                      const itemRefund =
                        returnQuantity *
                        Number(item.unit_price || 0);

                      return (
                        <tr key={item.id}>
                          <td>
                            <div className="return-product-cell">
                              <div className="return-product-icon">
                                <Package size={17} />
                              </div>

                              <div>
                                <strong>
                                  {item.product_name}
                                </strong>

                                <span>
                                  Product #{item.product_id}
                                </span>
                              </div>
                            </div>
                          </td>

                          <td>
                            <span className="return-sold-qty">
                              {item.quantity}
                            </span>
                          </td>

                          <td>
                            <div className="return-qty-control">
                              <input
                                type="number"
                                min="0"
                                max={item.quantity}
                                value={returnQuantity}
                                onChange={(e) =>
                                  handleReturnQuantityChange(
                                    item.product_id,
                                    e.target.value,
                                    item.quantity
                                  )
                                }
                                className="return-quantity-input"
                                disabled={processingReturn}
                              />

                              <span>
                                max {item.quantity}
                              </span>
                            </div>
                          </td>

                          <td>
                            <span className="return-money">
                              {currency}{" "}
                              {formatMoney(item.unit_price)}
                            </span>
                          </td>

                          <td className="return-total-cell">
                            <strong>
                              {currency}{" "}
                              {formatMoney(itemRefund)}
                            </strong>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* REFUND DETAILS */}

            <div className="return-refund-section">
              <div className="return-section-heading-row">
                <div>
                  <h3>
                    <WalletCards size={18} />
                    Refund Details
                  </h3>

                  <p>
                    Select the refund method and provide a
                    reason for the return.
                  </p>
                </div>
              </div>

              <div className="return-refund-grid">
                <div className="return-form-group">
                  <label>
                    <WalletCards size={14} />
                    Refund Method
                  </label>

                  <select
                    value={refundMethod}
                    onChange={(e) =>
                      setRefundMethod(e.target.value)
                    }
                    disabled={processingReturn}
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

                  <span
                    className={getPaymentClass(refundMethod)}
                  >
                    {getPaymentLabel(refundMethod)}
                  </span>
                </div>

                <div className="return-form-group">
                  <label>
                    <FileText size={14} />
                    Reason
                  </label>

                  <input
                    type="text"
                    value={reason}
                    onChange={(e) =>
                      setReason(e.target.value)
                    }
                    placeholder="e.g. Damaged product"
                    disabled={processingReturn}
                  />
                </div>
              </div>
            </div>

            {/* REFUND SUMMARY */}

            <div className="return-refund-summary">
              <div className="return-refund-summary-left">
                <div className="return-refund-summary-icon">
                  <CircleDollarSign size={24} />
                </div>

                <div>
                  <span>Total Refund Amount</span>

                  <small>
                    {selectedReturnItems} product
                    {selectedReturnItems !== 1 ? "s" : ""}{" "}
                    selected for return
                  </small>
                </div>
              </div>

              <strong>
                {currency} {refundTotal.toLocaleString()}
              </strong>
            </div>

            {/* ACTIONS */}

            <div className="return-form-actions">
              <button
                type="submit"
                className="return-process-btn"
                disabled={processingReturn}
              >
                {processingReturn ? (
                  <>
                    <RefreshCcw
                      size={17}
                      className="return-spin"
                    />
                    Processing...
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={17} />
                    Process Return
                  </>
                )}
              </button>

              <button
                type="button"
                className="return-cancel-btn"
                disabled={processingReturn}
                onClick={() =>
                  handleInvoiceSelect("")
                }
              >
                <X size={17} />
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* RETURN HISTORY */}

      <div className="return-history-card">
        <div className="return-history-header">
          <div>
            <div className="return-section-title">
              <span className="return-section-icon purple">
                <History size={18} />
              </span>

              Return History
            </div>

            <p>
              Review all previously processed customer returns
              and refunds.
            </p>
          </div>

          <span className="return-history-count">
            {returns.length} record
            {returns.length !== 1 ? "s" : ""}
          </span>
        </div>

        {loading ? (
          <div className="return-state-card">
            <RefreshCcw
              size={25}
              className="return-spin"
            />
            <strong>Loading returns...</strong>
            <span>
              Please wait while return history is loaded.
            </span>
          </div>
        ) : returns.length === 0 ? (
          <div className="return-state-card">
            <div className="return-empty-icon">
              <History size={28} />
            </div>

            <strong>No returns found</strong>

            <span>
              Process your first customer return to see it here.
            </span>
          </div>
        ) : (
          <div className="return-history-table-wrapper">
            <table className="return-history-table">
              <thead>
                <tr>
                  <th>Return Number</th>
                  <th>Invoice</th>
                  <th>Customer</th>
                  <th>Refund</th>
                  <th>Method</th>
                  <th>Reason</th>
                  <th>Date</th>
                </tr>
              </thead>

              <tbody>
                {returns.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div className="return-number-cell">
                        <div className="return-row-icon">
                          <RotateCcw size={16} />
                        </div>

                        <strong>
                          {item.return_number}
                        </strong>
                      </div>
                    </td>

                    <td>
                      <span className="return-invoice-badge">
                        {item.invoice_number || "-"}
                      </span>
                    </td>

                    <td>
                      <div className="return-customer-cell">
                        <div className="return-customer-avatar">
                          <UserRound size={15} />
                        </div>

                        <span>
                          {item.customer_name ||
                            "Walk-in Customer"}
                        </span>
                      </div>
                    </td>

                    <td>
                      <strong className="return-history-refund">
                        {currency}{" "}
                        {formatMoney(item.total_refund)}
                      </strong>
                    </td>

                    <td>
                      <span
                        className={getPaymentClass(
                          item.refund_method
                        )}
                      >
                        {getPaymentLabel(
                          item.refund_method
                        )}
                      </span>
                    </td>

                    <td>
                      <span className="return-reason">
                        {item.reason || "-"}
                      </span>
                    </td>

                    <td>
                      <div className="return-date-cell">
                        <CalendarDays size={14} />

                        {item.created_at
                          ? new Date(
                              item.created_at
                            ).toLocaleString()
                          : "-"}
                      </div>
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

export default Returns;