const db = require("./db");

// Categories
const categories = [
    "Grocery",
    "Beverages",
    "Snacks",
    "Dairy",
    "Personal Care"
];

const insertCategory = db.prepare(`
    INSERT OR IGNORE INTO categories (name)
    VALUES (?)
`);

for (const category of categories) {
    insertCategory.run(category);
}

// Get category IDs
const getCategory = db.prepare(`
    SELECT id FROM categories WHERE name = ?
`);

// Products
const products = [{
        name: "Tapal Tea 950g",
        barcode: "896400001001",
        category: "Grocery",
        unit: "pack",
        purchase_price: 850,
        sale_price: 950,
        stock: 20,
        low_stock_limit: 5
    },
    {
        name: "Surf Excel 1kg",
        barcode: "896400001002",
        category: "Grocery",
        unit: "pack",
        purchase_price: 480,
        sale_price: 550,
        stock: 15,
        low_stock_limit: 5
    },
    {
        name: "Coca Cola 1.5L",
        barcode: "896400001003",
        category: "Beverages",
        unit: "piece",
        purchase_price: 150,
        sale_price: 180,
        stock: 30,
        low_stock_limit: 10
    },
    {
        name: "Lays Masala 50g",
        barcode: "896400001004",
        category: "Snacks",
        unit: "piece",
        purchase_price: 50,
        sale_price: 60,
        stock: 40,
        low_stock_limit: 10
    },
    {
        name: "Olper's Milk 1L",
        barcode: "896400001005",
        category: "Dairy",
        unit: "liter",
        purchase_price: 280,
        sale_price: 300,
        stock: 25,
        low_stock_limit: 8
    }
];

const insertProduct = db.prepare(`
    INSERT OR IGNORE INTO products (
        name,
        barcode,
        category_id,
        unit,
        purchase_price,
        sale_price,
        stock,
        low_stock_limit
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

for (const product of products) {
    const category = getCategory.get(product.category);

    insertProduct.run(
        product.name,
        product.barcode,
        category.id,
        product.unit,
        product.purchase_price,
        product.sale_price,
        product.stock,
        product.low_stock_limit
    );
}

console.log("Sample categories and products added successfully!");