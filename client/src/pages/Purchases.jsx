import { useEffect, useState } from "react";
import api from "../services/api";
import { useSettings } from "../context/SettingsContext";
import { useNotification } from "../context/NotificationContext";
import {
  ShoppingBag,
  Plus,
  Trash2,
  Receipt,
  Package,
  Wallet,
  CircleDollarSign,
  AlertCircle,
  CalendarDays,
  Hash,
  Truck,
} from "lucide-react";

function Purchases() {
  const { currency } = useSettings();
  const { showSuccess, showError } = useNotification();

  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [purchases, setPurchases] = useState([]);

  const [supplierId, setSupplierId] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [paidAmount, setPaidAmount] = useState("");

  const [items, setItems] = useState([]);

  const [selectedProduct, setSelectedProduct] = useState("");
  const [quantity, setQuantity] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [batchNumber, setBatchNumber] = useState("");
  const [expiryDate, setExpiryDate] = useState("");

  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);

      const [
        suppliersResponse,
        productsResponse,
        purchasesResponse,
      ] = await Promise.all([
        api.get("/suppliers"),
        api.get("/products"),
        api.get("/purchases"),
      ]);

      setSuppliers(suppliersResponse.data.data || []);
      setProducts(productsResponse.data.data || []);
      setPurchases(purchasesResponse.data.data || []);
    } catch (error) {
      console.error(
        error.response?.data?.message ||
          "Failed to load purchase data"
      );

      showError(
        error.response?.data?.message ||
          "Failed to load purchase data"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const addItem = () => {
    const product = products.find(
      (item) => item.id === Number(selectedProduct)
    );

    const qty = Number(quantity);
    const price = Number(purchasePrice);

    if (!product) {
      showError("Please select a product");
      return;
    }

    if (!qty || qty <= 0) {
      showError("Enter a valid quantity");
      return;
    }

    if (!price || price <= 0) {
      showError("Enter a valid purchase price");
      return;
    }

    if (!batchNumber.trim()) {
      showError("Please enter batch number");
      return;
    }

    setItems((currentItems) => [
      ...currentItems,
      {
        product_id: product.id,
        product_name: product.name,
        quantity: qty,
        purchase_price: price,
        batch_number: batchNumber.trim(),
        expiry_date: expiryDate || null,
        total: qty * price,
      },
    ]);

    setSelectedProduct("");
    setQuantity("");
    setPurchasePrice("");
    setBatchNumber("");
    setExpiryDate("");
  };

  const removeItem = (index) => {
    setItems((currentItems) =>
      currentItems.filter((_, itemIndex) => itemIndex !== index)
    );
  };

  const subtotal = items.reduce(
    (total, item) => total + item.total,
    0
  );

  const paid = Number(paidAmount) || 0;
  const payable = subtotal - paid;

  const totalItems = items.reduce(
    (total, item) => total + item.quantity,
    0
  );

  const handleCreatePurchase = async (e) => {
    e.preventDefault();

    if (!supplierId) {
      showError("Please select a supplier");
      return;
    }

    if (items.length === 0) {
      showError("Please add at least one product");
      return;
    }

    if (paid < 0 || paid > subtotal) {
      showError("Paid amount cannot be greater than purchase total");
      return;
    }

    try {
      setProcessing(true);

      const response = await api.post("/purchases", {
        supplier_id: Number(supplierId),
        invoice_number:
          invoiceNumber.trim() || undefined,
        payment_method: paymentMethod,
        paid_amount: paid,
        items: items.map((item) => ({
          product_id: item.product_id,
          quantity: item.quantity,
          purchase_price: item.purchase_price,
          batch_number: item.batch_number,
          expiry_date: item.expiry_date,
        })),
      });

      showSuccess(
        response.data.message ||
          "Purchase created successfully"
      );

      setSupplierId("");
      setInvoiceNumber("");
      setPaymentMethod("cash");
      setPaidAmount("");
      setItems([]);

      await fetchData();
    } catch (error) {
      showError(
        error.response?.data?.message ||
          "Failed to create purchase"
      );
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="purchases-page">
        <div className="purchases-page-header">
          <div>
            <span className="purchases-eyebrow">
              PURCHASE MANAGEMENT
            </span>
            <h1>Purchases</h1>
            <p>
              Manage supplier purchases, stock batches and
              payable amounts.
            </p>
          </div>
        </div>

        <div className="purchases-loading-card">
          <div className="purchases-loading-icon">
            <ShoppingBag size={26} />
          </div>
          <h3>Loading purchases...</h3>
          <p>Please wait while purchase data is loaded.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="purchases-page">

      {/* PAGE HEADER */}

      <div className="purchases-page-header">
        <div>
          <span className="purchases-eyebrow">
            PURCHASE MANAGEMENT
          </span>

          <h1>Purchases</h1>

          <p>
            Create purchase invoices, manage stock batches,
            and track supplier payables.
          </p>
        </div>

        <div className="purchases-header-badge">
          <ShoppingBag size={18} />
          <span>Supplier Procurement</span>
        </div>
      </div>

      {/* SUMMARY */}

      <div className="purchases-summary-grid">

        <div className="purchases-summary-card">
          <div className="purchases-summary-icon blue">
            <Receipt size={21} />
          </div>

          <div>
            <span>Total Purchases</span>
            <strong>{purchases.length}</strong>
            <small>Purchase records</small>
          </div>
        </div>

        <div className="purchases-summary-card">
          <div className="purchases-summary-icon green">
            <Package size={21} />
          </div>

          <div>
            <span>Current Items</span>
            <strong>{totalItems}</strong>
            <small>Items in purchase</small>
          </div>
        </div>

        <div className="purchases-summary-card">
          <div className="purchases-summary-icon amber">
            <CircleDollarSign size={21} />
          </div>

          <div>
            <span>Purchase Total</span>
            <strong>
              {currency} {subtotal.toLocaleString()}
            </strong>
            <small>Current purchase</small>
          </div>
        </div>

        <div className="purchases-summary-card">
          <div className="purchases-summary-icon red">
            <Wallet size={21} />
          </div>

          <div>
            <span>Remaining Payable</span>
            <strong>
              {currency}{" "}
              {Math.max(payable, 0).toLocaleString()}
            </strong>
            <small>Supplier payable</small>
          </div>
        </div>

      </div>

      {/* CREATE PURCHASE */}

      <div className="purchase-workspace">

        <div className="purchase-workspace-header">
          <div className="purchase-section-title">
            <div className="purchase-section-icon">
              <Receipt size={20} />
            </div>

            <div>
              <h2>Create Purchase</h2>
              <p>
                Enter supplier and invoice information.
              </p>
            </div>
          </div>

          <span className="purchase-status-badge">
            New Purchase
          </span>
        </div>

        <form
          onSubmit={handleCreatePurchase}
          className="purchase-form"
        >

          {/* PURCHASE INFORMATION */}

          <div className="purchase-form-section">

            <div className="purchase-form-section-title">
              <Truck size={18} />
              <span>Purchase Information</span>
            </div>

            <div className="form-grid">

              <div className="form-group">
                <label>Supplier</label>

                <select
                  value={supplierId}
                  onChange={(e) =>
                    setSupplierId(e.target.value)
                  }
                >
                  <option value="">
                    Select supplier
                  </option>

                  {suppliers.map((supplier) => (
                    <option
                      key={supplier.id}
                      value={supplier.id}
                    >
                      {supplier.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Purchase Invoice Number</label>

                <div className="purchase-input-icon">
                  <Hash size={16} />

                  <input
                    type="text"
                    value={invoiceNumber}
                    onChange={(e) =>
                      setInvoiceNumber(e.target.value)
                    }
                    placeholder="Optional invoice number"
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

              <div className="form-group">
                <label>Paid Amount</label>

                <div className="purchase-input-icon">
                  <CircleDollarSign size={16} />

                  <input
                    type="number"
                    min="0"
                    value={paidAmount}
                    onChange={(e) =>
                      setPaidAmount(e.target.value)
                    }
                    placeholder="0"
                  />
                </div>
              </div>

            </div>
          </div>

          {/* ADD PRODUCT */}

          <div className="purchase-item-entry">

            <div className="purchase-form-section-title">
              <Package size={18} />
              <span>Add Products</span>
            </div>

            <div className="purchase-item-grid">

              <div className="form-group">
                <label>Product</label>

                <select
                  value={selectedProduct}
                  onChange={(e) =>
                    setSelectedProduct(e.target.value)
                  }
                >
                  <option value="">
                    Select product
                  </option>

                  {products.map((product) => (
                    <option
                      key={product.id}
                      value={product.id}
                    >
                      {product.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Quantity</label>

                <input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) =>
                    setQuantity(e.target.value)
                  }
                  placeholder="Quantity"
                />
              </div>

              <div className="form-group">
                <label>Purchase Price</label>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={purchasePrice}
                  onChange={(e) =>
                    setPurchasePrice(e.target.value)
                  }
                  placeholder="Purchase price"
                />
              </div>

              <div className="form-group">
                <label>Batch Number</label>

                <div className="purchase-input-icon">
                  <Hash size={16} />

                  <input
                    type="text"
                    value={batchNumber}
                    onChange={(e) =>
                      setBatchNumber(e.target.value)
                    }
                    placeholder="e.g. B-2026-09"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Expiry Date</label>

                <div className="purchase-input-icon">
                  <CalendarDays size={16} />

                  <input
                    type="date"
                    value={expiryDate}
                    onChange={(e) =>
                      setExpiryDate(e.target.value)
                    }
                  />
                </div>
              </div>

              <div className="purchase-add-product-wrapper">
                <label>&nbsp;</label>

                <button
                  type="button"
                  className="purchase-add-product-btn"
                  onClick={addItem}
                >
                  <Plus size={18} />
                  Add Product
                </button>
              </div>

            </div>
          </div>

          {/* CURRENT ITEMS */}

          <div className="purchase-items-section">

            <div className="purchase-section-heading-row">
              <div>
                <h3>Current Purchase Items</h3>
                <p>
                  Products added to this purchase invoice.
                </p>
              </div>

              <span className="purchase-item-count">
                {items.length}{" "}
                {items.length === 1 ? "Item" : "Items"}
              </span>
            </div>

            {items.length === 0 ? (
              <div className="purchase-empty-items">
                <div className="purchase-empty-icon">
                  <Package size={26} />
                </div>

                <h4>No products added</h4>

                <p>
                  Select a product above and click
                  <strong> Add Product </strong>
                  to build this purchase.
                </p>
              </div>
            ) : (
              <div className="purchase-table-wrapper">

                <table className="purchase-table">

                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Batch Number</th>
                      <th>Expiry Date</th>
                      <th>Quantity</th>
                      <th>Purchase Price</th>
                      <th>Total</th>
                      <th>Action</th>
                    </tr>
                  </thead>

                  <tbody>

                    {items.map((item, index) => (
                      <tr
                        key={`${item.product_id}-${index}`}
                      >

                        <td>
                          <div className="purchase-product-cell">
                            <div className="purchase-product-icon">
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
                          <span className="purchase-batch-badge">
                            <Hash size={13} />
                            {item.batch_number}
                          </span>
                        </td>

                        <td>
                          <span className="purchase-expiry">
                            <CalendarDays size={14} />
                            {item.expiry_date || "-"}
                          </span>
                        </td>

                        <td>
                          <span className="purchase-quantity">
                            {item.quantity}
                          </span>
                        </td>

                        <td>
                          <span className="purchase-money">
                            {currency}{" "}
                            {item.purchase_price.toLocaleString()}
                          </span>
                        </td>

                        <td>
                          <strong className="purchase-total-money">
                            {currency}{" "}
                            {item.total.toLocaleString()}
                          </strong>
                        </td>

                        <td>
                          <button
                            type="button"
                            className="purchase-remove-btn"
                            onClick={() =>
                              removeItem(index)
                            }
                            title="Remove product"
                          >
                            <Trash2 size={16} />
                            Remove
                          </button>
                        </td>

                      </tr>
                    ))}

                  </tbody>

                </table>
              </div>
            )}

          </div>

          {/* PURCHASE TOTAL */}

          <div className="purchase-checkout">

            <div className="purchase-checkout-info">

              <div className="purchase-total-line">
                <span>Purchase Total</span>

                <strong>
                  {currency}{" "}
                  {subtotal.toLocaleString()}
                </strong>
              </div>

              <div className="purchase-total-line">
                <span>Paid Amount</span>

                <strong className="paid-value">
                  {currency}{" "}
                  {paid.toLocaleString()}
                </strong>
              </div>

              <div className="purchase-total-divider" />

              <div className="purchase-total-line grand">
                <span>Remaining Payable</span>

                <strong>
                  {currency}{" "}
                  {Math.max(
                    payable,
                    0
                  ).toLocaleString()}
                </strong>
              </div>

            </div>

            <div className="purchase-submit-area">

              {payable > 0 && (
                <div className="purchase-payable-warning">
                  <AlertCircle size={16} />
                  <span>
                    Supplier payable will be recorded.
                  </span>
                </div>
              )}

              <button
                type="submit"
                className="purchase-create-btn"
                disabled={processing}
              >
                {processing ? (
                  "Processing..."
                ) : (
                  <>
                    <Receipt size={18} />
                    Create Purchase
                  </>
                )}
              </button>

            </div>

          </div>

        </form>
      </div>

      {/* PURCHASE HISTORY */}

      <div className="purchase-history-card">

        <div className="purchase-history-header">

          <div className="purchase-section-title">
            <div className="purchase-section-icon">
              <Receipt size={20} />
            </div>

            <div>
              <h2>Purchase History</h2>
              <p>
                Review previous supplier purchase invoices.
              </p>
            </div>
          </div>

          <span className="purchase-history-count">
            {purchases.length} Records
          </span>

        </div>

        {purchases.length === 0 ? (
          <div className="purchase-empty-history">
            <div className="purchase-empty-icon">
              <Receipt size={27} />
            </div>

            <h4>No purchases found</h4>

            <p>
              Your purchase history will appear here.
            </p>
          </div>
        ) : (
          <div className="purchase-table-wrapper">

            <table className="purchase-table purchase-history-table">

              <thead>
                <tr>
                  <th>ID</th>
                  <th>Invoice Number</th>
                  <th>Supplier</th>
                  <th>Total</th>
                  <th>Paid</th>
                  <th>Payable</th>
                  <th>Date</th>
                </tr>
              </thead>

              <tbody>

                {purchases.map((purchase) => {
                  const totalAmount = Number(
                    purchase.total_amount || 0
                  );

                  const paidAmountValue = Number(
                    purchase.paid_amount || 0
                  );

                  const dueAmount = Number(
                    purchase.due_amount || 0
                  );

                  return (
                    <tr key={purchase.id}>

                      <td>
                        <span className="purchase-id">
                          #{purchase.id}
                        </span>
                      </td>

                      <td>
                        <div className="purchase-invoice-cell">
                          <Receipt size={15} />

                          <span>
                            {purchase.invoice_number ||
                              "No invoice"}
                          </span>
                        </div>
                      </td>

                      <td>
                        <div className="purchase-supplier-cell">
                          <div className="purchase-supplier-avatar">
                            <Truck size={15} />
                          </div>

                          <span>
                            {purchase.supplier_name || "-"}
                          </span>
                        </div>
                      </td>

                      <td>
                        <strong className="purchase-history-total">
                          {currency}{" "}
                          {totalAmount.toLocaleString()}
                        </strong>
                      </td>

                      <td>
                        <span className="purchase-paid">
                          {currency}{" "}
                          {paidAmountValue.toLocaleString()}
                        </span>
                      </td>

                      <td>
                        <span
                          className={
                            dueAmount > 0
                              ? "purchase-due due"
                              : "purchase-due clear"
                          }
                        >
                          {currency}{" "}
                          {dueAmount.toLocaleString()}
                        </span>
                      </td>

                      <td>
                        <span className="purchase-date">
                          {purchase.created_at
                            ? new Date(
                                purchase.created_at
                              ).toLocaleString()
                            : "-"}
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

export default Purchases;