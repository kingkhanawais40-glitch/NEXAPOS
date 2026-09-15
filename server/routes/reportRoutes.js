const express = require("express");
const router = express.Router();

const db = require("../database/db");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

// =====================================================
// TURSO HELPERS
// =====================================================

const queryOne = async(sql, args = []) => {
    const result = await db.execute({
        sql,
        args
    });

    return result.rows[0] || {};
};

const queryAll = async(sql, args = []) => {
    const result = await db.execute({
        sql,
        args
    });

    return result.rows;
};


// =====================================================
// DAILY SALES REPORT
// ADMIN + MANAGER + CASHIER
// =====================================================

router.get(
    "/daily-sales",
    authMiddleware,
    roleMiddleware("admin", "manager", "cashier"),
    async(req, res) => {
        try {
            const summary = await queryOne(`
                SELECT
                    COUNT(*) AS total_invoices,
                    COALESCE(SUM(subtotal), 0) AS subtotal,
                    COALESCE(SUM(discount), 0) AS total_discount,
                    COALESCE(SUM(grand_total), 0) AS total_sales,
                    COALESCE(SUM(paid_amount), 0) AS total_paid,
                    COALESCE(SUM(due_amount), 0) AS total_due
                FROM invoices
                WHERE DATE(created_at) = DATE('now', 'localtime')
            `);

            const paymentMethods = await queryAll(`
                SELECT
                    payment_method,
                    COUNT(*) AS invoice_count,
                    COALESCE(SUM(grand_total), 0) AS total
                FROM invoices
                WHERE DATE(created_at) = DATE('now', 'localtime')
                GROUP BY payment_method
                ORDER BY total DESC
            `);

            res.json({
                success: true,
                data: {
                    date: new Date().toISOString().split("T")[0],
                    summary: {
                        total_invoices: summary.total_invoices,
                        subtotal: summary.subtotal,
                        total_discount: summary.total_discount,
                        total_sales: summary.total_sales,
                        total_paid: summary.total_paid,
                        total_due: summary.total_due
                    },
                    payment_methods: paymentMethods
                }
            });
        } catch (error) {
            console.error("Daily Sales Report Error:", error);

            res.status(500).json({
                success: false,
                message: "An unexpected error occurred. Please try again."
            });
        }
    }
);


// =====================================================
// MONTHLY SALES REPORT
// ADMIN + MANAGER
// =====================================================

router.get(
    "/monthly-sales",
    authMiddleware,
    roleMiddleware("admin", "manager"),
    async(req, res) => {
        try {
            const report = await queryAll(`
                SELECT
                    strftime('%Y-%m', created_at) AS month,
                    COUNT(*) AS total_invoices,
                    COALESCE(SUM(subtotal), 0) AS subtotal,
                    COALESCE(SUM(discount), 0) AS total_discount,
                    COALESCE(SUM(grand_total), 0) AS total_sales,
                    COALESCE(SUM(paid_amount), 0) AS total_paid,
                    COALESCE(SUM(due_amount), 0) AS total_due
                FROM invoices
                GROUP BY strftime('%Y-%m', created_at)
                ORDER BY month DESC
            `);

            res.json({
                success: true,
                data: report
            });
        } catch (error) {
            console.error("Monthly Sales Report Error:", error);

            res.status(500).json({
                success: false,
                message: "An unexpected error occurred. Please try again."
            });
        }
    }
);


// =====================================================
// TOP SELLING PRODUCTS
// ADMIN + MANAGER + CASHIER
// =====================================================

router.get(
    "/top-products",
    authMiddleware,
    roleMiddleware("admin", "manager", "cashier"),
    async(req, res) => {
        try {
            const products = await queryAll(`
                SELECT
                    products.id,
                    products.name,
                    products.barcode,
                    products.unit,
                    COALESCE(SUM(invoice_items.quantity), 0)
                        AS total_quantity_sold,
                    COALESCE(SUM(invoice_items.total), 0)
                        AS total_sales
                FROM invoice_items
                INNER JOIN products
                    ON invoice_items.product_id = products.id
                GROUP BY
                    products.id,
                    products.name,
                    products.barcode,
                    products.unit
                ORDER BY total_quantity_sold DESC
            `);

            res.json({
                success: true,
                data: products
            });
        } catch (error) {
            console.error("Top Products Report Error:", error);

            res.status(500).json({
                success: false,
                message: "An unexpected error occurred. Please try again."
            });
        }
    }
);


// =====================================================
// ACCURATE PROFIT REPORT
// ADMIN ONLY
// =====================================================

router.get(
    "/profit",
    authMiddleware,
    roleMiddleware("admin"),
    async(req, res) => {
        try {
            const sales = await queryOne(`
                SELECT
                    COALESCE(
                        SUM(invoice_items.quantity * invoice_items.unit_price),
                        0
                    ) AS gross_sales,
                    COALESCE(
                        SUM(invoice_items.quantity * products.purchase_price),
                        0
                    ) AS gross_cost
                FROM invoice_items
                INNER JOIN products
                    ON invoice_items.product_id = products.id
            `);

            const discounts = await queryOne(`
                SELECT
                    COALESCE(SUM(discount), 0) AS total_discount
                FROM invoices
            `);

            const returns = await queryOne(`
                SELECT
                    COALESCE(SUM(return_items.total), 0)
                        AS return_sales,
                    COALESCE(
                        SUM(
                            return_items.quantity *
                            products.purchase_price
                        ),
                        0
                    ) AS return_cost
                FROM return_items
                INNER JOIN returns
                    ON return_items.return_id = returns.id
                INNER JOIN products
                    ON return_items.product_id = products.id
            `);

            const grossSales = Number(sales.gross_sales || 0);
            const grossCost = Number(sales.gross_cost || 0);
            const totalDiscount = Number(discounts.total_discount || 0);
            const returnSales = Number(returns.return_sales || 0);
            const returnCost = Number(returns.return_cost || 0);

            const netSales =
                grossSales -
                totalDiscount -
                returnSales;

            const netCost =
                grossCost -
                returnCost;

            const grossProfit =
                netSales -
                netCost;

            res.json({
                success: true,
                data: {
                    gross_sales: grossSales,
                    total_discount: totalDiscount,
                    return_sales: returnSales,
                    net_sales: netSales,
                    gross_cost: grossCost,
                    return_cost: returnCost,
                    net_cost: netCost,
                    gross_profit: grossProfit
                }
            });
        } catch (error) {
            console.error("Profit Report Error:", error);

            res.status(500).json({
                success: false,
                message: "An unexpected error occurred. Please try again."
            });
        }
    }
);


