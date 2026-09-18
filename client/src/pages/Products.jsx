import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  FolderPlus,
  Search,
  Pencil,
  Trash2,
  Package,
  AlertTriangle,
  Boxes,
  X,
  ImagePlus,
} from "lucide-react";

import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useSettings } from "../context/SettingsContext";
import { useNotification } from "../context/NotificationContext";

function Products() {
  const { user } = useAuth();
  const { currency } = useSettings();
  const { showSuccess, showError, confirm } = useNotification();

  const isAdmin = user?.role === "admin";

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showProductForm, setShowProductForm] = useState(false);
  const [showCategoryForm, setShowCategoryForm] = useState(false);

  const [categoryName, setCategoryName] = useState("");
  const [categories, setCategories] = useState([]);

  const [productName, setProductName] = useState("");
  const [barcode, setBarcode] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [salePrice, setSalePrice] = useState("");
  const [stock, setStock] = useState("");
  const [unit, setUnit] = useState("piece");
  const [lowStockLimit, setLowStockLimit] = useState("5");

  const [imageUrl, setImageUrl] = useState("");
  const [imagePreview, setImagePreview] = useState("");
  const [imageLoadError, setImageLoadError] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [editingProductId, setEditingProductId] = useState(null);

  /* =====================================================
     IMAGE URL
  ===================================================== */

  const getImageUrl = (url) => {
    if (!url) {
      return "";
    }

    const cleanUrl = String(url).trim();

    if (
      cleanUrl.startsWith("http://") ||
      cleanUrl.startsWith("https://")
    ) {
      return cleanUrl;
    }

    const baseURL = api.defaults?.baseURL || "";
    const serverURL = baseURL.replace(/\/api\/?$/, "");

    return `${serverURL}${cleanUrl}`;
  };

  /* =====================================================
     VALIDATE IMAGE URL
  ===================================================== */

  const validateImageUrl = (url) => {
    const cleanUrl = url.trim();

    if (!cleanUrl) {
      return true;
    }

    try {
      const parsedUrl = new URL(cleanUrl);

      return (
        parsedUrl.protocol === "http:" ||
        parsedUrl.protocol === "https:"
      );
    } catch {
      return false;
    }
  };

  /* =====================================================
     FETCH PRODUCTS
  ===================================================== */

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await api.get("/products");
        setProducts(response.data.data || []);
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

  /* =====================================================
     FETCH CATEGORIES
  ===================================================== */

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await api.get("/products/categories");
        setCategories(response.data.data || []);
      } catch (error) {
        console.error(
          error.response?.data?.message ||
            "Failed to load categories"
        );
      }
    };

    fetchCategories();
  }, []);

  /* =====================================================
     RESET PRODUCT FORM
  ===================================================== */

  const resetProductForm = () => {
    setProductName("");
    setBarcode("");
    setCategoryId("");
    setPurchasePrice("");
    setSalePrice("");
    setStock("");
    setUnit("piece");
    setLowStockLimit("5");

    setImageUrl("");
    setImagePreview("");
    setImageLoadError(false);

    setEditingProductId(null);
    setShowProductForm(false);
  };

  /* =====================================================
     OPEN EDIT FORM
  ===================================================== */

  const openEditProduct = (product) => {
    setEditingProductId(product.id);

    setProductName(product.name || "");
    setBarcode(product.barcode || "");

    setCategoryId(
      product.category_id
        ? String(product.category_id)
        : ""
    );

    setPurchasePrice(product.purchase_price ?? "");
    setSalePrice(product.sale_price ?? "");
    setStock(product.stock ?? "");
    setUnit(product.unit || "piece");

    setLowStockLimit(
      product.low_stock_limit ?? "5"
    );

    const currentImage = product.image_url || "";

    setImageUrl(currentImage);
    setImagePreview(
      currentImage ? getImageUrl(currentImage) : ""
    );
    setImageLoadError(false);

    setShowProductForm(true);
  };

  /* =====================================================
     IMAGE URL CHANGE
  ===================================================== */

  const handleImageUrlChange = (event) => {
    const value = event.target.value;

    setImageUrl(value);
    setImageLoadError(false);

    if (!value.trim()) {
      setImagePreview("");
      return;
    }

    setImagePreview(value.trim());
  };

  /* =====================================================
     REMOVE IMAGE
  ===================================================== */

  const removeImage = () => {
    setImageUrl("");
    setImagePreview("");
    setImageLoadError(false);
  };

  /* =====================================================
     SAVE PRODUCT
  ===================================================== */

  const handleSaveProduct = async () => {
    if (!productName.trim()) {
      showError("Product name is required");
      return;
    }

    if (!categoryId) {
      showError("Please select a category");
      return;
    }

    if (imageUrl.trim() && !validateImageUrl(imageUrl)) {
      showError(
        "Please enter a valid image URL starting with http:// or https://"
      );
      return;
    }

    const purchase = Number(purchasePrice);
    const sale = Number(salePrice);
    const currentStock = Number(stock || 0);
    const currentLowStockLimit = Number(
      lowStockLimit || 5
    );

    if (purchase < 0 || sale < 0) {
      showError("Prices cannot be negative");
      return;
    }

    if (currentStock < 0) {
      showError("Stock cannot be negative");
      return;
    }

    if (currentLowStockLimit < 0) {
      showError("Low stock limit cannot be negative");
      return;
    }

    if (sale < purchase) {
      const confirmSalePrice = await confirm(
        "Sale price is lower than purchase price. Do you want to continue?",
        {
          confirmLabel: "Continue",
          danger: false,
        }
      );

      if (!confirmSalePrice) {
        return;
      }
    }

    try {
      const payload = {
        name: productName.trim(),
        barcode: barcode.trim(),
        category_id: Number(categoryId),
        purchase_price: purchase,
        sale_price: sale,
        stock: currentStock,
        low_stock_limit: currentLowStockLimit,
        unit,
        image_url: imageUrl.trim(),
      };

      let response;

      if (editingProductId) {
        response = await api.put(
          `/products/${editingProductId}`,
          payload
        );
      } else {
        response = await api.post(
          "/products",
          payload
        );
      }

      showSuccess(
        response.data.message ||
          "Product saved successfully"
      );

      const productsResponse =
        await api.get("/products");

      setProducts(
        productsResponse.data.data || []
      );

      resetProductForm();
    } catch (error) {
      console.error(error);

      showError(
        error.response?.data?.message ||
          "Failed to save product"
      );
    }
  };

  /* =====================================================
     SAVE CATEGORY
  ===================================================== */

  const handleSaveCategory = async () => {
    if (!categoryName.trim()) {
      showError("Category name is required");
      return;
    }

    try {
      const response = await api.post(
        "/products/categories",
        {
          name: categoryName.trim(),
        }
      );

      showSuccess(
        response.data.message ||
          "Category added successfully"
      );

      const categoriesResponse =
        await api.get("/products/categories");

      setCategories(
        categoriesResponse.data.data || []
      );

      setCategoryName("");
      setShowCategoryForm(false);
    } catch (error) {
      showError(
        error.response?.data?.message ||
          "Failed to add category"
      );
    }
  };

  /* =====================================================
     DELETE PRODUCT
  ===================================================== */

  const handleDeleteProduct = async (product) => {
    const confirmed = await confirm(
      `Are you sure you want to delete "${product.name}"?`
    );

    if (!confirmed) {
      return;
    }

    try {
      const response = await api.delete(
        `/products/${product.id}`
      );

      showSuccess(
        response.data.message ||
          "Product deleted successfully"
      );

      const productsResponse =
        await api.get("/products");

      setProducts(
        productsResponse.data.data || []
      );
    } catch (error) {
      showError(
        error.response?.data?.message ||
          "Failed to delete product"
      );
    }
  };

  /* =====================================================
     FILTER PRODUCTS
  ===================================================== */

  const filteredProducts = useMemo(() => {
    const search = searchTerm
      .trim()
      .toLowerCase();

    if (!search) {
      return products;
    }

    return products.filter((product) => {
      return (
        product.name
          ?.toLowerCase()
          .includes(search) ||
        product.barcode
          ?.toLowerCase()
          .includes(search) ||
        product.category_name
          ?.toLowerCase()
          .includes(search)
      );
    });
  }, [products, searchTerm]);

  /* =====================================================
     PRODUCT STATS
  ===================================================== */

  const totalProducts = products.length;

  const lowStockProducts = products.filter(
    (product) =>
      Number(product.stock) > 0 &&
      Number(product.stock) <=
        Number(product.low_stock_limit ?? 5)
  ).length;

  const outOfStockProducts = products.filter(
    (product) => Number(product.stock) <= 0
  ).length;

  /* =====================================================
     PRODUCT STATUS
  ===================================================== */

  const getProductStatus = (product) => {
    const productStock = Number(
      product.stock || 0
    );

    const limit = Number(
      product.low_stock_limit ?? 5
    );

    if (productStock <= 0) {
      return {
        label: "Out of Stock",
        className: "status-danger",
      };
    }

    if (productStock <= limit) {
      return {
        label: "Low Stock",
        className: "status-warning",
      };
    }

    return {
      label: "In Stock",
      className: "status-success",
    };
  };

  /* =====================================================
     RENDER
  ===================================================== */

  return (
    <div className="products-page">

      {/* =================================================
          PAGE HEADER
      ================================================= */}

      <div className="page-header">

        <div>
          <div className="page-eyebrow">
            INVENTORY MANAGEMENT
          </div>

          <h1>Products</h1>

          <p>
            Manage your store inventory,
            pricing and stock levels.
          </p>
        </div>

        {isAdmin && (
          <div className="page-header-actions">

            <button
              className="secondary-btn"
              onClick={() =>
                setShowCategoryForm(true)
              }
            >
              <FolderPlus size={17} />
              Add Category
            </button>

            <button
              className="primary-btn"
              onClick={() =>
                setShowProductForm(true)
              }
            >
              <Plus size={18} />
              Add Product
            </button>

          </div>
        )}

      </div>

      {/* =================================================
          SUMMARY CARDS
      ================================================= */}

      <div className="products-summary-grid">

        <div className="products-summary-card">

          <div className="products-summary-icon blue">
            <Package size={20} />
          </div>

          <div>
            <span>Total Products</span>

            <strong>
              {totalProducts.toLocaleString("en-PK")}
            </strong>
          </div>

        </div>

        <div className="products-summary-card">

          <div className="products-summary-icon warning">
            <AlertTriangle size={20} />
          </div>

          <div>
            <span>Low Stock</span>

            <strong>
              {lowStockProducts.toLocaleString("en-PK")}
            </strong>
          </div>

        </div>

        <div className="products-summary-card">

          <div className="products-summary-icon danger">
            <Boxes size={20} />
          </div>

          <div>
            <span>Out of Stock</span>

            <strong>
              {outOfStockProducts.toLocaleString("en-PK")}
            </strong>
          </div>

        </div>

      </div>

      {/* =================================================
          SEARCH TOOLBAR
      ================================================= */}

      <div className="products-toolbar">

        <div className="products-search">

          <Search size={18} />

          <input
            type="text"
            placeholder="Search product, barcode or category..."
            value={searchTerm}
            onChange={(e) =>
              setSearchTerm(e.target.value)
            }
          />

          {searchTerm && (
            <button
              className="products-search-clear"
              onClick={() => setSearchTerm("")}
              type="button"
              aria-label="Clear search"
            >
              <X size={16} />
            </button>
          )}

        </div>

        <div className="products-result-count">
          {filteredProducts.length}{" "}
          {filteredProducts.length === 1
            ? "product"
            : "products"}
        </div>

      </div>

      {/* =================================================
          PRODUCT TABLE
      ================================================= */}

      <div className="products-table-card">

        <div className="products-table-header">

          <div>
            <h2>Product Inventory</h2>

            <p>
              Current products and stock status
            </p>
          </div>

        </div>

        {loading ? (

          <div className="products-empty-state">

            <div className="products-empty-icon">
              <Package size={28} />
            </div>

            <h3>Loading products...</h3>

            <p>
              Please wait while inventory is loaded.
            </p>

          </div>

        ) : products.length === 0 ? (

          <div className="products-empty-state">

            <div className="products-empty-icon">
              <Package size={28} />
            </div>

            <h3>No products found</h3>

            <p>
              Your inventory does not contain
              any products yet.
            </p>

            {isAdmin && (
              <button
                className="primary-btn"
                onClick={() =>
                  setShowProductForm(true)
                }
              >
                <Plus size={17} />
                Add First Product
              </button>
            )}

          </div>

        ) : filteredProducts.length === 0 ? (

          <div className="products-empty-state">

            <div className="products-empty-icon">
              <Search size={28} />
            </div>

            <h3>No matching products</h3>

            <p>
              Try searching with a different
              product name, barcode or category.
            </p>

          </div>

        ) : (

          <div className="table-wrapper">

            <table>

              <thead>
                <tr>
                  <th>Product</th>
                  <th>Barcode</th>
                  <th>Category</th>
                  <th>Purchase Price</th>
                  <th>Sale Price</th>
                  <th>Stock</th>
                  <th>Status</th>
                  <th>Unit</th>

                  {isAdmin && (
                    <th>Actions</th>
                  )}
                </tr>
              </thead>

              <tbody>

                {filteredProducts.map((product) => {

                  const status =
                    getProductStatus(product);

                  const imageUrl =
                    getImageUrl(product.image_url);

                  return (
                    <tr key={product.id}>

                      {/* PRODUCT */}

                      <td>

                        <div className="product-name-cell">

                          <div
                            className="product-table-image"
                            style={{
                              width: "46px",
                              height: "46px",
                              minWidth: "46px",
                              borderRadius: "10px",
                              overflow: "hidden",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0,
                            }}
                          >

                            {imageUrl ? (
                              <img
                                src={imageUrl}
                                alt={product.name}
                                loading="lazy"
                                style={{
                                  width: "100%",
                                  height: "100%",
                                  objectFit: "cover",
                                  display: "block",
                                }}
                                onError={(e) => {
                                  e.currentTarget.style.display =
                                    "none";

                                  const fallback =
                                    e.currentTarget
                                      .parentElement
                                      ?.querySelector(
                                        ".product-table-image-fallback"
                                      );

                                  if (fallback) {
                                    fallback.style.display =
                                      "flex";
                                  }
                                }}
                              />
                            ) : null}

                            <div
                              className="product-table-image-fallback"
                              style={{
                                display: imageUrl
                                  ? "none"
                                  : "flex",
                                width: "100%",
                                height: "100%",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              <Package size={17} />
                            </div>

                          </div>

                          <div className="product-name-content">

                            <strong>
                              {product.name}
                            </strong>

                            {product.barcode && (
                              <span>
                                {product.barcode}
                              </span>
                            )}

                          </div>

                        </div>

                      </td>

                      {/* BARCODE */}

                      <td>
                        <span className="product-barcode">
                          {product.barcode || "-"}
                        </span>
                      </td>

                      {/* CATEGORY */}

                      <td>
                        <span className="product-category">
                          {product.category_name || "-"}
                        </span>
                      </td>

                      {/* PURCHASE PRICE */}

                      <td>
                        <span className="table-money">
                          {currency}{" "}
                          {Number(
                            product.purchase_price || 0
                          ).toLocaleString("en-PK")}
                        </span>
                      </td>

                      {/* SALE PRICE */}

                      <td>
                        <span className="table-money sale-price">
                          {currency}{" "}
                          {Number(
                            product.sale_price || 0
                          ).toLocaleString("en-PK")}
                        </span>
                      </td>

                      {/* STOCK */}

                      <td>
                        <strong className="stock-value">
                          {Number(
                            product.stock || 0
                          ).toLocaleString("en-PK")}
                        </strong>
                      </td>

                      {/* STATUS */}

                      <td>
                        <span
                          className={`status-badge ${status.className}`}
                        >
                          <span className="status-dot" />
                          {status.label}
                        </span>
                      </td>

                      {/* UNIT */}

                      <td>
                        <span className="unit-badge">
                          {product.unit || "-"}
                        </span>
                      </td>

                      {/* ACTIONS */}

                      {isAdmin && (
                        <td>

                          <div className="product-actions">

                            <button
                              className="table-action-btn edit-btn"
                              onClick={() =>
                                openEditProduct(product)
                              }
                              title="Edit product"
                            >
                              <Pencil size={15} />
                              Edit
                            </button>

                            <button
                              className="table-action-btn delete-btn"
                              onClick={() =>
                                handleDeleteProduct(product)
                              }
                              title="Delete product"
                            >
                              <Trash2 size={15} />
                              Delete
                            </button>

                          </div>

                        </td>
                      )}

                    </tr>
                  );
                })}

              </tbody>

            </table>

          </div>
        )}

      </div>

      {/* =================================================
          CATEGORY MODAL
      ================================================= */}

      {showCategoryForm && (

        <div className="modal-overlay">

          <div className="modal products-form-modal">

            <div className="modal-header">

              <div>

                <div className="modal-icon">
                  <FolderPlus size={20} />
                </div>

                <div>
                  <h2>Add Category</h2>

                  <p>
                    Create a new product category.
                  </p>
                </div>

              </div>

              <button
                className="modal-close"
                onClick={() => {
                  setCategoryName("");
                  setShowCategoryForm(false);
                }}
              >
                <X size={19} />
              </button>

            </div>

            <div className="form-group">

              <label>
                Category Name
              </label>

              <input
                type="text"
                placeholder="e.g. Beverages"
                value={categoryName}
                onChange={(e) =>
                  setCategoryName(e.target.value)
                }
                autoFocus
              />

            </div>

            <div className="modal-actions">

              <button
                className="secondary-btn"
                onClick={() => {
                  setCategoryName("");
                  setShowCategoryForm(false);
                }}
              >
                Cancel
              </button>

              <button
                className="primary-btn"
                onClick={handleSaveCategory}
              >
                <Plus size={17} />
                Save Category
              </button>

            </div>

          </div>

        </div>
      )}

      {/* =================================================
          PRODUCT MODAL
      ================================================= */}

      {showProductForm && (

        <div className="modal-overlay">

          <div className="modal products-form-modal large">

            <div className="modal-header">

              <div>

                <div className="modal-icon">
                  <Package size={20} />
                </div>

                <div>

                  <h2>
                    {editingProductId
                      ? "Edit Product"
                      : "Add Product"}
                  </h2>

                  <p>
                    {editingProductId
                      ? "Update product information and inventory details."
                      : "Add a new product to your inventory."}
                  </p>

                </div>

              </div>

              <button
                className="modal-close"
                onClick={resetProductForm}
              >
                <X size={19} />
              </button>

            </div>

            {/* =================================================
                PRODUCT IMAGE URL
            ================================================= */}

            <div className="product-image-upload">

              <div className="product-image-upload-header">

                <div>

                  <label>
                    Product Image
                  </label>

                  <p>
                    Paste a public image URL — no download required
                  </p>

                </div>

                {imageUrl && (
                  <button
                    type="button"
                    className="image-remove-btn"
                    onClick={removeImage}
                  >
                    <X size={15} />
                    Remove
                  </button>
                )}

              </div>

              <div className="product-image-url-row">

                <div className="product-image-url-input">

                  <ImagePlus size={18} />

                  <input
                    type="url"
                    placeholder="https://example.com/product-image.jpg"
                    value={imageUrl}
                    onChange={handleImageUrlChange}
                  />

                </div>

              </div>

              <div className="product-image-help">

                <span>
                  Google Images → open the image → right-click →
                  <strong> Copy image address</strong> → paste here.
                </span>

              </div>

              {imagePreview && !imageLoadError && (

                <div
                  className="product-image-preview-wrapper"
                  style={{
                    width: "90px",
                    height: "90px",
                    overflow: "hidden",
                    borderRadius: "12px",
                  }}
                >

                  <img
                    src={getImageUrl(imagePreview)}
                    alt="Product preview"
                    className="product-image-preview"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      display: "block",
                    }}
                    onError={() => {
                      setImageLoadError(true);
                    }}
                  />

                </div>

              )}

              {imagePreview && imageLoadError && (

                <div className="product-image-error">

                  <ImagePlus size={20} />

                  <div>

                    <strong>
                      Image could not be loaded
                    </strong>

                    <span>
                      Make sure you copied the direct image
                      address, not the Google search page URL.
                    </span>

                  </div>

                </div>

              )}

            </div>

            {/* =================================================
                PRODUCT FIELDS
            ================================================= */}

            <div className="form-grid">

              <div className="form-group">

                <label>
                  Product Name
                </label>

                <input
                  type="text"
                  placeholder="Enter product name"
                  value={productName}
                  onChange={(e) =>
                    setProductName(e.target.value)
                  }
                />

              </div>

              <div className="form-group">

                <label>
                  Barcode
                </label>

                <input
                  type="text"
                  placeholder="Enter barcode"
                  value={barcode}
                  onChange={(e) =>
                    setBarcode(e.target.value)
                  }
                />

              </div>

              <div className="form-group">

                <label>
                  Category
                </label>

                <select
                  value={categoryId}
                  onChange={(e) =>
                    setCategoryId(e.target.value)
                  }
                >

                  <option value="">
                    Select Category
                  </option>

                  {categories.map((category) => (
                    <option
                      key={category.id}
                      value={category.id}
                    >
                      {category.name}
                    </option>
                  ))}

                </select>

              </div>

              <div className="form-group">

                <label>
                  Unit
                </label>

                <select
                  value={unit}
                  onChange={(e) =>
                    setUnit(e.target.value)
                  }
                >

                  <option value="piece">
                    Piece
                  </option>

                  <option value="kg">
                    Kg
                  </option>

                  <option value="gram">
                    Gram
                  </option>

                  <option value="liter">
                    Liter
                  </option>

                  <option value="pack">
                    Pack
                  </option>

                  <option value="dozen">
                    Dozen
                  </option>

                  <option value="box">
                    Box
                  </option>

                </select>

              </div>

              <div className="form-group">

                <label>
                  Purchase Price
                </label>

                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={purchasePrice}
                  onChange={(e) =>
                    setPurchasePrice(e.target.value)
                  }
                />

              </div>

              <div className="form-group">

                <label>
                  Sale Price
                </label>

                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={salePrice}
                  onChange={(e) =>
                    setSalePrice(e.target.value)
                  }
                />

              </div>

              <div className="form-group">

                <label>
                  Stock
                </label>

                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={stock}
                  onChange={(e) =>
                    setStock(e.target.value)
                  }
                />

              </div>

              <div className="form-group">

                <label>
                  Low Stock Limit
                </label>

                <input
                  type="number"
                  min="0"
                  placeholder="5"
                  value={lowStockLimit}
                  onChange={(e) =>
                    setLowStockLimit(e.target.value)
                  }
                />

              </div>

            </div>

            {/* =================================================
                ACTIONS
            ================================================= */}

            <div className="modal-actions">

              <button
                className="secondary-btn"
                onClick={resetProductForm}
              >
                Cancel
              </button>

              <button
                className="primary-btn"
                onClick={handleSaveProduct}
              >

                {editingProductId ? (
                  <>
                    <Pencil size={17} />
                    Update Product
                  </>
                ) : (
                  <>
                    <Plus size={17} />
                    Save Product
                  </>
                )}

              </button>

            </div>

          </div>

        </div>
      )}

    </div>
  );
}

export default Products;