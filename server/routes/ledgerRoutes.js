const express = require("express");
const router = express.Router();

const db = require("../database/db");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

// =====================================================
// GET CUSTOMER LEDGER
// ADMIN + MANAGER + CASHIER
// =====================================================
router.get(
    "/customer/:customerId",
    authMiddleware,
    roleMiddleware("admin", "manager", "cashier"),
    (req, res) => {
        try {
            const customerId = Number(req.params.customerId);

            if (!Number.isInteger(customerId) || customerId <= 0) {
                return res.status(400).json({
                    success: false,
                    message: "Valid customer ID is required"
                });
            }

            const customer = db.prepare(`
                SELECT *
                FROM customers
                WHERE id = ?
            `).get(customerId);

            if (!customer) {
                return res.status(404).json({
                    success: false,
                    message: "Customer not found"
                });
            }

            const transactions = db.prepare(`
                SELECT
                    customer_ledger.*,
                    invoices.invoice_number
                FROM customer_ledger
                LEFT JOIN invoices
                    ON customer_ledger.invoice_id = invoices.id
                WHERE customer_ledger.customer_id = ?
                ORDER BY customer_ledger.id DESC
            `).all(customerId);

            const summary = db.prepare(`
                SELECT
                    COALESCE(
                        SUM(
                            CASE
                                WHEN transaction_type = 'debit'
                                THEN amount
                                ELSE 0
                            END
                        ),
                        0
                    ) AS total_debit,

                    COALESCE(
                        SUM(
                            CASE
                                WHEN transaction_type = 'credit'
                                THEN amount
                                ELSE 0
                            END
                        ),
                        0
                    ) AS total_credit

                FROM customer_ledger
                WHERE customer_id = ?
            `).get(customerId);

            const openingBalance = Number(
                customer.opening_balance || 0
            );

            const totalDebit = Number(
                summary.total_debit || 0
            );

            const totalCredit = Number(
                summary.total_credit || 0
            );

            const currentDue =
                openingBalance +
                totalDebit -
                totalCredit;

            res.json({
                success: true,
                data: {
                    customer,
                    summary: {
                        opening_balance: openingBalance,
                        total_debit: totalDebit,
                        total_credit: totalCredit,
                        current_due: currentDue
                    },
                    transactions
                }
            });

        } catch (error) {
            console.error("Get customer ledger error:", error);

            res.status(500).json({
                success: false,
                message: "An unexpected error occurred. Please try again."
            });
        }
    }
);


// =====================================================
// ADD CUSTOMER PAYMENT
// ADMIN + MANAGER ONLY
// CASHIER NOT ALLOWED
// =====================================================
router.post(
    "/payment",
    authMiddleware,
    roleMiddleware("admin", "manager"),
    (req, res) => {
        try {
            const {
                customer_id,
                amount,
                payment_method,
                description
            } = req.body;

            // ---------------------------------------------
            // VALIDATE CUSTOMER ID
            // ---------------------------------------------
            const customerId = Number(customer_id);

            if (!Number.isInteger(customerId) ||
                customerId <= 0
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Valid customer ID is required"
                });
            }

            // ---------------------------------------------
            // VALIDATE PAYMENT AMOUNT
            // ---------------------------------------------
            const paymentAmount = Number(amount);

            if (!Number.isFinite(paymentAmount) ||
                paymentAmount <= 0
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Valid payment amount is required"
                });
            }

            // ---------------------------------------------
            // NORMALIZE PAYMENT METHOD
            // ---------------------------------------------
            const normalizedPaymentMethod =
                String(payment_method || "cash")
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
                    message: "Invalid payment method. Use cash, bank, easypaisa or jazzcash"
                });
            }

            // ---------------------------------------------
            // FIND CUSTOMER
            // ---------------------------------------------
            const customer = db.prepare(`
                SELECT *
                FROM customers
                WHERE id = ?
            `).get(customerId);

            if (!customer) {
                return res.status(404).json({
                    success: false,
                    message: "Customer not found"
                });
            }

            // ---------------------------------------------
            // GET CUSTOMER LEDGER SUMMARY
            // ---------------------------------------------
            const summary = db.prepare(`
                SELECT
                    COALESCE(
                        SUM(
                            CASE
                                WHEN transaction_type = 'debit'
                                THEN amount
                                ELSE 0
                            END
                        ),
                        0
                    ) AS total_debit,

                    COALESCE(
                        SUM(
                            CASE
                                WHEN transaction_type = 'credit'
                                THEN amount
                                ELSE 0
                            END
                        ),
                        0
                    ) AS total_credit

                FROM customer_ledger
                WHERE customer_id = ?
            `).get(customerId);

            const openingBalance = Number(
                customer.opening_balance || 0
            );

            const totalDebit = Number(
                summary.total_debit || 0
            );

            const totalCredit = Number(
                summary.total_credit || 0
            );

            const currentDue =
                openingBalance +
                totalDebit -
                totalCredit;

            // ---------------------------------------------
            // PREVENT PAYMENT AGAINST ZERO/NEGATIVE DUE
            // ---------------------------------------------
            if (currentDue <= 0) {
                return res.status(400).json({
                    success: false,
                    message: "Customer has no outstanding due"
                });
            }

            // ---------------------------------------------
            // PREVENT OVERPAYMENT
            // ---------------------------------------------
            if (paymentAmount > currentDue) {
                return res.status(400).json({
                    success: false,
                    message: `Payment amount (PKR ${paymentAmount}) cannot exceed the outstanding due (PKR ${currentDue})`
                });
            }

            // ---------------------------------------------
            // DESCRIPTION
            // ---------------------------------------------
            const paymentDescription =
                String(
                    description || "Customer payment"
                ).trim();

            // ---------------------------------------------
            // INSERT PAYMENT
            // CREDIT = CUSTOMER PAID MONEY
            // ---------------------------------------------
            db.prepare(`
                INSERT INTO customer_ledger (
                    customer_id,
                    invoice_id,
                    transaction_type,
                    amount,
                    payment_method,
                    description
                )
                VALUES (?, NULL, 'credit', ?, ?, ?)
            `).run(
                customerId,
                paymentAmount,
                normalizedPaymentMethod,
                paymentDescription || "Customer payment"
            );

            res.status(201).json({
                success: true,
                message: "Customer payment recorded successfully"
            });

        } catch (error) {
            console.error("Add customer payment error:", error);

            res.status(500).json({
                success: false,
                message: "An unexpected error occurred. Please try again."
            });
        }
    }
);


module.exports = router;