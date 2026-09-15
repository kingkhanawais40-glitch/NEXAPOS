import { useEffect, useState } from "react";
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
  const [searchTerm, setSearchTerm] = useState("");
  const [editingProductId, setEditingProductId] = useState(null);
const [showEditForm, setShowEditForm] = useState(false);

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
  useEffect(() => {
  const fetchCategories = async () => {
    try {
      const response = await api.get("/products/categories");

      setCategories(response.data.data);
    } catch (error) {
      console.error(
        error.response?.data?.message ||
          "Failed to load categories"
      );
    }
  };

  fetchCategories();
}, []);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Products</h1>
          <p>
            Manage your store inventory and products.
          </p>
        </div>

        {isAdmin && (
  <>
    <button onClick={() => setShowProductForm(true)}>
      + Add Product
    </button>

    <button onClick={() => setShowCategoryForm(true)}>
      + Add Category
    </button>
  </>
)}
      </div>
      {showCategoryForm && (
  <div>
    <h2>Add Category</h2>

    <input
      type="text"
      placeholder="Category Name"
      value={categoryName}
      onChange={(e) =>
        setCategoryName(e.target.value)
      }
    />
    <button
  onClick={async () => {
    if (!categoryName.trim()) {
      showError("Category name is required");
      return;
    }

    try {
      const response = await api.post("/products/categories", {
        name: categoryName.trim(),
      });

      showSuccess(
        response.data.message ||
          "Category added successfully"
      );

      const categoriesResponse = await api.get(
        "/products/categories"
      );

      setCategories(categoriesResponse.data.data);

      setCategoryName("");
      setShowCategoryForm(false);
    } catch (error) {
      showError(
        error.response?.data?.message ||
          "Failed to add category"
      );
    }
  }}
>
  Save Category
</button>

    <button
      onClick={() => {
        setCategoryName("");
        setShowCategoryForm(false);
      }}
    >
      Cancel
    </button>
  </div>
)}

      {showProductForm && (
        <div>
          <h3>
  {editingProductId ? "Edit Product" : "Add Product"}
</h3>

          <input
            type="text"
            placeholder="Product Name"
            value={productName}
            onChange={(e) =>
              setProductName(e.target.value)
            }
          />

          <input
            type="text"
            placeholder="Barcode"
            value={barcode}
            onChange={(e) =>
              setBarcode(e.target.value)
            }
          />

          <select
  value={categoryId}
  onChange={(e) =>
    setCategoryId(e.target.value)
  }
>
  <option value="">Select Category</option>

  {categories.map((category) => (
    <option
      key={category.id}
      value={category.id}
    >
      {category.name}
    </option>
  ))}
</select>

          <input
            type="number"
            placeholder="Purchase Price"
            value={purchasePrice}
            onChange={(e) =>
              setPurchasePrice(e.target.value)
            }
          />

          <input
            type="number"
            placeholder="Sale Price"
            value={salePrice}
            onChange={(e) =>
              setSalePrice(e.target.value)
            }
          />

          <input
            type="number"
            placeholder="Stock"
            value={stock}
            onChange={(e) =>
              setStock(e.target.value)
            }
            
          />
          <div className="form-group">
  <label>Low Stock Limit</label>
  <input
    type="number"
    min="0"
    value={lowStockLimit}
    onChange={(e) => setLowStockLimit(e.target.value)}
    placeholder="e.g. 5"
  />
</div>

          <select
            value={unit}
            onChange={(e) =>
              setUnit(e.target.value)
            }
          >
            <option value="piece">Piece</option>
            <option value="kg">Kg</option>
            <option value="gram">Gram</option>
            <option value="liter">Liter</option>
            <option value="pack">Pack</option>
            <option value="dozen">Dozen</option>
            <option value="box">Box</option>
          </select>

          <br />
          <button
  onClick={async () => {
    if (!productName.trim()) {
  showError("Product name is required");
  return;
}

if (!categoryId) {
  showError("Please select a category");
  return;
}

const purchase = Number(purchasePrice);
const sale = Number(salePrice);
const currentStock = Number(stock || 0);

if (purchase < 0 || sale < 0) {
  showError("Prices cannot be negative");
  return;
}

if (currentStock < 0) {
  showError("Stock cannot be negative");
  return;
}

if (sale < purchase) {
  const confirmSalePrice = await confirm(
    "Sale price is lower than purchase price. Do you want to continue?",
    { confirmLabel: "Continue", danger: false }
  );

  if (!confirmSalePrice) {
    return;
  }
}

    try {
      let response;

if (editingProductId) {
  response = await api.put(`/products/${editingProductId}`, {
    name: productName,
    barcode: barcode || null,
    category_id: Number(categoryId),
    purchase_price: Number(purchasePrice),
    sale_price: Number(salePrice),
    stock: Number(stock || 0),
    low_stock_limit: Number(lowStockLimit || 5),
    unit,
  });
} else {
  response = await api.post("/products", {
    name: productName,
    barcode: barcode || null,
    category_id: Number(categoryId),
    purchase_price: Number(purchasePrice),
    sale_price: Number(salePrice),
    stock: Number(stock || 0),
    low_stock_limit: Number(lowStockLimit || 5),
    unit,
  });
}

      showSuccess(
  response.data.message ||
    "Product saved successfully"
);

      const productsResponse = await api.get("/products");
      setProducts(productsResponse.data.data);

      setProductName("");
      setBarcode("");
      setCategoryId("");
      setPurchasePrice("");
      setSalePrice("");
      setStock("");
      setUnit("piece");
      setLowStockLimit("5");
      setEditingProductId(null);

      setShowProductForm(false);
    } catch (error) {
      showError(
        error.response?.data?.message ||
          "Failed to add product"
      );
    }
  }}
>
  {editingProductId ? "Update Product" : "Save Product"}
</button>

          <button
            onClick={() => {
  setProductName("");
  setBarcode("");
  setCategoryId("");
  setPurchasePrice("");
  setSalePrice("");
  setStock("");
  setUnit("piece");
  setLowStockLimit("5");
  setEditingProductId(null);
  setShowProductForm(false);
}}
          >
            Cancel
          </button>
        </div>
      )}
      <input
  type="text"
  placeholder="Search product by name or barcode..."
  value={searchTerm}
  onChange={(e) => setSearchTerm(e.target.value)}
