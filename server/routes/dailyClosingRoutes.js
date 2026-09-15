const express = require("express");
const router = express.Router();

const db = require("../database/db");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

// ==========================================
// COMPUTE LIVE CASH FIGURES FOR A GIVEN DATE
// ==========================================
async function computeDailyFigures(closingDate) {

    // Sales broken down by payment method
    const salesResult = await db.execute({
        sql: `
            SELECT
                payment_method,
                COALESCE(SUM(paid_amount), 0) AS total
            FROM invoices
            WHERE DATE(created_at) = DATE(?)
            GROUP BY payment_method
        `,
        args: [closingDate]
    });

    const salesByMethod = salesResult.rows;

    const salesTotals = {
        cash: 0,
        bank: 0,
        easypaisa: 0,
        jazzcash: 0
    };

    salesByMethod.forEach((row) => {
        if (salesTotals[row.payment_method] !== undefined) {
            salesTotals[row.payment_method] =
                Number(row.total || 0);
        }
    });

    // Customer cash payments received today
    const customerCashPaymentsResult = await db.execute({
        sql: `
            SELECT COALESCE(SUM(amount), 0) AS total
            FROM customer_ledger
            WHERE transaction_type = 'credit'
              AND invoice_id IS NULL
              AND payment_method = 'cash'
              AND DATE(created_at) = DATE(?)
        `,
        args: [closingDate]
    });

    const customerCashPayments =
        customerCashPaymentsResult.rows[0] || {};


    // Cash expenses today
    const cashExpensesResult = await db.execute({
        sql: `
            SELECT COALESCE(SUM(amount), 0) AS total
            FROM expenses
            WHERE expense_date = DATE(?)
              AND payment_method = 'cash'
        `,
        args: [closingDate]
    });

    const cashExpenses =
        cashExpensesResult.rows[0] || {};


    // Supplier cash payments today
    const supplierCashPaymentsResult = await db.execute({
        sql: `
            SELECT COALESCE(SUM(amount), 0) AS total
            FROM supplier_ledger
            WHERE transaction_type = 'credit'
              AND payment_method = 'cash'
              AND DATE(created_at) = DATE(?)
        `,
        args: [closingDate]
    });

    const supplierCashPayments =
        supplierCashPaymentsResult.rows[0] || {};


    return {
        cash_sales: salesTotals.cash,
        bank_sales: salesTotals.bank,
        easypaisa_sales: salesTotals.easypaisa,
        jazzcash_sales: salesTotals.jazzcash,

        customer_cash_payments: Number(customerCashPayments.total || 0),

        cash_expenses: Number(cashExpenses.total || 0),

        supplier_cash_payments: Number(supplierCashPayments.total || 0)
    };
}


// ==========================================
// VALIDATE DATE
// ==========================================
function isValidDate(dateString) {

    if (typeof dateString !== "string") {
        return false;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        return false;
    }

    const [year, month, day] =
    dateString.split("-").map(Number);

    const date =
        new Date(Date.UTC(year, month - 1, day));

    return (
        date.getUTCFullYear() === year &&
        date.getUTCMonth() === month - 1 &&
        date.getUTCDate() === day
    );
}


// ==========================================
// GET LIVE SUMMARY
// ==========================================
router.get(
    "/summary",
    authMiddleware,
    roleMiddleware("admin"),
    async(req, res) => {

        try {

            const closingDate =
                req.query.date ||
                new Date().toISOString().split("T")[0];


            if (!isValidDate(closingDate)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid date. Use YYYY-MM-DD format"
                });
            }


            const figures =
                await computeDailyFigures(closingDate);


            // Previous actual closing cash
            const previousClosingResult =
                await db.execute({
                    sql: `
                        SELECT actual_cash
                        FROM daily_closings
                        WHERE closing_date < ?
                        ORDER BY closing_date DESC
                        LIMIT 1
                    `,
                    args: [closingDate]
                });

            const previousClosing =
                previousClosingResult.rows[0] || null;


            const suggestedOpeningCash =
                previousClosing ?
                Number(previousClosing.actual_cash || 0) :
                0;


            const existingResult =
                await db.execute({
                    sql: `
                        SELECT *
                        FROM daily_closings
                        WHERE closing_date = ?
                    `,
                    args: [closingDate]
                });

            const existing =
                existingResult.rows[0] || null;


            res.json({
                success: true,

                data: {
                    date: closingDate,

                    ...figures,

                    suggested_opening_cash: suggestedOpeningCash,

                    already_closed:
                        !!existing,

                    existing_closing: existing || null
                }
            });

        } catch (error) {

            console.error(
                "Daily closing summary error:",
                error
            );

            res.status(500).json({
                success: false,
                message: "Failed to load daily closing summary"
            });
        }
    }
);


