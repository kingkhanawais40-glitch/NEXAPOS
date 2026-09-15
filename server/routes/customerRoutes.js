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
    (req, res) => {
        try {
            const customers = db
                .prepare(`
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
    `)
                .all();

            res.json({
                success: true,
                data: customers
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: "An unexpected error occurred. Please try again."
            });
        }
    });

// ===============================
// GET SINGLE CUSTOMER
// ===============================
router.get(
    "/:id",
    authMiddleware,
    roleMiddleware("admin", "manager", "cashier"),
    (req, res) => {
        try {
            const customer = db
                .prepare(`
                SELECT *
                FROM customers
                WHERE id = ?
            `)
                .get(req.params.id);

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
            res.status(500).json({
                success: false,
                message: "An unexpected error occurred. Please try again."
            });
        }
    });

// ===============================
// ADD CUSTOMER
// ===============================
router.post(
    "/",
    authMiddleware,
    roleMiddleware("admin", "manager", "cashier"),
    (req, res) => {
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

            const result = db
                .prepare(`
                INSERT INTO customers (
                    name,
                    phone,
                    address,
                    opening_balance
                )
                VALUES (?, ?, ?, ?)
            `)
                .run(
                    name,
                    phone || null,
                    address || null,
                    opening_balance || 0
                );

            res.status(201).json({
                success: true,
                message: "Customer added successfully",
                id: result.lastInsertRowid
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: "An unexpected error occurred. Please try again."
            });
        }
    });

// ===============================
// UPDATE CUSTOMER
// ===============================
router.put(
    "/:id",
    authMiddleware,
    roleMiddleware("admin", "manager"),
    (req, res) => {
        try {
            const {
                name,
                phone,
                address,
                opening_balance
            } = req.body;

            const result = db
                .prepare(`
                UPDATE customers
                SET
                    name = ?,
                    phone = ?,
                    address = ?,
                    opening_balance = ?
                WHERE id = ?
            `)
                .run(
                    name,
                    phone || null,
                    address || null,
                    opening_balance || 0,
                    req.params.id
                );

            if (result.changes === 0) {
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
            res.status(500).json({
                success: false,
                message: "An unexpected error occurred. Please try again."
            });
        }
    });

// ===============================
// DELETE CUSTOMER
// ===============================
router.delete(
    "/:id",
    authMiddleware,
    roleMiddleware("admin"),
    (req, res) => {
        try {
            const result = db
                .prepare(`
                DELETE FROM customers
                WHERE id = ?
            `)
                .run(req.params.id);

            if (result.changes === 0) {
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
            res.status(500).json({
                success: false,
                message: "An unexpected error occurred. Please try again."
            });
        }
    });

module.exports = router;