const express = require("express");
const router = express.Router();

const db = require("../database/db");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");


// =====================================================
// CREATE SALE RETURN
// ADMIN ONLY
// =====================================================

router.post(
    "/",
    authMiddleware,
    roleMiddleware("admin"),
    async(req, res) => {
        try {

            const {
                invoice_id,
                items,
                refund_method = "cash",
                reason
            } = req.body;


            // =================================================
            // BASIC VALIDATION
            // =================================================

            if (!invoice_id) {
                return res.status(400).json({
                    success: false,
                    message: "Invoice ID is required"
                });
            }

            const invoiceId = Number(invoice_id);

            if (!Number.isInteger(invoiceId) ||
                invoiceId <= 0
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Valid invoice ID is required"
                });
            }

            if (!items ||
                !Array.isArray(items) ||
                items.length === 0
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Return must contain at least one product"
                });
            }


            const allowedRefundMethods = [
                "cash",
                "bank",
                "easypaisa",
                "jazzcash"
            ];

            const selectedRefundMethod =
                typeof refund_method === "string" ?
                refund_method.trim().toLowerCase() :
                "cash";


            if (!allowedRefundMethods.includes(
                    selectedRefundMethod
                )) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid refund method"
                });
            }


            // =================================================
            // GET ORIGINAL INVOICE
            // =================================================

            const invoiceResult =
                await db.execute({
                    sql: `
                        SELECT *
                        FROM invoices
                        WHERE id = ?
                    `,
                    args: [invoiceId]
                });

            const invoice =
                invoiceResult.rows[0];


            if (!invoice) {
                return res.status(404).json({
                    success: false,
                    message: "Invoice not found"
                });
            }


            // =================================================
            // TURSO WRITE TRANSACTION
            // =================================================

            const transaction =
                await db.transaction("write");

            let returnData;

            try {

                let totalRefund = 0;

                const validatedItems = [];


                // =================================================
                // VALIDATE ALL RETURN ITEMS
                // =================================================

                for (const item of items) {

                    if (!item.product_id) {
                        throw new Error(
                            "Product ID is required"
                        );
                    }

                    const productId =
                        Number(item.product_id);

                    if (!Number.isInteger(productId) ||
                        productId <= 0
                    ) {
                        throw new Error(
                            "Valid product ID is required"
                        );
                    }


                    const requestedQuantity =
                        Number(item.quantity);


                    if (!Number.isFinite(
                            requestedQuantity
                        ) ||
                        requestedQuantity <= 0
                    ) {
                        throw new Error(
                            "Invalid return quantity"
                        );
                    }


                    // ---------------------------------------------
                    // CHECK PRODUCT WAS SOLD IN INVOICE
                    // ---------------------------------------------

                    const invoiceItemResult =
                        await transaction.execute({
                            sql: `
                                SELECT *
                                FROM invoice_items
                                WHERE invoice_id = ?
                                AND product_id = ?
                            `,
                            args: [
                                invoiceId,
                                productId
                            ]
                        });

                    const invoiceItem =
                        invoiceItemResult.rows[0];


                    if (!invoiceItem) {
                        throw new Error(
                            `Product ${productId} was not sold in this invoice`
                        );
                    }


                    // ---------------------------------------------
                    // CHECK ALREADY RETURNED QUANTITY
                    // ---------------------------------------------

                    const returnedResult =
                        await transaction.execute({
                            sql: `
                                SELECT
                                    COALESCE(
                                        SUM(return_items.quantity),
                                        0
                                    ) AS returned_quantity

                                FROM return_items

                                INNER JOIN returns
                                    ON return_items.return_id =
                                       returns.id

                                WHERE returns.invoice_id = ?
                                AND return_items.product_id = ?
                            `,
                            args: [
                                invoiceId,
                                productId
                            ]
                        });


                    const returnedData =
                        returnedResult.rows[0];


                    const alreadyReturned =
                        Number(
                            returnedData ? returnedData.returned_quantity || 0 :
                            0
                        );


                    const originalQuantity =
                        Number(
                            invoiceItem.quantity
                        );


                    const remainingQuantity =
                        originalQuantity -
                        alreadyReturned;


                    if (
                        requestedQuantity >
                        remainingQuantity
                    ) {
                        throw new Error(
                            `Return quantity exceeds remaining sold quantity for product ${productId}`
                        );
                    }


                    // ---------------------------------------------
                    // CHECK PRODUCT EXISTS
                    // ---------------------------------------------

                    const productResult =
                        await transaction.execute({
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
                            `Product ${productId} not found`
                        );
                    }


                    // ---------------------------------------------
                    // CALCULATE REFUND
                    // ---------------------------------------------

                    const unitPrice =
                        Number(
                            invoiceItem.unit_price
                        );


                    if (!Number.isFinite(unitPrice) ||
                        unitPrice < 0
                    ) {
                        throw new Error(
                            `Invalid unit price for product ${productId}`
                        );
                    }


                    const total =
                        requestedQuantity *
                        unitPrice;


                    totalRefund += total;


                    validatedItems.push({
                        productId,
                        quantity: requestedQuantity,
                        unitPrice,
                        total,
                        productName: product.name
                    });
                }


                // =================================================
                // VALIDATE TOTAL REFUND
                // =================================================

                if (!Number.isFinite(totalRefund) ||
                    totalRefund <= 0
                ) {
                    throw new Error(
                        "Invalid refund amount"
                    );
                }


                // =================================================
                // GENERATE RETURN NUMBER
                // =================================================

                const returnNumber =
                    `RET-${Date.now()}-${Math.floor(
                        Math.random() * 1000
                    )}`;


                // =================================================
                // CREATE RETURN RECORD
                // =================================================

                const returnResult =
                    await transaction.execute({
                        sql: `
                            INSERT INTO returns (
                                return_number,
                                invoice_id,
                                customer_id,
                                total_refund,
                                refund_method,
                                reason
                            )
                            VALUES (?, ?, ?, ?, ?, ?)
                        `,
                        args: [
                            returnNumber,
                            invoiceId,
                            invoice.customer_id || null,
                            totalRefund,
                            selectedRefundMethod,
                            reason ?
                            String(reason).trim() :
                            null
                        ]
                    });


                const returnId =
                    Number(
                        returnResult.lastInsertRowid
                    );


                // =================================================
                // CUSTOMER LEDGER ADJUSTMENT
                // =================================================

                if (
                    invoice.customer_id &&
                    Number(invoice.due_amount) > 0
                ) {

                    const ledgerCredit =
                        Math.min(
                            totalRefund,
                            Number(invoice.due_amount)
                        );


                    if (ledgerCredit > 0) {

                        await transaction.execute({
                            sql: `
                                INSERT INTO customer_ledger (
                                    customer_id,
                                    invoice_id,
                                    transaction_type,
                                    amount,
                                    description
                                )
                                VALUES (?, ?, 'credit', ?, ?)
                            `,
                            args: [
                                invoice.customer_id,
                                invoiceId,
                                ledgerCredit,
                                `Return adjustment - ${returnNumber}`
                            ]
                        });
                    }
                }


                // =================================================
                // PROCESS RETURN ITEMS
                // =================================================

                for (const item of validatedItems) {

                    // ---------------------------------------------
                    // INSERT RETURN ITEM
                    // ---------------------------------------------

                    await transaction.execute({
                        sql: `
                            INSERT INTO return_items (
                                return_id,
                                product_id,
                                quantity,
                                unit_price,
                                total
                            )
                            VALUES (?, ?, ?, ?, ?)
                        `,
                        args: [
                            returnId,
                            item.productId,
                            item.quantity,
                            item.unitPrice,
                            item.total
                        ]
                    });


                    // ---------------------------------------------
                    // RESTORE STOCK
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
                            `Failed to restore stock for ${item.productName}`
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
                            VALUES (?, 'return', ?, ?, ?)
                        `,
                        args: [
                            item.productId,
                            item.quantity,
                            returnId,
                            `Customer return - ${returnNumber}`
                        ]
                    });
                }


                // =================================================
                // COMMIT TRANSACTION
                // =================================================

                await transaction.commit();


                returnData = {
                    returnId,
                    returnNumber,
                    invoiceId,
                    customerId: invoice.customer_id || null,
                    totalRefund,
                    refundMethod: selectedRefundMethod
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
                message: "Sale return created successfully",
                data: returnData
            });

        } catch (error) {

            console.error(
                "Create Sale Return Error:",
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
// GET ALL RETURNS
// ADMIN ONLY
// =====================================================

router.get(
    "/",
    authMiddleware,
    roleMiddleware("admin"),
    async(req, res) => {
        try {

            const result =
                await db.execute({
                    sql: `
                        SELECT
                            returns.*,
                            invoices.invoice_number,
                            customers.name AS customer_name

                        FROM returns

                        INNER JOIN invoices
                            ON returns.invoice_id =
                               invoices.id

                        LEFT JOIN customers
                            ON returns.customer_id =
                               customers.id

                        ORDER BY returns.id DESC
                    `,
                    args: []
                });


            res.json({
                success: true,
                data: result.rows
            });

        } catch (error) {

            console.error(
                "Get Returns Error:",
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
// GET SINGLE RETURN DETAILS
// ADMIN ONLY
// =====================================================

router.get(
    "/:id",
    authMiddleware,
    roleMiddleware("admin"),
    async(req, res) => {
        try {

            const returnId =
                Number(req.params.id);


            if (!Number.isInteger(returnId) ||
                returnId <= 0
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid return ID"
                });
            }


            // =================================================
            // GET RETURN
            // =================================================

            const returnResult =
                await db.execute({
                    sql: `
                        SELECT
                            returns.*,

                            invoices.invoice_number,
                            invoices.created_at AS invoice_date,

                            customers.name AS customer_name,
                            customers.phone AS customer_phone,
                            customers.address AS customer_address

                        FROM returns

                        INNER JOIN invoices
                            ON returns.invoice_id =
                               invoices.id

                        LEFT JOIN customers
                            ON returns.customer_id =
                               customers.id

                        WHERE returns.id = ?
                    `,
                    args: [returnId]
                });


            const returnRecord =
                returnResult.rows[0];


            if (!returnRecord) {
                return res.status(404).json({
                    success: false,
                    message: "Return not found"
                });
            }


            // =================================================
            // GET RETURN ITEMS
            // =================================================

            const itemsResult =
                await db.execute({
                    sql: `
                        SELECT
                            return_items.*,

                            products.name AS product_name,
                            products.barcode,
                            products.unit

                        FROM return_items

                        INNER JOIN products
                            ON return_items.product_id =
                               products.id

                        WHERE return_items.return_id = ?

                        ORDER BY return_items.id ASC
                    `,
                    args: [returnId]
                });


            res.json({
                success: true,
                data: {
                    return: returnRecord,
                    items: itemsResult.rows
                }
            });

        } catch (error) {

            console.error(
                "Get Return Details Error:",
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