const express = require("express");
const router = express.Router();

const db = require("../database/db");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");


// =====================================================
// GET ALL SUPPLIERS
// ADMIN + MANAGER
// =====================================================

router.get(
    "/",
    authMiddleware,
    roleMiddleware("admin", "manager"),
    (req, res) => {
        try {
            const suppliers = db.prepare(`
                SELECT
                    suppliers.*,
                    (
                        suppliers.opening_balance
                        + COALESCE((
                            SELECT SUM(amount)
                            FROM supplier_ledger
                            WHERE supplier_id = suppliers.id
                            AND transaction_type = 'debit'
                        ), 0)
                        - COALESCE((
                            SELECT SUM(amount)
                            FROM supplier_ledger
                            WHERE supplier_id = suppliers.id
                            AND transaction_type = 'credit'
                        ), 0)
                    ) AS current_payable
                FROM suppliers
                ORDER BY suppliers.id DESC
            `).all();

            res.json({
                success: true,
                data: suppliers
            });

        } catch (error) {
            console.error("Get Suppliers Error:", error);

            res.status(500).json({
                success: false,
                message: "An unexpected error occurred. Please try again."
            });
        }
    }
);


// =====================================================
// GET SINGLE SUPPLIER
// ADMIN + MANAGER
// =====================================================

router.get(
    "/:id",
    authMiddleware,
    roleMiddleware("admin", "manager"),
    (req, res) => {
        try {
            const supplier = db.prepare(`
                SELECT
                    suppliers.*,
                    (
                        suppliers.opening_balance
                        + COALESCE((
                            SELECT SUM(amount)
                            FROM supplier_ledger
                            WHERE supplier_id = suppliers.id
                            AND transaction_type = 'debit'
                        ), 0)
                        - COALESCE((
                            SELECT SUM(amount)
                            FROM supplier_ledger
                            WHERE supplier_id = suppliers.id
                            AND transaction_type = 'credit'
                        ), 0)
                    ) AS current_payable
                FROM suppliers
                WHERE suppliers.id = ?
            `).get(req.params.id);

            if (!supplier) {
                return res.status(404).json({
                    success: false,
                    message: "Supplier not found"
                });
            }

            res.json({
                success: true,
                data: supplier
            });

        } catch (error) {
            console.error("Get Supplier Error:", error);

            res.status(500).json({
                success: false,
                message: "An unexpected error occurred. Please try again."
            });
        }
    }
);


// =====================================================
// ADD SUPPLIER
// ADMIN + MANAGER
// =====================================================

router.post(
    "/",
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

            if (!name || !name.trim()) {
                return res.status(400).json({
                    success: false,
                    message: "Supplier name is required"
                });
            }

            if (
                opening_balance !== undefined &&
                opening_balance !== "" &&
                (isNaN(Number(opening_balance)) ||
                    Number(opening_balance) < 0)
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Opening balance cannot be negative"
                });
            }

            const result = db.prepare(`
                INSERT INTO suppliers (
                    name,
                    phone,
                    address,
                    opening_balance
                )
                VALUES (?, ?, ?, ?)
            `).run(
                name.trim(),
                phone || null,
                address || null,
                Number(opening_balance || 0)
            );

            res.status(201).json({
                success: true,
                message: "Supplier added successfully",
                id: result.lastInsertRowid
            });

        } catch (error) {
            console.error("Add Supplier Error:", error);

            res.status(500).json({
                success: false,
                message: "An unexpected error occurred. Please try again."
            });
        }
    }
);


// =====================================================
// UPDATE SUPPLIER
// ADMIN + MANAGER
// =====================================================

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

            const supplier = db.prepare(`
                SELECT *
                FROM suppliers
                WHERE id = ?
            `).get(req.params.id);

            if (!supplier) {
                return res.status(404).json({
                    success: false,
                    message: "Supplier not found"
                });
            }

            if (
                opening_balance !== undefined &&
                opening_balance !== "" &&
                (isNaN(Number(opening_balance)) ||
                    Number(opening_balance) < 0)
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Opening balance cannot be negative"
                });
            }

            db.prepare(`
                UPDATE suppliers
                SET
                    name = ?,
                    phone = ?,
                    address = ?,
                    opening_balance = ?
                WHERE id = ?
            `).run(
                name && name.trim() ?
                name.trim() :
                supplier.name,

                phone !== undefined ?
                phone :
                supplier.phone,

                address !== undefined ?
                address :
                supplier.address,

                opening_balance !== undefined ?
                Number(opening_balance) :
                supplier.opening_balance,

                req.params.id
            );

            res.json({
                success: true,
                message: "Supplier updated successfully"
            });

        } catch (error) {
            console.error("Update Supplier Error:", error);

            res.status(500).json({
                success: false,
                message: "An unexpected error occurred. Please try again."
            });
        }
    }
);


// =====================================================
// DELETE SUPPLIER
// ADMIN ONLY
// =====================================================

router.delete(
    "/:id",
    authMiddleware,
    roleMiddleware("admin"),
    (req, res) => {
        try {
            const supplier = db.prepare(`
                SELECT id
                FROM suppliers
                WHERE id = ?
            `).get(req.params.id);

            if (!supplier) {
                return res.status(404).json({
                    success: false,
                    message: "Supplier not found"
                });
            }

            db.prepare(`
                DELETE FROM suppliers
                WHERE id = ?
            `).run(req.params.id);

            res.json({
                success: true,
                message: "Supplier deleted successfully"
            });

        } catch (error) {
            console.error("Delete Supplier Error:", error);

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