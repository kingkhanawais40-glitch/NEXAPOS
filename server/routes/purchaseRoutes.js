const express = require("express");
const router = express.Router();

const db = require("../database/db");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");


// =====================================================
// CREATE PURCHASE
// ADMIN + MANAGER
// =====================================================

router.post(
    "/",
    authMiddleware,
    roleMiddleware("admin", "manager"),
    async(req, res) => {
        try {
            const {
                supplier_id,
                supplier_name,
                invoice_number,
                paid_amount = 0,
                payment_method = "cash",
                items
            } = req.body;

            // =================================================
            // VALIDATE SUPPLIER ID
            // =================================================

            const supplierId = Number(supplier_id);

            if (!Number.isInteger(supplierId) ||
                supplierId <= 0
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Valid supplier ID is required"
                });
            }

            // =================================================
            // VALIDATE ITEMS
            // =================================================

            if (!Array.isArray(items) ||
                items.length === 0
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Purchase must contain at least one product"
                });
            }

            // =================================================
            // VALIDATE PAYMENT METHOD
            // =================================================

            const allowedMethods = [
                "cash",
                "bank",
                "easypaisa",
                "jazzcash"
            ];

            const selectedPaymentMethod =
                String(payment_method || "cash")
                .trim()
                .toLowerCase();

            if (!allowedMethods.includes(
                    selectedPaymentMethod
                )) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid payment method. Use cash, bank, easypaisa or jazzcash"
                });
            }

            // =================================================
            // CLEAN INVOICE NUMBER
            // =================================================

            const cleanInvoiceNumber =
                invoice_number !== undefined &&
                invoice_number !== null &&
                String(invoice_number).trim() ?
                String(invoice_number).trim() :
                null;

            // =================================================
            // GET SUPPLIER
            // =================================================

            const supplierResult = await db.execute({
                sql: `
                    SELECT *
                    FROM suppliers
                    WHERE id = ?
                `,
                args: [supplierId]
            });

            const supplier =
                supplierResult.rows[0];

            if (!supplier) {
                return res.status(404).json({
                    success: false,
                    message: "Supplier not found"
                });
            }

            // =================================================
            // CHECK DUPLICATE INVOICE
            // =================================================

            if (cleanInvoiceNumber) {
                const existingPurchaseResult =
                    await db.execute({
                        sql: `
                            SELECT id
                            FROM purchases
                            WHERE invoice_number = ?
                        `,
                        args: [cleanInvoiceNumber]
                    });

                if (
                    existingPurchaseResult.rows.length > 0
                ) {
                    return res.status(400).json({
                        success: false,
                        message: `Purchase invoice ${cleanInvoiceNumber} already exists`
                    });
                }
            }

            // =================================================
            // VALIDATE PRODUCTS + CALCULATE TOTAL
            // =================================================

            let totalAmount = 0;

            const validatedItems = [];

            for (const item of items) {

                const productId =
                    Number(item.product_id);

                if (!Number.isInteger(productId) ||
                    productId <= 0
                ) {
                    throw new Error(
                        "Valid product ID is required"
                    );
                }

                const productResult =
                    await db.execute({
                        sql: `
                            SELECT *
                            FROM products
                            WHERE id = ?
                        `,
                        args: [productId]
                    });

                const product =
                    productResult.rows[0];

                if (!product) {
                    throw new Error(
                        `Product with ID ${productId} not found`
                    );
                }

                const quantity =
                    Number(item.quantity);

                const purchasePrice =
                    Number(item.purchase_price);

                // ---------------------------------------------
                // VALIDATE QUANTITY
                // ---------------------------------------------

                if (!Number.isFinite(quantity) ||
                    quantity <= 0
                ) {
                    throw new Error(
                        `Invalid quantity for ${product.name}`
                    );
                }

                // ---------------------------------------------
                // VALIDATE PURCHASE PRICE
                // ---------------------------------------------

                if (
                    item.purchase_price === undefined ||
                    item.purchase_price === null ||
                    item.purchase_price === "" ||
                    !Number.isFinite(purchasePrice) ||
                    purchasePrice < 0
                ) {
                    throw new Error(
                        `Invalid purchase price for ${product.name}`
                    );
                }

                // ---------------------------------------------
                // CALCULATE ITEM TOTAL
                // ---------------------------------------------

                const total =
                    quantity * purchasePrice;

                totalAmount += total;

                validatedItems.push({
                    productId,
                    quantity,
                    purchasePrice,
                    total,
                    productName: product.name
                });
            }

            // =================================================
            // VALIDATE TOTAL
            // =================================================

            if (!Number.isFinite(totalAmount) ||
                totalAmount < 0
            ) {
                throw new Error(
                    "Invalid purchase total"
                );
            }

            // =================================================
            // VALIDATE PAID AMOUNT
            // =================================================

            const paid =
                Number(paid_amount);

            if (!Number.isFinite(paid) ||
                paid < 0
            ) {
                throw new Error(
                    "Paid amount must be a valid non-negative number"
                );
            }

            if (paid > totalAmount) {
                throw new Error(
                    "Paid amount cannot be greater than purchase total"
                );
            }

            // =================================================
            // CALCULATE DUE
            // =================================================

            const dueAmount =
                totalAmount - paid;

            // =================================================
            // TURSO WRITE TRANSACTION
            // =================================================

            const transaction =
                await db.transaction("write");

            let purchase;

            try {

                // =================================================
                // CREATE PURCHASE
                // =================================================

                const purchaseResult =
                    await transaction.execute({
                        sql: `
                            INSERT INTO purchases (
                                supplier_name,
                                invoice_number,
                                total_amount,
                                paid_amount,
                                due_amount,
                                payment_method
                            )
                            VALUES (?, ?, ?, ?, ?, ?)
                        `,
                        args: [
                            supplier.name,
                            cleanInvoiceNumber,
                            totalAmount,
                            paid,
                            dueAmount,
                            selectedPaymentMethod
                        ]
                    });

                const purchaseId =
                    Number(
                        purchaseResult.lastInsertRowid
                    );

                // =================================================
                // ADD DUE TO SUPPLIER LEDGER
                // =================================================

                if (dueAmount > 0) {

                    await transaction.execute({
                        sql: `
                            INSERT INTO supplier_ledger (
                                supplier_id,
                                purchase_id,
                                transaction_type,
                                amount,
                                description
                            )
                            VALUES (?, ?, 'debit', ?, ?)
                        `,
                        args: [
                            supplierId,
                            purchaseId,
                            dueAmount,
                            `Credit purchase - ${supplier.name}`
                        ]
                    });
                }

                // =================================================
                // SAVE ITEMS + STOCK + MOVEMENT
                // =================================================

                for (const item of validatedItems) {

                    // ---------------------------------------------
                    // SAVE PURCHASE ITEM
                    // ---------------------------------------------

                    await transaction.execute({
                        sql: `
                            INSERT INTO purchase_items (
                                purchase_id,
                                product_id,
                                quantity,
                                purchase_price,
                                total
                            )
                            VALUES (?, ?, ?, ?, ?)
                        `,
                        args: [
                            purchaseId,
                            item.productId,
                            item.quantity,
                            item.purchasePrice,
                            item.total
                        ]
                    });

                    // ---------------------------------------------
                    // INCREASE STOCK
                    // ---------------------------------------------

                    const updateStockResult =
                        await transaction.execute({
                            sql: `
                                UPDATE products
                                SET stock = stock + ?
                                WHERE id = ?
                            `,
                            args: [
                                item.quantity,
                                item.productId
                            ]
                        });

                    if (
                        Number(
                            updateStockResult.rowsAffected
                        ) === 0
                    ) {
                        throw new Error(
                            `Failed to update stock for ${item.productName}`
                        );
                    }

                    // ---------------------------------------------
                    // STOCK MOVEMENT
                    // ---------------------------------------------

                    await transaction.execute({
                        sql: `
                            INSERT INTO stock_movements (
                                product_id,
                                type,
                                quantity,
                                reference_id,
                                reason
                            )
                            VALUES (?, 'purchase', ?, ?, ?)
                        `,
                        args: [
                            item.productId,
                            item.quantity,
                            purchaseId,
                            `Purchase - ${supplier.name}`
                        ]
                    });
                }

                // =================================================
                // COMMIT TRANSACTION
                // =================================================

                await transaction.commit();

                purchase = {
                    purchaseId,
                    supplierId,
                    supplierName: supplier.name,
                    totalAmount,
                    paidAmount: paid,
                    dueAmount,
                    paymentMethod: selectedPaymentMethod
                };

            } catch (transactionError) {

                await transaction.rollback();

                throw transactionError;
            }

            // =================================================
            // SUCCESS RESPONSE
            // =================================================

            res.status(201).json({
                success: true,
                message: "Purchase created successfully",
                data: purchase
            });

        } catch (error) {

            console.error(
                "Create Purchase Error:",
                error
            );

            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }
);


