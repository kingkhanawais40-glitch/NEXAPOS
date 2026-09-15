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
    (req, res) => {
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
            // DATABASE TRANSACTION
            // =================================================

            const transaction = db.transaction(() => {

                // =================================================
                // GET SUPPLIER
                // =================================================

                const supplier = db.prepare(`
                    SELECT *
                    FROM suppliers
                    WHERE id = ?
                `).get(supplierId);

                if (!supplier) {
                    throw new Error("Supplier not found");
                }

                // =================================================
                // CHECK DUPLICATE INVOICE
                // =================================================

                if (cleanInvoiceNumber) {
                    const existingPurchase = db.prepare(`
                        SELECT id
                        FROM purchases
                        WHERE invoice_number = ?
                    `).get(cleanInvoiceNumber);

                    if (existingPurchase) {
                        throw new Error(
                            `Purchase invoice ${cleanInvoiceNumber} already exists`
                        );
                    }
                }

                // =================================================
                // PREPARE PRODUCT QUERY
                // =================================================

                let totalAmount = 0;

                const getProduct = db.prepare(`
                    SELECT *
                    FROM products
                    WHERE id = ?
                `);

                // =================================================
                // VALIDATE ITEMS + CALCULATE TOTAL
                // =================================================

                for (const item of items) {

                    const productId = Number(
                        item.product_id
                    );

                    if (!Number.isInteger(productId) ||
                        productId <= 0
                    ) {
                        throw new Error(
                            "Valid product ID is required"
                        );
                    }

                    const product = getProduct.get(
                        productId
                    );

                    if (!product) {
                        throw new Error(
                            `Product with ID ${productId} not found`
                        );
                    }

                    const quantity = Number(
                        item.quantity
                    );

                    const purchasePrice = Number(
                        item.purchase_price
                    );

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
                    // CALCULATE TOTAL
                    // ---------------------------------------------

                    totalAmount +=
                        quantity * purchasePrice;
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

                const paid = Number(
                    paid_amount
                );

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
                // CREATE PURCHASE
                // =================================================

                const purchaseResult = db.prepare(`
                    INSERT INTO purchases (
                        supplier_name,
                        invoice_number,
                        total_amount,
                        paid_amount,
                        due_amount,
                        payment_method
                    )
                    VALUES (?, ?, ?, ?, ?, ?)
                `).run(
                    supplier.name,
                    cleanInvoiceNumber,
                    totalAmount,
                    paid,
                    dueAmount,
                    selectedPaymentMethod
                );

                const purchaseId =
                    purchaseResult.lastInsertRowid;

                // =================================================
                // ADD DUE TO SUPPLIER LEDGER
                // =================================================

                if (dueAmount > 0) {

                    db.prepare(`
                        INSERT INTO supplier_ledger (
                            supplier_id,
                            purchase_id,
                            transaction_type,
                            amount,
                            description
                        )
                        VALUES (?, ?, 'debit', ?, ?)
                    `).run(
                        supplierId,
                        purchaseId,
                        dueAmount,
                        `Credit purchase - ${supplier.name}`
                    );
                }

                // =================================================
                // PREPARE STATEMENTS
                // =================================================

                const insertItem = db.prepare(`
                    INSERT INTO purchase_items (
                        purchase_id,
                        product_id,
                        quantity,
                        purchase_price,
                        total
                    )
                    VALUES (?, ?, ?, ?, ?)
                `);

                const updateStock = db.prepare(`
                    UPDATE products
                    SET stock = stock + ?
                    WHERE id = ?
                `);

                const insertMovement = db.prepare(`
                    INSERT INTO stock_movements (
                        product_id,
                        type,
                        quantity,
                        reference_id,
                        reason
                    )
                    VALUES (?, 'purchase', ?, ?, ?)
                `);

                // =================================================
                // SAVE ITEMS + STOCK + MOVEMENT
                // =================================================

                for (const item of items) {

                    const productId = Number(
                        item.product_id
                    );

                    const quantity = Number(
                        item.quantity
                    );

                    const purchasePrice = Number(
                        item.purchase_price
                    );

                    const total =
                        quantity * purchasePrice;

                    // ---------------------------------------------
                    // SAVE PURCHASE ITEM
                    // ---------------------------------------------

                    insertItem.run(
                        purchaseId,
                        productId,
                        quantity,
                        purchasePrice,
                        total
                    );

                    // ---------------------------------------------
                    // INCREASE STOCK
                    // ---------------------------------------------

                    updateStock.run(
                        quantity,
                        productId
                    );

                    // ---------------------------------------------
                    // STOCK MOVEMENT
                    // ---------------------------------------------

                    insertMovement.run(
                        productId,
                        quantity,
                        purchaseId,
                        `Purchase - ${supplier.name}`
                    );
                }

                // =================================================
                // RETURN PURCHASE DATA
                // =================================================

                return {
                    purchaseId,
                    supplierId,
                    supplierName: supplier.name,
                    totalAmount,
                    paidAmount: paid,
                    dueAmount,
                    paymentMethod: selectedPaymentMethod
                };
            });

            // =================================================
            // EXECUTE TRANSACTION
            // =================================================

            const purchase = transaction();

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
    (req, res) => {
        try {

            const purchases = db.prepare(`
                SELECT
                    purchases.*,
                    COUNT(purchase_items.id) AS total_items
                FROM purchases

                LEFT JOIN purchase_items
                    ON purchases.id = purchase_items.purchase_id

                GROUP BY purchases.id

                ORDER BY purchases.id DESC
            `).all();

            res.json({
                success: true,
                data: purchases
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
    (req, res) => {
        try {

            const purchaseId = Number(
                req.params.id
            );

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

            const purchase = db.prepare(`
                SELECT *
                FROM purchases
                WHERE id = ?
            `).get(purchaseId);

            if (!purchase) {
                return res.status(404).json({
                    success: false,
                    message: "Purchase not found"
                });
            }

            // =================================================
            // GET PURCHASE ITEMS
            // =================================================

            const items = db.prepare(`
                SELECT
                    purchase_items.*,
                    products.name AS product_name,
                    products.barcode,
                    products.unit
                FROM purchase_items

                INNER JOIN products
                    ON purchase_items.product_id = products.id

                WHERE purchase_items.purchase_id = ?

                ORDER BY purchase_items.id ASC
            `).all(purchaseId);

            res.json({
                success: true,
                data: {
                    purchase,
                    items
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