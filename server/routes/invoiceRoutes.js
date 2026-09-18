const express = require("express");
const router = express.Router();

const db = require("../database/db");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

// ==========================================
// CREATE NEW INVOICE / SALE
// ADMIN + MANAGER + CASHIER
// ==========================================
router.post(
    "/",
    authMiddleware,
    roleMiddleware("admin", "manager", "cashier"),
    async(req, res) => {
        try {
            const {
                items,
                payment_method,
                paid_amount,
                customer_id,
                discount,
                tax,
                notes,
            } = req.body;

            // ==========================================
            // BASIC VALIDATION
            // ==========================================

            if (!Array.isArray(items) || items.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: "Invoice must contain at least one item.",
                });
            }

            const allowedPaymentMethods = [
                "cash",
                "card",
                "credit",
                "bank",
                "other",
            ];

            if (!allowedPaymentMethods.includes(payment_method)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid payment method.",
                });
            }

            const paidAmount = Number(paid_amount || 0);
            const discountAmount = Number(discount || 0);
            const taxAmount = Number(tax || 0);

            if (paidAmount < 0) {
                return res.status(400).json({
                    success: false,
                    message: "Paid amount cannot be negative.",
                });
            }

            if (discountAmount < 0) {
                return res.status(400).json({
                    success: false,
                    message: "Discount cannot be negative.",
                });
            }

            if (taxAmount < 0) {
                return res.status(400).json({
                    success: false,
                    message: "Tax cannot be negative.",
                });
            }

            // ==========================================
            // VALIDATE ITEMS
            // ==========================================

            const validatedItems = [];
            let subtotal = 0;

            for (const item of items) {
                const productId = Number(item.product_id);
                const quantity = Number(item.quantity);

                let batchId = item.batch_id;

                if (
                    batchId === undefined ||
                    batchId === null ||
                    batchId === ""
                ) {
                    batchId = null;
                } else {
                    batchId = Number(batchId);

                    if (!Number.isInteger(batchId) || batchId <= 0) {
                        return res.status(400).json({
                            success: false,
                            message: "Invalid batch ID.",
                        });
                    }
                }

                if (!Number.isInteger(productId) || productId <= 0) {
                    return res.status(400).json({
                        success: false,
                        message: "Invalid product ID.",
                    });
                }

                if (!Number.isFinite(quantity) || quantity <= 0) {
                    return res.status(400).json({
                        success: false,
                        message: "Invalid product quantity.",
                    });
                }

                // ==========================================
                // GET PRODUCT
                // ==========================================

                const productResult = await db.execute({
                    sql: `
                        SELECT
                            id,
                            name,
                            stock,
                            sale_price
                        FROM products
                        WHERE id = ?
                    `,
                    args: [productId],
                });

                if (productResult.rows.length === 0) {
                    throw new Error(
                        `Product with ID ${productId} was not found.`
                    );
                }

                const product = productResult.rows[0];

                // ==========================================
                // PRODUCT STOCK VALIDATION
                // ==========================================

                if (Number(product.stock) < quantity) {
                    throw new Error(
                        `Insufficient stock for product "${product.name}".`
                    );
                }

                const salePrice = Number(product.sale_price || 0);

                if (salePrice < 0) {
                    throw new Error(
                        `Invalid sale price for product "${product.name}".`
                    );
                }

                // ==========================================
                // BATCH VALIDATION
                // ==========================================

                let batch = null;

                if (batchId !== null) {
                    const batchResult = await db.execute({
                        sql: `
                            SELECT
                                id,
                                product_id,
                                batch_number,
                                expiry_date,
                                quantity
                            FROM product_batches
                            WHERE id = ?
                              AND product_id = ?
                        `,
                        args: [batchId, productId],
                    });

                    if (batchResult.rows.length === 0) {
                        throw new Error(
                            `Selected batch was not found for product "${product.name}".`
                        );
                    }

                    batch = batchResult.rows[0];

                    // ==========================================
                    // BATCH EXPIRY CHECK
                    // ==========================================

                    if (batch.expiry_date) {
                        const today = new Date()
                            .toISOString()
                            .split("T")[0];

                        if (batch.expiry_date < today) {
                            throw new Error(
                                `Batch ${batch.batch_number} has expired.`
                            );
                        }
                    }

                    // ==========================================
                    // BATCH STOCK CHECK
                    // ==========================================

                    if (Number(batch.quantity) < quantity) {
                        throw new Error(
                            `Insufficient stock in batch ${batch.batch_number}.`
                        );
                    }
                }

                const itemTotal = salePrice * quantity;

                subtotal += itemTotal;

                validatedItems.push({
                    product,
                    productId,
                    quantity,
                    salePrice,
                    batchId,
                    batch,
                });
            }

            // ==========================================
            // CALCULATE TOTALS
            // ==========================================

            const totalBeforeDiscount = subtotal;

            const total = Math.max(
                0,
                totalBeforeDiscount - discountAmount + taxAmount
            );

            const dueAmount = Math.max(0, total - paidAmount);

            // ==========================================
            // CUSTOMER VALIDATION
            // ==========================================

            let customerId = null;

            if (
                customer_id !== undefined &&
                customer_id !== null &&
                customer_id !== ""
            ) {
                customerId = Number(customer_id);

                if (!Number.isInteger(customerId) || customerId <= 0) {
                    return res.status(400).json({
                        success: false,
                        message: "Invalid customer ID.",
                    });
                }

                const customerResult = await db.execute({
                    sql: `
                        SELECT id
                        FROM customers
                        WHERE id = ?
                    `,
                    args: [customerId],
                });

                if (customerResult.rows.length === 0) {
                    return res.status(400).json({
                        success: false,
                        message: "Customer not found.",
                    });
                }
            }

            // ==========================================
            // CREDIT SALE VALIDATION
            // ==========================================

            if (payment_method === "credit" && !customerId) {
                return res.status(400).json({
                    success: false,
                    message: "Customer is required for credit sales.",
                });
            }

            // ==========================================
            // GENERATE INVOICE NUMBER
            // ==========================================

            const invoiceNumber = `INV-${Date.now()}`;

            const cashierUsername =
                req.user ?
                req.user.username || null :
                null;

            // ==========================================
            // START DATABASE TRANSACTION
            // ==========================================

            const tx = await db.transaction("write");

            try {
                // ==========================================
                // INSERT INVOICE
                // ==========================================

                const invoiceResult = await tx.execute({
                    sql: `
                        INSERT INTO invoices (
                            invoice_number,
                            customer_id,
                            subtotal,
                            discount,
                            tax,
                            total,
                            paid_amount,
                            due_amount,
                            payment_method,
                            notes,
                            cashier
                        )
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    `,
                    args: [
                        invoiceNumber,
                        customerId,
                        subtotal,
                        discountAmount,
                        taxAmount,
                        total,
                        paidAmount,
                        dueAmount,
                        payment_method,
                        notes || null,
                        cashierUsername,
                    ],
                });

                const invoiceId = Number(
                    invoiceResult.lastInsertRowid
                );

                if (!invoiceId) {
                    throw new Error(
                        "Failed to create invoice."
                    );
                }

                // ==========================================
                // CUSTOMER LEDGER
                // ==========================================

                if (customerId && dueAmount > 0) {
                    await tx.execute({
                        sql: `
                            INSERT INTO customer_ledger (
                                customer_id,
                                invoice_id,
                                transaction_type,
                                amount,
                                description
                            )
                            VALUES (?, ?, ?, ?, ?)
                        `,
                        args: [
                            customerId,
                            invoiceId,
                            "debit",
                            dueAmount,
                            `Invoice ${invoiceNumber}`,
                        ],
                    });
                }

                // ==========================================
                // PROCESS EACH ITEM
                // ==========================================

                for (const item of validatedItems) {
                    // ==========================================
                    // INSERT INVOICE ITEM
                    // ==========================================

                    await tx.execute({
                        sql: `
                            INSERT INTO invoice_items (
                                invoice_id,
                                product_id,
                                quantity,
                                unit_price,
                                total,
                                batch_id
                            )
                            VALUES (?, ?, ?, ?, ?, ?)
                        `,
                        args: [
                            invoiceId,
                            item.productId,
                            item.quantity,
                            item.salePrice,
                            item.salePrice * item.quantity,
                            item.batchId,
                        ],
                    });

                    // ==========================================
                    // DECREASE PRODUCT STOCK
                    // ==========================================

                    const stockResult = await tx.execute({
                        sql: `
                            UPDATE products
                            SET stock = stock - ?
                            WHERE id = ?
                              AND stock >= ?
                        `,
                        args: [
                            item.quantity,
                            item.productId,
                            item.quantity,
                        ],
                    });

                    if (Number(stockResult.rowsAffected) === 0) {
                        throw new Error(
                            `Unable to update stock for product "${item.product.name}".`
                        );
                    }

                    // ==========================================
                    // DECREASE BATCH STOCK
                    // ==========================================

                    if (item.batchId !== null) {
                        const batchStockResult = await tx.execute({
                            sql: `
                                UPDATE product_batches
                                SET quantity = quantity - ?
                                WHERE id = ?
                                  AND quantity >= ?
                            `,
                            args: [
                                item.quantity,
                                item.batchId,
                                item.quantity,
                            ],
                        });

                        if (
                            Number(batchStockResult.rowsAffected) === 0
                        ) {
                            throw new Error(
                                `Unable to update stock for batch ${item.batch.batch_number}.`
                            );
                        }
                    }

                    // ==========================================
                    // STOCK MOVEMENT
                    // ==========================================

                    await tx.execute({
                        sql: `
                            INSERT INTO stock_movements (
                                product_id,
                                type,
                                quantity,
                                reference_id,
                                notes
                            )
                            VALUES (?, ?, ?, ?, ?)
                        `,
                        args: [
                            item.productId,
                            "sale",
                            item.quantity,
                            invoiceId,
                            item.batchId ?
                            `Sale from batch ${item.batch.batch_number}` :
                            `Sale from invoice ${invoiceNumber}`,
                        ],
                    });
                }

                // ==========================================
                // COMMIT TRANSACTION
                // ==========================================

                await tx.commit();

                // ==========================================
                // RETURN INVOICE DATA
                // ==========================================

                return res.status(201).json({
                    success: true,
                    message: "Invoice created successfully.",
                    data: {
                        invoice_id: invoiceId,
                        invoice_number: invoiceNumber,
                        subtotal,
                        discount: discountAmount,
                        tax: taxAmount,
                        total,
                        paid_amount: paidAmount,
                        due_amount: dueAmount,
                        payment_method,
                    },
                });
            } catch (transactionError) {
                // ==========================================
                // ROLLBACK TRANSACTION
                // ==========================================

                try {
                    await tx.rollback();
                } catch (rollbackError) {
                    console.error(
                        "Transaction rollback error:",
                        rollbackError
                    );
                }

                throw transactionError;
            }
        } catch (error) {
            console.error("Create invoice error:", error);

            return res.status(400).json({
                success: false,
                message: error.message ||
                    "An unexpected error occurred while creating invoice.",
            });
        }
    }
);

