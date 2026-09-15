const express = require("express");
const bcrypt = require("bcryptjs");

const db = require("../database/db");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const router = express.Router();

// =====================================================
// RESET BUSINESS DATA
// =====================================================
// Admin only
// Requires:
// 1. Admin password
// 2. Exact confirmation text
//
// PRESERVED:
// - users
// - settings
//
// DELETED:
// - transactions
// - financial records
// - employees
// - products
// - categories
// - customers
// - suppliers
// =====================================================

router.post(
    "/reset-business-data",
    authMiddleware,
    roleMiddleware("admin"),
    async(req, res) => {
        try {
            const { confirmation, password } = req.body;

            // ==========================================
            // VALIDATE CONFIRMATION
            // ==========================================

            if (confirmation !== "RESET BUSINESS DATA") {
                return res.status(400).json({
                    success: false,
                    message: "Invalid confirmation text"
                });
            }

            // ==========================================
            // VALIDATE PASSWORD
            // ==========================================

            if (
                typeof password !== "string" ||
                password.trim().length === 0
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Admin password is required"
                });
            }

            // ==========================================
            // GET CURRENT ADMIN
            // ==========================================

            const adminResult = await db.execute({
                sql: `
                    SELECT id, username, password, role, status
                    FROM users
                    WHERE id = ?
                      AND role = 'admin'
                      AND status = 'active'
                `,
                args: [req.user.id]
            });

            const admin =
                adminResult.rows[0] || null;

            if (!admin) {
                return res.status(401).json({
                    success: false,
                    message: "Active admin account not found"
                });
            }

            // ==========================================
            // VERIFY ADMIN PASSWORD
            // ==========================================

            const passwordMatch = await bcrypt.compare(
                password,
                admin.password
            );

            if (!passwordMatch) {
                return res.status(401).json({
                    success: false,
                    message: "Incorrect admin password"
                });
            }

            // ==========================================
            // START TURSO WRITE TRANSACTION
            // ==========================================

            const transaction =
                await db.transaction("write");

            try {

                // --------------------------------------
                // 1. Employee Salary Payments
                // --------------------------------------

                await transaction.execute(`
                    DELETE FROM employee_salary_payments
                `);

                // --------------------------------------
                // 2. Return Items
                // --------------------------------------

                await transaction.execute(`
                    DELETE FROM return_items
                `);

                // --------------------------------------
                // 3. Returns
                // --------------------------------------

                await transaction.execute(`
                    DELETE FROM returns
                `);

                // --------------------------------------
                // 4. Invoice Items
                // --------------------------------------

                await transaction.execute(`
                    DELETE FROM invoice_items
                `);

                // --------------------------------------
                // 5. Customer Ledger
                // --------------------------------------

                await transaction.execute(`
                    DELETE FROM customer_ledger
                `);

                // --------------------------------------
                // 6. Invoices
                // --------------------------------------

                await transaction.execute(`
                    DELETE FROM invoices
                `);

                // --------------------------------------
                // 7. Stock Movements
                // --------------------------------------

                await transaction.execute(`
                    DELETE FROM stock_movements
                `);

                // --------------------------------------
                // 8. Purchase Items
                // --------------------------------------

                await transaction.execute(`
                    DELETE FROM purchase_items
                `);

                // --------------------------------------
                // 9. Supplier Ledger
                // --------------------------------------

                await transaction.execute(`
                    DELETE FROM supplier_ledger
                `);

                // --------------------------------------
                // 10. Purchases
                // --------------------------------------

                await transaction.execute(`
                    DELETE FROM purchases
                `);

                // --------------------------------------
                // 11. Expenses
                // --------------------------------------

                await transaction.execute(`
                    DELETE FROM expenses
                `);

                // --------------------------------------
                // 12. Daily Closings
                // --------------------------------------

                await transaction.execute(`
                    DELETE FROM daily_closings
                `);

                // --------------------------------------
                // 13. Employees
                // --------------------------------------

                await transaction.execute(`
                    DELETE FROM employees
                `);

                // --------------------------------------
                // 14. Products
                // --------------------------------------

                await transaction.execute(`
                    DELETE FROM products
                `);

                // --------------------------------------
                // 15. Categories
                // --------------------------------------

                await transaction.execute(`
                    DELETE FROM categories
                `);

                // --------------------------------------
                // 16. Customers
                // --------------------------------------

                await transaction.execute(`
                    DELETE FROM customers
                `);

                // --------------------------------------
                // 17. Suppliers
                // --------------------------------------

                await transaction.execute(`
                    DELETE FROM suppliers
                `);

                // --------------------------------------
                // IMPORTANT:
                // users and settings are NOT deleted.
                // --------------------------------------

                await transaction.commit();

            } catch (transactionError) {

                await transaction.rollback();

                throw transactionError;
            }

            // ==========================================
            // SUCCESS
            // ==========================================

            return res.status(200).json({
                success: true,
                message: "Business data reset successfully"
            });

        } catch (error) {

            console.error(
                "Business Data Reset Error:",
                error
            );

            return res.status(500).json({
                success: false,
                message: "Unable to reset business data"
            });
        }
    }
);

module.exports = router;