const express = require("express");
const router = express.Router();

const db = require("../database/db");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

// =====================================================
// GET ALL CATEGORIES
// Admin + Manager + Cashier
// =====================================================
router.get(
    "/categories",
    authMiddleware,
    roleMiddleware("admin", "manager", "cashier"),
    async(req, res) => {
        try {
            const result = await db.execute(`
                SELECT *
                FROM categories
                ORDER BY name ASC
            `);

            res.json({
                success: true,
                data: result.rows
            });
        } catch (error) {
            console.error("GET CATEGORIES ERROR:", error);

            res.status(500).json({
                success: false,
                message: "An unexpected error occurred. Please try again."
            });
        }
    }
);


// =====================================================
// ADD CATEGORY
// Admin + Manager
// =====================================================
router.post(
    "/categories",
    authMiddleware,
    roleMiddleware("admin", "manager"),
    async(req, res) => {
        try {
            const { name } = req.body;

            if (!name || !String(name).trim()) {
                return res.status(400).json({
                    success: false,
                    message: "Category name is required"
                });
            }

            const categoryName = String(name).trim();

            if (categoryName.length > 100) {
                return res.status(400).json({
                    success: false,
                    message: "Category name cannot exceed 100 characters"
                });
            }

            // Prevent duplicate category names
            const existingCategory = await db.execute({
                sql: `
                    SELECT id
                    FROM categories
                    WHERE LOWER(TRIM(name)) = LOWER(TRIM(?))
                `,
                args: [categoryName]
            });

            if (existingCategory.rows.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: "A category with this name already exists"
                });
            }

            const result = await db.execute({
                sql: `
                    INSERT INTO categories (name)
                    VALUES (?)
                `,
                args: [categoryName]
            });

            res.status(201).json({
                success: true,
                message: "Category added successfully",
                id: Number(result.lastInsertRowid)
            });
        } catch (error) {
            console.error("ADD CATEGORY ERROR:", error);

            res.status(500).json({
                success: false,
                message: "An unexpected error occurred. Please try again."
            });
        }
    }
);


// =====================================================
// GET ALL PRODUCTS
// Admin + Manager + Cashier
// =====================================================
router.get(
    "/",
    authMiddleware,
    roleMiddleware("admin", "manager", "cashier"),
    async(req, res) => {
        try {
            const result = await db.execute(`
                SELECT
                    products.*,
                    categories.name AS category_name
                FROM products
                LEFT JOIN categories
                    ON products.category_id = categories.id
                ORDER BY products.id DESC
            `);

            res.json({
                success: true,
                data: result.rows
            });
        } catch (error) {
            console.error("GET PRODUCTS ERROR:", error);

            res.status(500).json({
                success: false,
                message: "An unexpected error occurred. Please try again."
            });
        }
    }
);