/>

      {loading ? (
        <p>Loading products...</p>
      ) : products.length === 0 ? (
        <p>No products found.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Barcode</th>
              <th>Category</th>
              <th>Purchase Price</th>
              <th>Sale Price</th>
              <th>Stock</th>
              <th>Status</th>
              <th>Unit</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
  {products
    .filter((product) => {
      const search = searchTerm.toLowerCase();

      return (
        product.name?.toLowerCase().includes(search) ||
        product.barcode?.toLowerCase().includes(search)
      );
    })
    .map((product) => (
      <tr key={product.id}>
        <td>{product.name}</td>
        <td>{product.barcode || "-"}</td>
        <td>{product.category_name || "-"}</td>
        <td>{currency} {product.purchase_price}</td>
        <td>{currency} {product.sale_price}</td>
        <td>{product.stock}</td>
        <td>
  {product.stock <= 0
    ? "Out of Stock"
    : product.stock <= (product.low_stock_limit ?? 5)
    ? "Low Stock"
    : "In Stock"}
</td>
        <td>{product.unit}</td>
        <td>
            {isAdmin && (
  <div className="product-actions">
    <button
      className="edit-btn"
      onClick={() => {
     setEditingProductId(product.id);

  setProductName(product.name || "");
  setBarcode(product.barcode || "");
  setCategoryId(product.category_id ? String(product.category_id) : "");
  setPurchasePrice(product.purchase_price ?? "");
  setSalePrice(product.sale_price ?? "");
  setStock(product.stock ?? "");
  setUnit(product.unit || "piece");

  setShowProductForm(true);
}}
    >
      Edit
    </button>

    <button
      className="delete-btn"
      onClick={async () => {
  const confirmed = await confirm(
    `Are you sure you want to delete "${product.name}"?`
  );

  if (!confirmed) {
    return;
  }

  try {
    const response = await api.delete(`/products/${product.id}`);

    showSuccess(
      response.data.message ||
        "Product deleted successfully"
    );

    const productsResponse = await api.get("/products");

    setProducts(productsResponse.data.data);
  } catch (error) {
    showError(
      error.response?.data?.message ||
        "Failed to delete product"
    );
  }
}}
    >
      Delete
    </button>
  </div>
)}
</td>
      </tr>
    ))}
</tbody>
        </table>
      )}
    </div>
  );
}

export default Products;