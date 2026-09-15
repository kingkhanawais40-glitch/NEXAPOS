const express = require("express");
const router = express.Router();

const db = require("../database/db");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

// ===============================
// GET ALL CUSTOMERS
// ===============================
router.get(
    "/",
    authMiddleware,
    roleMiddleware("admin", "manager", "cashier"),
    async(req, res) => {
        try {
            const result = await db.execute(`
                SELECT
                    customers.*,
                    (
                        customers.opening_balance
                        + COALESCE((
                            SELECT SUM(amount)
                            FROM customer_ledger
                            WHERE customer_id = customers.id
                            AND transaction_type = 'debit'
                        ), 0)
                        - COALESCE((
                            SELECT SUM(amount)
                            FROM customer_ledger
                            WHERE customer_id = customers.id
                            AND transaction_type = 'credit'
                        ), 0)
                    ) AS current_due
                FROM customers
                ORDER BY customers.id DESC
            `);

            res.json({
                success: true,
                data: result.rows
            });
        } catch (error) {
            console.error("GET CUSTOMERS ERROR:", error);

            res.status(500).json({
                success: false,
                message: "An unexpected error occurred. Please try again."
            });
        }
    }
);


// ===============================
// GET SINGLE CUSTOMER
// ===============================
router.get(
    "/:id",
    authMiddleware,
    roleMiddleware("admin", "manager", "cashier"),
    async(req, res) => {
        try {
            const result = await db.execute({
                sql: `
                    SELECT *
                    FROM customers
                    WHERE id = ?
                `,
                args: [req.params.id]
            });

            const customer = result.rows[0];

            if (!customer) {
                return res.status(404).json({
                    success: false,
                    message: "Customer not found"
                });
            }

            res.json({
                success: true,
                data: customer
            });
        } catch (error) {
            console.error("GET CUSTOMER ERROR:", error);

            res.status(500).json({
                success: false,
                message: "An unexpected error occurred. Please try again."
            });
        }
    }
);


// ===============================
// ADD CUSTOMER
// ===============================
router.post(
    "/",
    authMiddleware,
    roleMiddleware("admin", "manager", "cashier"),
    async(req, res) => {
        try {
            const {
                name,
                phone,
                address,
                opening_balance
            } = req.body;

            if (!name) {
                return res.status(400).json({
                    success: false,
                    message: "Customer name is required"
                });
            }

            const result = await db.execute({
                sql: `
                    INSERT INTO customers (
                        name,
                        phone,
                        address,
                        opening_balance
                    )
                    VALUES (?, ?, ?, ?)
                `,
                args: [
                    name,
                    phone || null,
                    address || null,
                    opening_balance || 0
                ]
            });

            res.status(201).json({
                success: true,
                message: "Customer added successfully",
                id: Number(result.lastInsertRowid)
            });
        } catch (error) {
            console.error("ADD CUSTOMER ERROR:", error);

            res.status(500).json({
                success: false,
                message: "An unexpected error occurred. Please try again."
            });
        }
    }
);


// ===============================
// UPDATE CUSTOMER
// ===============================
router.put(
    "/:id",
    authMiddleware,
    roleMiddleware("admin", "manager"),
    async(req, res) => {
        try {
            const {
                name,
                phone,
                address,
                opening_balance
            } = req.body;

            const result = await db.execute({
                sql: `
                    UPDATE customers
                    SET
                        name = ?,
                        phone = ?,
                        address = ?,
                        opening_balance = ?
                    WHERE id = ?
                `,
                args: [
                    name,
                    phone || null,
                    address || null,
                    opening_balance || 0,
                    req.params.id
                ]
            });

            if (Number(result.rowsAffected) === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Customer not found"
                });
            }

            res.json({
                success: true,
                message: "Customer updated successfully"
            });
        } catch (error) {
            console.error("UPDATE CUSTOMER ERROR:", error);

            res.status(500).json({
                success: false,
                message: "An unexpected error occurred. Please try again."
            });
        }
    }
);


// ===============================
// DELETE CUSTOMER
// ===============================
router.delete(
    "/:id",
    authMiddleware,
    roleMiddleware("admin"),
    async(req, res) => {
        try {
            const result = await db.execute({
                sql: `
                    DELETE FROM customers
                    WHERE id = ?
                `,
                args: [req.params.id]
            });

            if (Number(result.rowsAffected) === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Customer not found"
                });
            }

            res.json({
                success: true,
                message: "Customer deleted successfully"
            });
        } catch (error) {
            console.error("DELETE CUSTOMER ERROR:", error);

            res.status(500).json({
                success: false,
                message: "An unexpected error occurred. Please try again."
            });
        }
    }
);


module.exports = router;