// =====================================================
// GET ALL PURCHASES
// ADMIN + MANAGER
// =====================================================

router.get(
    "/",
    authMiddleware,
    roleMiddleware("admin", "manager"),
    async(req, res) => {
        try {

            const result =
                await db.execute({
                    sql: `
                        SELECT
                            purchases.*,
                            COUNT(purchase_items.id) AS total_items
                        FROM purchases

                        LEFT JOIN purchase_items
                            ON purchases.id =
                               purchase_items.purchase_id

                        GROUP BY purchases.id

                        ORDER BY purchases.id DESC
                    `,
                    args: []
                });

            res.json({
                success: true,
                data: result.rows
            });

        } catch (error) {

            console.error(
                "Get Purchases Error:",
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
// GET SINGLE PURCHASE DETAILS
// ADMIN + MANAGER
// =====================================================

router.get(
    "/:id",
    authMiddleware,
    roleMiddleware("admin", "manager"),
    async(req, res) => {
        try {

            const purchaseId =
                Number(req.params.id);

            if (!Number.isInteger(purchaseId) ||
                purchaseId <= 0
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Valid purchase ID is required"
                });
            }

            // =================================================
            // GET PURCHASE
            // =================================================

            const purchaseResult =
                await db.execute({
                    sql: `
                        SELECT *
                        FROM purchases
                        WHERE id = ?
                    `,
                    args: [purchaseId]
                });

            const purchase =
                purchaseResult.rows[0];

            if (!purchase) {
                return res.status(404).json({
                    success: false,
                    message: "Purchase not found"
                });
            }

            // =================================================
            // GET PURCHASE ITEMS
            // =================================================

            const itemsResult =
                await db.execute({
                    sql: `
                        SELECT
                            purchase_items.*,
                            products.name AS product_name,
                            products.barcode,
                            products.unit
                        FROM purchase_items

                        INNER JOIN products
                            ON purchase_items.product_id =
                               products.id

                        WHERE purchase_items.purchase_id = ?

                        ORDER BY purchase_items.id ASC
                    `,
                    args: [purchaseId]
                });

            res.json({
                success: true,
                data: {
                    purchase,
                    items: itemsResult.rows
                }
            });

        } catch (error) {

            console.error(
                "Get Purchase Details Error:",
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
// EXPORT ROUTER
// =====================================================

module.exports = router;