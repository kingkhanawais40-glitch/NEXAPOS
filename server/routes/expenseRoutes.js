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
    async(req, res) => {
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
                String(payment_method)
                .trim()
                .toLowerCase();

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
                new Date()
                .toISOString()
                .split("T")[0];


            // -----------------------------
            // Insert expense
            // -----------------------------

            const result =
                await db.execute({
                    sql: `
                        INSERT INTO expenses (
                            category,
                            description,
                            amount,
                            payment_method,
                            expense_date
                        )
                        VALUES (?, ?, ?, ?, ?)
                    `,
                    args: [
                        category.trim(),
                        description &&
                        description.trim() ?
                        description.trim() :
                        null,
                        expenseAmount,
                        normalizedPaymentMethod,
                        expenseDate
                    ]
                });


            res.status(201).json({
                success: true,
                message: "Expense added successfully",
                data: {
                    expenseId: Number(result.lastInsertRowid),
                    category: category.trim(),
                    description: description &&
                        description.trim() ?
                        description.trim() : null,
                    amount: expenseAmount,
                    paymentMethod: normalizedPaymentMethod,
                    expenseDate
                }
            });

        } catch (error) {

            console.error(
                "Add expense error:",
                error
            );

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
    async(req, res) => {
        try {

            const result =
                await db.execute({
                    sql: `
                        SELECT *
                        FROM expenses
                        ORDER BY id DESC
                    `,
                    args: []
                });


            res.json({
                success: true,
                data: result.rows
            });

        } catch (error) {

            console.error(
                "Get expenses error:",
                error
            );

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
    async(req, res) => {
        try {

            // -----------------------------
            // Today's total
            // -----------------------------

            const todayResult =
                await db.execute({
                    sql: `
                        SELECT
                            COALESCE(
                                SUM(amount),
                                0
                            ) AS total
                        FROM expenses
                        WHERE expense_date =
                              DATE('now', 'localtime')
                    `,
                    args: []
                });

            const today =
                todayResult.rows[0];


            // -----------------------------
            // Current month's total
            // -----------------------------

            const monthResult =
                await db.execute({
                    sql: `
                        SELECT
                            COALESCE(
                                SUM(amount),
                                0
                            ) AS total
                        FROM expenses
                        WHERE strftime(
                            '%Y-%m',
                            expense_date
                        ) =
                        strftime(
                            '%Y-%m',
                            'now',
                            'localtime'
                        )
                    `,
                    args: []
                });

            const month =
                monthResult.rows[0];


            // -----------------------------
            // Category-wise expenses
            // -----------------------------

            const categoryResult =
                await db.execute({
                    sql: `
                        SELECT
                            category,
                            SUM(amount) AS total
                        FROM expenses
                        GROUP BY category
                        ORDER BY total DESC
                    `,
                    args: []
                });


            // -----------------------------
            // Payment-method-wise expenses
            // -----------------------------

            const paymentMethodResult =
                await db.execute({
                    sql: `
                        SELECT
                            payment_method,
                            SUM(amount) AS total
                        FROM expenses
                        GROUP BY payment_method
                        ORDER BY total DESC
                    `,
                    args: []
                });


            res.json({
                success: true,
                data: {
                    today_total: today ? today.total || 0 : 0,
                    month_total: month ? month.total || 0 : 0,
                    by_category: categoryResult.rows,
                    by_payment_method: paymentMethodResult.rows
                }
            });

        } catch (error) {

            console.error(
                "Expense summary error:",
                error
            );

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
    async(req, res) => {
        try {

            const expenseId =
                Number(req.params.id);


            if (!Number.isInteger(expenseId) ||
                expenseId <= 0
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid expense ID"
                });
            }


            const result =
                await db.execute({
                    sql: `
                        SELECT *
                        FROM expenses
                        WHERE id = ?
                    `,
                    args: [expenseId]
                });


            const expense =
                result.rows[0];


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

            console.error(
                "Get single expense error:",
                error
            );

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
    async(req, res) => {
        try {

            const expenseId =
                Number(req.params.id);


            if (!Number.isInteger(expenseId) ||
                expenseId <= 0
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid expense ID"
                });
            }


            // -----------------------------
            // Find expense
            // -----------------------------

            const expenseResult =
                await db.execute({
                    sql: `
                        SELECT *
                        FROM expenses
                        WHERE id = ?
                    `,
                    args: [expenseId]
                });


            const expense =
                expenseResult.rows[0];


            if (!expense) {
                return res.status(404).json({
                    success: false,
                    message: "Expense not found"
                });
            }


            // -----------------------------
            // Delete expense
            // -----------------------------

            const deleteResult =
                await db.execute({
                    sql: `
                        DELETE FROM expenses
                        WHERE id = ?
                    `,
                    args: [expenseId]
                });


            if (
                Number(deleteResult.rowsAffected) === 0
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Expense could not be deleted"
                });
            }


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

            console.error(
                "Delete expense error:",
                error
            );

            res.status(500).json({
                success: false,
                message: "An unexpected error occurred. Please try again."
            });
        }
    }
);


module.exports = router;