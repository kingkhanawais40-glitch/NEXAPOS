const express = require("express");
const router = express.Router();

const db = require("../database/db");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

// =====================================================
// GET INVENTORY
// Admin + Manager + Cashier
// =====================================================
router.get(
    "/",
    authMiddleware,
    roleMiddleware("admin", "manager", "cashier"),
    (req, res) => {
        try {
            const products = db.prepare(`
                SELECT
                    products.id,
                    products.name,
                    products.barcode,
                    products.unit,
                    products.purchase_price,
                    products.sale_price,
                    products.stock,
                    products.low_stock_limit,
                    categories.name AS category_name,

                    CASE
                        WHEN products.stock <= products.low_stock_limit
                        THEN 1
                        ELSE 0
                    END AS low_stock

                FROM products

                LEFT JOIN categories
                    ON products.category_id = categories.id

                ORDER BY products.name ASC
            `).all();

            res.json({
                success: true,
                data: products
            });

        } catch (error) {
            console.error("Get inventory error:", error);

            res.status(500).json({
                success: false,
                message: "An unexpected error occurred. Please try again."
            });
        }
    }
);


// =====================================================
// SEARCH INVENTORY
// Admin + Manager + Cashier
// =====================================================
router.get(
    "/search",
    authMiddleware,
    roleMiddleware("admin", "manager", "cashier"),
    (req, res) => {
        try {
            const { q } = req.query;

            if (!q || !q.trim()) {
                return res.status(400).json({
                    success: false,
                    message: "Search query is required"
                });
            }

            const searchQuery = q.trim();

            const products = db.prepare(`
                SELECT
                    products.*,
                    categories.name AS category_name
                FROM products

                LEFT JOIN categories
                    ON products.category_id = categories.id

                WHERE products.name LIKE ?
                   OR products.barcode LIKE ?

                ORDER BY products.name ASC
            `).all(
                `%${searchQuery}%`,
                `%${searchQuery}%`
            );

            res.json({
                success: true,
                data: products
            });

        } catch (error) {
            console.error("Search inventory error:", error);

            res.status(500).json({
                success: false,
                message: "An unexpected error occurred. Please try again."
            });
        }
    }
);


// =====================================================
// GET LOW STOCK PRODUCTS
// Admin + Manager + Cashier
// =====================================================
router.get(
    "/low-stock",
    authMiddleware,
    roleMiddleware("admin", "manager", "cashier"),
    (req, res) => {
        try {
            const products = db.prepare(`
                SELECT
                    products.*,
                    categories.name AS category_name
                FROM products

                LEFT JOIN categories
                    ON products.category_id = categories.id

                WHERE products.stock <= products.low_stock_limit

                ORDER BY products.stock ASC
            `).all();

            res.json({
                success: true,
                data: products
            });

        } catch (error) {
            console.error("Get low stock error:", error);

            res.status(500).json({
                success: false,
                message: "An unexpected error occurred. Please try again."
            });
        }
    }
);


// =====================================================
// ADJUST STOCK
// Admin + Manager ONLY
// Cashier DENIED
// =====================================================
router.post(
    "/adjust",
    authMiddleware,
    roleMiddleware("admin", "manager"),
    (req, res) => {
        try {
            const {
                product_id,
                quantity,
                type,
                reason
            } = req.body;

            // -----------------------------
            // Validate product ID
            // -----------------------------
            if (!product_id) {
                return res.status(400).json({
                    success: false,
                    message: "Product ID is required"
                });
            }

            // -----------------------------
            // Validate quantity
            // -----------------------------
            const qty = Number(quantity);

            if (!Number.isFinite(qty) ||
                qty <= 0
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Valid quantity is required"
                });
            }

            // -----------------------------
            // Validate adjustment type
            // -----------------------------
            if (!["add", "remove"].includes(type)) {
                return res.status(400).json({
                    success: false,
                    message: "Type must be add or remove"
                });
            }

            // -----------------------------
            // Find product
            // -----------------------------
            const product = db.prepare(`
                SELECT
                    id,
                    name,
                    barcode,
                    stock
                FROM products
                WHERE id = ?
            `).get(product_id);

            if (!product) {
                return res.status(404).json({
                    success: false,
                    message: "Product not found"
                });
            }

            // -----------------------------
            // Prevent negative stock
            // -----------------------------
            if (
                type === "remove" &&
                product.stock < qty
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Insufficient stock"
                });
            }

            // -----------------------------
            // Calculate new stock
            // -----------------------------
            const newStock =
                type === "add" ?
                product.stock + qty :
                product.stock - qty;

            const adjustmentReason =
                reason && reason.trim() ?
                reason.trim() :
                "Manual stock adjustment";

            // =================================================
            // TRANSACTION
            // Stock update + movement record together
            // =================================================
            const adjustStock = db.transaction(() => {

                // Update product stock
                db.prepare(`
                    UPDATE products
                    SET stock = ?
                    WHERE id = ?
                `).run(
                    newStock,
                    product_id
                );

                // Record stock movement
                db.prepare(`
                    INSERT INTO stock_movements (
                        product_id,
                        type,
                        quantity,
                        reason
                    )
                    VALUES (?, ?, ?, ?)
                `).run(
                    product_id,
                    type,
                    qty,
                    adjustmentReason
                );
            });

            adjustStock();

            res.json({
                success: true,
                message: "Stock adjusted successfully",
                data: {
                    product_id,
                    product_name: product.name,
                    previous_stock: product.stock,
                    adjustment: type === "add" ?
                        qty :
                        -qty,
                    new_stock: newStock,
                    reason: adjustmentReason
                }
            });

        } catch (error) {
            console.error("Adjust stock error:", error);

            res.status(500).json({
                success: false,
                message: "An unexpected error occurred. Please try again."
            });
        }
    }
);


// =====================================================
// GET STOCK MOVEMENT HISTORY
// Admin + Manager ONLY
// Cashier DENIED
// =====================================================
router.get(
    "/movements/:productId",
    authMiddleware,
    roleMiddleware("admin", "manager"),
    (req, res) => {
        try {
            const product = db.prepare(`
                SELECT
                    id,
                    name,
                    barcode,
                    stock
                FROM products
                WHERE id = ?
            `).get(req.params.productId);

            if (!product) {
                return res.status(404).json({
                    success: false,
                    message: "Product not found"
                });
            }

            const movements = db.prepare(`
                SELECT
                    stock_movements.*,
                    products.name AS product_name
                FROM stock_movements

                INNER JOIN products
                    ON stock_movements.product_id = products.id

                WHERE stock_movements.product_id = ?

                ORDER BY stock_movements.id DESC
            `).all(req.params.productId);

            res.json({
                success: true,
                data: {
                    product,
                    movements
                }
            });

        } catch (error) {
            console.error("Get stock movement history error:", error);

            res.status(500).json({
                success: false,
                message: "An unexpected error occurred. Please try again."
            });
        }
    }
);


module.exports = router;