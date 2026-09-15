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
    (req, res) => {
        try {

            // =====================================================
            // TODAY'S SALES
            // =====================================================

            const todaySales = db.prepare(`
            SELECT
                COALESCE(SUM(grand_total), 0) AS total
            FROM invoices
            WHERE DATE(created_at) = DATE('now', 'localtime')
        `).get();


            // =====================================================
            // TODAY'S INVOICES
            // =====================================================

            const todayInvoices = db.prepare(`
            SELECT
                COUNT(*) AS total
            FROM invoices
            WHERE DATE(created_at) = DATE('now', 'localtime')
        `).get();


            // =====================================================
            // MONTHLY SALES
            // =====================================================

            const monthSales = db.prepare(`
            SELECT
                COALESCE(SUM(grand_total), 0) AS total
            FROM invoices
            WHERE strftime('%Y-%m', created_at)
                = strftime('%Y-%m', 'now', 'localtime')
        `).get();


            // =====================================================
            // TOTAL PRODUCTS
            // =====================================================

            const products = db.prepare(`
            SELECT
                COUNT(*) AS total
            FROM products
        `).get();


            // =====================================================
            // LOW STOCK PRODUCTS
            // =====================================================

            const lowStock = db.prepare(`
            SELECT
                COUNT(*) AS total
            FROM products
            WHERE stock <= low_stock_limit
        `).get();


            // =====================================================
            // TOTAL CUSTOMERS
            // =====================================================

            const customers = db.prepare(`
            SELECT
                COUNT(*) AS total
            FROM customers
        `).get();


            // =====================================================
            // TOTAL SUPPLIERS
            // =====================================================

            const suppliers = db.prepare(`
            SELECT
                COUNT(*) AS total
            FROM suppliers
        `).get();


            // =====================================================
            // CUSTOMER TOTAL DUE
            // =====================================================

            const customerDue = db.prepare(`
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
        `).get();


            // =====================================================
            // SUPPLIER TOTAL PAYABLE
            // =====================================================

            const supplierPayable = db.prepare(`
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
        `).get();


            // =====================================================
            // TODAY'S EXPENSES
            // =====================================================

            const todayExpenses = db.prepare(`
            SELECT
                COALESCE(SUM(amount), 0) AS total
            FROM expenses
            WHERE expense_date = DATE('now', 'localtime')
        `).get();


            // =====================================================
            // TODAY'S GROSS PROFIT
            // =====================================================

            const todayProfit = db.prepare(`
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
        `).get();


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

                    supplier_payable: Number(supplierPayable.total || 0),

                    today_expenses: Number(todayExpenses.total || 0),

                    today_profit: Number(todayProfit.profit || 0),

                    today_net_profit: todayNetProfit
                }
            });

        } catch (error) {

            console.error("Dashboard Summary Error:", error);

            res.status(500).json({
                success: false,
                message: "Failed to load dashboard summary"
            });
        }
    });


// =====================================================
// EXPORT ROUTER
// =====================================================

module.exports = router;