import { useEffect, useState } from "react";
import api from "../services/api";
import { useSettings } from "../context/SettingsContext";
import { useNotification } from "../context/NotificationContext";

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

  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);

      const [suppliersResponse, productsResponse, purchasesResponse] =
        await Promise.all([
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

    setItems((currentItems) => [
      ...currentItems,
      {
        product_id: product.id,
        product_name: product.name,
        quantity: qty,
        purchase_price: price,
        total: qty * price,
      },
    ]);

    setSelectedProduct("");
    setQuantity("");
    setPurchasePrice("");
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
        <div className="page-header">
          <div>
            <h1>Purchases</h1>
            <p>Manage supplier purchases and stock.</p>
          </div>
        </div>

        <div className="suppliers-card">
          <p>Loading purchases...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="purchases-page">

      <div className="page-header">
        <div>
          <h1>Purchases</h1>
          <p>
            Create purchase invoices and increase product stock.
          </p>
        </div>
      </div>

      {/* CREATE PURCHASE */}

      <div className="suppliers-card">

        <h2>Create Purchase</h2>

        <form onSubmit={handleCreatePurchase}>

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

              <input
                type="text"
                value={invoiceNumber}
                onChange={(e) =>
                  setInvoiceNumber(e.target.value)
                }
                placeholder="Optional invoice number"
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

            <div className="form-group">
              <label>Paid Amount</label>

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

          {/* ADD PRODUCT */}

          <div className="form-grid">

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
              <label>&nbsp;</label>

              <button
                type="button"
                className="secondary-btn"
                onClick={addItem}
              >
                + Add Product
              </button>
            </div>

          </div>

          {/* ITEMS */}

          {items.length > 0 && (
            <div className="table-wrapper">

              <table>

                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Quantity</th>
                    <th>Purchase Price</th>
                    <th>Total</th>
                    <th>Action</th>
                  </tr>
                </thead>

                <tbody>

                  {items.map((item, index) => (
                    <tr key={`${item.product_id}-${index}`}>

                      <td>{item.product_name}</td>

                      <td>{item.quantity}</td>

                      <td>
                        {currency}{" "}
                        {item.purchase_price.toLocaleString()}
                      </td>

                      <td>
                        {currency}{" "}
                        {item.total.toLocaleString()}
                      </td>

                      <td>
                        <button
                          type="button"
                          className="danger-btn"
                          onClick={() =>
                            removeItem(index)
                          }
                        >
                          Remove
                        </button>
                      </td>

                    </tr>
                  ))}

                </tbody>

              </table>

            </div>
          )}

          {/* TOTAL */}

          <div className="form-actions">

            <div>
              <strong>
                Purchase Total: {currency}{" "}
                {subtotal.toLocaleString()}
              </strong>

              <br />

              <strong>
                Remaining Payable: {currency}{" "}
                {Math.max(payable, 0).toLocaleString()}
              </strong>
            </div>

            <button
              type="submit"
              className="primary-btn"
              disabled={processing}
            >
              {processing
                ? "Processing..."
                : "Create Purchase"}
            </button>

          </div>

        </form>

      </div>

      {/* PURCHASE HISTORY */}

      <div className="suppliers-card">

        <h2>Purchase History</h2>

        {purchases.length === 0 ? (
          <p>No purchases found.</p>
        ) : (
          <div className="table-wrapper">

            <table>

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

                {purchases.map((purchase) => (
                  <tr key={purchase.id}>

                    <td>{purchase.id}</td>

                    <td>
                      {purchase.invoice_number || "-"}
                    </td>

                    <td>
                      {purchase.supplier_name || "-"}
                    </td>

                    <td>
                      {currency}{" "}
                      {Number(
                        purchase.total_amount || 0
                      ).toLocaleString()}
                    </td>

                    <td>
                      {currency}{" "}
                      {Number(
                        purchase.paid_amount || 0
                      ).toLocaleString()}
                    </td>

                    <td>
                      {currency}{" "}
                      {Number(
                        purchase.due_amount || 0
                      ).toLocaleString()}
                    </td>

                    <td>
                      {purchase.created_at
                        ? new Date(
                            purchase.created_at
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

export default Purchases;

