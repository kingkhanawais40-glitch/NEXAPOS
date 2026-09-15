import { BrowserRouter, Routes, Route } from "react-router-dom";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import MainLayout from "./layouts/MainLayout";
import POS from "./pages/POS";
import Products from "./pages/Products";
import ProtectedRoute from "./components/ProtectedRoute";
import Customers from "./pages/Customers";
import Suppliers from "./pages/Suppliers";
import SupplierLedger from "./pages/SupplierLedger";
import Purchases from "./pages/Purchases";
import Expenses from "./pages/Expenses";
import Reports from "./pages/Reports";
import Employees from "./pages/Employees";
import AdminRoute from "./components/AdminRoute";
import Settings from "./pages/Settings";
import CustomerLedger from "./pages/CustomerLedger";
import Returns from "./pages/Returns";
import DailyClosing from "./pages/DailyClosing";
import UserManagement from "./pages/UserManagement";
import Home from "./pages/Home";

import "./App.css";

function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* LOGIN */}
        <Route path="/" element={<Home />} />
<Route path="/login" element={<Login />} />

        {/* AUTHENTICATED ROUTES */}
        <Route element={<ProtectedRoute />}>
          <Route element={<MainLayout />}>

            {/* ADMIN + CASHIER */}
            <Route
              path="/dashboard"
              element={<Dashboard />}
            />

            <Route
              path="/pos"
              element={<POS />}
            />

            <Route
              path="/products"
              element={<Products />}
            />

            <Route
              path="/customers"
              element={<Customers />}
            />

            <Route
              path="/customers/:customerId/ledger"
              element={<CustomerLedger />}
            />

            {/* ADMIN ONLY */}
            <Route element={<AdminRoute />}>

              <Route
                path="/suppliers"
                element={<Suppliers />}
              />

              <Route
                path="/suppliers/:supplierId/ledger"
                element={<SupplierLedger />}
              />

              <Route
                path="/purchases"
                element={<Purchases />}
              />

              <Route
                path="/expenses"
                element={<Expenses />}
              />

              <Route
                path="/reports"
                element={<Reports />}
              />

              <Route
  path="/returns"
  element={<Returns />}
/>

              <Route
                path="/employees"
                element={<Employees />}
              />

              <Route
  path="/users"
  element={<UserManagement />}
/>

              <Route
  path="/settings"
  element={<Settings />}
/>

              <Route
                path="/daily-closing"
                element={<DailyClosing />}
              />

            </Route>

          </Route>
        </Route>

      </Routes>
    </BrowserRouter>
  );
}

export default App;

