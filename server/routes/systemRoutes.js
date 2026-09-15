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

            const admin = db.prepare(`
                SELECT id, username, password, role, status
                FROM users
                WHERE id = ?
                  AND role = 'admin'
                  AND status = 'active'
            `).get(req.user.id);

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
            // ENABLE FOREIGN KEYS
            // ==========================================

            db.exec("PRAGMA foreign_keys = ON");

            // ==========================================
            // START TRANSACTION
            // ==========================================

            const resetBusinessData = db.transaction(() => {

                // --------------------------------------
                // 1. Employee Salary Payments
                // --------------------------------------

                db.prepare(`
                    DELETE FROM employee_salary_payments
                `).run();

                // --------------------------------------
                // 2. Return Items
                // --------------------------------------

                db.prepare(`
                    DELETE FROM return_items
                `).run();

                // --------------------------------------
                // 3. Returns
                // --------------------------------------

                db.prepare(`
                    DELETE FROM returns
                `).run();

                // --------------------------------------
                // 4. Invoice Items
                // --------------------------------------

                db.prepare(`
                    DELETE FROM invoice_items
                `).run();

                // --------------------------------------
                // 5. Customer Ledger
                // --------------------------------------

                db.prepare(`
                    DELETE FROM customer_ledger
                `).run();

                // --------------------------------------
                // 6. Invoices
                // --------------------------------------

                db.prepare(`
                    DELETE FROM invoices
                `).run();

                // --------------------------------------
                // 7. Stock Movements
                // --------------------------------------

                db.prepare(`
                    DELETE FROM stock_movements
                `).run();

                // --------------------------------------
                // 8. Purchase Items
                // --------------------------------------

                db.prepare(`
                    DELETE FROM purchase_items
                `).run();

                // --------------------------------------
                // 9. Supplier Ledger
                // --------------------------------------

                db.prepare(`
                    DELETE FROM supplier_ledger
                `).run();

                // --------------------------------------
                // 10. Purchases
                // --------------------------------------

                db.prepare(`
                    DELETE FROM purchases
                `).run();

                // --------------------------------------
                // 11. Expenses
                // --------------------------------------

                db.prepare(`
                    DELETE FROM expenses
                `).run();

                // --------------------------------------
                // 12. Daily Closings
                // --------------------------------------

                db.prepare(`
                    DELETE FROM daily_closings
                `).run();

                // --------------------------------------
                // 13. Employees
                // --------------------------------------

                db.prepare(`
                    DELETE FROM employees
                `).run();

                // --------------------------------------
                // 14. Products
                // --------------------------------------

                db.prepare(`
                    DELETE FROM products
                `).run();

                // --------------------------------------
                // 15. Categories
                // --------------------------------------

                db.prepare(`
                    DELETE FROM categories
                `).run();

                // --------------------------------------
                // 16. Customers
                // --------------------------------------

                db.prepare(`
                    DELETE FROM customers
                `).run();

                // --------------------------------------
                // 17. Suppliers
                // --------------------------------------

                db.prepare(`
                    DELETE FROM suppliers
                `).run();

                // --------------------------------------
                // IMPORTANT:
                // users and settings are NOT deleted.
                // --------------------------------------
            });

            // ==========================================
            // EXECUTE RESET
            // ==========================================

            resetBusinessData();

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