// ==========================================
// SAVE / FINALIZE DAILY CLOSING
// ==========================================
router.post(
    "/",
    authMiddleware,
    roleMiddleware("admin"),
    async(req, res) => {

        try {

            const {
                date,
                opening_cash = 0,
                actual_cash,
                notes = "",
                reopen = false
            } = req.body;


            const closingDate =
                date ||
                new Date().toISOString().split("T")[0];


            // Validate date
            if (!isValidDate(closingDate)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid date. Use YYYY-MM-DD format"
                });
            }


            // Validate opening cash
            const openingCashNumber =
                Number(opening_cash);

            if (!Number.isFinite(openingCashNumber) ||
                openingCashNumber < 0
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Opening cash must be a valid non-negative number"
                });
            }


            // Validate actual cash
            if (
                actual_cash === undefined ||
                actual_cash === null ||
                actual_cash === ""
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Actual cash counted is required"
                });
            }


            const actualCashNumber =
                Number(actual_cash);

            if (!Number.isFinite(actualCashNumber) ||
                actualCashNumber < 0
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Actual cash must be a valid non-negative number"
                });
            }


            // Validate notes
            const cleanNotes =
                typeof notes === "string" ?
                notes.trim() :
                "";


            // Check existing closing
            const existingResult =
                await db.execute({
                    sql: `
                        SELECT *
                        FROM daily_closings
                        WHERE closing_date = ?
                    `,
                    args: [closingDate]
                });

            const existing =
                existingResult.rows[0] || null;


            if (existing && !reopen) {
                return res.status(400).json({
                    success: false,
                    message: `Daily closing for ${closingDate} already exists. ` +
                        `Reopen it explicitly to edit.`
                });
            }


            const figures =
                await computeDailyFigures(closingDate);


            // ==========================================
            // EXPECTED CASH
            // ==========================================
            const expectedCash =
                openingCashNumber +
                figures.cash_sales +
                figures.customer_cash_payments -
                figures.cash_expenses -
                figures.supplier_cash_payments;


            const difference =
                actualCashNumber - expectedCash;


            // ==========================================
            // SAVE TRANSACTION
            // ==========================================
            const transaction =
                await db.transaction("write");

            try {

                if (existing) {

                    await transaction.execute({
                        sql: `
                            UPDATE daily_closings
                            SET
                                opening_cash = ?,
                                cash_sales = ?,
                                bank_sales = ?,
                                easypaisa_sales = ?,
                                jazzcash_sales = ?,
                                customer_cash_payments = ?,
                                cash_expenses = ?,
                                supplier_cash_payments = ?,
                                expected_cash = ?,
                                actual_cash = ?,
                                difference = ?,
                                notes = ?,
                                closed_by = ?,
                                updated_at = CURRENT_TIMESTAMP
                            WHERE closing_date = ?
                        `,
                        args: [
                            openingCashNumber,
                            figures.cash_sales,
                            figures.bank_sales,
                            figures.easypaisa_sales,
                            figures.jazzcash_sales,
                            figures.customer_cash_payments,
                            figures.cash_expenses,
                            figures.supplier_cash_payments,
                            expectedCash,
                            actualCashNumber,
                            difference,
                            cleanNotes,
                            req.user ?
                            req.user.username || null :
                            null,
                            closingDate
                        ]
                    });

                } else {

                    await transaction.execute({
                        sql: `
                            INSERT INTO daily_closings (
                                closing_date,
                                opening_cash,
                                cash_sales,
                                bank_sales,
                                easypaisa_sales,
                                jazzcash_sales,
                                customer_cash_payments,
                                cash_expenses,
                                supplier_cash_payments,
                                expected_cash,
                                actual_cash,
                                difference,
                                notes,
                                closed_by
                            )
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        `,
                        args: [
                            closingDate,
                            openingCashNumber,
                            figures.cash_sales,
                            figures.bank_sales,
                            figures.easypaisa_sales,
                            figures.jazzcash_sales,
                            figures.customer_cash_payments,
                            figures.cash_expenses,
                            figures.supplier_cash_payments,
                            expectedCash,
                            actualCashNumber,
                            difference,
                            cleanNotes,
                            req.user ?
                            req.user.username || null :
                            null
                        ]
                    });
                }


                await transaction.commit();

            } catch (transactionError) {

                await transaction.rollback();

                throw transactionError;
            }


            // ==========================================
            // RETURN SAVED RECORD
            // ==========================================
            const savedResult =
                await db.execute({
                    sql: `
                        SELECT *
                        FROM daily_closings
                        WHERE closing_date = ?
                    `,
                    args: [closingDate]
                });

            const saved =
                savedResult.rows[0] || null;


            res.status(existing ? 200 : 201).json({
                success: true,

                message: existing ?
                    "Daily closing updated successfully" :
                    "Daily closing saved successfully",

                data: saved
            });

        } catch (error) {

            console.error(
                "Daily closing save error:",
                error
            );

            res.status(500).json({
                success: false,
                message: "Failed to save daily closing"
            });
        }
    }
);


// ==========================================
// GET CLOSING HISTORY
// ==========================================
router.get(
    "/history",
    authMiddleware,
    roleMiddleware("admin"),
    async(req, res) => {

        try {

            const closingsResult =
                await db.execute(`
                    SELECT *
                    FROM daily_closings
                    ORDER BY closing_date DESC
                    LIMIT 60
                `);

            const closings =
                closingsResult.rows;


            res.json({
                success: true,
                data: closings
            });

        } catch (error) {

            console.error(
                "Daily closing history error:",
                error
            );

            res.status(500).json({
                success: false,
                message: "Failed to load daily closing history"
            });
        }
    }
);


module.exports = router;