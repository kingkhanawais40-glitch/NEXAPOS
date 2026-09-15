import { useEffect, useState } from "react";
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

      const response = await api.get(
        `/invoices/${id}`
      );

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

  return (
    <div className="returns-page">
      <div className="page-header">
        <div>
          <h1>Returns</h1>
          <p>Manage sale returns and refunds.</p>
        </div>
      </div>

      {/* SELECT INVOICE */}

      <div className="suppliers-card">
        <h2>Select Invoice</h2>

        <div className="form-group">
          <label>Invoice</label>

          <select
            value={invoiceId}
            onChange={(e) =>
              handleInvoiceSelect(e.target.value)
            }
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
                {Number(
                  invoice.grand_total || 0
                ).toLocaleString()}
              </option>
            ))}
          </select>
        </div>

        {invoiceLoading && (
          <p>Loading invoice...</p>
        )}
      </div>

      {/* INVOICE DETAILS */}

      {selectedInvoice && (
        <div className="suppliers-card">
          <h2>Invoice Details</h2>

          <div className="form-grid">
            <div>
              <strong>Invoice:</strong>{" "}
              {selectedInvoice.invoice.invoice_number}
            </div>

            <div>
              <strong>Customer:</strong>{" "}
              {selectedInvoice.invoice.customer_name ||
                "Walk-in Customer"}
            </div>

            <div>
              <strong>Total:</strong> {currency}{" "}
              {Number(
                selectedInvoice.invoice.grand_total || 0
              ).toLocaleString()}
            </div>

            <div>
              <strong>Paid:</strong> {currency}{" "}
              {Number(
                selectedInvoice.invoice.paid_amount || 0
              ).toLocaleString()}
            </div>

            <div>
              <strong>Due:</strong> {currency}{" "}
              {Number(
                selectedInvoice.invoice.due_amount || 0
              ).toLocaleString()}
            </div>
          </div>

          <h3>Products</h3>

          <form onSubmit={handleSubmitReturn}>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Quantity Sold</th>
                    <th>Return Quantity</th>
                    <th>Unit Price</th>
                    <th>Total</th>
                  </tr>
                </thead>

                <tbody>
                  {selectedInvoice.items.map((item) => (
                    <tr key={item.id}>
                      <td>{item.product_name}</td>

                      <td>{item.quantity}</td>

                      <td>
                        <input
                          type="number"
                          min="0"
                          max={item.quantity}
                          value={
                            returnQuantities[
                              item.product_id
                            ] || 0
                          }
                          onChange={(e) =>
                            handleReturnQuantityChange(
                              item.product_id,
                              e.target.value,
                              item.quantity
                            )
                          }
                          className="return-quantity-input"
                        />
                      </td>

                      <td>
                        {currency}{" "}
                        {Number(
                          item.unit_price || 0
                        ).toLocaleString()}
                      </td>

                      <td>
                        {currency}{" "}
                        {Number(
                          item.total || 0
                        ).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* REFUND SUMMARY */}

            <div className="form-grid">
              <div className="form-group">
                <label>Refund Method</label>

                <select
                  value={refundMethod}
                  onChange={(e) =>
                    setRefundMethod(e.target.value)
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
                <label>Reason</label>

                <input
                  type="text"
                  value={reason}
                  onChange={(e) =>
                    setReason(e.target.value)
                  }
                  placeholder="e.g. Damaged product"
                />
              </div>
            </div>

            <div className="form-actions">
              <strong>
                Refund Amount: {currency}{" "}
                {refundTotal.toLocaleString()}
              </strong>
            </div>

            <div className="form-actions">
              <button
                type="submit"
                className="primary-btn"
                disabled={processingReturn}
              >
                {processingReturn
                  ? "Processing..."
                  : "Process Return"}
              </button>

              <button
                type="button"
                className="secondary-btn"
                disabled={processingReturn}
                onClick={() =>
                  handleInvoiceSelect("")
                }
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* RETURN HISTORY */}

      <div className="suppliers-card">
        <h2>Return History</h2>

        {loading ? (
          <p>Loading returns...</p>
        ) : returns.length === 0 ? (
          <p>No returns found.</p>
        ) : (
          <div className="table-wrapper">
            <table>
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
                      {item.return_number}
                    </td>

                    <td>
                      {item.invoice_number || "-"}
                    </td>

                    <td>
                      {item.customer_name ||
                        "Walk-in Customer"}
                    </td>

                    <td>
                      {currency}{" "}
                      {Number(
                        item.total_refund || 0
                      ).toLocaleString()}
                    </td>

                    <td>
                      {item.refund_method || "-"}
                    </td>

                    <td>
                      {item.reason || "-"}
                    </td>

                    <td>
                      {item.created_at
                        ? new Date(
                            item.created_at
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

export default Returns;