// =====================================================
// NET PROFIT REPORT
// ADMIN ONLY
// =====================================================

router.get(
    "/net-profit",
    authMiddleware,
    roleMiddleware("admin"),
    async(req, res) => {
        try {
            const profit = await queryOne(`
                SELECT
                    COALESCE(
                        SUM(invoice_items.quantity * invoice_items.unit_price),
                        0
                    ) AS gross_sales,
                    COALESCE(
                        SUM(invoice_items.quantity * products.purchase_price),
                        0
                    ) AS gross_cost
                FROM invoice_items
                INNER JOIN products
                    ON invoice_items.product_id = products.id
            `);

            const discounts = await queryOne(`
                SELECT
                    COALESCE(SUM(discount), 0) AS total_discount
                FROM invoices
            `);

            const returns = await queryOne(`
                SELECT
                    COALESCE(SUM(return_items.total), 0)
                        AS return_sales,
                    COALESCE(
                        SUM(
                            return_items.quantity *
                            products.purchase_price
                        ),
                        0
                    ) AS return_cost
                FROM return_items
                INNER JOIN returns
                    ON return_items.return_id = returns.id
                INNER JOIN products
                    ON return_items.product_id = products.id
            `);

            const expenses = await queryOne(`
                SELECT
                    COALESCE(SUM(amount), 0) AS total_expenses
                FROM expenses
            `);

            const salaries = await queryOne(`
                SELECT
                    COALESCE(SUM(amount), 0) AS total_salary
                FROM employee_salary_payments
            `);

            const grossSales = Number(profit.gross_sales || 0);
            const grossCost = Number(profit.gross_cost || 0);
            const totalDiscount = Number(discounts.total_discount || 0);
            const returnSales = Number(returns.return_sales || 0);
            const returnCost = Number(returns.return_cost || 0);
            const normalExpenses = Number(expenses.total_expenses || 0);
            const salaryExpenses = Number(salaries.total_salary || 0);

            const totalExpenses =
                normalExpenses +
                salaryExpenses;

            const netSales =
                grossSales -
                totalDiscount -
                returnSales;

            const netCost =
                grossCost -
                returnCost;

            const grossProfit =
                netSales -
                netCost;

            const netProfit =
                grossProfit -
                totalExpenses;

            res.json({
                success: true,
                data: {
                    net_sales: netSales,
                    net_cost: netCost,
                    gross_profit: grossProfit,
                    normal_expenses: normalExpenses,
                    salary_expenses: salaryExpenses,
                    total_expenses: totalExpenses,
                    net_profit: netProfit
                }
            });
        } catch (error) {
            console.error("Net Profit Report Error:", error);

            res.status(500).json({
                success: false,
                message: "An unexpected error occurred. Please try again."
            });
        }
    }
);


// =====================================================
// EXPENSE-WISE REPORT
// ADMIN ONLY
// =====================================================

router.get(
    "/expenses",
    authMiddleware,
    roleMiddleware("admin"),
    async(req, res) => {
        try {
            const summary = await queryAll(`
                SELECT
                    category,
                    COUNT(*) AS expense_count,
                    COALESCE(SUM(amount), 0) AS total_amount
                FROM expenses
                GROUP BY category
                ORDER BY total_amount DESC
            `);

            const total = await queryOne(`
                SELECT
                    COALESCE(SUM(amount), 0) AS total_expenses
                FROM expenses
            `);

            const salary = await queryOne(`
                SELECT
                    COUNT(*) AS payment_count,
                    COALESCE(SUM(amount), 0) AS total_salary
                FROM employee_salary_payments
            `);

            const normalExpenses =
                Number(total.total_expenses || 0);

            const salaryExpenses =
                Number(salary.total_salary || 0);

            const totalExpenses =
                normalExpenses +
                salaryExpenses;

            if (salaryExpenses > 0) {
                summary.push({
                    category: "Salary",
                    expense_count: Number(
                        salary.payment_count || 0
                    ),
                    total_amount: salaryExpenses
                });
            }

            res.json({
                success: true,
                data: {
                    total_expenses: totalExpenses,
                    normal_expenses: normalExpenses,
                    salary_expenses: salaryExpenses,
                    by_category: summary
                }
            });
        } catch (error) {
            console.error("Expense Report Error:", error);

            res.status(500).json({
                success: false,
                message: "An unexpected error occurred. Please try again."
            });
        }
    }
);


// =====================================================
// SALES BY PAYMENT METHOD
// ADMIN + MANAGER
// =====================================================