// ==========================================
// GET ALL INVOICES
// ADMIN + MANAGER + CASHIER
// ==========================================
router.get(
    "/",
    authMiddleware,
    roleMiddleware("admin", "manager", "cashier"),
    async(req, res) => {
        try {
            const result = await db.execute({
                sql: `
                    SELECT
                        invoices.*,
                        customers.name AS customer_name
                    FROM invoices
                    LEFT JOIN customers
                        ON invoices.customer_id = customers.id
                    ORDER BY invoices.id DESC
                `,
                args: [],
            });

            return res.json({
                success: true,
                data: result.rows,
            });
        } catch (error) {
            console.error("Get invoices error:", error);

            return res.status(500).json({
                success: false,
                message: "An unexpected error occurred. Please try again.",
            });
        }
    }
);

// ==========================================
// GET SINGLE INVOICE
// ADMIN + MANAGER + CASHIER
// ==========================================
router.get(
    "/:id",
    authMiddleware,
    roleMiddleware("admin", "manager", "cashier"),
    async(req, res) => {
        try {
            const invoiceId = Number(req.params.id);

            if (!Number.isInteger(invoiceId) || invoiceId <= 0) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid invoice ID.",
                });
            }

            // ==========================================
            // GET INVOICE
            // ==========================================

            const invoiceResult = await db.execute({
                sql: `
                    SELECT
                        invoices.*,
                        datetime(
                            invoices.created_at,
                            '+5 hours'
                        ) AS pakistan_created_at,
                        customers.name AS customer_name,
                        customers.phone AS customer_phone,
                        customers.address AS customer_address
                    FROM invoices
                    LEFT JOIN customers
                        ON invoices.customer_id = customers.id
                    WHERE invoices.id = ?
                `,
                args: [invoiceId],
            });

            if (invoiceResult.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Invoice not found.",
                });
            }

            const invoice = invoiceResult.rows[0];

            // ==========================================
            // USE PAKISTAN TIME
            // ==========================================

            if (invoice.pakistan_created_at) {
                invoice.created_at =
                    invoice.pakistan_created_at;
            }

            delete invoice.pakistan_created_at;

            // ==========================================
            // GET INVOICE ITEMS
            // ==========================================

            const itemsResult = await db.execute({
                sql: `
                    SELECT
                        invoice_items.*,
                        products.name AS product_name,
                        products.barcode,
                        products.unit
                    FROM invoice_items
                    INNER JOIN products
                        ON invoice_items.product_id = products.id
                    WHERE invoice_items.invoice_id = ?
                    ORDER BY invoice_items.id ASC
                `,
                args: [invoiceId],
            });

            // ==========================================
            // RETURN INVOICE + ITEMS
            // ==========================================

            return res.json({
                success: true,
                data: {
                    invoice,
                    items: itemsResult.rows,
                },
            });
        } catch (error) {
            console.error("Get invoice details error:", error);

            return res.status(500).json({
                success: false,
                message: "An unexpected error occurred. Please try again.",
            });
        }
    }
);

module.exports = router;