import { useEffect, useState } from "react";
import api from "../services/api";
import { useNotification } from "../context/NotificationContext";

function POS() {
  const { showSuccess, showError } = useNotification();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState([]);

  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState("");

  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");

  const [discount, setDiscount] = useState(0);
  const [paidAmount, setPaidAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("cash");

  const [invoiceId, setInvoiceId] = useState(null);
  const [invoice, setInvoice] = useState(null);
  const [printMode, setPrintMode] = useState("a4");

  const [searchTerm, setSearchTerm] = useState("");
  const [barcodeInput, setBarcodeInput] = useState("");
  const [barcodeError, setBarcodeError] = useState("");

  const [processingSale, setProcessingSale] = useState(false);
 const [settings, setSettings] = useState(null);

  // ==========================================
  // ADD PRODUCT TO CART
  // ==========================================
  const addProductToCart = (product) => {
    if (product.stock <= 0) {
      showError("Product is out of stock");
      return false;
    }

    let added = true;

    setCart((currentCart) => {
      const existingProduct = currentCart.find(
        (item) => item.id === product.id
      );

      if (existingProduct) {
        if (existingProduct.quantity >= product.stock) {
          showError("Insufficient stock");
          added = false;
          return currentCart;
        }

        return currentCart.map((item) =>
          item.id === product.id
            ? {
                ...item,
                quantity: item.quantity + 1,
              }
            : item
        );
      }

      return [
        ...currentCart,
        {
          ...product,
          quantity: 1,
        },
      ];
    });

    return added;
  };

  // ==========================================
  // BARCODE SCAN
  // ==========================================
  const handleBarcodeScan = (e) => {
    if (e.key !== "Enter") return;

    e.preventDefault();

    const code = barcodeInput.trim();

    if (!code) return;

    const product = products.find(
      (p) => p.barcode && p.barcode === code
    );

    if (!product) {
      setBarcodeError(
        `No product found with barcode "${code}"`
      );
      setBarcodeInput("");
      return;
    }

    setBarcodeError("");
    addProductToCart(product);
    setBarcodeInput("");
  };

  // ==========================================
  // FETCH PRODUCTS
  // ==========================================
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await api.get("/products");

        setProducts(response.data.data);
      } catch (error) {
        console.error(
          error.response?.data?.message ||
            "Failed to load products"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  // ==========================================
  // FETCH SETTINGS
  // ==========================================
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await api.get("/settings");

        setSettings(response.data.data);
      } catch (error) {
        console.error(
          error.response?.data?.message ||
            "Failed to load settings"
        );
      }
    };

    fetchSettings();
  }, []);

  // ==========================================
  // FETCH CUSTOMERS
  // ==========================================
  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const response = await api.get("/customers");

        setCustomers(response.data.data);
      } catch (error) {
        console.error(
          error.response?.data?.message ||
            "Failed to load customers"
        );
      }
    };

    fetchCustomers();
  }, []);

  // ==========================================
  // FETCH CREATED INVOICE
  // ==========================================
  useEffect(() => {
    if (!invoiceId) return;

    const fetchInvoice = async () => {
      try {
        const response = await api.get(
          `/invoices/${invoiceId}`
        );

        console.log(
          "INVOICE RESPONSE:",
          response.data
        );

        // FIXED: only one setInvoice
        setInvoice(response.data.data);
      } catch (error) {
        console.error(
          error.response?.data?.message ||
            "Failed to load invoice"
        );
      }
    };

    fetchInvoice();
  }, [invoiceId]);

  // ==========================================
  // CART CALCULATIONS
  // ==========================================
  const subtotal = cart.reduce(
    (total, item) =>
      total +
      Number(item.sale_price) *
        Number(item.quantity),
    0
  );

  const finalDiscount = Math.max(
    Number(discount) || 0,
    0
  );

  const taxableAmount = Math.max(
    subtotal - finalDiscount,
    0
  );

  const taxRate = Number(
    settings?.default_tax || 0
  );

  const currency =
    settings?.currency || "PKR";

  const taxAmount =
    (taxableAmount * taxRate) / 100;

  const grandTotal =
    taxableAmount + taxAmount;

  const paymentDifference = Math.abs(
    Number(paidAmount) - grandTotal
  );

  // ==========================================
  // ADD CUSTOMER
  // ==========================================
  const handleSaveCustomer = async () => {
    if (!customerName.trim()) {
      showError("Customer name is required");
      return;
    }

    try {
      const response = await api.post(
        "/customers",
        {
          name: customerName,
          phone: customerPhone,
        }
      );

      const newCustomer = {
        id:
          response.data.data?.id ||
          response.data.id,
        name: customerName,
        phone: customerPhone,
      };

      setCustomers((currentCustomers) => [
        ...currentCustomers,
        newCustomer,
      ]);

      setSelectedCustomer(
        String(newCustomer.id)
      );

      setCustomerName("");
      setCustomerPhone("");
      setShowCustomerForm(false);

      showSuccess(
        "Customer added successfully"
      );
    } catch (error) {
      console.error(
        "Customer error:",
        error
      );

      showError(
        error.response?.data?.message ||
          "Failed to add customer"
      );
    }
  };

  // ==========================================
  // COMPLETE SALE
  // ==========================================
  const handleCompleteSale = async () => {
    if (cart.length === 0) {
      showError("Cart is empty");
      return;
    }

    if (finalDiscount > subtotal) {
      showError(
        "Discount cannot be greater than subtotal"
      );
      return;
    }

    if (Number(paidAmount) > grandTotal) {
      showError(
        "Paid amount cannot be greater than grand total"
      );
      return;
    }

    setProcessingSale(true);

    try {
      const response = await api.post(
        "/invoices",
        {
          customer_id: selectedCustomer
            ? Number(selectedCustomer)
            : null,

          discount: finalDiscount,

          paid_amount: Number(paidAmount),

          payment_method: paymentMethod,

          items: cart.map((item) => ({
            product_id: item.id,
            quantity: item.quantity,
          })),
        }
      );

      const createdInvoiceId =
        response.data.data.invoiceId;

      console.log(
        "CREATED INVOICE ID:",
        createdInvoiceId
      );

      setInvoiceId(createdInvoiceId);

      // Reset POS
      setCart([]);
      setSelectedCustomer("");
      setDiscount(0);
      setPaidAmount(0);
      setPaymentMethod("cash");
      setSearchTerm("");

      // Refresh products
      const productsResponse =
        await api.get("/products");

      setProducts(
        productsResponse.data.data
      );

      // Refresh customers
      const customersResponse =
        await api.get("/customers");

      setCustomers(
        customersResponse.data.data
      );

      showSuccess(
        `Sale completed successfully! Invoice: ${response.data.data.invoiceNumber}`
      );
    } catch (error) {
      console.error(
        "Sale error:",
        error
      );

      showError(
        error.response?.data?.message ||
          "Failed to create sale"
      );
    } finally {
      setProcessingSale(false);
    }
  };

  return (
    <div className="pos-page">

      {/* ======================================
          PAGE HEADER
      ====================================== */}
      <div className="page-header">
        <div>
          <h1>Point of Sale</h1>

          <p>
            Create a new sale and generate an invoice.
          </p>
        </div>
      </div>


      {/* ======================================
          POS CONTENT
          IMPORTANT:
          Invoice is NOT inside this div
      ====================================== */}
      <div className="pos-content">

        {/* ======================================
            BARCODE SCAN
        ====================================== */}
        <div className="pos-barcode-scan">

          <input
            type="text"
            placeholder="Scan barcode or type and press Enter..."
            value={barcodeInput}
            onChange={(e) => {
              setBarcodeInput(e.target.value);

              if (barcodeError) {
                setBarcodeError("");
              }
            }}
            onKeyDown={handleBarcodeScan}
            autoFocus
          />

          {barcodeError && (
            <p className="pos-barcode-error">
              {barcodeError}
            </p>
          )}

        </div>


        {/* ======================================
            PRODUCT SEARCH
        ====================================== */}
        <input
          type="text"
          placeholder="Search product by name or barcode..."
          value={searchTerm}
          onChange={(e) =>
            setSearchTerm(e.target.value)
          }
        />


        {/* ======================================
            PRODUCTS
        ====================================== */}
        <div className="pos-products">

          <h2>Products</h2>

          {loading ? (
            <p>Loading products...</p>
          ) : products.length === 0 ? (
            <p>No products found.</p>
          ) : (
            products
              .filter(
                (product) =>
                  product.name
                    .toLowerCase()
                    .includes(
                      searchTerm.toLowerCase()
                    ) ||
                  product.barcode
                    ?.toLowerCase()
                    .includes(
                      searchTerm.toLowerCase()
                    )
              )
              .map((product) => (
                <div key={product.id}>

                  <strong>
                    {product.name}
                  </strong>

                  <span>
                    {" "}
                    — {currency}{" "}
                    {product.sale_price}
                  </span>

                  <span>
                    {" "}
                    | Stock:{" "}
                    {product.stock}
                  </span>

                  <button
                    type="button"
                    onClick={() =>
                      addProductToCart(product)
                    }
                  >
                    Add
                  </button>

                </div>
              ))
          )}

        </div>


        {/* ======================================
            CUSTOMER
        ====================================== */}
        <div className="pos-customer">

          <h2>Customer</h2>

          <button
            type="button"
            onClick={() =>
              setShowCustomerForm(true)
            }
          >
            + Add Customer
          </button>

          <select
            value={selectedCustomer}
            onChange={(e) =>
              setSelectedCustomer(
                e.target.value
              )
            }
          >

            <option value="">
              Walk-in Customer
            </option>

            {customers.map(
              (customer) => (
                <option
                  key={customer.id}
                  value={customer.id}
                >
                  {customer.name}

                  {customer.phone
                    ? ` - ${customer.phone}`
                    : ""}

                  {` | Due: ${currency} ${
                    customer.current_due ?? 0
                  }`}
                </option>
              )
            )}

          </select>


          {selectedCustomer && (
            <p>
              Current Due: {currency}{" "}
              {
                customers.find(
                  (customer) =>
                    String(customer.id) ===
                    String(selectedCustomer)
                )?.current_due ?? 0
              }
            </p>
          )}


          {/* CUSTOMER FORM */}
          {showCustomerForm && (
            <div>

              <h3>Add Customer</h3>

              <input
                type="text"
                placeholder="Customer name"
                value={customerName}
                onChange={(e) =>
                  setCustomerName(
                    e.target.value
                  )
                }
              />

              <input
                type="text"
                placeholder="Phone number"
                value={customerPhone}
                onChange={(e) =>
                  setCustomerPhone(
                    e.target.value
                  )
                }
              />

              <button
                type="button"
                onClick={
                  handleSaveCustomer
                }
              >
                Save Customer
              </button>

              <button
                type="button"
                onClick={() =>
                  setShowCustomerForm(false)
                }
              >
                Cancel
              </button>

            </div>
          )}

        </div>


        {/* ======================================
            CART
        ====================================== */}
        <div className="pos-cart">

          <h2>Cart</h2>

          <button
            type="button"
            onClick={() =>
              setCart([])
            }
          >
            Clear Cart
          </button>


          {cart.length === 0 ? (
            <p>Cart is empty.</p>
          ) : (
            cart.map((item) => (
              <div key={item.id}>

                <strong>
                  {item.name}
                </strong>


                <div>

                  {/* DECREASE */}
                  <button
                    type="button"
                    onClick={() => {
                      setCart(
                        (currentCart) =>
                          currentCart
                            .map(
                              (cartItem) =>
                                cartItem.id ===
                                item.id
                                  ? {
                                      ...cartItem,
                                      quantity:
                                        cartItem.quantity -
                                        1,
                                    }
                                  : cartItem
                            )
                            .filter(
                              (cartItem) =>
                                cartItem.quantity >
                                0
                            )
                      );
                    }}
                  >
                    −
                  </button>


                  <span>
                    {" "}
                    {item.quantity}{" "}
                  </span>


                  {/* INCREASE */}
                  <button
                    type="button"
                    onClick={() => {
                      if (
                        item.quantity >=
                        item.stock
                      ) {
                        showError(
                          "Insufficient stock"
                        );

                        return;
                      }

                      setCart(
                        (currentCart) =>
                          currentCart.map(
                            (cartItem) =>
                              cartItem.id ===
                              item.id
                                ? {
                                    ...cartItem,
                                    quantity:
                                      cartItem.quantity +
                                      1,
                                  }
                                : cartItem
                          )
                      );
                    }}
                  >
                    +
                  </button>


                  {/* REMOVE */}
                  <button
                    type="button"
                    onClick={() => {
                      setCart(
                        (currentCart) =>
                          currentCart.filter(
                            (cartItem) =>
                              cartItem.id !==
                              item.id
                          )
                      );
                    }}
                  >
                    Remove
                  </button>

                </div>


                <span>
                  {currency}{" "}
                  {(
                    Number(item.sale_price) *
                    Number(item.quantity)
                  ).toLocaleString(
                    undefined,
                    {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    }
                  )}
                </span>

              </div>
            ))
          )}


          {/* ====================================
              CART SUMMARY
          ==================================== */}
          <div className="cart-total">

            <strong>
              Subtotal: {currency}{" "}
              {subtotal.toLocaleString(
                undefined,
                {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                }
              )}
            </strong>

          </div>


          {/* DISCOUNT */}
          <div className="cart-discount">

            <label>
              Discount ({currency})
            </label>

            <input
              type="number"
              min="0"
              value={discount}
              onChange={(e) =>
                setDiscount(
                  Number(e.target.value)
                )
              }
            />

          </div>


          {/* TAX */}
          <div className="cart-tax">

            <strong>
              Tax ({taxRate}%): {currency}{" "}
              {taxAmount.toLocaleString(
                undefined,
                {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                }
              )}
            </strong>

          </div>


          {/* GRAND TOTAL */}
          <div className="cart-grand-total">

            <strong>
              Grand Total: {currency}{" "}
              {grandTotal.toLocaleString(
                undefined,
                {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                }
              )}
            </strong>

          </div>


          {/* ====================================
              PAYMENT
          ==================================== */}
          <div className="payment-section">

            <label>
              Paid Amount ({currency})
            </label>

            <input
              type="number"
              min="0"
              value={paidAmount}
              onChange={(e) =>
                setPaidAmount(
                  Number(e.target.value)
                )
              }
            />


            <label>
              Payment Method
            </label>

            <select
              value={paymentMethod}
              onChange={(e) =>
                setPaymentMethod(
                  e.target.value
                )
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


          {/* ====================================
              PAYMENT SUMMARY
          ==================================== */}
          <div className="payment-summary">

            <strong>
              {paidAmount >= grandTotal
                ? "Change"
                : "Due"}
              : {currency}{" "}
              {paymentDifference.toLocaleString(
                undefined,
                {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                }
              )}
            </strong>

          </div>


          {/* ====================================
              COMPLETE SALE
          ==================================== */}
          <button
            type="button"
            disabled={processingSale}
            onClick={handleCompleteSale}
          >
            {processingSale
              ? "Processing..."
              : "Complete Sale"}
          </button>

        </div>

      </div>


      {/* ==================================================
          INVOICE PREVIEW

          IMPORTANT:
          This is OUTSIDE .pos-content

          Is wajah se invoice cart ke peeche nahi aayega.
      ================================================== */}
      {invoice && (
        <div
          className={`invoice-preview ${
            printMode === "thermal"
              ? "thermal-receipt"
              : "a4-receipt"
          }`}
        >

          {/* ======================================
              INVOICE HEADER
          ====================================== */}
          <div className="invoice-header">

            <div>

              <h2>
                {settings?.store_name ||
                  "General Store"}
              </h2>

              {settings?.store_phone && (
                <p>
                  Phone:{" "}
                  {settings.store_phone}
                </p>
              )}

              {settings?.store_address && (
                <p>
                  {settings.store_address}
                </p>
              )}

            </div>


            <div className="invoice-meta">

              <p>
                <strong>
                  Invoice #:
                </strong>{" "}
                {
                  invoice.invoice
                    .invoice_number
                }
              </p>

              <p>
                <strong>
                  Date:
                </strong>{" "}
                {
                  invoice.invoice
                    .created_at
                }
              </p>

              <p>
                <strong>
                  Cashier:
                </strong>{" "}
                {
                  invoice.invoice
                    .cashier_username || "-"
                }
              </p>

            </div>

          </div>


          {/* ======================================
              CUSTOMER
          ====================================== */}
          <div className="invoice-customer">

            <p>
              <strong>
                Customer:
              </strong>{" "}
              {
                invoice.invoice
                  .customer_name ||
                "Walk-in Customer"
              }
            </p>

            <p>
              <strong>
                Phone:
              </strong>{" "}
              {
                invoice.invoice
                  .customer_phone ||
                "N/A"
              }
            </p>

          </div>


          {/* ======================================
              INVOICE ITEMS
          ====================================== */}
          <table>

            <thead>

              <tr>
                <th>Product</th>
                <th>Barcode</th>
                <th>Qty</th>
                <th>Unit</th>
                <th>Price</th>
                <th>Total</th>
              </tr>

            </thead>


            <tbody>

              {invoice.items.map(
                (item) => (
                  <tr key={item.id}>

                    <td>
                      {item.product_name}
                    </td>

                    <td>
                      {item.barcode || "-"}
                    </td>

                    <td>
                      {item.quantity}
                    </td>

                    <td>
                      {item.unit || "-"}
                    </td>

                    <td>
                      {currency}{" "}
                      {item.unit_price}
                    </td>

                    <td>
                      {currency}{" "}
                      {item.total}
                    </td>

                  </tr>
                )
              )}

            </tbody>

          </table>


          {/* ======================================
              INVOICE SUMMARY
          ====================================== */}
          <div className="invoice-summary">

            <p>
              <span>
                Subtotal
              </span>

              <span>
                {currency}{" "}
                {invoice.invoice.subtotal}
              </span>
            </p>


            <p>
              <span>
                Discount
              </span>

              <span>
                {currency}{" "}
                {invoice.invoice.discount}
              </span>
            </p>


            <p>
              <span>
                Tax (
                {invoice.invoice.tax_rate ||
                  0}
                %)
              </span>

              <span>
                {currency}{" "}
                {invoice.invoice.tax_amount ||
                  0}
              </span>
            </p>


            <p className="invoice-grand-total">

              <span>
                Grand Total
              </span>

              <span>
                {currency}{" "}
                {invoice.invoice.grand_total}
              </span>

            </p>


            <p>
              <span>
                Paid
              </span>

              <span>
                {currency}{" "}
                {invoice.invoice.paid_amount}
              </span>
            </p>


            <p>
              <span>
                Due
              </span>

              <span>
                {currency}{" "}
                {invoice.invoice.due_amount}
              </span>
            </p>


            <p>
              <span>
                Payment Method
              </span>

              <span>
                {invoice.invoice.payment_method}
              </span>
            </p>


            <p>
              <span>
                Status
              </span>

              <span>
                {Number(
                  invoice.invoice.due_amount
                ) === 0
                  ? "Paid"
                  : Number(
                      invoice.invoice.paid_amount
                    ) > 0
                  ? "Partial"
                  : "Due"}
              </span>
            </p>

          </div>


          {/* ======================================
              INVOICE FOOTER
          ====================================== */}
          <p className="invoice-footer-text">

            {settings?.invoice_footer ||
              "Thank you for shopping with us!"}

          </p>


          {/* ======================================
              PRINT BUTTONS
          ====================================== */}
          <div className="invoice-print-actions">

            <button
              type="button"
              onClick={() => {
                setPrintMode("a4");

                setTimeout(() => {
                  window.print();
                }, 300);
              }}
            >
              Print A4
            </button>


            <button
              type="button"
              onClick={() => {
                setPrintMode("thermal");

                setTimeout(() => {
                  window.print();
                }, 300);
              }}
            >
              Print Thermal Receipt
            </button>

          </div>

        </div>
      )}

    </div>
  );
}

export default POS;

