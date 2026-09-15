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
    (req, res) => {

        const transaction = db.transaction(() => {

            const {
                customer_id,
                discount = 0,
                paid_amount = 0,
                payment_method = "cash",
                items
            } = req.body;

            // ==========================================
            // VALIDATE ITEMS
            // ==========================================
            if (!items ||
                !Array.isArray(items) ||
                items.length === 0
            ) {
                throw new Error(
                    "Invoice must contain at least one product"
                );
            }

            // ==========================================
            // VALIDATE PAYMENT METHOD
            // ==========================================
            const allowedMethods = [
                "cash",
                "bank",
                "easypaisa",
                "jazzcash"
            ];

            const normalizedPaymentMethod =
                String(payment_method)
                .trim()
                .toLowerCase();

            if (!allowedMethods.includes(
                    normalizedPaymentMethod
                )) {
                throw new Error(
                    "Invalid payment method"
                );
            }

            // ==========================================
            // VALIDATE CUSTOMER
            // ==========================================
            let customerId = null;

            if (
                customer_id !== undefined &&
                customer_id !== null &&
                customer_id !== ""
            ) {
                customerId = Number(customer_id);

                if (!Number.isInteger(customerId) ||
                    customerId <= 0
                ) {
                    throw new Error(
                        "Invalid customer ID"
                    );
                }

                const customer = db.prepare(`
                    SELECT id
                    FROM customers
                    WHERE id = ?
                `).get(customerId);

                if (!customer) {
                    throw new Error(
                        "Customer not found"
                    );
                }
            }

            // ==========================================
            // GET PRODUCTS
            // ==========================================
            const getProduct = db.prepare(`
                SELECT *
                FROM products
                WHERE id = ?
            `);

            let subtotal = 0;

            // ==========================================
            // VALIDATE PRODUCTS
            // ==========================================
            for (const item of items) {

                const productId =
                    Number(item.product_id);

                const quantity =
                    Number(item.quantity);

                if (!Number.isInteger(productId) ||
                    productId <= 0
                ) {
                    throw new Error(
                        "Invalid product ID"
                    );
                }

                if (!Number.isFinite(quantity) ||
                    quantity <= 0
                ) {
                    throw new Error(
                        "Invalid product quantity"
                    );
                }

                const product =
                    getProduct.get(productId);

                if (!product) {
                    throw new Error(
                        `Product with ID ${productId} not found`
                    );
                }

                if (
                    Number(product.stock) <
                    quantity
                ) {
                    throw new Error(
                        `Insufficient stock for ${product.name}`
                    );
                }

                const salePrice =
                    Number(product.sale_price);

                if (!Number.isFinite(salePrice) ||
                    salePrice < 0
                ) {
                    throw new Error(
                        `Invalid sale price for ${product.name}`
                    );
                }

                subtotal +=
                    salePrice * quantity;
            }

            // ==========================================
            // DISCOUNT
            // ==========================================
            const finalDiscount =
                Number(discount);

            if (!Number.isFinite(finalDiscount) ||
                finalDiscount < 0
            ) {
                throw new Error(
                    "Discount must be a valid non-negative number"
                );
            }

            if (finalDiscount > subtotal) {
                throw new Error(
                    "Discount cannot be greater than subtotal"
                );
            }

            // ==========================================
            // GET DEFAULT TAX
            // ==========================================
            const settings = db.prepare(`
                SELECT default_tax
                FROM settings
                WHERE id = 1
            `).get();

            const taxRate = Number(
                settings ?
                settings.default_tax :
                0
            );

            if (!Number.isFinite(taxRate) ||
                taxRate < 0
            ) {
                throw new Error(
                    "Invalid tax rate"
                );
            }

            // ==========================================
            // CALCULATE TAX
            // ==========================================
            const taxableAmount =
                Math.max(
                    subtotal - finalDiscount,
                    0
                );

            const taxAmount =
                taxableAmount * taxRate / 100;

            const grandTotal =
                taxableAmount + taxAmount;

            // ==========================================
            // PAID AMOUNT
            // ==========================================
            const paid =
                Number(paid_amount);

            if (!Number.isFinite(paid) ||
                paid < 0
            ) {
                throw new Error(
                    "Paid amount must be a valid non-negative number"
                );
            }

            if (paid > grandTotal) {
                throw new Error(
                    "Paid amount cannot be greater than grand total"
                );
            }

            const dueAmount =
                grandTotal - paid;

            // ==========================================
            // CUSTOMER REQUIRED FOR CREDIT SALE
            // ==========================================
            if (
                dueAmount > 0 &&
                !customerId
            ) {
                throw new Error(
                    "Customer is required for a credit sale"
                );
            }

            // ==========================================
            // GENERATE INVOICE NUMBER
            // ==========================================
            const invoiceNumber =
                `INV-${Date.now()}-${Math.floor(
                    Math.random() * 1000
                )}`;

            // ==========================================
            // CREATE INVOICE
            // ==========================================
            const invoiceResult = db.prepare(`
                INSERT INTO invoices (
                    invoice_number,
                    customer_id,
                    subtotal,
                    discount,
                    tax_rate,
                    tax_amount,
                    grand_total,
                    paid_amount,
                    due_amount,
                    payment_method,
                    cashier_username
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
                invoiceNumber,
                customerId,
                subtotal,
                finalDiscount,
                taxRate,
                taxAmount,
                grandTotal,
                paid,
                dueAmount,
                normalizedPaymentMethod,
                req.user ? req.user.username || null : null
            );

            const invoiceId =
                invoiceResult.lastInsertRowid;

            // ==========================================
            // CUSTOMER LEDGER
            // ==========================================
            if (
                customerId &&
                dueAmount > 0
            ) {
                db.prepare(`
                    INSERT INTO customer_ledger (
                        customer_id,
                        invoice_id,
                        transaction_type,
                        amount,
                        description
                    )
                    VALUES (?, ?, 'debit', ?, ?)
                `).run(
                    customerId,
                    invoiceId,
                    dueAmount,
                    `Credit sale - ${invoiceNumber}`
                );
            }

            // ==========================================
            // INSERT INVOICE ITEM
            // ==========================================
            const insertItem = db.prepare(`
                INSERT INTO invoice_items (
                    invoice_id,
                    product_id,
                    quantity,
                    unit_price,
                    discount,
                    total
                )
                VALUES (?, ?, ?, ?, ?, ?)
            `);

            // ==========================================
            // REDUCE STOCK
            // ==========================================
            const updateStock = db.prepare(`
                UPDATE products
                SET stock = stock - ?
                WHERE id = ?
            `);

            // ==========================================
            // STOCK MOVEMENT
            // ==========================================
            const insertStockMovement = db.prepare(`
                INSERT INTO stock_movements (
                    product_id,
                    type,
                    quantity,
                    reference_id,
                    reason
                )
                VALUES (?, 'sale', ?, ?, ?)
            `);

            // ==========================================
            // PROCESS ITEMS
            // ==========================================
            for (const item of items) {

                const product =
                    getProduct.get(
                        Number(item.product_id)
                    );

                const quantity =
                    Number(item.quantity);

                const salePrice =
                    Number(product.sale_price);

                const total =
                    salePrice * quantity;

                // Invoice item
                insertItem.run(
                    invoiceId,
                    product.id,
                    quantity,
                    salePrice,
                    0,
                    total
                );

                // Reduce stock
                updateStock.run(
                    quantity,
                    product.id
                );

                // Stock movement
                insertStockMovement.run(
                    product.id,
                    quantity,
                    invoiceId,
                    `Sale - ${invoiceNumber}`
                );
            }

            // ==========================================
            // RETURN INVOICE DATA
            // ==========================================
            return {
                invoiceId,
                invoiceNumber,
                subtotal,
                discount: finalDiscount,
                taxableAmount,
                taxRate,
                taxAmount,
                grandTotal,
                paidAmount: paid,
                dueAmount,
                paymentMethod: normalizedPaymentMethod,
                cashierUsername: req.user ? req.user.username || null : null
            };
        });

        // ==========================================
        // EXECUTE TRANSACTION
        // ==========================================
        try {

            const invoice =
                transaction();

            res.status(201).json({
                success: true,
                message: "Invoice created successfully",
                data: invoice
            });

        } catch (error) {

            console.error(
                "Create invoice error:",
                error
            );

            res.status(400).json({
                success: false,
                message: error.message
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
    (req, res) => {

        try {

            const invoices = db.prepare(`
                SELECT
                    invoices.*,
                    customers.name AS customer_name
                FROM invoices
                LEFT JOIN customers
                    ON invoices.customer_id = customers.id
                ORDER BY invoices.id DESC
            `).all();

            res.json({
                success: true,
                data: invoices
            });

        } catch (error) {

            console.error(
                "Get invoices error:",
                error
            );

            res.status(500).json({
                success: false,
                message: "An unexpected error occurred. Please try again."
            });
        }
    }
);

// ==========================================
// GET SINGLE INVOICE WITH ITEMS
// ADMIN + MANAGER + CASHIER
// ==========================================
router.get(
    "/:id",
    authMiddleware,
    roleMiddleware("admin", "manager", "cashier"),
    (req, res) => {

        try {

            const invoiceId =
                Number(req.params.id);

            if (!Number.isInteger(invoiceId) ||
                invoiceId <= 0
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid invoice ID"
                });
            }

            const invoice = db.prepare(`
                SELECT
                    invoices.*,
                    customers.name AS customer_name,
                    customers.phone AS customer_phone,
                    customers.address AS customer_address
                FROM invoices
                LEFT JOIN customers
                    ON invoices.customer_id = customers.id
                WHERE invoices.id = ?
            `).get(invoiceId);

            if (!invoice) {
                return res.status(404).json({
                    success: false,
                    message: "Invoice not found"
                });
            }

            const items = db.prepare(`
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
            `).all(invoiceId);

            res.json({
                success: true,
                data: {
                    invoice,
                    items
                }
            });

        } catch (error) {

            console.error(
                "Get invoice error:",
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