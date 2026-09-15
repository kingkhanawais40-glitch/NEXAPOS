const db = require("./db");

// Categories table
db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
`);

// Products table
db.exec(`
    CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        barcode TEXT UNIQUE,
        category_id INTEGER,
        unit TEXT NOT NULL DEFAULT 'piece',
        purchase_price REAL NOT NULL DEFAULT 0,
        sale_price REAL NOT NULL DEFAULT 0,
        stock REAL NOT NULL DEFAULT 0,
        low_stock_limit REAL NOT NULL DEFAULT 5,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

        FOREIGN KEY (category_id)
        REFERENCES categories(id)
    )
`);

// Customers table
db.exec(`
    CREATE TABLE IF NOT EXISTS customers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        phone TEXT,
        address TEXT,
        opening_balance REAL NOT NULL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
`);
// ===============================
// INVOICES TABLE
// ===============================
db.exec(`
    CREATE TABLE IF NOT EXISTS invoices (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        invoice_number TEXT NOT NULL UNIQUE,
        customer_id INTEGER,
        subtotal REAL NOT NULL DEFAULT 0,
        discount REAL NOT NULL DEFAULT 0,
        grand_total REAL NOT NULL DEFAULT 0,
        paid_amount REAL NOT NULL DEFAULT 0,
        due_amount REAL NOT NULL DEFAULT 0,
        payment_method TEXT NOT NULL DEFAULT 'cash',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

        FOREIGN KEY (customer_id)
        REFERENCES customers(id)
    )
`);

// ===============================
// INVOICE ITEMS TABLE
// ===============================
db.exec(`
    CREATE TABLE IF NOT EXISTS invoice_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        invoice_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        quantity REAL NOT NULL,
        unit_price REAL NOT NULL,
        discount REAL NOT NULL DEFAULT 0,
        total REAL NOT NULL,

        FOREIGN KEY (invoice_id)
        REFERENCES invoices(id),

        FOREIGN KEY (product_id)
        REFERENCES products(id)
    )
`);

// ===============================
// ADD TAX COLUMNS TO INVOICES
// ===============================
try {
    db.exec(`
        ALTER TABLE invoices
        ADD COLUMN tax_rate REAL NOT NULL DEFAULT 0
    `);
} catch (error) {
    if (!error.message.includes("duplicate column name")) {
        throw error;
    }
}

try {
    db.exec(`
        ALTER TABLE invoices
        ADD COLUMN tax_amount REAL NOT NULL DEFAULT 0
    `);
} catch (error) {
    if (!error.message.includes("duplicate column name")) {
        throw error;
    }
}

// ===============================
// ADD CASHIER TRACKING TO INVOICES
// ===============================
try {
    db.exec(`
        ALTER TABLE invoices
        ADD COLUMN cashier_username TEXT
    `);
} catch (error) {
    if (!error.message.includes("duplicate column name")) {
        throw error;
    }
}

// ===============================
// CUSTOMER LEDGER TABLE
// ===============================
db.exec(`
    CREATE TABLE IF NOT EXISTS customer_ledger (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_id INTEGER NOT NULL,
        invoice_id INTEGER,
        transaction_type TEXT NOT NULL,
        amount REAL NOT NULL DEFAULT 0,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

        FOREIGN KEY (customer_id)
        REFERENCES customers(id),

        FOREIGN KEY (invoice_id)
        REFERENCES invoices(id)
    )
`);
try {
    db.prepare(`
        ALTER TABLE customer_ledger
        ADD COLUMN payment_method TEXT NOT NULL DEFAULT 'cash'
    `).run();

    console.log(
        "payment_method column added to customer_ledger"
    );

} catch (error) {

    if (!error.message.includes(
            "duplicate column name"
        )) {
        console.error(
            "Customer Ledger Migration Error:",
            error.message
        );
    }
}
// ===============================
// STOCK MOVEMENTS TABLE
// ===============================
db.exec(`
    CREATE TABLE IF NOT EXISTS stock_movements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER NOT NULL,
        type TEXT NOT NULL,
        quantity REAL NOT NULL,
        reference_id INTEGER,
        reason TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

        FOREIGN KEY (product_id)
        REFERENCES products(id)
    )
`);
// ===============================
// PURCHASES TABLE
// ===============================
db.exec(`
    CREATE TABLE IF NOT EXISTS purchases (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        supplier_name TEXT NOT NULL,
        invoice_number TEXT,
        total_amount REAL NOT NULL DEFAULT 0,
        paid_amount REAL NOT NULL DEFAULT 0,
        due_amount REAL NOT NULL DEFAULT 0,
        payment_method TEXT NOT NULL DEFAULT 'cash',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
`);

// ===============================
// PURCHASE ITEMS TABLE
// ===============================
db.exec(`
    CREATE TABLE IF NOT EXISTS purchase_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        purchase_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        quantity REAL NOT NULL,
        purchase_price REAL NOT NULL,
        total REAL NOT NULL,

        FOREIGN KEY (purchase_id)
        REFERENCES purchases(id),

        FOREIGN KEY (product_id)
        REFERENCES products(id)
    )
`);
// ===============================
// SUPPLIERS TABLE
// ===============================
db.exec(`
    CREATE TABLE IF NOT EXISTS suppliers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        phone TEXT,
        address TEXT,
        opening_balance REAL NOT NULL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