// =====================================================
// ADD PRODUCT
// Admin + Manager
// =====================================================
router.post(
    "/",
    authMiddleware,
    roleMiddleware("admin", "manager"),
    async(req, res) => {
        try {
            const {
                name,
                barcode,
                category_id,
                unit,
                purchase_price,
                sale_price,
                stock,
                low_stock_limit
            } = req.body;

            // ---------------------------------------------
            // REQUIRED FIELDS
            // ---------------------------------------------
            if (!name || !String(name).trim()) {
                return res.status(400).json({
                    success: false,
                    message: "Product name is required"
                });
            }

            const productName = String(name).trim();

            if (productName.length > 200) {
                return res.status(400).json({
                    success: false,
                    message: "Product name cannot exceed 200 characters"
                });
            }

            if (
                sale_price === undefined ||
                sale_price === null ||
                sale_price === ""
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Sale price is required"
                });
            }

            // ---------------------------------------------
            // NUMERIC VALIDATION
            // ---------------------------------------------
            const salePriceNumber = Number(sale_price);

            const purchasePriceNumber =
                purchase_price === undefined ||
                purchase_price === null ||
                purchase_price === "" ?
                0 :
                Number(purchase_price);

            const stockNumber =
                stock === undefined ||
                stock === null ||
                stock === "" ?
                0 :
                Number(stock);

            const lowStockLimitNumber =
                low_stock_limit === undefined ||
                low_stock_limit === null ||
                low_stock_limit === "" ?
                5 :
                Number(low_stock_limit);

            if (!Number.isFinite(salePriceNumber) ||
                salePriceNumber < 0
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Sale price must be a valid non-negative number"
                });
            }

            if (!Number.isFinite(purchasePriceNumber) ||
                purchasePriceNumber < 0
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Purchase price must be a valid non-negative number"
                });
            }

            if (!Number.isFinite(stockNumber) ||
                stockNumber < 0
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Stock must be a valid non-negative number"
                });
            }

            if (!Number.isFinite(lowStockLimitNumber) ||
                lowStockLimitNumber < 0
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Low stock limit must be a valid non-negative number"
                });
            }

            // ---------------------------------------------
            // VALIDATE CATEGORY ID
            // ---------------------------------------------
            let categoryId = null;

            if (
                category_id !== undefined &&
                category_id !== null &&
                category_id !== ""
            ) {
                categoryId = Number(category_id);

                if (!Number.isInteger(categoryId) ||
                    categoryId <= 0
                ) {
                    return res.status(400).json({
                        success: false,
                        message: "Invalid category ID"
                    });
                }

                const category = await db.execute({
                    sql: `
                        SELECT id
                        FROM categories
                        WHERE id = ?
                    `,
                    args: [categoryId]
                });

                if (category.rows.length === 0) {
                    return res.status(400).json({
                        success: false,
                        message: "Selected category does not exist"
                    });
                }
            }

            // ---------------------------------------------
            // CLEAN BARCODE
            // ---------------------------------------------
            const cleanBarcode =
                barcode !== undefined &&
                barcode !== null &&
                String(barcode).trim() ?
                String(barcode).trim() :
                null;

            // ---------------------------------------------
            // CHECK DUPLICATE BARCODE
            // ---------------------------------------------
            if (cleanBarcode) {
                const existingBarcode = await db.execute({
                    sql: `
                        SELECT id
                        FROM products
                        WHERE barcode = ?
                    `,
                    args: [cleanBarcode]
                });

                if (existingBarcode.rows.length > 0) {
                    return res.status(400).json({
                        success: false,
                        message: "A product with this barcode already exists"
                    });
                }
            }

            // ---------------------------------------------
            // UNIT
            // ---------------------------------------------
            const cleanUnit =
                unit && String(unit).trim() ?
                String(unit).trim() :
                "piece";

            // ---------------------------------------------
            // INSERT PRODUCT
            // ---------------------------------------------
            const result = await db.execute({
                sql: `
                    INSERT INTO products (
                        name,
                        barcode,
                        category_id,
                        unit,
                        purchase_price,
                        sale_price,
                        stock,
                        low_stock_limit
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                `,
                args: [
                    productName,
                    cleanBarcode,
                    categoryId,
                    cleanUnit,
                    purchasePriceNumber,
                    salePriceNumber,
                    stockNumber,
                    lowStockLimitNumber
                ]
            });

            res.status(201).json({
                success: true,
                message: "Product added successfully",
                id: Number(result.lastInsertRowid)
            });
        } catch (error) {
            console.error("ADD PRODUCT ERROR:", error);

            res.status(500).json({
                success: false,
                message: "An unexpected error occurred. Please try again."
            });
        }
    }
);


