const express = require("express");
const router = express.Router();

const db = require("../database/db");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

// =====================================================
// IMAGE URL VALIDATION
// =====================================================

const isValidImageUrl = (value) => {
    if (!value) {
        return true;
    }

    const imageUrl = String(value).trim();

    if (imageUrl.length > 2000) {
        return false;
    }

    try {
        const url = new URL(imageUrl);

        if (
            url.protocol !== "http:" &&
            url.protocol !== "https:"
        ) {
            return false;
        }

        return true;
    } catch {
        return false;
    }
};


// =====================================================
// GET ALL CATEGORIES
// Admin + Manager + Cashier
// =====================================================

router.get(
    "/categories",
    authMiddleware,
    roleMiddleware("admin", "manager", "cashier"),
    async (req, res) => {
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
    async (req, res) => {
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

            const existingCategory = await db.execute({
                sql: `
                    SELECT id
                    FROM categories
                    WHERE LOWER(TRIM(name))
                        = LOWER(TRIM(?))
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
    async (req, res) => {
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
    async (req, res) => {
        try {
            const {
                name,
                barcode,
                category_id,
                unit,
                purchase_price,
                sale_price,
                stock,
                low_stock_limit,
                image_url
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
            // IMAGE URL
            // ---------------------------------------------

            let cleanImageUrl = null;

            if (
                image_url !== undefined &&
                image_url !== null &&
                String(image_url).trim()
            ) {
                cleanImageUrl =
                    String(image_url).trim();

                if (!isValidImageUrl(cleanImageUrl)) {
                    return res.status(400).json({
                        success: false,
                        message: "Please enter a valid image URL"
                    });
                }
            }

            // ---------------------------------------------
            // NUMERIC VALIDATION
            // ---------------------------------------------

            const salePriceNumber =
                Number(sale_price);

            const purchasePriceNumber =
                purchase_price === undefined ||
                purchase_price === null ||
                purchase_price === ""
                    ? 0
                    : Number(purchase_price);

            const stockNumber =
                stock === undefined ||
                stock === null ||
                stock === ""
                    ? 0
                    : Number(stock);

            const lowStockLimitNumber =
                low_stock_limit === undefined ||
                low_stock_limit === null ||
                low_stock_limit === ""
                    ? 5
                    : Number(low_stock_limit);

            if (
                !Number.isFinite(salePriceNumber) ||
                salePriceNumber < 0
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Sale price must be a valid non-negative number"
                });
            }

            if (
                !Number.isFinite(purchasePriceNumber) ||
                purchasePriceNumber < 0
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Purchase price must be a valid non-negative number"
                });
            }

            if (
                !Number.isFinite(stockNumber) ||
                stockNumber < 0
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Stock must be a valid non-negative number"
                });
            }

            if (
                !Number.isFinite(lowStockLimitNumber) ||
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

                if (
                    !Number.isInteger(categoryId) ||
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
            // BARCODE
            // ---------------------------------------------

            const cleanBarcode =
                barcode !== undefined &&
                barcode !== null &&
                String(barcode).trim()
                    ? String(barcode).trim()
                    : null;

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
                unit && String(unit).trim()
                    ? String(unit).trim()
                    : "piece";

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
                        low_stock_limit,
                        image_url
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
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
                    cleanImageUrl
                ]
            });

            const productId =
                Number(result.lastInsertRowid);

            res.status(201).json({
                success: true,
                message: "Product added successfully",
                id: productId,
                image_url: cleanImageUrl
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
// ADD PRODUCT BATCH
// Admin + Manager
// =====================================================

router.post(
    "/:id/batches",
    authMiddleware,
    roleMiddleware("admin", "manager"),
    async (req, res) => {
        try {
            const productId = Number(req.params.id);

            if (
                !Number.isInteger(productId) ||
                productId <= 0
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Valid product ID is required"
                });
            }

            const {
                batch_number,
                expiry_date,
                quantity,
                purchase_price
            } = req.body;

            if (
                !batch_number ||
                !String(batch_number).trim()
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Batch number is required"
                });
            }

            const cleanBatchNumber =
                String(batch_number).trim();

            if (cleanBatchNumber.length > 100) {
                return res.status(400).json({
                    success: false,
                    message: "Batch number cannot exceed 100 characters"
                });
            }

            const productResult = await db.execute({
                sql: `
                    SELECT
                        id,
                        stock
                    FROM products
                    WHERE id = ?
                `,
                args: [productId]
            });

            if (productResult.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Product not found"
                });
            }

            const quantityNumber =
                quantity === undefined ||
                quantity === null ||
                quantity === ""
                    ? 0
                    : Number(quantity);

            if (
                !Number.isFinite(quantityNumber) ||
                quantityNumber < 0
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Quantity must be a valid non-negative number"
                });
            }

            const purchasePriceNumber =
                purchase_price === undefined ||
                purchase_price === null ||
                purchase_price === ""
                    ? 0
                    : Number(purchase_price);

            if (
                !Number.isFinite(purchasePriceNumber) ||
                purchasePriceNumber < 0
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Purchase price must be a valid non-negative number"
                });
            }

            let cleanExpiryDate = null;

            if (
                expiry_date !== undefined &&
                expiry_date !== null &&
                String(expiry_date).trim()
            ) {
                cleanExpiryDate =
                    String(expiry_date).trim();

                if (
                    !/^\d{4}-\d{2}-\d{2}$/.test(
                        cleanExpiryDate
                    )
                ) {
                    return res.status(400).json({
                        success: false,
                        message: "Expiry date must be in YYYY-MM-DD format"
                    });
                }

                const expiryDateObject =
                    new Date(
                        `${cleanExpiryDate}T00:00:00`
                    );

                if (
                    Number.isNaN(
                        expiryDateObject.getTime()
                    )
                ) {
                    return res.status(400).json({
                        success: false,
                        message: "Invalid expiry date"
                    });
                }
            }

            const existingBatch =
                await db.execute({
                    sql: `
                        SELECT id
                        FROM product_batches
                        WHERE product_id = ?
                        AND LOWER(TRIM(batch_number))
                            = LOWER(TRIM(?))
                    `,
                    args: [
                        productId,
                        cleanBatchNumber
                    ]
                });

            if (existingBatch.rows.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: "A batch with this batch number already exists for this product"
                });
            }

            const result = await db.execute({
                sql: `
                    INSERT INTO product_batches (
                        product_id,
                        batch_number,
                        expiry_date,
                        quantity,
                        purchase_price
                    )
                    VALUES (?, ?, ?, ?, ?)
                `,
                args: [
                    productId,
                    cleanBatchNumber,
                    cleanExpiryDate,
                    quantityNumber,
                    purchasePriceNumber
                ]
            });

            const batchId =
                Number(result.lastInsertRowid);

            if (quantityNumber > 0) {
                await db.execute({
                    sql: `
                        UPDATE products
                        SET stock = stock + ?
                        WHERE id = ?
                    `,
                    args: [
                        quantityNumber,
                        productId
                    ]
                });
            }

            if (quantityNumber > 0) {
                await db.execute({
                    sql: `
                        INSERT INTO stock_movements (
                            product_id,
                            type,
                            quantity,
                            reference_id,
                            reason
                        )
                        VALUES (?, ?, ?, ?, ?)
                    `,
                    args: [
                        productId,
                        "in",
                        quantityNumber,
                        batchId,
                        `Batch ${cleanBatchNumber} added`
                    ]
                });
            }

            const createdBatch =
                await db.execute({
                    sql: `
                        SELECT
                            id,
                            product_id,
                            batch_number,
                            expiry_date,
                            quantity,
                            purchase_price,
                            created_at
                        FROM product_batches
                        WHERE id = ?
                    `,
                    args: [batchId]
                });

            const batch =
                createdBatch.rows[0];

            res.status(201).json({
                success: true,
                message: "Product batch added successfully",
                data: {
                    id: Number(batch.id),
                    product_id: Number(batch.product_id),
                    batch_number: batch.batch_number,
                    expiry_date: batch.expiry_date,
                    quantity: Number(batch.quantity),
                    purchase_price: Number(
                        batch.purchase_price
                    ),
                    created_at: batch.created_at
                }
            });

        } catch (error) {
            console.error(
                "ADD PRODUCT BATCH ERROR:",
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
// UPDATE PRODUCT
// Admin + Manager
// =====================================================

router.put(
    "/:id",
    authMiddleware,
    roleMiddleware("admin", "manager"),
    async (req, res) => {
        try {
            const productId =
                Number(req.params.id);

            if (
                !Number.isInteger(productId) ||
                productId <= 0
            ) {
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
                low_stock_limit,
                image_url
            } = req.body;

            if (!name || !String(name).trim()) {
                return res.status(400).json({
                    success: false,
                    message: "Product name is required"
                });
            }

            const productName =
                String(name).trim();

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
            // FIND EXISTING PRODUCT
            // ---------------------------------------------

            const product =
                await db.execute({
                    sql: `
                        SELECT
                            id,
                            image_url
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
            // IMAGE URL
            // ---------------------------------------------

            let cleanImageUrl = null;

            if (
                image_url !== undefined &&
                image_url !== null &&
                String(image_url).trim()
            ) {
                cleanImageUrl =
                    String(image_url).trim();

                if (!isValidImageUrl(cleanImageUrl)) {
                    return res.status(400).json({
                        success: false,
                        message: "Please enter a valid image URL"
                    });
                }
            }

            // ---------------------------------------------
            // NUMERIC VALIDATION
            // ---------------------------------------------

            const salePriceNumber =
                Number(sale_price);

            const purchasePriceNumber =
                purchase_price === undefined ||
                purchase_price === null ||
                purchase_price === ""
                    ? 0
                    : Number(purchase_price);

            const stockNumber =
                stock === undefined ||
                stock === null ||
                stock === ""
                    ? 0
                    : Number(stock);

            const lowStockLimitNumber =
                low_stock_limit === undefined ||
                low_stock_limit === null ||
                low_stock_limit === ""
                    ? 5
                    : Number(low_stock_limit);

            if (
                !Number.isFinite(salePriceNumber) ||
                salePriceNumber < 0
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Sale price must be a valid non-negative number"
                });
            }

            if (
                !Number.isFinite(purchasePriceNumber) ||
                purchasePriceNumber < 0
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Purchase price must be a valid non-negative number"
                });
            }

            if (
                !Number.isFinite(stockNumber) ||
                stockNumber < 0
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Stock must be a valid non-negative number"
                });
            }

            if (
                !Number.isFinite(lowStockLimitNumber) ||
                lowStockLimitNumber < 0
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Low stock limit must be a valid non-negative number"
                });
            }

            // ---------------------------------------------
            // CATEGORY
            // ---------------------------------------------

            let categoryId = null;

            if (
                category_id !== undefined &&
                category_id !== null &&
                category_id !== ""
            ) {
                categoryId =
                    Number(category_id);

                if (
                    !Number.isInteger(categoryId) ||
                    categoryId <= 0
                ) {
                    return res.status(400).json({
                        success: false,
                        message: "Invalid category ID"
                    });
                }

                const category =
                    await db.execute({
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
            // BARCODE
            // ---------------------------------------------

            const cleanBarcode =
                barcode !== undefined &&
                barcode !== null &&
                String(barcode).trim()
                    ? String(barcode).trim()
                    : null;

            if (cleanBarcode) {
                const existingBarcode =
                    await db.execute({
                        sql: `
                            SELECT id
                            FROM products
                            WHERE barcode = ?
                            AND id != ?
                        `,
                        args: [
                            cleanBarcode,
                            productId
                        ]
                    });

                if (
                    existingBarcode.rows.length > 0
                ) {
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
                unit && String(unit).trim()
                    ? String(unit).trim()
                    : "piece";

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
                        low_stock_limit = ?,
                        image_url = ?
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
                    cleanImageUrl,
                    productId
                ]
            });

            res.json({
                success: true,
                message: "Product updated successfully",
                image_url: cleanImageUrl
            });

        } catch (error) {
            console.error(
                "UPDATE PRODUCT ERROR:",
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
// GET PRODUCT BATCHES
// Admin + Manager + Cashier
// =====================================================

router.get(
    "/:id/batches",
    authMiddleware,
    roleMiddleware("admin", "manager", "cashier"),
    async (req, res) => {
        try {
            const productId =
                Number(req.params.id);

            if (
                !Number.isInteger(productId) ||
                productId <= 0
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Valid product ID is required"
                });
            }

            const result =
                await db.execute({
                    sql: `
                        SELECT
                            id,
                            product_id,
                            batch_number,
                            expiry_date,
                            quantity,
                            purchase_price
                        FROM product_batches
                        WHERE product_id = ?
                        ORDER BY
                            CASE
                                WHEN expiry_date IS NULL
                                THEN 1
                                ELSE 0
                            END ASC,
                            expiry_date ASC,
                            id ASC
                    `,
                    args: [productId]
                });

            res.json({
                success: true,
                data: result.rows.map(
                    (batch) => ({
                        id: Number(batch.id),
                        product_id: Number(
                            batch.product_id
                        ),
                        batch_number:
                            batch.batch_number,
                        expiry_date:
                            batch.expiry_date,
                        quantity:
                            Number(batch.quantity),
                        purchase_price:
                            Number(
                                batch.purchase_price || 0
                            )
                    })
                )
            });

        } catch (error) {
            console.error(
                "GET PRODUCT BATCHES ERROR:",
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
// GET PRODUCT BY BARCODE WITH BATCH
// Admin + Manager + Cashier
// =====================================================

router.get(
    "/barcode/:barcode",
    authMiddleware,
    roleMiddleware("admin", "manager", "cashier"),
    async (req, res) => {
        try {
            const barcode =
                String(
                    req.params.barcode || ""
                ).trim();

            if (!barcode) {
                return res.status(400).json({
                    success: false,
                    message: "Barcode is required"
                });
            }

            const result =
                await db.execute({
                    sql: `
                        SELECT
                            products.id,
                            products.name,
                            products.barcode,
                            products.sale_price,
                            products.stock,
                            products.unit,
                            products.image_url,

                            product_batches.id AS batch_id,
                            product_batches.batch_number,
                            product_batches.expiry_date,
                            product_batches.quantity AS batch_stock

                        FROM products

                        LEFT JOIN product_batches
                            ON products.id =
                               product_batches.product_id

                        WHERE products.barcode = ?

                        AND (
                            product_batches.id IS NULL
                            OR product_batches.quantity > 0
                        )

                        ORDER BY
                            CASE
                                WHEN product_batches.expiry_date IS NULL
                                THEN 1
                                ELSE 0
                            END ASC,

                            product_batches.expiry_date ASC,

                            product_batches.id ASC

                        LIMIT 1
                    `,
                    args: [barcode]
                });

            if (result.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Product or available batch not found"
                });
            }

            const product =
                result.rows[0];

            if (
                product.expiry_date &&
                product.expiry_date <
                    new Date()
                        .toISOString()
                        .split("T")[0]
            ) {
                return res.status(400).json({
                    success: false,
                    message: "This product batch has expired"
                });
            }

            res.json({
                success: true,
                data: {
                    id: Number(product.id),

                    name: product.name,

                    barcode: product.barcode,

                    sale_price:
                        Number(
                            product.sale_price
                        ),

                    stock:
                        Number(
                            product.stock
                        ),

                    image_url:
                        product.image_url ||
                        null,

                    batch_id:
                        product.batch_id
                            ? Number(
                                product.batch_id
                            )
                            : null,

                    batch_number:
                        product.batch_number ||
                        null,

                    expiry_date:
                        product.expiry_date ||
                        null,

                    batch_stock:
                        product.batch_stock !== null
                            ? Number(
                                product.batch_stock
                            )
                            : Number(
                                product.stock
                            ),

                    unit: product.unit
                }
            });

        } catch (error) {
            console.error(
                "GET PRODUCT BY BARCODE ERROR:",
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
// DELETE PRODUCT
// Admin only
// =====================================================

router.delete(
    "/:id",
    authMiddleware,
    roleMiddleware("admin"),
    async (req, res) => {
        try {
            const productId =
                Number(req.params.id);

            if (
                !Number.isInteger(productId) ||
                productId <= 0
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Valid product ID is required"
                });
            }

            const product =
                await db.execute({
                    sql: `
                        SELECT
                            id,
                            image_url
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
            console.error(
                "DELETE PRODUCT ERROR:",
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