`);

// ===============================
// SUPPLIER LEDGER TABLE
// ===============================
db.exec(`
    CREATE TABLE IF NOT EXISTS supplier_ledger (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        supplier_id INTEGER NOT NULL,
        purchase_id INTEGER,
        transaction_type TEXT NOT NULL,
        amount REAL NOT NULL DEFAULT 0,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

        FOREIGN KEY (supplier_id)
        REFERENCES suppliers(id),

        FOREIGN KEY (purchase_id)
        REFERENCES purchases(id)
    )
`);
// ===============================
// ADD PAYMENT METHOD TO SUPPLIER LEDGER
// ===============================

try {
    db.prepare(`
        ALTER TABLE supplier_ledger
        ADD COLUMN payment_method TEXT NOT NULL DEFAULT 'cash'
    `).run();

    console.log(
        "payment_method column added to supplier_ledger"
    );

} catch (error) {

    if (!error.message.includes(
            "duplicate column name"
        )) {
        console.error(
            "Supplier Ledger Migration Error:",
            error.message
        );
    }
}
// Returns table
db.exec(`
    CREATE TABLE IF NOT EXISTS returns (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        return_number TEXT NOT NULL UNIQUE,
        invoice_id INTEGER NOT NULL,
        customer_id INTEGER,
        total_refund REAL NOT NULL DEFAULT 0,
        refund_method TEXT NOT NULL DEFAULT 'cash',
        reason TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

        FOREIGN KEY (invoice_id)
        REFERENCES invoices(id),

        FOREIGN KEY (customer_id)
        REFERENCES customers(id)
    )
`);

// Return items table
db.exec(`
    CREATE TABLE IF NOT EXISTS return_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        return_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        quantity REAL NOT NULL,
        unit_price REAL NOT NULL,
        total REAL NOT NULL,

        FOREIGN KEY (return_id)
        REFERENCES returns(id),

        FOREIGN KEY (product_id)
        REFERENCES products(id)
    )
`);
// Expenses table
db.exec(`
    CREATE TABLE IF NOT EXISTS expenses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        category TEXT NOT NULL,
        description TEXT,
        amount REAL NOT NULL DEFAULT 0,
        payment_method TEXT NOT NULL DEFAULT 'cash',
        expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
`);
// =====================================================
// EMPLOYEES TABLE
// =====================================================

db.exec(`
    CREATE TABLE IF NOT EXISTS employees (
        id INTEGER PRIMARY KEY AUTOINCREMENT,

        name TEXT NOT NULL,

        phone TEXT,

        address TEXT,

        role TEXT NOT NULL DEFAULT 'cashier',

        salary REAL NOT NULL DEFAULT 0,

        joining_date TEXT,

        status TEXT NOT NULL DEFAULT 'active',

        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
`);
// =====================================================
// EMPLOYEE SALARY PAYMENTS TABLE
// =====================================================

db.exec(`
    CREATE TABLE IF NOT EXISTS employee_salary_payments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,

        employee_id INTEGER NOT NULL,

        salary_month TEXT NOT NULL,

        amount REAL NOT NULL DEFAULT 0,

        payment_date TEXT NOT NULL,

        payment_method TEXT NOT NULL DEFAULT 'cash',

        notes TEXT,

        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

        FOREIGN KEY (employee_id)
            REFERENCES employees(id)
            ON DELETE CASCADE
    )
`);
db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'cashier',
        status TEXT NOT NULL DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
`);

// =====================================================
// SETTINGS TABLE
// =====================================================

db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY CHECK (id = 1),

        store_name TEXT NOT NULL DEFAULT 'General Store',

        store_phone TEXT DEFAULT '',

        store_address TEXT DEFAULT '',

        invoice_footer TEXT DEFAULT 'Thank you for shopping with us!',

        currency TEXT NOT NULL DEFAULT 'PKR',

        default_tax REAL NOT NULL DEFAULT 0,

        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
`);



// =====================================================
// DAILY CLOSINGS TABLE
// =====================================================

db.exec(`
    CREATE TABLE IF NOT EXISTS daily_closings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,

        closing_date TEXT NOT NULL UNIQUE,

        opening_cash REAL NOT NULL DEFAULT 0,

        cash_sales REAL NOT NULL DEFAULT 0,
        bank_sales REAL NOT NULL DEFAULT 0,
        easypaisa_sales REAL NOT NULL DEFAULT 0,
        jazzcash_sales REAL NOT NULL DEFAULT 0,

        customer_cash_payments REAL NOT NULL DEFAULT 0,
        cash_expenses REAL NOT NULL DEFAULT 0,
        supplier_cash_payments REAL NOT NULL DEFAULT 0,

        expected_cash REAL NOT NULL DEFAULT 0,
        actual_cash REAL NOT NULL DEFAULT 0,
        difference REAL NOT NULL DEFAULT 0,

        notes TEXT,
        closed_by TEXT,

        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
`);

console.log("Daily closings table created successfully!");


console.log("Expenses table created successfully!");

console.log("Returns tables created successfully!");

console.log("Supplier tables created successfully!");

console.log("Customer ledger table created successfully!");
console.log("Database tables created successfully!");