const db = require("./database/db");

// =====================================================
// SAFE BUSINESS DATA RESET
// =====================================================
// This script:
// ✅ Deletes business/transaction data
// ✅ Keeps users/login accounts
// ✅ Keeps store settings
// ❌ Does NOT delete users
// ❌ Does NOT delete settings
// =====================================================

console.log("");
console.log("==============================================");
console.log("       SAFE BUSINESS DATA RESET");
console.log("==============================================");
console.log("");

try {
    // Enable foreign keys
    db.exec("PRAGMA foreign_keys = ON");

    // Start transaction
    db.exec("BEGIN TRANSACTION");

    console.log("Resetting business data...");
    console.log("");

    // =================================================
    // 1. EMPLOYEE SALARY PAYMENTS
    // =================================================
    db.exec(`
DELETE FROM employee_salary_payments
    `);

    console.log("✓ Employee salary payments cleared");


    // =================================================
    // 2. RETURN ITEMS
    // =================================================
    db.exec(`
DELETE FROM return_items
    `);

    console.log("✓ Return items cleared");


    // =================================================
    // 3. RETURNS
    // =================================================
    db.exec(`
DELETE FROM returns
    `);

    console.log("✓ Returns cleared");


    // =================================================
    // 4. INVOICE ITEMS
    // =================================================
    db.exec(`
DELETE FROM invoice_items
    `);

    console.log("✓ Invoice items cleared");


    // =================================================
    // 5. CUSTOMER LEDGER
    // =================================================
    db.exec(`
DELETE FROM customer_ledger
    `);

    console.log("✓ Customer ledger cleared");


    // =================================================
    // 6. INVOICES
    // =================================================
    db.exec(`
DELETE FROM invoices
    `);

    console.log("✓ Invoices cleared");


    // =================================================
    // 7. STOCK MOVEMENTS
    // =================================================
    db.exec(`
DELETE FROM stock_movements
    `);

    console.log("✓ Stock movements cleared");


    // =================================================
    // 8. PURCHASE ITEMS
    // =================================================
    db.exec(`
DELETE FROM purchase_items
    `);

    console.log("✓ Purchase items cleared");


    // =================================================
    // 9. SUPPLIER LEDGER
    // =================================================
    db.exec(`
DELETE FROM supplier_ledger
    `);

    console.log("✓ Supplier ledger cleared");


    // =================================================
    // 10. PURCHASES
    // =================================================
    db.exec(`
DELETE FROM purchases
    `);

    console.log("✓ Purchases cleared");


    // =================================================
    // 11. EXPENSES
    // =================================================
    db.exec(`
DELETE FROM expenses
    `);

    console.log("✓ Expenses cleared");


    // =================================================
    // 12. DAILY CLOSINGS
    // =================================================
    db.exec(`
DELETE FROM daily_closings
    `);

    console.log("✓ Daily closings cleared");


    // =================================================
    // 13. EMPLOYEES
    // =================================================
    db.exec(`
DELETE FROM employees
    `);

    console.log("✓ Employees cleared");


    // =================================================
    // 14. PRODUCTS
    // =================================================
    db.exec(`
DELETE FROM products
    `);

    console.log("✓ Products cleared");


    // =================================================
    // 15. CATEGORIES
    // =================================================
    db.exec(`
DELETE FROM categories
    `);

    console.log("✓ Categories cleared");


    // =================================================
    // 16. CUSTOMERS
    // =================================================
    db.exec(`
DELETE FROM customers
    `);

    console.log("✓ Customers cleared");


    // =================================================
    // 17. SUPPLIERS
    // =================================================
    db.exec(`
DELETE FROM suppliers
    `);

    console.log("✓ Suppliers cleared");


    // =================================================
    // IMPORTANT:
    // users table is NOT deleted.
    // settings table is NOT deleted.
    // =================================================


    // =================================================
    // COMMIT
    // =================================================
    db.exec("COMMIT");

    console.log("");
    console.log("==============================================");
    console.log("       RESET COMPLETED SUCCESSFULLY");
    console.log("==============================================");
    console.log("");

    console.log("Business data:");
    console.log("✓ Categories cleared");
    console.log("✓ Products cleared");
    console.log("✓ Customers cleared");
    console.log("✓ Suppliers cleared");
    console.log("✓ Invoices cleared");
    console.log("✓ Purchases cleared");
    console.log("✓ Returns cleared");
    console.log("✓ Customer ledger cleared");
    console.log("✓ Supplier ledger cleared");
    console.log("✓ Stock movements cleared");
    console.log("✓ Expenses cleared");
    console.log("✓ Employees cleared");
    console.log("✓ Salary payments cleared");
    console.log("✓ Daily closings cleared");

    console.log("");
    console.log("Protected data:");
    console.log("🔐 Users/login accounts preserved");
    console.log("⚙️ Store settings preserved");

    console.log("");
    console.log("You can now login using your existing");
    console.log("admin/cashier account.");
    console.log("");

} catch (error) {

    console.error("");
    console.error("==============================================");
    console.error("             RESET FAILED");
    console.error("==============================================");
    console.error("");

    console.error(error.message);

    console.error("");
    console.error("Rolling back all changes...");

    try {
        db.exec("ROLLBACK");
        console.error("✓ Rollback completed");
        console.error("No reset changes were committed.");
    } catch (rollbackError) {
        console.error(
            "Rollback error:",
            rollbackError.message
        );
    }

    console.error("");
    console.error("Your database should remain unchanged.");
    console.error("");
}