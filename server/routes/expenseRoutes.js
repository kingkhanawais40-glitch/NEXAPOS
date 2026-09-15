const express = require("express");
const router = express.Router();

const db = require("../database/db");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");


// =====================================================
// ADD EXPENSE
// ADMIN ONLY
// =====================================================

router.post(
    "/",
    authMiddleware,
    roleMiddleware("admin"),
    (req, res) => {
        try {
            const {
                category,
                description,
                amount,
                payment_method = "cash",
                expense_date
            } = req.body;

            // -----------------------------
            // Validate category
            // -----------------------------
            if (!category || !category.trim()) {
                return res.status(400).json({
                    success: false,
                    message: "Expense category is required"
                });
            }

            // -----------------------------
            // Validate amount
            // -----------------------------
            const expenseAmount = Number(amount);

            if (!Number.isFinite(expenseAmount) ||
                expenseAmount <= 0
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Valid expense amount is required"
                });
            }

            // -----------------------------
            // Normalize payment method
            // -----------------------------
            const normalizedPaymentMethod =
                String(payment_method).trim().toLowerCase();

            const allowedPaymentMethods = [
                "cash",
                "bank",
                "easypaisa",
                "jazzcash"
            ];

            if (!allowedPaymentMethods.includes(
                    normalizedPaymentMethod
                )) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid payment method"
                });
            }

            // -----------------------------
            // Expense date
            // -----------------------------
            const expenseDate =
                expense_date ||
                new Date().toISOString().split("T")[0];

            // -----------------------------
            // Insert expense
            // -----------------------------
            const result = db.prepare(`
                INSERT INTO expenses (
                    category,
                    description,
                    amount,
                    payment_method,
                    expense_date
                )
                VALUES (?, ?, ?, ?, ?)
            `).run(
                category.trim(),
                description && description.trim() ?
                description.trim() :
                null,
                expenseAmount,
                normalizedPaymentMethod,
                expenseDate
            );

            res.status(201).json({
                success: true,
                message: "Expense added successfully",
                data: {
                    expenseId: result.lastInsertRowid,
                    category: category.trim(),
                    description: description && description.trim() ?
                        description.trim() : null,
                    amount: expenseAmount,
                    paymentMethod: normalizedPaymentMethod,
                    expenseDate
                }
            });

        } catch (error) {
            console.error("Add expense error:", error);

            res.status(500).json({
                success: false,
                message: "An unexpected error occurred. Please try again."
            });
        }
    }
);


// =====================================================
// GET ALL EXPENSES
// ADMIN ONLY
// =====================================================

router.get(
    "/",
    authMiddleware,
    roleMiddleware("admin"),
    (req, res) => {
        try {
            const expenses = db.prepare(`
                SELECT *
                FROM expenses
                ORDER BY id DESC
            `).all();

            res.json({
                success: true,
                data: expenses
            });

        } catch (error) {
            console.error("Get expenses error:", error);

            res.status(500).json({
                success: false,
                message: "An unexpected error occurred. Please try again."
            });
        }
    }
);


// =====================================================
// EXPENSE SUMMARY
// ADMIN ONLY
// IMPORTANT:
// Keep this BEFORE /:id
// =====================================================

router.get(
    "/summary/report",
    authMiddleware,
    roleMiddleware("admin"),
    (req, res) => {
        try {

            // -----------------------------
            // Today's total
            // -----------------------------
            const today = db.prepare(`
                SELECT
                    COALESCE(SUM(amount), 0) AS total
                FROM expenses
                WHERE expense_date = DATE('now', 'localtime')
            `).get();

            // -----------------------------
            // Current month's total
            // -----------------------------
            const month = db.prepare(`
                SELECT
                    COALESCE(SUM(amount), 0) AS total
                FROM expenses
                WHERE strftime('%Y-%m', expense_date)
                    = strftime('%Y-%m', 'now', 'localtime')
            `).get();

            // -----------------------------
            // Category-wise expenses
            // -----------------------------
            const byCategory = db.prepare(`
                SELECT
                    category,
                    SUM(amount) AS total
                FROM expenses
                GROUP BY category
                ORDER BY total DESC
            `).all();

            // -----------------------------
            // Payment-method-wise expenses
            // -----------------------------
            const byPaymentMethod = db.prepare(`
                SELECT
                    payment_method,
                    SUM(amount) AS total
                FROM expenses
                GROUP BY payment_method
                ORDER BY total DESC
            `).all();

            res.json({
                success: true,
                data: {
                    today_total: today.total,
                    month_total: month.total,
                    by_category: byCategory,
                    by_payment_method: byPaymentMethod
                }
            });

        } catch (error) {
            console.error("Expense summary error:", error);

            res.status(500).json({
                success: false,
                message: "An unexpected error occurred. Please try again."
            });
        }
    }
);


// =====================================================
// GET SINGLE EXPENSE
// ADMIN ONLY
// =====================================================

router.get(
    "/:id",
    authMiddleware,
    roleMiddleware("admin"),
    (req, res) => {
        try {

            const expense = db.prepare(`
                SELECT *
                FROM expenses
                WHERE id = ?
            `).get(req.params.id);

            if (!expense) {
                return res.status(404).json({
                    success: false,
                    message: "Expense not found"
                });
            }

            res.json({
                success: true,
                data: expense
            });

        } catch (error) {
            console.error("Get single expense error:", error);

            res.status(500).json({
                success: false,
                message: "An unexpected error occurred. Please try again."
            });
        }
    }
);


// =====================================================
// DELETE EXPENSE
// ADMIN ONLY
// =====================================================

router.delete(
    "/:id",
    authMiddleware,
    roleMiddleware("admin"),
    (req, res) => {
        try {

            const expense = db.prepare(`
                SELECT *
                FROM expenses
                WHERE id = ?
            `).get(req.params.id);

            if (!expense) {
                return res.status(404).json({
                    success: false,
                    message: "Expense not found"
                });
            }

            db.prepare(`
                DELETE FROM expenses
                WHERE id = ?
            `).run(req.params.id);

            res.json({
                success: true,
                message: "Expense deleted successfully",
                data: {
                    expenseId: expense.id,
                    category: expense.category,
                    amount: expense.amount
                }
            });

        } catch (error) {
            console.error("Delete expense error:", error);

            res.status(500).json({
                success: false,
                message: "An unexpected error occurred. Please try again."
            });
        }
    }
);


module.exports = router;