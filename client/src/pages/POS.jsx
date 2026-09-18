import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Barcode,
  Banknote,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  Layers3,
  Minus,
  Package,
  Plus,
  Printer,
  Percent,
  Receipt,
  RefreshCw,
  Search,
  ShoppingCart,
  Tag,
  Trash2,
  UserPlus,
  UserRound,
  WalletCards,
  X,
} from "lucide-react";

import api from "../services/api";
import { useNotification } from "../context/NotificationContext";

const formatInvoiceDate = (value) => {
  if (!value) return "-";

  const raw = String(value).trim();

  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(raw)) {
    const [datePart, timePart] = raw.split(" ");
    const [year, month, day] = datePart.split("-");
    const [hour, minute, second] = timePart.split(":");

    const date = new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
      Number(second)
    );

    if (Number.isNaN(date.getTime())) {
      return "-";
    }

    return date.toLocaleString("en-PK", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
  }

  return raw;
};

function POS() {
  const { showSuccess, showError } = useNotification();

  const barcodeInputRef = useRef(null);

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const [cart, setCart] = useState([]);

  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState("");

  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [savingCustomer, setSavingCustomer] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [barcodeInput, setBarcodeInput] = useState("");
  const [barcodeError, setBarcodeError] = useState("");

  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [selectedProductForBatch, setSelectedProductForBatch] =
    useState(null);
  const [productBatches, setProductBatches] = useState([]);
  const [loadingBatches, setLoadingBatches] = useState(false);

  const [showNewProductForm, setShowNewProductForm] = useState(false);
  const [newProductBarcode, setNewProductBarcode] = useState("");
  const [newProductName, setNewProductName] = useState("");
  const [newProductPurchasePrice, setNewProductPurchasePrice] = useState("");
  const [newProductSalePrice, setNewProductSalePrice] = useState("");
  const [newProductStock, setNewProductStock] = useState("");
  const [newProductUnit, setNewProductUnit] = useState("piece");
  const [savingNewProduct, setSavingNewProduct] = useState(false);

  const [discount, setDiscount] = useState(0);
  const [paidAmount, setPaidAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [processingSale, setProcessingSale] = useState(false);

  const [settings, setSettings] = useState(null);

  const [invoiceId, setInvoiceId] = useState(null);
  const [invoice, setInvoice] = useState(null);
  const [showInvoice, setShowInvoice] = useState(false);

  const currency = settings?.currency || "PKR";
  const taxRate = Number(settings?.default_tax || 0);

  const filteredProducts = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    if (!query) return products;

    return products.filter((product) => {
      const name = String(product.name || "").toLowerCase();
      const barcode = String(product.barcode || "").toLowerCase();

      return name.includes(query) || barcode.includes(query);
    });
  }, [products, searchTerm]);

  const subtotal = useMemo(() => {
    return cart.reduce(
      (total, item) =>
        total +
        Number(item.sale_price || 0) * Number(item.quantity || 0),
      0
    );
  }, [cart]);

  const finalDiscount = Math.max(Number(discount) || 0, 0);

  const taxableAmount = Math.max(subtotal - finalDiscount, 0);

  const taxAmount = (taxableAmount * taxRate) / 100;

  const grandTotal = taxableAmount + taxAmount;

  const paid = Math.max(Number(paidAmount) || 0, 0);

  const paymentDifference = Math.abs(paid - grandTotal);

  const cartItemCount = cart.reduce(
    (total, item) => total + Number(item.quantity || 0),
    0
  );

  const dueAmount = Math.max(grandTotal - paid, 0);

  const changeAmount = Math.max(paid - grandTotal, 0);

  const selectedCustomerData = customers.find(
    (customer) => String(customer.id) === String(selectedCustomer)
  );

  const formatMoney = (value) =>
    Number(value || 0).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  // ==========================================
  // LOAD DATA
  // ==========================================

  const loadProducts = async () => {
    try {
      setLoading(true);

      const response = await api.get("/products");

      setProducts(response.data?.data || []);
    } catch (error) {
      console.error("GET PRODUCTS ERROR:", error);

      showError(
        error.response?.data?.message || "Failed to load products"
      );
    } finally {
      setLoading(false);
    }
  };

  const loadCustomers = async () => {
    try {
      const response = await api.get("/customers");

      setCustomers(response.data?.data || []);
    } catch (error) {
      console.error("GET CUSTOMERS ERROR:", error);
    }
  };

  const loadSettings = async () => {
    try {
      const response = await api.get("/settings");

      setSettings(response.data?.data || null);
    } catch (error) {
      console.error("GET SETTINGS ERROR:", error);
    }
  };

  useEffect(() => {
    loadProducts();
    loadCustomers();
    loadSettings();

    setTimeout(() => {
      barcodeInputRef.current?.focus();
    }, 300);
  }, []);

  // ==========================================
  // ADD PRODUCT TO CART
  // ==========================================

  const addProductToCart = (product) => {
    const availableStock = Number(
      product.batch_stock ?? product.stock ?? 0
    );

    if (availableStock <= 0) {
      showError(
        product.batch_id
          ? "This batch is out of stock"
          : "Product is out of stock"
      );

      return false;
    }

    if (product.expiry_date) {
      const today = new Date().toISOString().split("T")[0];

      if (product.expiry_date < today) {
        showError(`Batch ${product.batch_number || ""} has expired`);

        return false;
      }
    }

    let added = true;

    setCart((currentCart) => {
      const existingProduct = currentCart.find(
        (item) =>
          item.id === product.id &&
          (item.batch_id ?? null) === (product.batch_id ?? null)
      );

      if (existingProduct) {
        if (Number(existingProduct.quantity) >= availableStock) {
          showError(
            product.batch_id
              ? "Insufficient batch stock"
              : "Insufficient stock"
          );

          added = false;

          return currentCart;
        }

        return currentCart.map((item) =>
          item.id === product.id &&
          (item.batch_id ?? null) === (product.batch_id ?? null)
            ? {
                ...item,
                quantity: Number(item.quantity) + 1,
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
  // BATCH SELECTOR
  // ==========================================

  const openBatchSelector = async (product) => {
    try {
      setSelectedProductForBatch(product);
      setLoadingBatches(true);
      setBatchModalOpen(true);
      setProductBatches([]);

      const response = await api.get(`/products/${product.id}/batches`);

      setProductBatches(response.data?.data || []);
    } catch (error) {
      console.error("GET PRODUCT BATCHES ERROR:", error);

      setBatchModalOpen(false);

      showError(
        error.response?.data?.message || "Failed to load product batches"
      );
    } finally {
      setLoadingBatches(false);
    }
  };

  const closeBatchSelector = () => {
    setBatchModalOpen(false);
    setSelectedProductForBatch(null);
    setProductBatches([]);
  };

  const handleBatchSelect = (batch) => {
    if (!selectedProductForBatch) return;

    const batchStock = Number(batch.quantity || 0);

    if (batchStock <= 0) {
      showError("This batch is out of stock");
      return;
    }

    if (batch.expiry_date) {
      const today = new Date().toISOString().split("T")[0];

      if (batch.expiry_date < today) {
        showError(`Batch ${batch.batch_number || ""} has expired`);

        return;
      }
    }

    const productWithBatch = {
      ...selectedProductForBatch,
      batch_id: Number(batch.id),
      batch_number: batch.batch_number || null,
      expiry_date: batch.expiry_date || null,
      batch_stock: batchStock,
    };

    const added = addProductToCart(productWithBatch);

    if (added) {
      showSuccess(`${selectedProductForBatch.name} added to cart`);

      closeBatchSelector();
    }
  };

  // ==========================================
  // NEW PRODUCT
  // ==========================================

  const closeNewProductForm = () => {
    setShowNewProductForm(false);
    setNewProductBarcode("");
    setNewProductName("");
    setNewProductPurchasePrice("");
    setNewProductSalePrice("");
    setNewProductStock("");
    setNewProductUnit("piece");
  };

  const handleSaveNewProduct = async () => {
    if (!newProductName.trim()) {
      showError("Product name is required");
      return;
    }

    if (
      newProductSalePrice === "" ||
      Number(newProductSalePrice) < 0
    ) {
      showError("Valid sale price is required");
      return;
    }

    if (
      newProductStock === "" ||
      Number(newProductStock) < 0
    ) {
      showError("Valid stock is required");
      return;
    }

    setSavingNewProduct(true);

    try {
      const response = await api.post("/products", {
        name: newProductName.trim(),
        barcode: newProductBarcode.trim() || null,
        purchase_price: Number(newProductPurchasePrice || 0),
        sale_price: Number(newProductSalePrice),
        stock: Number(newProductStock),
        unit: newProductUnit.trim() || "piece",
      });

      const productId =
        response.data?.id || response.data?.data?.id;

      if (!productId) {
        throw new Error("Product ID was not returned by the server");
      }

      const createdProduct =
        response.data?.data || response.data || {};

      addProductToCart({
        ...createdProduct,
        id: Number(productId),
        name: newProductName.trim(),
        barcode: newProductBarcode.trim() || null,
        sale_price: Number(newProductSalePrice),
        stock: Number(newProductStock),
        batch_stock: Number(newProductStock),
        batch_id: null,
        batch_number: null,
        expiry_date: null,
      });

      setProducts((currentProducts) => [
        {
          ...createdProduct,
          id: Number(productId),
          name: newProductName.trim(),
          barcode: newProductBarcode.trim() || null,
          sale_price: Number(newProductSalePrice),
          stock: Number(newProductStock),
        },
        ...currentProducts,
      ]);

      closeNewProductForm();
      setBarcodeInput("");

      showSuccess("Product created and added to cart");

      barcodeInputRef.current?.focus();
    } catch (error) {
      console.error("SAVE NEW PRODUCT ERROR:", error);

      showError(
        error.response?.data?.message || "Failed to create product"
      );
    } finally {
      setSavingNewProduct(false);
    }
  };

  // ==========================================
  // BARCODE SCAN
  // ==========================================

  const handleBarcodeScan = async (event) => {
    if (event.key !== "Enter") return;

    event.preventDefault();

    const code = barcodeInput.trim();

    if (!code) return;

    setBarcodeError("");

    try {
      const response = await api.get(
        `/products/barcode/${encodeURIComponent(code)}`
      );

      const product = response.data?.data;

      if (!product) {
        throw new Error("Product not found");
      }

      const added = addProductToCart(product);

      if (added) {
        showSuccess(`${product.name} added to cart`);
      }

      setBarcodeInput("");

      setTimeout(() => {
        barcodeInputRef.current?.focus();
      }, 50);
    } catch (error) {
      const status = error.response?.status;

      if (status === 404) {
        setNewProductBarcode(code);
        setNewProductName("");
        setNewProductPurchasePrice("");
        setNewProductSalePrice("");
        setNewProductStock("");
        setNewProductUnit("piece");

        setShowNewProductForm(true);
        setBarcodeInput("");

        return;
      }

      console.error("BARCODE SCAN ERROR:", error);

      const message =
        error.response?.data?.message || "Barcode lookup failed";

      setBarcodeError(message);
      setBarcodeInput("");
    }
  };

  // ==========================================
  // CART ACTIONS
  // ==========================================

  const removeFromCart = (item) => {
    setCart((currentCart) =>
      currentCart.filter(
        (cartItem) =>
          !(
            cartItem.id === item.id &&
            (cartItem.batch_id ?? null) === (item.batch_id ?? null)
          )
      )
    );
  };

  const updateCartQuantity = (item, newQuantity) => {
    const quantity = Number(newQuantity);

    if (quantity <= 0) {
      removeFromCart(item);
      return;
    }

    const availableStock = Number(
      item.batch_stock ?? item.stock ?? 0
    );

    if (quantity > availableStock) {
      showError(
        item.batch_id
          ? "Insufficient batch stock"
          : "Insufficient stock"
      );

      return;
    }

    setCart((currentCart) =>
      currentCart.map((cartItem) =>
        cartItem.id === item.id &&
        (cartItem.batch_id ?? null) === (item.batch_id ?? null)
          ? {
              ...cartItem,
              quantity,
            }
          : cartItem
      )
    );
  };

  const increaseQuantity = (item) => {
    updateCartQuantity(item, Number(item.quantity) + 1);
  };

  const decreaseQuantity = (item) => {
    updateCartQuantity(item, Number(item.quantity) - 1);
  };

  const clearCart = () => {
    if (cart.length === 0) return;

    const confirmed = window.confirm(
      "Clear all products from the cart?"
    );

    if (!confirmed) return;

    setCart([]);
    setDiscount(0);
    setPaidAmount(0);
    setSelectedCustomer("");
  };

  // ==========================================
  // CUSTOMER
  // ==========================================

  const handleSaveCustomer = async () => {
    if (!customerName.trim()) {
      showError("Customer name is required");
      return;
    }

    setSavingCustomer(true);

    try {
      const response = await api.post("/customers", {
        name: customerName.trim(),
        phone: customerPhone.trim(),
      });

      const newCustomer = {
        id: response.data?.data?.id || response.data?.id,
        name: customerName.trim(),
        phone: customerPhone.trim(),
      };

      if (!newCustomer.id) {
        throw new Error("Customer ID was not returned");
      }

      setCustomers((current) => [...current, newCustomer]);

      setSelectedCustomer(String(newCustomer.id));

      setCustomerName("");
      setCustomerPhone("");
      setShowCustomerForm(false);

      showSuccess("Customer added successfully");
    } catch (error) {
      console.error("CUSTOMER ERROR:", error);

      showError(
        error.response?.data?.message || "Failed to add customer"
      );
    } finally {
      setSavingCustomer(false);
    }
  };

  // ==========================================
  // CHECKOUT
  // ==========================================

  const handleCheckout = async () => {
    if (cart.length === 0) {
      showError("Cart is empty");
      return;
    }

    if (finalDiscount > subtotal) {
      showError("Discount cannot be greater than subtotal");
      return;
    }

    if (paid > grandTotal) {
      showError("Paid amount cannot be greater than grand total");
      return;
    }

    if (grandTotal - paid > 0 && !selectedCustomer) {
      showError("Customer is required for a credit sale");
      return;
    }

    setProcessingSale(true);

    try {
      const response = await api.post("/invoices", {
        customer_id: selectedCustomer
          ? Number(selectedCustomer)
          : null,

        discount: finalDiscount,

        tax: taxAmount,

        paid_amount: paid,

        payment_method: paymentMethod,

        items: cart.map((item) => ({
          product_id: item.id,
          quantity: Number(item.quantity),
          batch_id: item.batch_id ?? null,
        })),
      });

      const createdInvoiceId =
        response.data?.data?.invoice_id ||
        response.data?.invoice_id;

      if (!createdInvoiceId) {
        throw new Error("Invoice ID was not returned");
      }

      setInvoiceId(Number(createdInvoiceId));

      setCart([]);
      setSelectedCustomer("");
      setDiscount(0);
      setPaidAmount(0);
      setPaymentMethod("cash");
      setSearchTerm("");

      await loadProducts();
      await loadCustomers();

      showSuccess(
        `Sale completed successfully! Invoice: ${
          response.data?.data?.invoice_number ||
          createdInvoiceId
        }`
      );
    } catch (error) {
      console.error("CHECKOUT ERROR:", error);

      showError(
        error.response?.data?.message || "Failed to create sale"
      );
    } finally {
      setProcessingSale(false);
    }
  };

  // ==========================================
  // LOAD CREATED INVOICE
  // ==========================================

  useEffect(() => {
    if (!invoiceId) return;

    const fetchInvoice = async () => {
      try {
        const response = await api.get(`/invoices/${invoiceId}`);

        setInvoice(response.data?.data || null);

        setShowInvoice(true);
      } catch (error) {
        console.error("GET INVOICE ERROR:", error);

        showError(
          error.response?.data?.message || "Failed to load invoice"
        );
      }
    };

    fetchInvoice();
  }, [invoiceId]);

  // ==========================================
  // PRINT INVOICE
  // ==========================================

  const printInvoice = () => {
    const printArea = document.querySelector(".invoice-print-area");

    if (!printArea) {
      showError("Invoice preview not found");
      return;
    }

    const printWindow = window.open(
      "",
      "_blank",
      "width=900,height=900"
    );

    if (!printWindow) {
      showError(
        "Please allow popups to print the invoice"
      );
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Invoice ${
            invoice?.invoice?.invoice_number || ""
          }</title>

          <style>
            * {
              box-sizing: border-box;
            }

            body {
              margin: 0;
              padding: 24px;
              background: #ffffff;
              color: #111827;
              font-family: Arial, Helvetica, sans-serif;
            }

            .print-invoice {
              width: 100%;
              max-width: 850px;
              margin: 0 auto;
            }

            h1,
            h2,
            h3,
            p {
              margin-top: 0;
            }

            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 20px;
            }

            th,
            td {
              padding: 10px;
              border-bottom: 1px solid #e5e7eb;
              text-align: left;
              font-size: 13px;
            }

            th {
              background: #f3f4f6;
              font-weight: 700;
            }

            .invoice-head {
              display: flex;
              justify-content: space-between;
              gap: 20px;
              padding-bottom: 18px;
              border-bottom: 2px solid #111827;
            }

            .invoice-meta {
              text-align: right;
            }

            .invoice-customer {
              margin-top: 18px;
              padding: 12px 14px;
              background: #f8fafc;
              border: 1px solid #e5e7eb;
            }

            .invoice-summary {
              width: 320px;
              margin: 22px 0 0 auto;
            }

            .summary-row {
              display: flex;
              justify-content: space-between;
              padding: 6px 0;
            }

            .grand-total {
              margin-top: 8px;
              padding-top: 10px;
              border-top: 2px solid #111827;
              font-size: 17px;
              font-weight: 800;
            }

            .invoice-footer {
              margin-top: 30px;
              padding-top: 15px;
              border-top: 1px solid #e5e7eb;
              text-align: center;
              font-size: 12px;
              color: #6b7280;
            }

            @media print {
              body {
                padding: 0;
              }

              .print-invoice {
                max-width: none;
              }
            }
          </style>
        </head>

        <body>
          <div class="print-invoice">
            ${printArea.innerHTML}
          </div>

          <script>
            window.onload = function () {
              window.print();

              setTimeout(function () {
                window.close();
              }, 500);
            };
          </script>
        </body>
      </html>
    `);

    printWindow.document.close();
  };

  const closeInvoice = () => {
    setShowInvoice(false);
    setInvoice(null);
    setInvoiceId(null);

    setTimeout(() => {
      barcodeInputRef.current?.focus();
    }, 100);
  };

  // ==========================================
  // RENDER
  // ==========================================

  return (
    <div className="pos-page">

      {/* ======================================
          HEADER
      ====================================== */}

      <div className="pos-header">

        <div className="pos-header-main">

          <div className="pos-header-icon">
            <ShoppingCart size={23} />
          </div>

          <div>
            <div className="pos-eyebrow">
              SALES WORKSPACE
            </div>

            <h1>Point of Sale</h1>

            <p>
              Create sales, manage products and
              generate invoices.
            </p>
          </div>

        </div>

        <div className="pos-header-actions">

          <button
            type="button"
            className="pos-header-btn"
            onClick={() => {
              barcodeInputRef.current?.focus();
            }}
          >
            <Barcode size={17} />
            Scan Barcode
          </button>

          <button
            type="button"
            className="pos-header-btn primary"
            onClick={() => setShowCustomerForm(true)}
          >
            <UserPlus size={17} />
            Add Customer
          </button>

        </div>

      </div>

      {/* ======================================
          POS LAYOUT
      ====================================== */}

      <div className="pos-layout">

        {/* ====================================
            PRODUCTS SECTION
        ==================================== */}

        <section className="pos-products-section">

          <div className="pos-section-header">

            <div>
              <div className="pos-section-kicker">
                INVENTORY
              </div>

              <h2>
                Products
              </h2>

              <p>
                Select a product or scan its barcode.
              </p>
            </div>

            <div className="pos-product-count">
              <Package size={16} />
              {products.length} Products
            </div>

          </div>

          {/* BARCODE SCANNER */}

          <div className="barcode-section">

            <div className="barcode-section-icon">
              <Barcode size={23} />
            </div>

            <div className="barcode-input-area">

              <label>
                QUICK BARCODE SCANNER
              </label>

              <input
                ref={barcodeInputRef}
                type="text"
                placeholder="Scan barcode or type barcode and press Enter..."
                value={barcodeInput}
                onChange={(event) => {
                  setBarcodeInput(event.target.value);

                  if (barcodeError) {
                    setBarcodeError("");
                  }
                }}
                onKeyDown={handleBarcodeScan}
                autoFocus
              />

            </div>

            <div className="barcode-enter-hint">
              <span>ENTER</span>
            </div>

          </div>

          {barcodeError && (
            <div className="pos-barcode-error">
              <AlertTriangle size={16} />
              {barcodeError}
            </div>
          )}

          {/* SEARCH */}

          <div className="product-search">

            <Search size={18} />

            <input
              type="text"
              placeholder="Search product by name or barcode..."
              value={searchTerm}
              onChange={(event) =>
                setSearchTerm(event.target.value)
              }
            />

            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
              >
                <X size={16} />
              </button>
            )}

          </div>

          {/* PRODUCTS */}

          <div className="products-grid">

            {loading ? (
              <div className="pos-loading">

                <RefreshCw
                  size={22}
                  className="pos-spin"
                />

                <span>
                  Loading products...
                </span>

              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="pos-empty">

                <Package size={36} />

                <h3>
                  No products found
                </h3>

                <p>
                  Try another search or scan a
                  barcode.
                </p>

              </div>
            ) : (
              filteredProducts.map((product) => {

                const stock = Number(
                  product.stock || 0
                );

                const isOut = stock <= 0;

                return (
                  <button
                    type="button"
                    key={product.id}
                    className={`product-card ${
                      isOut ? "out-of-stock" : ""
                    }`}
                    onClick={() =>
                      openBatchSelector(product)
                    }
                    disabled={isOut}
                  >

                    <div className="product-card-top">

                      <div className="product-card-icon">

                        {product.image_url ? (
                          <img
                            src={product.image_url}
                            alt={product.name}
                            onError={(event) => {
                              event.currentTarget.style.display =
                                "none";

                              event.currentTarget.parentElement
                                ?.querySelector(
                                  ".product-image-fallback"
                                )
                                ?.classList.add("show");
                            }}
                          />
                        ) : null}

                        <div className="product-image-fallback">
                          <Package size={20} />
                        </div>

                      </div>

                      <span
                        className={`product-stock-badge ${
                          isOut
                            ? "danger"
                            : stock <= 5
                            ? "warning"
                            : "success"
                        }`}
                      >
                        {isOut
                          ? "Out"
                          : `${stock} in stock`}
                      </span>

                    </div>

                    <div className="product-card-name">
                      {product.name}
                    </div>

                    <div className="product-card-barcode">
                      <Barcode size={13} />
                      {product.barcode || "No barcode"}
                    </div>

                    <div className="product-card-bottom">

                      <div>
                        <span>
                          PRICE
                        </span>

                        <strong>
                          {currency}{" "}
                          {formatMoney(
                            product.sale_price
                          )}
                        </strong>
                      </div>

                      <div className="product-add-icon">
                        <Plus size={17} />
                      </div>

                    </div>

                  </button>
                );
              })
            )}

          </div>

        </section>

        {/* ====================================
            CART SECTION
        ==================================== */}

        <aside className="pos-cart-section">

          <div className="cart-header">

            <div className="cart-title">

              <div className="cart-title-icon">
                <ShoppingCart size={19} />
              </div>

              <div>
                <h2>Current Sale</h2>

                <p>
                  {cartItemCount} item
                  {cartItemCount !== 1 ? "s" : ""}
                </p>
              </div>

            </div>

            <button
              type="button"
              className="cart-clear-btn"
              onClick={clearCart}
              disabled={cart.length === 0}
            >
              <Trash2 size={15} />
              Clear
            </button>

          </div>

          {/* CUSTOMER */}

          <div className="customer-section">

            <div className="customer-section-header">

              <div className="customer-label">
                <UserRound size={16} />
                Customer
              </div>

              <button
                type="button"
                className="customer-add-btn"
                onClick={() =>
                  setShowCustomerForm(true)
                }
              >
                <Plus size={14} />
                Add
              </button>

            </div>

            <div className="customer-select-wrapper">

              <UserRound size={17} />

              <select
                value={selectedCustomer}
                onChange={(event) =>
                  setSelectedCustomer(
                    event.target.value
                  )
                }
              >

                <option value="">
                  Walk-in Customer
                </option>

                {customers.map((customer) => (
                  <option
                    key={customer.id}
                    value={customer.id}
                  >
                    {customer.name}
                    {customer.phone
                      ? ` - ${customer.phone}`
                      : ""}
                  </option>
                ))}

              </select>

            </div>

            {selectedCustomerData && (
              <div className="customer-due-info">

                <span>
                  Current Due
                </span>

                <strong>
                  {currency}{" "}
                  {formatMoney(
                    selectedCustomerData.current_due
                  )}
                </strong>

              </div>
            )}

          </div>

          {/* CART ITEMS */}

          <div className="cart-items">

            {cart.length === 0 ? (
              <div className="cart-empty">

                <div className="cart-empty-icon">
                  <ShoppingCart size={26} />
                </div>

                <h3>
                  Your cart is empty
                </h3>

                <p>
                  Select a product or scan a
                  barcode to start a sale.
                </p>

              </div>
            ) : (
              cart.map((item) => (
                <div
                  className="cart-item"
                  key={`${item.id}-${item.batch_id ?? "no-batch"}`}
                >

                  <div className="cart-item-main">

                    <div className="cart-item-info">

                      <div className="cart-item-icon">

                        {item.image_url ? (
                          <img
                            src={item.image_url}
                            alt={item.name}
                            onError={(event) => {
                              event.currentTarget.style.display =
                                "none";

                              event.currentTarget.parentElement
                                ?.querySelector(
                                  ".cart-image-fallback"
                                )
                                ?.classList.add("show");
                            }}
                          />
                        ) : null}

                        <div className="cart-image-fallback">
                          <Package size={17} />
                        </div>

                      </div>

                      <div>

                        <div className="cart-item-name">
                          {item.name}
                        </div>

                        <div className="cart-item-batch">
                          <Barcode size={11} />
                          {item.barcode || "No barcode"}
                        </div>

                      </div>

                    </div>

                    <button
                      type="button"
                      className="cart-remove"
                      onClick={() =>
                        removeFromCart(item)
                      }
                    >
                      <X size={15} />
                    </button>

                  </div>

                  <div className="cart-item-meta">

                    <span>
                      <Layers3 size={12} />
                      Batch:{" "}
                      {item.batch_number || "-"}
                    </span>

                    <span>
                      <CalendarDays size={12} />
                      {item.expiry_date || "No expiry"}
                    </span>

                  </div>

                  <div className="cart-item-bottom">

                    <div className="cart-item-controls">

                      <button
                        type="button"
                        onClick={() =>
                          decreaseQuantity(item)
                        }
                      >
                        <Minus size={14} />
                      </button>

                      <strong>
                        {item.quantity}
                      </strong>

                      <button
                        type="button"
                        onClick={() =>
                          increaseQuantity(item)
                        }
                      >
                        <Plus size={14} />
                      </button>

                    </div>

                    <div className="cart-item-price">

                      <span>
                        {currency}{" "}
                        {formatMoney(
                          item.sale_price
                        )}{" "}
                        ×{" "}
                        {item.quantity}
                      </span>

                      <strong>
                        {currency}{" "}
                        {formatMoney(
                          Number(item.sale_price) *
                            Number(item.quantity)
                        )}
                      </strong>

                    </div>

                  </div>

                </div>
              ))
            )}

          </div>

          {/* ADJUSTMENTS */}

          <div className="cart-adjustments">

            <div className="adjustment-row">

              <div>
                <Tag size={15} />
                Discount
              </div>

              <div className="adjustment-input">

                <span>
                  {currency}
                </span>

                <input
                  type="number"
                  min="0"
                  value={discount}
                  onChange={(event) =>
                    setDiscount(
                      Number(event.target.value)
                    )
                  }
                />

              </div>

            </div>

            <div className="adjustment-row tax-row">

              <div>
                <Percent size={15} />
                Tax
              </div>

              <strong>
                {taxRate}% · {currency}{" "}
                {formatMoney(taxAmount)}
              </strong>

            </div>

          </div>

          {/* SUMMARY */}

          <div className="cart-summary">

            <div className="cart-summary-row">

              <span>
                Subtotal
              </span>

              <strong>
                {currency}{" "}
                {formatMoney(subtotal)}
              </strong>

            </div>

            <div className="cart-summary-row discount-summary">

              <span>
                Discount
              </span>

              <strong>
                - {currency}{" "}
                {formatMoney(finalDiscount)}
              </strong>

            </div>

            <div className="cart-summary-row">

              <span>
                Tax
              </span>

              <strong>
                {currency}{" "}
                {formatMoney(taxAmount)}
              </strong>

            </div>

            <div className="grand-total">

              <div>
                <span>
                  Grand Total
                </span>

                <small>
                  Payable amount
                </small>
              </div>

              <strong>
                {currency}{" "}
                {formatMoney(grandTotal)}
              </strong>

            </div>

          </div>

          {/* PAYMENT */}

          <div className="payment-section">

            <div className="payment-section-heading">

              <div className="payment-heading-icon">
                <WalletCards size={17} />
              </div>

              <div>

                <h3>
                  Payment
                </h3>

                <p>
                  Choose payment method
                </p>

              </div>

            </div>

            <div className="payment-method-grid">

              {[
                {
                  value: "cash",
                  label: "Cash",
                  icon: Banknote,
                },
                {
                  value: "bank",
                  label: "Bank",
                  icon: CreditCard,
                },
                {
                  value: "easypaisa",
                  label: "Easypaisa",
                  icon: WalletCards,
                },
                {
                  value: "jazzcash",
                  label: "JazzCash",
                  icon: WalletCards,
                },
              ].map((method) => {

                const Icon = method.icon;

                return (
                  <button
                    type="button"
                    key={method.value}
                    className={`payment-method-btn ${
                      paymentMethod === method.value
                        ? "active"
                        : ""
                    }`}
                    onClick={() =>
                      setPaymentMethod(
                        method.value
                      )
                    }
                  >
                    <Icon size={16} />
                    {method.label}
                  </button>
                );
              })}

            </div>

            <label className="paid-label">
              Amount Received
            </label>

            <div className="paid-input-wrapper">

              <span>
                {currency}
              </span>

              <input
                type="number"
                min="0"
                value={paidAmount}
                onChange={(event) =>
                  setPaidAmount(
                    Number(event.target.value)
                  )
                }
              />

            </div>

            <div
              className={`payment-result ${
                paid >= grandTotal
                  ? "change"
                  : "due"
              }`}
            >

              <div>
                {paid >= grandTotal
                  ? "Change"
                  : "Due"}
              </div>

              <strong>
                {currency}{" "}
                {formatMoney(
                  paid >= grandTotal
                    ? changeAmount
                    : dueAmount
                )}
              </strong>

            </div>

          </div>

          {/* CHECKOUT */}

          <button
            type="button"
            className="checkout-button"
            disabled={
              processingSale ||
              cart.length === 0
            }
            onClick={handleCheckout}
          >

            {processingSale ? (
              <>
                <RefreshCw
                  size={18}
                  className="pos-spin"
                />

                Processing Sale...
              </>
            ) : (
              <>
                <CheckCircle2 size={18} />

                Complete Sale

                <ArrowRight size={17} />
              </>
            )}

          </button>

        </aside>

      </div>

      {/* ======================================
          NEW PRODUCT MODAL
      ====================================== */}

      {showNewProductForm && (
        <div className="new-product-modal">

          <div className="new-product-dialog">

            <div className="modal-header">

              <div className="modal-header-icon blue">
                <Package size={21} />
              </div>

              <div>

                <div className="modal-eyebrow">
                  NEW INVENTORY ITEM
                </div>

                <h2>
                  Create Product
                </h2>

                <p>
                  Barcode was not found. Add
                  the product details below.
                </p>

              </div>

              <button
                type="button"
                className="modal-close"
                onClick={closeNewProductForm}
                disabled={savingNewProduct}
              >
                <X size={19} />
              </button>

            </div>

            <div className="new-product-barcode">

              <Barcode size={17} />

              <div>

                <span>
                  SCANNED BARCODE
                </span>

                <strong>
                  {newProductBarcode || "-"}
                </strong>

              </div>

            </div>

            <div className="form-row">

              <div className="form-group full">

                <label>
                  Product Name
                </label>

                <input
                  type="text"
                  placeholder="Enter product name"
                  value={newProductName}
                  onChange={(event) =>
                    setNewProductName(
                      event.target.value
                    )
                  }
                  autoFocus
                />

              </div>

            </div>

            <div className="form-row">

              <div className="form-group">

                <label>
                  Purchase Price
                </label>

                <div className="input-with-prefix">

                  <span>
                    {currency}
                  </span>

                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={
                      newProductPurchasePrice
                    }
                    onChange={(event) =>
                      setNewProductPurchasePrice(
                        event.target.value
                      )
                    }
                  />

                </div>

              </div>

              <div className="form-group">

                <label>
                  Sale Price
                </label>

                <div className="input-with-prefix">

                  <span>
                    {currency}
                  </span>

                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={
                      newProductSalePrice
                    }
                    onChange={(event) =>
                      setNewProductSalePrice(
                        event.target.value
                      )
                    }
                  />

                </div>

              </div>

            </div>

            <div className="form-row">

              <div className="form-group">

                <label>
                  Opening Stock
                </label>

                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={newProductStock}
                  onChange={(event) =>
                    setNewProductStock(
                      event.target.value
                    )
                  }
                />

              </div>

              <div className="form-group">

                <label>
                  Unit
                </label>

                <select
                  value={newProductUnit}
                  onChange={(event) =>
                    setNewProductUnit(
                      event.target.value
                    )
                  }
                >

                  <option value="piece">
                    Piece
                  </option>

                  <option value="kg">
                    Kilogram
                  </option>

                  <option value="gram">
                    Gram
                  </option>

                  <option value="litre">
                    Litre
                  </option>

                  <option value="ml">
                    Millilitre
                  </option>

                  <option value="box">
                    Box
                  </option>

                  <option value="pack">
                    Pack
                  </option>

                  <option value="dozen">
                    Dozen
                  </option>

                </select>

              </div>

            </div>

            <div className="modal-actions">

              <button
                type="button"
                className="modal-secondary-btn"
                onClick={closeNewProductForm}
                disabled={savingNewProduct}
              >
                Cancel
              </button>

              <button
                type="button"
                className="modal-primary-btn"
                onClick={handleSaveNewProduct}
                disabled={savingNewProduct}
              >

                {savingNewProduct ? (
                  <>
                    <RefreshCw
                      size={17}
                      className="pos-spin"
                    />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={17} />
                    Save & Add to Cart
                  </>
                )}

              </button>

            </div>

          </div>

        </div>
      )}

      {/* ======================================
          CUSTOMER MODAL
      ====================================== */}

      {showCustomerForm && (
        <div className="customer-modal-overlay">

          <div className="customer-modal">

            <div className="modal-header">

              <div className="modal-header-icon blue">
                <UserPlus size={21} />
              </div>

              <div>

                <div className="modal-eyebrow">
                  CUSTOMER MANAGEMENT
                </div>

                <h2>
                  Add Customer
                </h2>

                <p>
                  Create a customer for this sale.
                </p>

              </div>

              <button
                type="button"
                className="modal-close"
                onClick={() =>
                  setShowCustomerForm(false)
                }
                disabled={savingCustomer}
              >
                <X size={19} />
              </button>

            </div>

            <div className="form-group">

              <label>
                Customer Name
              </label>

              <input
                type="text"
                placeholder="Enter customer name"
                value={customerName}
                onChange={(event) =>
                  setCustomerName(
                    event.target.value
                  )
                }
                autoFocus
              />

            </div>

            <div className="form-group">

              <label>
                Phone Number
              </label>

              <input
                type="text"
                placeholder="Enter phone number"
                value={customerPhone}
                onChange={(event) =>
                  setCustomerPhone(
                    event.target.value
                  )
                }
              />

            </div>

            <div className="modal-actions">

              <button
                type="button"
                className="modal-secondary-btn"
                onClick={() =>
                  setShowCustomerForm(false)
                }
                disabled={savingCustomer}
              >
                Cancel
              </button>

              <button
                type="button"
                className="modal-primary-btn"
                onClick={handleSaveCustomer}
                disabled={savingCustomer}
              >

                {savingCustomer ? (
                  <>
                    <RefreshCw
                      size={17}
                      className="pos-spin"
                    />
                    Saving...
                  </>
                ) : (
                  <>
                    <UserPlus size={17} />
                    Save Customer
                  </>
                )}

              </button>

            </div>

          </div>

        </div>
      )}

      {/* ======================================
          BATCH MODAL
      ====================================== */}

      {batchModalOpen && (
        <div
          className="batch-modal-overlay"
          onClick={closeBatchSelector}
        >

          <div
            className="batch-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            <div className="batch-modal-header">

              <div className="batch-modal-title">

                <div className="batch-modal-icon">
                  <Layers3 size={20} />
                </div>

                <div>

                  <div className="modal-eyebrow">
                    INVENTORY
                  </div>

                  <h2>
                    Select Batch
                  </h2>

                  <p>
                    {selectedProductForBatch?.name ||
                      "Product"}
                  </p>

                </div>

              </div>

              <button
                type="button"
                onClick={closeBatchSelector}
              >
                <X size={19} />
              </button>

            </div>

            {loadingBatches ? (
              <div className="batch-modal-state">

                <RefreshCw
                  size={24}
                  className="pos-spin"
                />

                <p>
                  Loading available batches...
                </p>

              </div>
            ) : productBatches.length === 0 ? (
              <div className="batch-modal-state">

                <AlertTriangle size={28} />

                <h3>
                  No batches found
                </h3>

                <p>
                  This product does not have
                  any available batches.
                </p>

                <button
                  type="button"
                  className="modal-secondary-btn"
                  onClick={closeBatchSelector}
                >
                  Close
                </button>

              </div>
            ) : (
              <div className="batch-list">

                {productBatches.map((batch) => {

                  const batchStock = Number(
                    batch.quantity || 0
                  );

                  const today = new Date()
                    .toISOString()
                    .split("T")[0];

                  const expired =
                    batch.expiry_date &&
                    batch.expiry_date < today;

                  const outOfStock =
                    batchStock <= 0;

                  const disabled =
                    expired || outOfStock;

                  return (
                    <button
                      type="button"
                      key={batch.id}
                      disabled={disabled}
                      className={`batch-option ${
                        disabled
                          ? "batch-disabled"
                          : ""
                      }`}
                      onClick={() =>
                        handleBatchSelect(batch)
                      }
                    >

                      <div className="batch-option-main">

                        <div className="batch-option-icon">
                          <Layers3 size={18} />
                        </div>

                        <div>

                          <strong>
                            Batch{" "}
                            {batch.batch_number || "-"}
                          </strong>

                          <span>
                            {batch.expiry_date
                              ? `Expiry: ${batch.expiry_date}`
                              : "No expiry date"}
                          </span>

                        </div>

                      </div>

                      <div className="batch-option-status">

                        <strong>
                          {batchStock}
                        </strong>

                        <span>
                          Stock
                        </span>

                        {expired && (
                          <em>
                            Expired
                          </em>
                        )}

                        {!expired && outOfStock && (
                          <em>
                            Out of Stock
                          </em>
                        )}

                      </div>

                      {!disabled && (
                        <ChevronRight size={17} />
                      )}

                    </button>
                  );
                })}

              </div>
            )}

          </div>

        </div>
      )}

      {/* ======================================
          INVOICE MODAL
      ====================================== */}

      {showInvoice && invoice && (
        <div className="invoice-overlay">

          <div className="invoice-modal">

            <div className="invoice-modal-toolbar">

              <div>

                <div className="modal-eyebrow">
                  SALE COMPLETED
                </div>

                <h2>
                  Invoice Ready
                </h2>

              </div>

              <div className="invoice-toolbar-actions">

                <button
                  type="button"
                  className="invoice-print-btn"
                  onClick={printInvoice}
                >
                  <Printer size={16} />
                  Print Invoice
                </button>

                <button
                  type="button"
                  className="invoice-close-btn"
                  onClick={closeInvoice}
                >
                  <X size={18} />
                </button>

              </div>

            </div>

            <div className="invoice-print-area">

              <div className="invoice-head">

                <div>

                  <div className="invoice-brand">
                    {settings?.store_name ||
                      "NEXA POS"}
                  </div>

                  {settings?.store_phone && (
                    <p>
                      {settings.store_phone}
                    </p>
                  )}

                  {settings?.store_address && (
                    <p>
                      {settings.store_address}
                    </p>
                  )}

                </div>

                <div className="invoice-number-box">

                  <span>
                    INVOICE
                  </span>

                  <strong>
                    {
                      invoice.invoice
                        .invoice_number
                    }
                  </strong>

                  <small>
                    {formatInvoiceDate(
                      invoice.invoice.created_at
                    )}
                  </small>

                </div>

              </div>

              <div className="invoice-info-grid">

                <div className="invoice-info-card">

                  <UserRound size={16} />

                  <div>

                    <span>
                      CUSTOMER
                    </span>

                    <strong>
                      {invoice.invoice.customer_name ||
                        "Walk-in Customer"}
                    </strong>

                    <small>
                      {invoice.invoice.customer_phone ||
                        "No phone"}
                    </small>

                  </div>

                </div>

                <div className="invoice-info-card">

                  <Receipt size={16} />

                  <div>

                    <span>
                      CASHIER
                    </span>

                    <strong>
                      {invoice.invoice.cashier || "-"}
                    </strong>

                    <small>
                      Payment:{" "}
                      {invoice.invoice.payment_method}
                    </small>

                  </div>

                </div>

              </div>

              <table className="invoice-items">

                <thead>

                  <tr>
                    <th>Product</th>
                    <th>Barcode</th>
                    <th>Qty</th>
                    <th>Price</th>
                    <th>Total</th>
                  </tr>

                </thead>

                <tbody>

                  {invoice.items.map((item) => (
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
                        {currency}{" "}
                        {item.unit_price}
                      </td>

                      <td>
                        {currency}{" "}
                        {item.total}
                      </td>

                    </tr>
                  ))}

                </tbody>

              </table>

              <div className="invoice-summary">

                <div className="invoice-summary-row">

                  <span>
                    Subtotal
                  </span>

                  <strong>
                    {currency}{" "}
                    {invoice.invoice.subtotal}
                  </strong>

                </div>

                <div className="invoice-summary-row">

                  <span>
                    Discount
                  </span>

                  <strong>
                    {currency}{" "}
                    {invoice.invoice.discount}
                  </strong>

                </div>

                <div className="invoice-summary-row">

                  <span>
                    Tax (
                    {invoice.invoice.tax_rate || 0}
                    %)
                  </span>

                  <strong>
                    {currency}{" "}
                    {invoice.invoice.tax || 0}
                  </strong>

                </div>

                <div className="invoice-grand-total">

                  <span>
                    Grand Total
                  </span>

                  <strong>
                    {currency}{" "}
                    {invoice.invoice.total}
                  </strong>

                </div>

                <div className="invoice-summary-row">

                  <span>
                    Paid
                  </span>

                  <strong>
                    {currency}{" "}
                    {invoice.invoice.paid_amount}
                  </strong>

                </div>

                <div className="invoice-summary-row">

                  <span>
                    Due
                  </span>

                  <strong>
                    {currency}{" "}
                    {invoice.invoice.due_amount}
                  </strong>

                </div>

              </div>

              <div className="invoice-footer">

                <strong>
                  {settings?.invoice_footer ||
                    "Thank you for shopping with us!"}
                </strong>

                <span>
                  Powered by NEXA POS
                </span>

              </div>

            </div>

            <div className="invoice-bottom-actions">

              <button
                type="button"
                className="invoice-secondary-btn"
                onClick={closeInvoice}
              >
                Close
              </button>

              <button
                type="button"
                className="invoice-primary-btn"
                onClick={printInvoice}
              >
                <Printer size={17} />
                Print Invoice
              </button>

            </div>

          </div>

        </div>
      )}

    </div>
  );
}

export default POS;