// =====================================================
// UPDATE PRODUCT
// Admin + Manager
// =====================================================
router.put(
    "/:id",
    authMiddleware,
    roleMiddleware("admin", "manager"),
    async(req, res) => {
        try {
            const productId = Number(req.params.id);

            if (!Number.isInteger(productId) || productId <= 0) {
                return res.status(400).json({
                    success: false,
                    message: "Valid product ID is required"
                });
            }

            const {
                name,
                barcode,
                category_id,
                unit,
                purchase_price,
                sale_price,
                stock,
                low_stock_limit
            } = req.body;

            // ---------------------------------------------
            // REQUIRED FIELDS
            // ---------------------------------------------
            if (!name || !String(name).trim()) {
                return res.status(400).json({
                    success: false,
                    message: "Product name is required"
                });
            }

            const productName = String(name).trim();

            if (productName.length > 200) {
                return res.status(400).json({
                    success: false,
                    message: "Product name cannot exceed 200 characters"
                });
            }

            if (
                sale_price === undefined ||
                sale_price === null ||
                sale_price === ""
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Sale price is required"
                });
            }

            // ---------------------------------------------
            // FIND PRODUCT
            // ---------------------------------------------
            const product = await db.execute({
                sql: `
                    SELECT id
                    FROM products
                    WHERE id = ?
                `,
                args: [productId]
            });

            if (product.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Product not found"
                });
            }

            // ---------------------------------------------
            // NUMERIC VALIDATION
            // ---------------------------------------------
            const salePriceNumber = Number(sale_price);

            const purchasePriceNumber =
                purchase_price === undefined ||
                purchase_price === null ||
                purchase_price === "" ?
                0 :
                Number(purchase_price);

            const stockNumber =
                stock === undefined ||
                stock === null ||
                stock === "" ?
                0 :
                Number(stock);

            const lowStockLimitNumber =
                low_stock_limit === undefined ||
                low_stock_limit === null ||
                low_stock_limit === "" ?
                5 :
                Number(low_stock_limit);

            if (!Number.isFinite(salePriceNumber) ||
                salePriceNumber < 0
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Sale price must be a valid non-negative number"
                });
            }

            if (!Number.isFinite(purchasePriceNumber) ||
                purchasePriceNumber < 0
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Purchase price must be a valid non-negative number"
                });
            }

            if (!Number.isFinite(stockNumber) ||
                stockNumber < 0
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Stock must be a valid non-negative number"
                });
            }

            if (!Number.isFinite(lowStockLimitNumber) ||
                lowStockLimitNumber < 0
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Low stock limit must be a valid non-negative number"
                });
            }

            // ---------------------------------------------
            // VALIDATE CATEGORY
            // ---------------------------------------------
            let categoryId = null;

            if (
                category_id !== undefined &&
                category_id !== null &&
                category_id !== ""
            ) {
                categoryId = Number(category_id);

                if (!Number.isInteger(categoryId) ||
                    categoryId <= 0
                ) {
                    return res.status(400).json({
                        success: false,
                        message: "Invalid category ID"
                    });
                }

                const category = await db.execute({
                    sql: `
                        SELECT id
                        FROM categories
                        WHERE id = ?
                    `,
                    args: [categoryId]
                });

                if (category.rows.length === 0) {
                    return res.status(400).json({
                        success: false,
                        message: "Selected category does not exist"
                    });
                }
            }

            // ---------------------------------------------
            // CLEAN BARCODE
            // ---------------------------------------------
            const cleanBarcode =
                barcode !== undefined &&
                barcode !== null &&
                String(barcode).trim() ?
                String(barcode).trim() :
                null;

            // ---------------------------------------------
            // CHECK DUPLICATE BARCODE
            // ---------------------------------------------
            if (cleanBarcode) {
                const existingBarcode = await db.execute({
                    sql: `
                        SELECT id
                        FROM products
                        WHERE barcode = ?
                        AND id != ?
                    `,
                    args: [cleanBarcode, productId]
                });

                if (existingBarcode.rows.length > 0) {
                    return res.status(400).json({
                        success: false,
                        message: "A product with this barcode already exists"
                    });
                }
            }

            // ---------------------------------------------
            // UNIT
            // ---------------------------------------------
            const cleanUnit =
                unit && String(unit).trim() ?
                String(unit).trim() :
                "piece";

            // ---------------------------------------------
            // UPDATE PRODUCT
            // ---------------------------------------------
            await db.execute({
                sql: `
                    UPDATE products
                    SET
                        name = ?,
                        barcode = ?,
                        category_id = ?,
                        unit = ?,
                        purchase_price = ?,
                        sale_price = ?,
                        stock = ?,
                        low_stock_limit = ?
                    WHERE id = ?
                `,
                args: [
                    productName,
                    cleanBarcode,
                    categoryId,
                    cleanUnit,
                    purchasePriceNumber,
                    salePriceNumber,
                    stockNumber,
                    lowStockLimitNumber,
                    productId
                ]
            });

            res.json({
                success: true,
                message: "Product updated successfully"
            });
        } catch (error) {
            console.error("UPDATE PRODUCT ERROR:", error);

            res.status(500).json({
                success: false,
                message: "An unexpected error occurred. Please try again."
            });
        }
    }
);


// =====================================================
// DELETE PRODUCT
// Admin only
// =====================================================
router.delete(
    "/:id",
    authMiddleware,
    roleMiddleware("admin"),
    async(req, res) => {
        try {
            const productId = Number(req.params.id);

            if (!Number.isInteger(productId) || productId <= 0) {
                return res.status(400).json({
                    success: false,
                    message: "Valid product ID is required"
                });
            }

            const product = await db.execute({
                sql: `
                    SELECT id
                    FROM products
                    WHERE id = ?
                `,
                args: [productId]
            });

            if (product.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Product not found"
                });
            }

            await db.execute({
                sql: `
                    DELETE FROM products
                    WHERE id = ?
                `,
                args: [productId]
            });

            res.json({
                success: true,
                message: "Product deleted successfully"
            });
        } catch (error) {
            console.error("DELETE PRODUCT ERROR:", error);

            res.status(500).json({
                success: false,
                message: "An unexpected error occurred. Please try again."
            });
        }
    }
);


module.exports = router;