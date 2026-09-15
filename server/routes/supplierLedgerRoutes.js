const express = require("express");
const router = express.Router();

const db = require("../database/db");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");


// =====================================================
// GET SUPPLIER LEDGER
// ADMIN + MANAGER
// =====================================================

router.get(
    "/supplier/:supplierId",
    authMiddleware,
    roleMiddleware("admin", "manager"),
    (req, res) => {
        try {
            const supplier = db.prepare(`
                SELECT *
                FROM suppliers
                WHERE id = ?
            `).get(req.params.supplierId);

            if (!supplier) {
                return res.status(404).json({
                    success: false,
                    message: "Supplier not found"
                });
            }

            const transactions = db.prepare(`
                SELECT
                    supplier_ledger.*,
                    purchases.invoice_number
                FROM supplier_ledger

                LEFT JOIN purchases
                    ON supplier_ledger.purchase_id = purchases.id

                WHERE supplier_ledger.supplier_id = ?

                ORDER BY supplier_ledger.id DESC
            `).all(req.params.supplierId);

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

                FROM supplier_ledger

                WHERE supplier_id = ?
            `).get(req.params.supplierId);

            const openingBalance =
                Number(supplier.opening_balance || 0);

            const currentPayable =
                openingBalance +
                Number(summary.total_debit || 0) -
                Number(summary.total_credit || 0);

            res.json({
                success: true,
                data: {
                    supplier,

                    summary: {
                        opening_balance: openingBalance,
                        total_debit: Number(summary.total_debit || 0),
                        total_credit: Number(summary.total_credit || 0),
                        current_payable: currentPayable
                    },

                    transactions
                }
            });

        } catch (error) {
            console.error("Get Supplier Ledger Error:", error);

            res.status(500).json({
                success: false,
                message: "An unexpected error occurred. Please try again."
            });
        }
    }
);


// =====================================================
// RECORD SUPPLIER PAYMENT
// ADMIN + MANAGER
// =====================================================

router.post(
    "/payment",
    authMiddleware,
    roleMiddleware("admin", "manager"),
    (req, res) => {
        try {
            const {
                supplier_id,
                amount,
                payment_method,
                description
            } = req.body;

            if (!supplier_id) {
                return res.status(400).json({
                    success: false,
                    message: "Supplier ID is required"
                });
            }

            if (!amount ||
                isNaN(Number(amount)) ||
                Number(amount) <= 0
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Valid payment amount is required"
                });
            }

            const allowedPaymentMethods = [
                "cash",
                "bank",
                "easypaisa",
                "jazzcash"
            ];

            const selectedPaymentMethod =
                payment_method ?
                payment_method.toLowerCase() :
                "cash";

            if (!allowedPaymentMethods.includes(
                    selectedPaymentMethod
                )) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid payment method. Use cash, bank, easypaisa or jazzcash"
                });
            }

            const supplier = db.prepare(`
                SELECT *
                FROM suppliers
                WHERE id = ?
            `).get(supplier_id);

            if (!supplier) {
                return res.status(404).json({
                    success: false,
                    message: "Supplier not found"
                });
            }


            // =================================================
            // CALCULATE CURRENT PAYABLE
            // =================================================

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

                FROM supplier_ledger

                WHERE supplier_id = ?
            `).get(supplier_id);

            const currentPayable =
                Number(supplier.opening_balance || 0) +
                Number(summary.total_debit || 0) -
                Number(summary.total_credit || 0);

            const paymentAmount = Number(amount);


            // =================================================
            // PREVENT OVERPAYMENT
            // =================================================

            if (paymentAmount > currentPayable) {
                return res.status(400).json({
                    success: false,
                    message: "Payment cannot be greater than supplier payable"
                });
            }


            // =================================================
            // RECORD PAYMENT
            // CREDIT = SUPPLIER PAYMENT
            // =================================================

            db.prepare(`
                INSERT INTO supplier_ledger (
                    supplier_id,
                    purchase_id,
                    transaction_type,
                    amount,
                    payment_method,
                    description
                )
                VALUES (?, NULL, 'credit', ?, ?, ?)
            `).run(
                supplier_id,
                paymentAmount,
                selectedPaymentMethod,
                description || "Supplier payment"
            );


            // =================================================
            // CALCULATE NEW PAYABLE
            // =================================================

            const newPayable =
                currentPayable - paymentAmount;


            res.status(201).json({
                success: true,
                message: "Supplier payment recorded successfully",

                data: {
                    supplier_id: supplier_id,
                    supplier_name: supplier.name,
                    payment_amount: paymentAmount,
                    previous_payable: currentPayable,
                    remaining_payable: newPayable
                }
            });

        } catch (error) {
            console.error("Supplier Payment Error:", error);

            res.status(500).json({
                success: false,
                message: "An unexpected error occurred. Please try again."
            });
        }
    }
);


// =====================================================
// EXPORT ROUTER
// =====================================================

module.exports = router;