router.get(
    "/payment-methods",
    authMiddleware,
    roleMiddleware("admin", "manager"),
    async(req, res) => {
        try {
            const report = await queryAll(`
                SELECT
                    payment_method,
                    COUNT(*) AS invoice_count,
                    COALESCE(SUM(grand_total), 0) AS total_sales,
                    COALESCE(SUM(paid_amount), 0) AS total_paid,
                    COALESCE(SUM(due_amount), 0) AS total_due
                FROM invoices
                GROUP BY payment_method
                ORDER BY total_sales DESC
            `);

            const total = await queryOne(`
                SELECT
                    COUNT(*) AS total_invoices,
                    COALESCE(SUM(grand_total), 0) AS total_sales,
                    COALESCE(SUM(paid_amount), 0) AS total_paid,
                    COALESCE(SUM(due_amount), 0) AS total_due
                FROM invoices
            `);

            res.json({
                success: true,
                data: {
                    summary: {
                        total_invoices: total.total_invoices,
                        total_sales: total.total_sales,
                        total_paid: total.total_paid,
                        total_due: total.total_due
                    },
                    payment_methods: report
                }
            });
        } catch (error) {
            console.error("Payment Methods Report Error:", error);

            res.status(500).json({
                success: false,
                message: "An unexpected error occurred. Please try again."
            });
        }
    }
);


// =====================================================
// CUSTOMER DUE REPORT
// ADMIN + MANAGER
// =====================================================

router.get(
    "/customer-due",
    authMiddleware,
    roleMiddleware("admin", "manager"),
    async(req, res) => {
        try {
            const customers = await queryAll(`
                SELECT
                    customers.id,
                    customers.name,
                    customers.phone,
                    customers.opening_balance,

                    COALESCE(
                        SUM(
                            CASE
                                WHEN customer_ledger.transaction_type = 'debit'
                                THEN customer_ledger.amount
                                ELSE 0
                            END
                        ),
                        0
                    ) AS total_debit,

                    COALESCE(
                        SUM(
                            CASE
                                WHEN customer_ledger.transaction_type = 'credit'
                                THEN customer_ledger.amount
                                ELSE 0
                            END
                        ),
                        0
                    ) AS total_credit

                FROM customers

                LEFT JOIN customer_ledger
                    ON customer_ledger.customer_id = customers.id

                GROUP BY
                    customers.id,
                    customers.name,
                    customers.phone,
                    customers.opening_balance

                HAVING
                    customers.opening_balance +
                    COALESCE(
                        SUM(
                            CASE
                                WHEN customer_ledger.transaction_type = 'debit'
                                THEN customer_ledger.amount
                                WHEN customer_ledger.transaction_type = 'credit'
                                THEN -customer_ledger.amount
                                ELSE 0
                            END
                        ),
                        0
                    ) > 0

                ORDER BY
                    (
                        customers.opening_balance +
                        COALESCE(
                            SUM(
                                CASE
                                    WHEN customer_ledger.transaction_type = 'debit'
                                    THEN customer_ledger.amount
                                    WHEN customer_ledger.transaction_type = 'credit'
                                    THEN -customer_ledger.amount
                                    ELSE 0
                                END
                            ),
                            0
                        )
                    ) DESC
            `);

            const totalDue = customers.reduce(
                (total, customer) =>
                total +
                Number(customer.opening_balance || 0) +
                Number(customer.total_debit || 0) -
                Number(customer.total_credit || 0),
                0
            );

            res.json({
                success: true,
                data: {
                    total_customers_with_due: customers.length,
                    total_due: totalDue,
                    customers: customers.map(customer => ({
                        id: customer.id,
                        name: customer.name,
                        phone: customer.phone,
                        opening_balance: Number(
                            customer.opening_balance || 0
                        ),
                        total_debit: Number(
                            customer.total_debit || 0
                        ),
                        total_credit: Number(
                            customer.total_credit || 0
                        ),
                        current_due: Number(customer.opening_balance || 0) +
                            Number(customer.total_debit || 0) -
                            Number(customer.total_credit || 0)
                    }))
                }
            });
        } catch (error) {
            console.error("Customer Due Report Error:", error);

            res.status(500).json({
                success: false,
                message: "An unexpected error occurred. Please try again."
            });
        }
    }
);


// =====================================================
// SUPPLIER PAYABLE REPORT
// ADMIN + MANAGER
// =====================================================

router.get(
    "/supplier-payable",
    authMiddleware,
    roleMiddleware("admin", "manager"),
    async(req, res) => {
        try {
            const suppliers = await queryAll(`
                SELECT
                    suppliers.id,
                    suppliers.name,
                    suppliers.phone,
                    suppliers.opening_balance,

                    COALESCE(
                        SUM(
                            CASE
                                WHEN supplier_ledger.transaction_type = 'debit'
                                THEN supplier_ledger.amount
                                ELSE 0
                            END
                        ),
                        0
                    ) AS total_debit,

                    COALESCE(
                        SUM(
                            CASE
                                WHEN supplier_ledger.transaction_type = 'credit'
                                THEN supplier_ledger.amount
                                ELSE 0
                            END
                        ),
                        0
                    ) AS total_credit

                FROM suppliers

                LEFT JOIN supplier_ledger
                    ON supplier_ledger.supplier_id = suppliers.id

                GROUP BY
                    suppliers.id,
                    suppliers.name,
                    suppliers.phone,
                    suppliers.opening_balance

                HAVING
                    suppliers.opening_balance +
                    COALESCE(
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
                    ) > 0

                ORDER BY
                    (
                        suppliers.opening_balance +
                        COALESCE(
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
                        )
                    ) DESC
            `);

            const totalPayable = suppliers.reduce(
                (total, supplier) =>
                total +
                Number(supplier.opening_balance || 0) +
                Number(supplier.total_debit || 0) -
                Number(supplier.total_credit || 0),
                0
            );

            res.json({
                success: true,
                data: {
                    total_suppliers_with_payable: suppliers.length,
                    total_payable: totalPayable,
                    suppliers: suppliers.map(supplier => ({
                        id: supplier.id,
                        name: supplier.name,
                        phone: supplier.phone,
                        opening_balance: Number(
                            supplier.opening_balance || 0
                        ),
                        total_debit: Number(
                            supplier.total_debit || 0
                        ),
                        total_credit: Number(
                            supplier.total_credit || 0
                        ),
                        current_payable: Number(supplier.opening_balance || 0) +
                            Number(supplier.total_debit || 0) -
                            Number(supplier.total_credit || 0)
                    }))
                }
            });
        } catch (error) {
            console.error("Supplier Payable Report Error:", error);

            res.status(500).json({
                success: false,
                message: "An unexpected error occurred. Please try again."
            });
        }
    }
);


