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
    (req, res) => {
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

            const invoice = db.prepare(`
                SELECT *
                FROM invoices
                WHERE id = ?
            `).get(invoice_id);


            if (!invoice) {
                return res.status(404).json({
                    success: false,
                    message: "Invoice not found"
                });
            }


            // =================================================
            // DATABASE TRANSACTION
            // =================================================

            const transaction = db.transaction(() => {

                let totalRefund = 0;


                // =================================================
                // PREPARE STATEMENTS
                // =================================================

                const getInvoiceItem = db.prepare(`
                    SELECT *
                    FROM invoice_items
                    WHERE invoice_id = ?
                    AND product_id = ?
                `);


                const getReturnedQuantity = db.prepare(`
                    SELECT
                        COALESCE(
                            SUM(return_items.quantity),
                            0
                        ) AS returned_quantity

                    FROM return_items

                    INNER JOIN returns
                        ON return_items.return_id = returns.id

                    WHERE returns.invoice_id = ?
                    AND return_items.product_id = ?
                `);


                const getProduct = db.prepare(`
                    SELECT *
                    FROM products
                    WHERE id = ?
                `);


                // =================================================
                // VALIDATE ALL RETURN ITEMS
                // =================================================

                for (const item of items) {

                    if (!item.product_id) {
                        throw new Error(
                            "Product ID is required"
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

                    const invoiceItem =
                        getInvoiceItem.get(
                            invoice_id,
                            item.product_id
                        );


                    if (!invoiceItem) {
                        throw new Error(
                            `Product ${item.product_id} was not sold in this invoice`
                        );
                    }


                    // ---------------------------------------------
                    // CHECK ALREADY RETURNED QUANTITY
                    // ---------------------------------------------

                    const returnedData =
                        getReturnedQuantity.get(
                            invoice_id,
                            item.product_id
                        );


                    const alreadyReturned =
                        Number(
                            returnedData.returned_quantity || 0
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
                            `Return quantity exceeds remaining sold quantity for product ${item.product_id}`
                        );
                    }


                    // ---------------------------------------------
                    // CHECK PRODUCT EXISTS
                    // ---------------------------------------------

                    const product =
                        getProduct.get(
                            item.product_id
                        );


                    if (!product) {
                        throw new Error(
                            `Product ${item.product_id} not found`
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
                            `Invalid unit price for product ${item.product_id}`
                        );
                    }


                    totalRefund +=
                        requestedQuantity *
                        unitPrice;
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

                const returnResult = db.prepare(`
                    INSERT INTO returns (
                        return_number,
                        invoice_id,
                        customer_id,
                        total_refund,
                        refund_method,
                        reason
                    )
                    VALUES (?, ?, ?, ?, ?, ?)
                `).run(
                    returnNumber,
                    invoice_id,
                    invoice.customer_id || null,
                    totalRefund,
                    selectedRefundMethod,
                    reason ?
                    String(reason).trim() :
                    null
                );


                const returnId =
                    returnResult.lastInsertRowid;


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

                        db.prepare(`
                            INSERT INTO customer_ledger (
                                customer_id,
                                invoice_id,
                                transaction_type,
                                amount,
                                description
                            )
                            VALUES (?, ?, 'credit', ?, ?)
                        `).run(
                            invoice.customer_id,
                            invoice_id,
                            ledgerCredit,
                            `Return adjustment - ${returnNumber}`
                        );
                    }
                }


                // =================================================
                // PREPARE RETURN ITEM STATEMENT
                // =================================================

                const insertReturnItem = db.prepare(`
                    INSERT INTO return_items (
                        return_id,
                        product_id,
                        quantity,
                        unit_price,
                        total
                    )
                    VALUES (?, ?, ?, ?, ?)
                `);


                // =================================================
                // PREPARE STOCK UPDATE
                // =================================================

                const updateStock = db.prepare(`
                    UPDATE products
                    SET stock = stock + ?
                    WHERE id = ?
                `);


                // =================================================
                // PREPARE STOCK MOVEMENT
                // =================================================

                const insertMovement = db.prepare(`
                    INSERT INTO stock_movements (
                        product_id,
                        type,
                        quantity,
                        reference_id,
                        reason
                    )
                    VALUES (?, 'return', ?, ?, ?)
                `);


                // =================================================
                // PROCESS RETURN ITEMS
                // =================================================

                for (const item of items) {

                    const invoiceItem =
                        getInvoiceItem.get(
                            invoice_id,
                            item.product_id
                        );


                    const quantity =
                        Number(item.quantity);


                    const unitPrice =
                        Number(invoiceItem.unit_price);


                    const total =
                        quantity * unitPrice;


                    // ---------------------------------------------
                    // INSERT RETURN ITEM
                    // ---------------------------------------------

                    insertReturnItem.run(
                        returnId,
                        item.product_id,
                        quantity,
                        unitPrice,
                        total
                    );


                    // ---------------------------------------------
                    // RESTORE STOCK
                    // ---------------------------------------------

                    updateStock.run(
                        quantity,
                        item.product_id
                    );


                    // ---------------------------------------------
                    // STOCK MOVEMENT
                    // ---------------------------------------------

                    insertMovement.run(
                        item.product_id,
                        quantity,
                        returnId,
                        `Customer return - ${returnNumber}`
                    );
                }


                // =================================================
                // RETURN RESULT
                // =================================================

                return {
                    returnId,
                    returnNumber,
                    invoiceId: invoice_id,
                    customerId: invoice.customer_id || null,
                    totalRefund,
                    refundMethod: selectedRefundMethod
                };
            });


            // =================================================
            // EXECUTE TRANSACTION
            // =================================================

            const returnData =
                transaction();


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
    (req, res) => {
        try {

            const returns = db.prepare(`
                SELECT
                    returns.*,
                    invoices.invoice_number,
                    customers.name AS customer_name

                FROM returns

                INNER JOIN invoices
                    ON returns.invoice_id = invoices.id

                LEFT JOIN customers
                    ON returns.customer_id = customers.id

                ORDER BY returns.id DESC
            `).all();


            res.json({
                success: true,
                data: returns
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
    (req, res) => {
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


            const returnRecord = db.prepare(`
                SELECT
                    returns.*,

                    invoices.invoice_number,
                    invoices.created_at AS invoice_date,

                    customers.name AS customer_name,
                    customers.phone AS customer_phone,
                    customers.address AS customer_address

                FROM returns

                INNER JOIN invoices
                    ON returns.invoice_id = invoices.id

                LEFT JOIN customers
                    ON returns.customer_id = customers.id

                WHERE returns.id = ?
            `).get(returnId);


            if (!returnRecord) {
                return res.status(404).json({
                    success: false,
                    message: "Return not found"
                });
            }


            const items = db.prepare(`
                SELECT
                    return_items.*,

                    products.name AS product_name,
                    products.barcode,
                    products.unit

                FROM return_items

                INNER JOIN products
                    ON return_items.product_id = products.id

                WHERE return_items.return_id = ?

                ORDER BY return_items.id ASC
            `).all(returnId);


            res.json({
                success: true,
                data: {
                    return: returnRecord,
                    items
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