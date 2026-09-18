import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  ShoppingCart,
  FileText,
  Package,
  AlertTriangle,
  Users,
  Truck,
  Wallet,
  UserPlus,
  ShoppingBag,
  BarChart3,
  ArrowUpRight,
} from "lucide-react";

import { useAuth } from "../context/AuthContext";
import { useSettings } from "../context/SettingsContext";
import api from "../services/api";

function Dashboard() {
  const { user } = useAuth();
  const { formatCurrency } = useSettings();
  const isAdmin = user?.role === "admin";

  const navigate = useNavigate();

  const [summary, setSummary] = useState(null);
  const [salesChart, setSalesChart] = useState([]);
  const [expenseChart, setExpenseChart] = useState([]);

  const [currentDateTime, setCurrentDateTime] = useState(new Date());

  /* =====================================================
     LIVE DATE & TIME
  ===================================================== */

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  /* =====================================================
     FETCH DASHBOARD DATA
  ===================================================== */

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const response = await api.get("/dashboard/summary");
        setSummary(response.data.data);
      } catch (error) {
        console.error(
          error.response?.data?.message ||
            "Failed to load dashboard"
        );
      }
    };

    const fetchSalesChart = async () => {
      try {
        const response = await api.get("/reports/sales-chart");

        setSalesChart(response.data.data || []);
      } catch (error) {
        console.error(
          error.response?.data?.message ||
            "Failed to load sales chart"
        );
      }
    };

    const fetchExpenseChart = async () => {
      if (!isAdmin) {
        setExpenseChart([]);
        return;
      }

      try {
        const response = await api.get("/reports/expense-chart");

        setExpenseChart(response.data.data || []);
      } catch (error) {
        console.error(
          error.response?.data?.message ||
            "Failed to load expense chart"
        );
      }
    };

    fetchDashboard();
    fetchSalesChart();
    fetchExpenseChart();
  }, [isAdmin]);

  /* =====================================================
     LOADING
  ===================================================== */

  if (!summary) {
    return (
      <div className="dashboard">
        <div className="dashboard-loading">
          <div className="dashboard-loading-spinner" />
          <h2>Loading Dashboard</h2>
          <p>Preparing your store overview...</p>
        </div>
      </div>
    );
  }

  /* =====================================================
     CHART MAXIMUM VALUES
  ===================================================== */

  const maxSales = Math.max(
    ...salesChart.map(
      (item) => Number(item.total_sales) || 0
    ),
    1
  );

  const maxExpenses = Math.max(
    ...expenseChart.map(
      (item) => Number(item.total_expenses) || 0
    ),
    1
  );

  /* =====================================================
     KPI CARDS
  ===================================================== */

  const cards = [
    {
      title: "Today Sales",
      value: formatCurrency(summary.today_sales),
      icon: ShoppingCart,
      color: "sales",
    },
    {
      title: "Today Invoices",
      value: Number(
        summary.today_invoices || 0
      ).toLocaleString("en-PK"),
      icon: FileText,
      color: "invoices",
    },
    {
      title: "Month Sales",
      value: formatCurrency(summary.month_sales),
      icon: ShoppingCart,
      color: "month-sales",
    },
    {
      title: "Total Products",
      value: Number(
        summary.total_products || 0
      ).toLocaleString("en-PK"),
      icon: Package,
      color: "products",
    },
    {
      title: "Low Stock",
      value: Number(
        summary.low_stock_products || 0
      ).toLocaleString("en-PK"),
      icon: AlertTriangle,
      color: "low-stock",
    },
    {
      title: "Customer Due",
      value: formatCurrency(summary.customer_due),
      icon: Users,
      color: "customer-due",
    },
    {
      title: "Supplier Payable",
      value: formatCurrency(summary.supplier_payable),
      icon: Truck,
      color: "supplier-payable",
    },
    {
      title: "Today Expenses",
      value: formatCurrency(summary.today_expenses),
      icon: Wallet,
      color: "expenses",
    },
  ];

  /* =====================================================
     QUICK ACTIONS
  ===================================================== */

  const quickActions = [
    {
      title: "New Sale",
      description: "Create a new invoice",
      icon: ShoppingCart,
      path: "/pos",
    },
    {
      title: "Add Product",
      description: "Add item to inventory",
      icon: Package,
      path: "/products",
    },
    {
      title: "Add Customer",
      description: "Register a customer",
      icon: UserPlus,
      path: "/customers",
    },

    ...(isAdmin
      ? [
          {
            title: "New Purchase",
            description: "Record a purchase",
            icon: ShoppingBag,
            path: "/purchases",
          },
        ]
      : []),
  ];

  /* =====================================================
     GREETING
  ===================================================== */

  const hour = currentDateTime.getHours();

  const greeting =
    hour < 12
      ? "Good Morning"
      : hour < 18
      ? "Good Afternoon"
      : "Good Evening";

  /* =====================================================
     DATE
  ===================================================== */

  const formattedDate =
    currentDateTime.toLocaleDateString("en-PK", {
      weekday: "long",
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  /* =====================================================
     TIME
  ===================================================== */

  const formattedTime =
    currentDateTime.toLocaleTimeString("en-PK", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });

  /* =====================================================
     RENDER
  ===================================================== */

  return (
    <div className="dashboard">

      {/* =================================================
          PAGE HEADER
      ================================================= */}

      <section className="dashboard-header">

        <div className="dashboard-header-content">

          <div className="dashboard-eyebrow">
            <span className="dashboard-eyebrow-dot" />
            BUSINESS OVERVIEW
          </div>

          <h1>{greeting}, {user?.username || "there"}</h1>

          <p>
            Monitor your store performance, sales,
            inventory and daily business activity.
          </p>

        </div>

        <div className="dashboard-header-right">

          <div className="dashboard-datetime">

            <span>{formattedDate}</span>

            <strong>{formattedTime}</strong>

          </div>

          <button
            className="dashboard-primary-action"
            onClick={() => navigate("/pos")}
          >
            <ShoppingCart size={18} />
            New Sale
            <ArrowUpRight size={16} />
          </button>

        </div>

      </section>


      {/* =================================================
          KPI CARDS
      ================================================= */}

      <section className="dashboard-cards">

        {cards.map((card) => {

          const Icon = card.icon;

          return (
            <article
              className={`dashboard-card ${card.color}`}
              key={card.title}
            >

              <div className="dashboard-card-top">

                <div>
                  <p>{card.title}</p>
                </div>

                <div className="dashboard-card-icon">
                  <Icon size={20} />
                </div>

              </div>

              <h2>{card.value}</h2>

            </article>
          );
        })}

      </section>


      {/* =================================================
          MAIN DASHBOARD GRID
      ================================================= */}

      <section className="dashboard-main-grid">

        {/* =================================================
            SALES ANALYTICS
        ================================================= */}

        <div className="dashboard-chart-section dashboard-sales-panel">

          <div className="dashboard-chart-header">

            <div>

              <div className="dashboard-section-label">
                PERFORMANCE
              </div>

              <h2>Sales Analytics</h2>

              <p>
                Daily sales and invoice performance
              </p>

            </div>

            <div className="dashboard-chart-icon">
              <BarChart3 size={21} />
            </div>

          </div>


          <div className="sales-chart">

            {salesChart.length === 0 ? (

              <div className="dashboard-chart-empty">
                <BarChart3 size={30} />
                <p>No sales data available.</p>
              </div>

            ) : (

              <div className="sales-chart-bars">

                {salesChart.map((item) => {

                  const totalSales =
                    Number(item.total_sales) || 0;

                  const invoiceCount =
                    Number(item.invoice_count) || 0;

                  const barHeight =
                    Math.max(
                      (totalSales / maxSales) * 145,
                      7
                    );

                  return (
                    <div
                      className="sales-bar-item"
                      key={item.sale_date}
                    >

                      <div className="sales-bar-info">

                        <span className="sales-bar-value">
                          {formatCurrency(totalSales)}
                        </span>

                        <span className="sales-bar-invoices">
                          {invoiceCount} invoices
                        </span>

                      </div>

                      <div
                        className="sales-bar"
                        style={{
                          height: `${barHeight}px`,
                        }}
                        title={
                          `Sales: ${formatCurrency(totalSales)} | ` +
                          `${invoiceCount} invoices`
                        }
                      />

                      <span className="sales-bar-date">
                        {item.sale_date}
                      </span>

                    </div>
                  );
                })}

              </div>
            )}

          </div>

        </div>


        {/* =================================================
            QUICK ACTIONS
        ================================================= */}

        <div className="quick-actions">

          <div className="quick-actions-header">

            <div>

              <div className="dashboard-section-label">
                SHORTCUTS
              </div>

              <h2>Quick Actions</h2>

              <p>
                Common tasks for your store
              </p>

            </div>

          </div>


          <div className="quick-actions-grid">

            {quickActions.map((action) => {

              const Icon = action.icon;

              return (
                <button
                  key={action.title}
                  className="quick-action"
                  onClick={() => navigate(action.path)}
                >

                  <div className="quick-action-icon">
                    <Icon size={20} />
                  </div>

                  <div className="quick-action-content">

                    <strong>
                      {action.title}
                    </strong>

                    <span>
                      {action.description}
                    </span>

                  </div>

                  <ArrowUpRight
                    className="quick-action-arrow"
                    size={17}
                  />

                </button>
              );
            })}

          </div>

        </div>

      </section>


      {/* =================================================
          EXPENSE ANALYTICS
      ================================================= */}

      {isAdmin && (
        <section className="dashboard-chart-section dashboard-expense-panel">

          <div className="dashboard-chart-header">

            <div>

              <div className="dashboard-section-label">
                FINANCIAL OVERVIEW
              </div>

              <h2>Expense Analytics</h2>

              <p>
                Daily business expense overview
              </p>

            </div>

            <div className="dashboard-chart-icon">
              <Wallet size={21} />
            </div>

          </div>


          <div className="sales-chart">

            {expenseChart.length === 0 ? (

              <div className="dashboard-chart-empty">
                <Wallet size={30} />
                <p>No expense data available.</p>
              </div>

            ) : (

              <div className="sales-chart-bars">

                {expenseChart.map((item) => {

                  const totalExpenses =
                    Number(item.total_expenses) || 0;

                  const expenseCount =
                    Number(item.expense_count) || 0;

                  const barHeight =
                    Math.max(
                      (totalExpenses / maxExpenses) * 145,
                      7
                    );

                  return (
                    <div
                      className="sales-bar-item"
                      key={item.expense_date}
                    >

                      <div className="sales-bar-info">

                        <span className="sales-bar-value">
                          {formatCurrency(totalExpenses)}
                        </span>

                        <span className="sales-bar-invoices">
                          {expenseCount} expenses
                        </span>

                      </div>

                      <div
                        className="sales-bar"
                        style={{
                          height: `${barHeight}px`,
                        }}
                        title={
                          `Expenses: ${formatCurrency(totalExpenses)} | ` +
                          `${expenseCount} expenses`
                        }
                      />

                      <span className="sales-bar-date">
                        {item.expense_date}
                      </span>

                    </div>
                  );
                })}

              </div>
            )}

          </div>

        </section>
      )}

    </div>
  );
}

export default Dashboard;