// =====================================================
// SALES RETURN REPORT
// ADMIN + MANAGER
// =====================================================

router.get(
    "/returns",
    authMiddleware,
    roleMiddleware("admin", "manager"),
    async(req, res) => {
        try {
            const summary = await queryOne(`
                SELECT
                    COUNT(*) AS total_returns,
                    COALESCE(SUM(total_refund), 0) AS total_refund
                FROM returns
            `);

            const refundMethods = await queryAll(`
                SELECT
                    refund_method,
                    COUNT(*) AS return_count,
                    COALESCE(SUM(total_refund), 0) AS total_refund
                FROM returns
                GROUP BY refund_method
                ORDER BY total_refund DESC
            `);

            const returnedProducts = await queryAll(`
                SELECT
                    products.id,
                    products.name,
                    products.barcode,
                    products.unit,
                    COALESCE(SUM(return_items.quantity), 0)
                        AS total_quantity_returned,
                    COALESCE(SUM(return_items.total), 0)
                        AS total_refund
                FROM return_items
                INNER JOIN products
                    ON return_items.product_id = products.id
                GROUP BY
                    products.id,
                    products.name,
                    products.barcode,
                    products.unit
                ORDER BY total_quantity_returned DESC
            `);

            res.json({
                success: true,
                data: {
                    summary: {
                        total_returns: summary.total_returns,
                        total_refund: summary.total_refund
                    },
                    refund_methods: refundMethods,
                    returned_products: returnedProducts
                }
            });
        } catch (error) {
            console.error("Sales Return Report Error:", error);

            res.status(500).json({
                success: false,
                message: "An unexpected error occurred. Please try again."
            });
        }
    }
);


// =====================================================
// LAST 7 DAYS SALES CHART
// ADMIN + MANAGER + CASHIER
// =====================================================

router.get(
    "/sales-chart",
    authMiddleware,
    roleMiddleware("admin", "manager", "cashier"),
    async(req, res) => {
        try {
            const report = await queryAll(`
                WITH RECURSIVE dates(date) AS (
                    SELECT DATE(
                        'now',
                        'localtime',
                        '-6 days'
                    )

                    UNION ALL

                    SELECT DATE(date, '+1 day')
                    FROM dates
                    WHERE date < DATE('now', 'localtime')
                )

                SELECT
                    dates.date AS sale_date,
                    COUNT(invoices.id) AS invoice_count,
                    COALESCE(
                        SUM(invoices.grand_total),
                        0
                    ) AS total_sales

                FROM dates

                LEFT JOIN invoices
                    ON DATE(invoices.created_at) = dates.date

                GROUP BY dates.date
                ORDER BY dates.date ASC
            `);

            res.json({
                success: true,
                data: report
            });
        } catch (error) {
            console.error("Sales Chart Report Error:", error);

            res.status(500).json({
                success: false,
                message: "An unexpected error occurred. Please try again."
            });
        }
    }
);


// =====================================================
// DAILY EXPENSE CHART
// ADMIN ONLY
// =====================================================

router.get(
    "/expense-chart",
    authMiddleware,
    roleMiddleware("admin"),
    async(req, res) => {
        try {
            const report = await queryAll(`
                WITH RECURSIVE dates(date) AS (
                    SELECT DATE(
                        'now',
                        'localtime',
                        '-6 days'
                    )

                    UNION ALL

                    SELECT DATE(date, '+1 day')
                    FROM dates
                    WHERE date < DATE('now', 'localtime')
                )

                SELECT
                    dates.date AS expense_date,
                    COUNT(expenses.id) AS expense_count,
                    COALESCE(
                        SUM(expenses.amount),
                        0
                    ) AS total_expenses

                FROM dates

                LEFT JOIN expenses
                    ON expenses.expense_date = dates.date

                GROUP BY dates.date
                ORDER BY dates.date ASC
            `);

            res.json({
                success: true,
                data: report
            });
        } catch (error) {
            console.error("Expense Chart Report Error:", error);

            res.status(500).json({
                success: false,
                message: "An unexpected error occurred. Please try again."
            });
        }
    }
);


// =====================================================
// PURCHASE REPORT
// ADMIN + MANAGER
// =====================================================

