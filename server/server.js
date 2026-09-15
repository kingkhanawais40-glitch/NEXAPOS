require("dotenv").config();
const express = require("express");
const cors = require("cors");

const db = require("./database/db");
const productRoutes = require("./routes/productRoutes");
const customerRoutes = require("./routes/customerRoutes");
const invoiceRoutes = require("./routes/invoiceRoutes");
const ledgerRoutes = require("./routes/ledgerRoutes");
const inventoryRoutes = require("./routes/inventoryRoutes");
const purchaseRoutes = require("./routes/purchaseRoutes");
const supplierRoutes = require("./routes/supplierRoutes");
const supplierLedgerRoutes = require("./routes/supplierLedgerRoutes");
const returnRoutes = require("./routes/returnRoutes");
const expenseRoutes = require("./routes/expenseRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const reportRoutes = require("./routes/reportRoutes");
const employeeRoutes = require("./routes/employeeRoutes");
const userRoutes = require("./routes/userRoutes");
const authMiddleware = require("./middleware/authMiddleware");
const roleMiddleware = require("./middleware/roleMiddleware");
const settingsRoutes = require("./routes/settingsRoutes");
const dailyClosingRoutes = require("./routes/dailyClosingRoutes");
const systemRoutes = require("./routes/systemRoutes");



const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.use("/api/products", productRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/invoices", invoiceRoutes);
app.use("/api/ledger", ledgerRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/purchases", purchaseRoutes);
app.use("/api/supplier-ledger", supplierLedgerRoutes);
app.use("/api/suppliers", supplierRoutes);
app.use("/api/returns", returnRoutes);
app.use("/api/expenses", expenseRoutes);
app.use("/api/employees", employeeRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/users", userRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/daily-closing", dailyClosingRoutes);
app.use("/api/system", systemRoutes);

app.get("/api/protected-test", authMiddleware, (req, res) => {
    res.json({
        success: true,
        message: "Protected route accessed successfully",
        user: req.user
    });
});

app.get(
    "/api/admin-test",
    authMiddleware,
    roleMiddleware("admin"),
    (req, res) => {
        res.json({
            success: true,
            message: "Admin access granted",
            user: req.user
        });
    }
);

app.get("/", (req, res) => {
    res.json({
        success: true,
        message: "General Store POS API is running!"
    });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});