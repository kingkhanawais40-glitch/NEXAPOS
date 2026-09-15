const express = require("express");
const router = express.Router();

const db = require("../database/db");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

// =====================================================
// DASHBOARD SUMMARY
// =====================================================

router.get(
    "/summary",
    authMiddleware,
    roleMiddleware("admin", "manager"),
    async(req, res) => {
        try {

            // =====================================================
            // TODAY'S SALES
            // =====================================================

            const todaySalesResult = await db.execute(`
                SELECT
                    COALESCE(SUM(grand_total), 0) AS total
                FROM invoices
                WHERE DATE(created_at) = DATE('now', 'localtime')
            `);

            const todaySales = todaySalesResult.rows[0] || {};


            // =====================================================
            // TODAY'S INVOICES
            // =====================================================

            const todayInvoicesResult = await db.execute(`
                SELECT
                    COUNT(*) AS total
                FROM invoices
                WHERE DATE(created_at) = DATE('now', 'localtime')
            `);

            const todayInvoices = todayInvoicesResult.rows[0] || {};


            // =====================================================
            // MONTHLY SALES
            // =====================================================

            const monthSalesResult = await db.execute(`
                SELECT
                    COALESCE(SUM(grand_total), 0) AS total
                FROM invoices
                WHERE strftime('%Y-%m', created_at)
                    = strftime('%Y-%m', 'now', 'localtime')
            `);

            const monthSales = monthSalesResult.rows[0] || {};


            // =====================================================
            // TOTAL PRODUCTS
            // =====================================================

            const productsResult = await db.execute(`
                SELECT
                    COUNT(*) AS total
                FROM products
            `);

            const products = productsResult.rows[0] || {};


            // =====================================================
            // LOW STOCK PRODUCTS
            // =====================================================

            const lowStockResult = await db.execute(`
                SELECT
                    COUNT(*) AS total
                FROM products
                WHERE stock <= low_stock_limit
            `);

            const lowStock = lowStockResult.rows[0] || {};


            // =====================================================
            // TOTAL CUSTOMERS
            // =====================================================

            const customersResult = await db.execute(`
                SELECT
                    COUNT(*) AS total
                FROM customers
            `);

            const customers = customersResult.rows[0] || {};


            // =====================================================
            // TOTAL SUPPLIERS
            // =====================================================

            const suppliersResult = await db.execute(`
                SELECT
                    COUNT(*) AS total
                FROM suppliers
            `);

            const suppliers = suppliersResult.rows[0] || {};


            // =====================================================
            // CUSTOMER TOTAL DUE
            // =====================================================

            const customerDueResult = await db.execute(`
                SELECT
                    COALESCE(
                        (
                            SELECT SUM(opening_balance)
                            FROM customers
                        ),
                        0
                    )
                    +
                    COALESCE(
                        (
                            SELECT SUM(
                                CASE
                                    WHEN transaction_type = 'debit'
                                    THEN amount
                                    ELSE -amount
                                END
                            )
                            FROM customer_ledger
                        ),
                        0
                    ) AS total
            `);

            const customerDue = customerDueResult.rows[0] || {};


            // =====================================================
            // SUPPLIER TOTAL PAYABLE
            // =====================================================

            const supplierPayableResult = await db.execute(`
                SELECT
                    COALESCE(
                        SUM(
                            CASE
                                WHEN balance > 0
                                THEN balance
                                ELSE 0
                            END
                        ),
                        0
                    ) AS total
                FROM (
                    SELECT
                        suppliers.id,
                        suppliers.opening_balance
                        + COALESCE(
                            SUM(
                                CASE
                                    WHEN supplier_ledger.transaction_type = 'debit'
                                    THEN supplier_ledger.amount

                                    WHEN supplier_ledger.transaction_type = 'credit'
                                    THEN -supplier_ledger.amount

                                    ELSE 0
                                END
                            ),
                            0
                        ) AS balance

                    FROM suppliers

                    LEFT JOIN supplier_ledger
                        ON supplier_ledger.supplier_id = suppliers.id

                    GROUP BY
                        suppliers.id,
                        suppliers.opening_balance
                ) AS supplier_balances
            `);

            const supplierPayable =
                supplierPayableResult.rows[0] || {};


            // =====================================================
            // TODAY'S EXPENSES
            // =====================================================

            const todayExpensesResult = await db.execute(`
                SELECT
                    COALESCE(SUM(amount), 0) AS total
                FROM expenses
                WHERE expense_date = DATE('now', 'localtime')
            `);

            const todayExpenses = todayExpensesResult.rows[0] || {};


            // =====================================================
            // TODAY'S GROSS PROFIT
            // =====================================================

            const todayProfitResult = await db.execute(`
                SELECT
                    COALESCE(
                        SUM(
                            invoice_items.quantity *
                            (
                                invoice_items.unit_price -
                                products.purchase_price
                            )
                        ),
                        0
                    ) AS profit
                FROM invoice_items

                INNER JOIN invoices
                    ON invoice_items.invoice_id = invoices.id

                INNER JOIN products
                    ON invoice_items.product_id = products.id

                WHERE DATE(invoices.created_at)
                    = DATE('now', 'localtime')
            `);

            const todayProfit = todayProfitResult.rows[0] || {};


            // =====================================================
            // TODAY'S NET PROFIT
            // =====================================================

            const todayNetProfit =
                Number(todayProfit.profit || 0) -
                Number(todayExpenses.total || 0);


            // =====================================================
            // DASHBOARD RESPONSE
            // =====================================================

            res.json({
                success: true,

                data: {
                    today_sales: Number(todaySales.total || 0),

                    today_invoices: Number(todayInvoices.total || 0),

                    month_sales: Number(monthSales.total || 0),

                    total_products: Number(products.total || 0),

                    low_stock_products: Number(lowStock.total || 0),

                    total_customers: Number(customers.total || 0),

                    total_suppliers: Number(suppliers.total || 0),

                    customer_due: Number(customerDue.total || 0),

                    supplier_payable: Number(
                        supplierPayable.total || 0
                    ),

                    today_expenses: Number(
                        todayExpenses.total || 0
                    ),

                    today_profit: Number(
                        todayProfit.profit || 0
                    ),

                    today_net_profit: todayNetProfit
                }
            });

        } catch (error) {

            console.error(
                "Dashboard Summary Error:",
                error
            );

            res.status(500).json({
                success: false,
                message: "Failed to load dashboard summary"
            });
        }
    }
);


// =====================================================
// EXPORT ROUTER
// =====================================================

module.exports = router;