router.get(
    "/purchases",
    authMiddleware,
    roleMiddleware("admin", "manager"),
    async(req, res) => {
        try {
            const summary = await queryOne(`
                SELECT
                    COUNT(*) AS total_purchases,
                    COALESCE(SUM(total_amount), 0)
                        AS total_purchase_amount,
                    COALESCE(SUM(paid_amount), 0)
                        AS total_paid,
                    COALESCE(SUM(due_amount), 0)
                        AS total_due
                FROM purchases
            `);

            const suppliers = await queryAll(`
                SELECT
                    supplier_name,
                    COUNT(*) AS purchase_count,
                    COALESCE(SUM(total_amount), 0)
                        AS total_amount,
                    COALESCE(SUM(paid_amount), 0)
                        AS total_paid,
                    COALESCE(SUM(due_amount), 0)
                        AS total_due
                FROM purchases
                GROUP BY supplier_name
                ORDER BY total_amount DESC
            `);

            res.json({
                success: true,
                data: {
                    summary: {
                        total_purchases: summary.total_purchases,
                        total_purchase_amount: summary.total_purchase_amount,
                        total_paid: summary.total_paid,
                        total_due: summary.total_due
                    },
                    suppliers
                }
            });
        } catch (error) {
            console.error("Purchase Report Error:", error);

            res.status(500).json({
                success: false,
                message: "An unexpected error occurred. Please try again."
            });
        }
    }
);


// =====================================================
// STOCK VALUATION REPORT
// ADMIN + MANAGER
// =====================================================

router.get(
    "/stock-valuation",
    authMiddleware,
    roleMiddleware("admin", "manager"),
    async(req, res) => {
        try {
            const products = await queryAll(`
                SELECT
                    id,
                    name,
                    barcode,
                    unit,
                    stock,
                    purchase_price,
                    sale_price,
                    stock * purchase_price AS purchase_value,
                    stock * sale_price AS sale_value,
                    stock * (
                        sale_price - purchase_price
                    ) AS potential_profit
                FROM products
                ORDER BY purchase_value DESC
            `);

            const summary = await queryOne(`
                SELECT
                    COALESCE(SUM(stock), 0)
                        AS total_quantity,
                    COALESCE(
                        SUM(stock * purchase_price),
                        0
                    ) AS total_purchase_value,
                    COALESCE(
                        SUM(stock * sale_price),
                        0
                    ) AS total_sale_value
                FROM products
            `);

            const totalPotentialProfit =
                Number(summary.total_sale_value || 0) -
                Number(summary.total_purchase_value || 0);

            res.json({
                success: true,
                data: {
                    summary: {
                        total_quantity: summary.total_quantity,
                        total_purchase_value: summary.total_purchase_value,
                        total_sale_value: summary.total_sale_value,
                        potential_profit: totalPotentialProfit
                    },
                    products
                }
            });
        } catch (error) {
            console.error("Stock Valuation Report Error:", error);

            res.status(500).json({
                success: false,
                message: "An unexpected error occurred. Please try again."
            });
        }
    }
);


// =====================================================
// LOW STOCK REPORT
// ADMIN + MANAGER + CASHIER
// =====================================================

router.get(
    "/low-stock",
    authMiddleware,
    roleMiddleware("admin", "manager", "cashier"),
    async(req, res) => {
        try {
            const products = await queryAll(`
                SELECT
                    id,
                    name,
                    barcode,
                    unit,
                    stock,
                    low_stock_limit,
                    purchase_price,
                    sale_price,

                    low_stock_limit - stock
                        AS shortage_quantity,

                    CASE
                        WHEN low_stock_limit > stock
                        THEN (
                            low_stock_limit - stock
                        ) * purchase_price
                        ELSE 0
                    END AS estimated_restock_value

                FROM products

                WHERE stock <= low_stock_limit

                ORDER BY shortage_quantity DESC
            `);

            const summary = await queryOne(`
                SELECT
                    COUNT(*) AS total_low_stock,

                    COALESCE(
                        SUM(
                            CASE
                                WHEN low_stock_limit > stock
                                THEN low_stock_limit - stock
                                ELSE 0
                            END
                        ),
                        0
                    ) AS total_shortage,

                    COALESCE(
                        SUM(
                            CASE
                                WHEN low_stock_limit > stock
                                THEN (
                                    low_stock_limit - stock
                                ) * purchase_price
                                ELSE 0
                            END
                        ),
                        0
                    ) AS estimated_restock_value

                FROM products

                WHERE stock <= low_stock_limit
            `);

            res.json({
                success: true,
                data: {
                    summary: {
                        total_low_stock: summary.total_low_stock,
                        total_shortage: summary.total_shortage,
                        estimated_restock_value: summary.estimated_restock_value
                    },
                    products
                }
            });
        } catch (error) {
            console.error("Low Stock Report Error:", error);

            res.status(500).json({
                success: false,
                message: "An unexpected error occurred. Please try again."
            });
        }
    }
);


// =====================================================
// PURCHASE PRODUCT ANALYTICS
// ADMIN + MANAGER
// =====================================================

