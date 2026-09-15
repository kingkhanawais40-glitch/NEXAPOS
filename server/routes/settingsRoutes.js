const express = require("express");
const db = require("../database/db");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const router = express.Router();

// =====================================================
// GET SETTINGS
// ADMIN + MANAGER + CASHIER
// =====================================================

router.get(
    "/",
    authMiddleware,
    async(req, res) => {
        try {

            let settingsResult = await db.execute(`
                SELECT *
                FROM settings
                WHERE id = 1
            `);

            let settings = settingsResult.rows[0] || null;

            // =================================================
            // CREATE DEFAULT SETTINGS IF NOT FOUND
            // =================================================

            if (!settings) {

                await db.execute({
                    sql: `
                        INSERT INTO settings (
                            id,
                            store_name,
                            store_phone,
                            store_address,
                            invoice_footer,
                            currency,
                            default_tax
                        )
                        VALUES (
                            1,
                            ?,
                            ?,
                            ?,
                            ?,
                            ?,
                            ?
                        )
                    `,
                    args: [
                        "General Store",
                        "",
                        "",
                        "Thank you for shopping with us!",
                        "PKR",
                        0
                    ]
                });

                settingsResult = await db.execute(`
                    SELECT *
                    FROM settings
                    WHERE id = 1
                `);

                settings = settingsResult.rows[0] || null;
            }

            // =================================================
            // SUCCESS RESPONSE
            // =================================================

            res.json({
                success: true,
                data: settings
            });

        } catch (error) {

            console.error(
                "Get Settings Error:",
                error
            );

            res.status(500).json({
                success: false,
                message: "Failed to load settings"
            });
        }
    }
);

// =====================================================
// UPDATE SETTINGS
// ADMIN ONLY
// =====================================================

router.put(
    "/",
    authMiddleware,
    roleMiddleware("admin"),
    async(req, res) => {
        try {

            const {
                store_name,
                store_phone,
                store_address,
                invoice_footer,
                currency,
                default_tax
            } = req.body;

            // =================================================
            // STORE NAME VALIDATION
            // =================================================

            if (
                typeof store_name !== "string" ||
                !store_name.trim()
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Store name is required"
                });
            }

            // =================================================
            // CURRENCY VALIDATION
            // =================================================

            const selectedCurrency =
                typeof currency === "string" &&
                currency.trim() ?
                currency.trim().toUpperCase() :
                "PKR";

            if (selectedCurrency.length > 10) {
                return res.status(400).json({
                    success: false,
                    message: "Currency is invalid"
                });
            }

            // =================================================
            // TAX VALIDATION
            // =================================================

            const tax =
                default_tax === undefined ||
                default_tax === null ||
                default_tax === "" ?
                0 :
                Number(default_tax);

            if (!Number.isFinite(tax)) {
                return res.status(400).json({
                    success: false,
                    message: "Default tax must be a valid number"
                });
            }

            if (tax < 0) {
                return res.status(400).json({
                    success: false,
                    message: "Default tax cannot be negative"
                });
            }

            if (tax > 100) {
                return res.status(400).json({
                    success: false,
                    message: "Default tax cannot exceed 100%"
                });
            }

            // =================================================
            // SAFE STRING VALUES
            // =================================================

            const storePhone =
                typeof store_phone === "string" ?
                store_phone.trim() :
                "";

            const storeAddress =
                typeof store_address === "string" ?
                store_address.trim() :
                "";

            const invoiceFooter =
                typeof invoice_footer === "string" ?
                invoice_footer.trim() :
                "";

            // =================================================
            // INSERT / UPDATE SETTINGS
            // =================================================

            await db.execute({
                sql: `
                    INSERT INTO settings (
                        id,
                        store_name,
                        store_phone,
                        store_address,
                        invoice_footer,
                        currency,
                        default_tax
                    )
                    VALUES (
                        1,
                        ?,
                        ?,
                        ?,
                        ?,
                        ?,
                        ?
                    )

                    ON CONFLICT(id)
                    DO UPDATE SET
                        store_name = excluded.store_name,
                        store_phone = excluded.store_phone,
                        store_address = excluded.store_address,
                        invoice_footer = excluded.invoice_footer,
                        currency = excluded.currency,
                        default_tax = excluded.default_tax
                `,
                args: [
                    store_name.trim(),
                    storePhone,
                    storeAddress,
                    invoiceFooter,
                    selectedCurrency,
                    tax
                ]
            });

            // =================================================
            // GET UPDATED SETTINGS
            // =================================================

            const settingsResult = await db.execute(`
                SELECT *
                FROM settings
                WHERE id = 1
            `);

            const settings =
                settingsResult.rows[0] || null;

            // =================================================
            // SUCCESS RESPONSE
            // =================================================

            res.json({
                success: true,
                message: "Settings updated successfully",
                data: settings
            });

        } catch (error) {

            console.error(
                "Update Settings Error:",
                error
            );

            res.status(500).json({
                success: false,
                message: "Failed to update settings"
            });
        }
    }
);

// =====================================================
// EXPORT ROUTER
// =====================================================

module.exports = router;