router.get(
    "/purchase-products",
    authMiddleware,
    roleMiddleware("admin", "manager"),
    async(req, res) => {
        try {
            const products = await queryAll(`
                SELECT
                    products.id,
                    products.name,
                    products.barcode,
                    products.unit,

                    COALESCE(
                        SUM(purchase_items.quantity),
                        0
                    ) AS total_quantity_purchased,

                    COALESCE(
                        SUM(purchase_items.total),
                        0
                    ) AS total_purchase_amount

                FROM purchase_items

                INNER JOIN products
                    ON purchase_items.product_id = products.id

                GROUP BY
                    products.id,
                    products.name,
                    products.barcode,
                    products.unit

                ORDER BY total_quantity_purchased DESC
            `);

            res.json({
                success: true,
                data: products
            });
        } catch (error) {
            console.error(
                "Purchase Product Analytics Error:",
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
// CASH FLOW REPORT
// ADMIN ONLY
// =====================================================

router.get(
    "/cash-flow",
    authMiddleware,
    roleMiddleware("admin"),
    async(req, res) => {
        try {
            const { from, to } = req.query;

            const startDate =
                from ||
                new Date().toISOString().split("T")[0];

            const endDate =
                to || startDate;

            const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

            if (!dateRegex.test(startDate) ||
                !dateRegex.test(endDate)
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Dates must use YYYY-MM-DD format"
                });
            }

            const salesCollected = await queryOne(`
                SELECT
                    COALESCE(SUM(paid_amount), 0) AS total
                FROM invoices
                WHERE DATE(created_at)
                    BETWEEN DATE(?) AND DATE(?)
            `, [startDate, endDate]);

            const supplierPayments = await queryOne(`
                SELECT
                    COALESCE(SUM(amount), 0) AS total
                FROM supplier_ledger
                WHERE transaction_type = 'credit'
                AND DATE(created_at)
                    BETWEEN DATE(?) AND DATE(?)
            `, [startDate, endDate]);

            const supplierPaymentsByPaymentMethod =
                await queryAll(`
                    SELECT
                        payment_method,
                        COALESCE(SUM(amount), 0) AS total
                    FROM supplier_ledger
                    WHERE transaction_type = 'credit'
                    AND DATE(created_at)
                        BETWEEN DATE(?) AND DATE(?)
                    GROUP BY payment_method
                `, [startDate, endDate]);

            const customerPaymentsByPaymentMethod =
                await queryAll(`
                    SELECT
                        payment_method,
                        COALESCE(SUM(amount), 0) AS total
                    FROM customer_ledger
                    WHERE transaction_type = 'credit'
                    AND invoice_id IS NULL
                    AND DATE(created_at)
                        BETWEEN DATE(?) AND DATE(?)
                    GROUP BY payment_method
                `, [startDate, endDate]);

            const expenses = await queryOne(`
                SELECT
                    COALESCE(SUM(amount), 0) AS total
                FROM expenses
                WHERE expense_date
                    BETWEEN DATE(?) AND DATE(?)
            `, [startDate, endDate]);

            const salaries = await queryOne(`
                SELECT
                    COALESCE(SUM(amount), 0) AS total
                FROM employee_salary_payments
                WHERE payment_date
                    BETWEEN DATE(?) AND DATE(?)
            `, [startDate, endDate]);

            const customerPayments = await queryOne(`
                SELECT
                    COALESCE(SUM(amount), 0) AS total
                FROM customer_ledger
                WHERE transaction_type = 'credit'
                AND invoice_id IS NULL
                AND DATE(created_at)
                    BETWEEN DATE(?) AND DATE(?)
            `, [startDate, endDate]);

            const refunds = await queryOne(`
                SELECT
                    COALESCE(SUM(total_refund), 0) AS total
                FROM returns
                WHERE DATE(created_at)
                    BETWEEN DATE(?) AND DATE(?)
            `, [startDate, endDate]);

            const salesByPaymentMethod =
                await queryAll(`
                    SELECT
                        payment_method,
                        COALESCE(SUM(paid_amount), 0) AS total
                    FROM invoices
                    WHERE DATE(created_at)
                        BETWEEN DATE(?) AND DATE(?)
                    GROUP BY payment_method
                `, [startDate, endDate]);

            const salaryByPaymentMethod =
                await queryAll(`
                    SELECT
                        payment_method,
                        COALESCE(SUM(amount), 0) AS total
                    FROM employee_salary_payments
                    WHERE payment_date
                        BETWEEN DATE(?) AND DATE(?)
                    GROUP BY payment_method
                `, [startDate, endDate]);

            const expenseByPaymentMethod =
                await queryAll(`
                    SELECT
                        payment_method,
                        COALESCE(SUM(amount), 0) AS total
                    FROM expenses
                    WHERE expense_date
                        BETWEEN DATE(?) AND DATE(?)
                    GROUP BY payment_method
                `, [startDate, endDate]);

            const salesCollectedAmount =
                Number(salesCollected.total || 0);

            const supplierPaymentsAmount =
                Number(supplierPayments.total || 0);

            const expensesAmount =
                Number(expenses.total || 0);

            const salaryPaymentsAmount =
                Number(salaries.total || 0);

            const refundsAmount =
                Number(refunds.total || 0);

            const customerPaymentsAmount =
                Number(customerPayments.total || 0);

            const totalInflow =
                salesCollectedAmount +
                customerPaymentsAmount;

            const totalOutflow =
                supplierPaymentsAmount +
                expensesAmount +
                salaryPaymentsAmount +
                refundsAmount;

            const netCashFlow =
                totalInflow -
                totalOutflow;

            res.json({
                success: true,
                data: {
                    date_range: {
                        from: startDate,
                        to: endDate
                    },

                    inflow: {
                        sales_collected: salesCollectedAmount,
                        customer_payments: customerPaymentsAmount,
                        total: totalInflow
                    },

                    outflow: {
                        supplier_payments: supplierPaymentsAmount,
                        expenses: expensesAmount,
                        salary_payments: salaryPaymentsAmount,
                        customer_refunds: refundsAmount,
                        total: totalOutflow
                    },

                    payment_methods: {
                        sales: salesByPaymentMethod,
                        customer_payments: customerPaymentsByPaymentMethod,
                        supplier_payments: supplierPaymentsByPaymentMethod,
                        salaries: salaryByPaymentMethod,
                        expenses: expenseByPaymentMethod
                    },

                    summary: {
                        total_inflow: totalInflow,
                        total_outflow: totalOutflow,
                        net_cash_flow: netCashFlow
                    }
                }
            });
        } catch (error) {
            console.error("Cash Flow Report Error:", error);

            res.status(500).json({
                success: false,
                message: "An unexpected error occurred. Please try again."
            });
        }
    }
);


// =====================================================
// DAILY CLOSING REPORT
// ADMIN ONLY
// =====================================================

router.get(
    "/daily-closing",
    authMiddleware,
    roleMiddleware("admin"),
    async(req, res) => {
        try {
            const requestedDate = req.query.date;

            const closingDate =
                requestedDate ||
                new Date().toISOString().split("T")[0];

            if (!/^\d{4}-\d{2}-\d{2}$/.test(closingDate)) {
                return res.status(400).json({
                    success: false,
                    message: "Date must use YYYY-MM-DD format"
                });
            }

            const cashSales = await queryOne(`
                SELECT
                    COALESCE(SUM(paid_amount), 0) AS total
                FROM invoices
                WHERE DATE(created_at) = DATE(?)
                AND payment_method = 'cash'
            `, [closingDate]);

            const customerPayments = await queryOne(`
                SELECT
                    COALESCE(SUM(amount), 0) AS total
                FROM customer_ledger
                WHERE transaction_type = 'credit'
                AND invoice_id IS NULL
                AND DATE(created_at) = DATE(?)
            `, [closingDate]);

            const supplierPayments = await queryOne(`
                SELECT
                    COALESCE(SUM(amount), 0) AS total
                FROM supplier_ledger
                WHERE transaction_type = 'credit'
                AND DATE(created_at) = DATE(?)
            `, [closingDate]);

            const expenses = await queryOne(`
                SELECT
                    COALESCE(SUM(amount), 0) AS total
                FROM expenses
                WHERE expense_date = DATE(?)
                AND payment_method = 'cash'
            `, [closingDate]);

            const refunds = await queryOne(`
                SELECT
                    COALESCE(SUM(total_refund), 0) AS total
                FROM returns
                WHERE DATE(created_at) = DATE(?)
                AND refund_method = 'cash'
            `, [closingDate]);

            const salaryPayments = await queryOne(`
                SELECT
                    COALESCE(SUM(amount), 0) AS total
                FROM employee_salary_payments
                WHERE payment_date = DATE(?)
                AND payment_method = 'cash'
            `, [closingDate]);

            const sales = await queryOne(`
                SELECT
                    COUNT(*) AS total_invoices,
                    COALESCE(SUM(grand_total), 0) AS total_sales,
                    COALESCE(SUM(paid_amount), 0) AS total_paid,
                    COALESCE(SUM(due_amount), 0) AS total_due
                FROM invoices
                WHERE DATE(created_at) = DATE(?)
            `, [closingDate]);

            const cashInflow =
                Number(cashSales.total || 0) +
                Number(customerPayments.total || 0);

            const cashOutflow =
                Number(supplierPayments.total || 0) +
                Number(expenses.total || 0) +
                Number(refunds.total || 0) +
                Number(salaryPayments.total || 0);

            const netCashMovement =
                cashInflow -
                cashOutflow;

            res.json({
                success: true,
                data: {
                    date: closingDate,

                    sales: {
                        total_invoices: sales.total_invoices,
                        total_sales: sales.total_sales,
                        total_paid: sales.total_paid,
                        total_due: sales.total_due
                    },

                    cash_inflow: {
                        cash_sales: Number(cashSales.total || 0),
                        customer_payments: Number(customerPayments.total || 0),
                        total: cashInflow
                    },

                    cash_outflow: {
                        supplier_payments: Number(supplierPayments.total || 0),
                        cash_expenses: Number(expenses.total || 0),
                        cash_refunds: Number(refunds.total || 0),
                        salary_payments: Number(salaryPayments.total || 0),
                        total: cashOutflow
                    },

                    closing: {
                        net_cash_movement: netCashMovement
                    }
                }
            });
        } catch (error) {
            console.error(
                "Daily Closing Report Error:",
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
// UNIFIED REPORTS SUMMARY
// ADMIN ONLY
// =====================================================

router.get(
    "/summary",
    authMiddleware,
    roleMiddleware("admin"),
    async(req, res) => {
        try {
            const today =
                new Date().toISOString().split("T")[0];

            const from =
                req.query.from || today;

            const to =
                req.query.to || today;

            const dateRegex =
                /^\d{4}-\d{2}-\d{2}$/;

            if (!dateRegex.test(from) ||
                !dateRegex.test(to)
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Dates must use YYYY-MM-DD format"
                });
            }

            const salesRow = await queryOne(`
                SELECT
                    COUNT(*) AS total_invoices,
                    COALESCE(SUM(grand_total), 0)
                        AS total_sales
                FROM invoices
                WHERE DATE(created_at)
                    BETWEEN DATE(?) AND DATE(?)
            `, [from, to]);

            const totalInvoices =
                Number(salesRow.total_invoices || 0);

            const totalSales =
                Number(salesRow.total_sales || 0);

            const averageInvoiceValue =
                totalInvoices > 0 ?
                totalSales / totalInvoices :
                0;

            const paymentMethodsRaw =
                await queryAll(`
                    SELECT
                        payment_method,
                        COUNT(*) AS total_transactions,
                        COALESCE(
                            SUM(grand_total),
                            0
                        ) AS total_amount
                    FROM invoices
                    WHERE DATE(created_at)
                        BETWEEN DATE(?) AND DATE(?)
                    GROUP BY payment_method
                    ORDER BY total_amount DESC
                `, [from, to]);

            const costRow = await queryOne(`
                SELECT
                    COALESCE(
                        SUM(
                            invoice_items.quantity *
                            products.purchase_price
                        ),
                        0
                    ) AS cost_of_goods
                FROM invoice_items
                INNER JOIN invoices
                    ON invoice_items.invoice_id = invoices.id
                INNER JOIN products
                    ON invoice_items.product_id = products.id
                WHERE DATE(invoices.created_at)
                    BETWEEN DATE(?) AND DATE(?)
            `, [from, to]);

            const costOfGoods =
                Number(costRow.cost_of_goods || 0);

            const grossProfit =
                totalSales -
                costOfGoods;

            const expensesTotalRow =
                await queryOne(`
                    SELECT
                        COALESCE(
                            SUM(amount),
                            0
                        ) AS total_expenses
                    FROM expenses
                    WHERE expense_date
                        BETWEEN DATE(?) AND DATE(?)
                `, [from, to]);

            const totalExpenses =
                Number(
                    expensesTotalRow.total_expenses || 0
                );

            const expensesByCategory =
                await queryAll(`
                    SELECT
                        category,
                        COALESCE(SUM(amount), 0)
                            AS total
                    FROM expenses
                    WHERE expense_date
                        BETWEEN DATE(?) AND DATE(?)
                    GROUP BY category
                    ORDER BY total DESC
                `, [from, to]);

            const expensesByPaymentMethod =
                await queryAll(`
                    SELECT
                        payment_method,
                        COALESCE(SUM(amount), 0)
                            AS total
                    FROM expenses
                    WHERE expense_date
                        BETWEEN DATE(?) AND DATE(?)
                    GROUP BY payment_method
                    ORDER BY total DESC
                `, [from, to]);

            const netProfit =
                grossProfit -
                totalExpenses;

            const customerWise =
                await queryAll(`
                    SELECT
                        customers.id,
                        customers.name,

                        customers.opening_balance +

                        COALESCE(
                            SUM(
                                CASE
                                    WHEN customer_ledger.transaction_type =
                                        'debit'
                                    THEN customer_ledger.amount
                                    ELSE 0
                                END
                            ),
                            0
                        ) -

                        COALESCE(
                            SUM(
                                CASE
                                    WHEN customer_ledger.transaction_type =
                                        'credit'
                                    THEN customer_ledger.amount
                                    ELSE 0
                                END
                            ),
                            0
                        ) AS due

                    FROM customers

                    LEFT JOIN customer_ledger
                        ON customer_ledger.customer_id =
                           customers.id

                    GROUP BY
                        customers.id,
                        customers.name,
                        customers.opening_balance

                    HAVING due > 0

                    ORDER BY due DESC
                `);

            const totalCustomerDue =
                customerWise.reduce(
                    (sum, row) =>
                    sum + Number(row.due || 0),
                    0
                );

            const supplierWise =
                await queryAll(`
                    SELECT
                        suppliers.id,
                        suppliers.name,

                        suppliers.opening_balance +

                        COALESCE(
                            SUM(
                                CASE
                                    WHEN supplier_ledger.transaction_type =
                                        'debit'
                                    THEN supplier_ledger.amount
                                    ELSE 0
                                END
                            ),
                            0
                        ) -

                        COALESCE(
                            SUM(
                                CASE
                                    WHEN supplier_ledger.transaction_type =
                                        'credit'
                                    THEN supplier_ledger.amount
                                    ELSE 0
                                END
                            ),
                            0
                        ) AS payable

                    FROM suppliers

                    LEFT JOIN supplier_ledger
                        ON supplier_ledger.supplier_id =
                           suppliers.id

                    GROUP BY
                        suppliers.id,
                        suppliers.name,
                        suppliers.opening_balance

                    HAVING payable > 0

                    ORDER BY payable DESC
                `);

            const totalSupplierPayable =
                supplierWise.reduce(
                    (sum, row) =>
                    sum + Number(row.payable || 0),
                    0
                );

            const stockSummary =
                await queryOne(`
                    SELECT
                        COALESCE(
                            SUM(stock * purchase_price),
                            0
                        ) AS total_value
                    FROM products
                `);

            const lowStock =
                await queryAll(`
                    SELECT
                        id,
                        name,
                        stock,
                        low_stock_limit
                    FROM products
                    WHERE stock > 0
                    AND stock <= low_stock_limit
                    ORDER BY stock ASC
                `);

            const outOfStock =
                await queryAll(`
                    SELECT
                        id,
                        name,
                        stock
                    FROM products
                    WHERE stock <= 0
                `);

            res.json({
                success: true,

                data: {
                    range: {
                        from,
                        to
                    },

                    sales: {
                        total_sales: totalSales,
                        total_invoices: totalInvoices,
                        average_invoice_value: averageInvoiceValue
                    },

                    profit: {
                        sales: totalSales,
                        cost_of_goods: costOfGoods,
                        gross_profit: grossProfit,
                        expenses: totalExpenses,
                        net_profit: netProfit
                    },

                    expenses: {
                        total_expenses: totalExpenses,
                        by_category: expensesByCategory,
                        by_payment_method: expensesByPaymentMethod
                    },

                    customers: {
                        total_due: totalCustomerDue,
                        customer_wise: customerWise
                    },

                    suppliers: {
                        total_payable: totalSupplierPayable,
                        supplier_wise: supplierWise
                    },

                    inventory: {
                        stock_valuation: Number(
                            stockSummary.total_value || 0
                        ),
                        low_stock_count: lowStock.length,
                        out_of_stock_count: outOfStock.length,
                        low_stock: lowStock,
                        out_of_stock: outOfStock
                    },

                    payment_methods: paymentMethodsRaw
                }
            });
        } catch (error) {
            console.error(
                "Reports Summary Error:",
                error
            );

            res.status(500).json({
                success: false,
                message: "Failed to load reports summary"
            });
        }
    }
);


// =====================================================
// EXPORT ROUTER
// =====================================================

module.exports = router;