import { useEffect, useState } from "react";
import api from "../services/api";
import { useSettings } from "../context/SettingsContext";
import {
  BarChart3,
  CalendarDays,
  CircleDollarSign,
  CreditCard,
  Package,
  TrendingUp,
  TrendingDown,
  Users,
  Truck,
  Wallet,
  ArrowUpRight,
  AlertTriangle,
  XCircle,
  RefreshCw,
  FileBarChart,
} from "lucide-react";

function toDateStr(d) {
  return d.toISOString().split("T")[0];
}

function getRangeForPreset(preset) {
  const now = new Date();
  const today = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );

  switch (preset) {
    case "today":
      return {
        from: toDateStr(today),
        to: toDateStr(today),
      };

    case "yesterday": {
      const y = new Date(today);
      y.setDate(y.getDate() - 1);

      return {
        from: toDateStr(y),
        to: toDateStr(y),
      };
    }

    case "this_week": {
      const start = new Date(today);
      const day = start.getDay();

      start.setDate(start.getDate() - day);

      return {
        from: toDateStr(start),
        to: toDateStr(today),
      };
    }

    case "this_month": {
      const start = new Date(
        today.getFullYear(),
        today.getMonth(),
        1
      );

      return {
        from: toDateStr(start),
        to: toDateStr(today),
      };
    }

    case "last_month": {
      const start = new Date(
        today.getFullYear(),
        today.getMonth() - 1,
        1
      );

      const end = new Date(
        today.getFullYear(),
        today.getMonth(),
        0
      );

      return {
        from: toDateStr(start),
        to: toDateStr(end),
      };
    }

    default:
      return {
        from: toDateStr(today),
        to: toDateStr(today),
      };
  }
}

const PRESETS = [
  { key: "today", label: "Today" },
  { key: "yesterday", label: "Yesterday" },
  { key: "this_week", label: "This Week" },
  { key: "this_month", label: "This Month" },
  { key: "last_month", label: "Last Month" },
  { key: "custom", label: "Custom Range" },
];

function Reports() {
  const { currency } = useSettings();

  const [preset, setPreset] = useState("today");

  const [customFrom, setCustomFrom] = useState(
    toDateStr(new Date())
  );

  const [customTo, setCustomTo] = useState(
    toDateStr(new Date())
  );

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const activeRange =
    preset === "custom"
      ? {
          from: customFrom,
          to: customTo,
        }
      : getRangeForPreset(preset);

  const fetchSummary = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("/reports/summary", {
        params: {
          from: activeRange.from,
          to: activeRange.to,
        },
      });

      setData(response.data.data);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Failed to load reports"
      );

      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preset, customFrom, customTo]);

  const fmt = (n) =>
    `${currency} ${Number(n || 0).toLocaleString()}`;

  const formatMethod = (method) => {
    if (!method) return "-";

    return method
      .replace(/_/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };

  const getPaymentClass = (method) => {
    const value = String(method || "").toLowerCase();

    if (value === "cash") return "report-payment cash";
    if (value === "bank") return "report-payment bank";
    if (value === "easypaisa") {
      return "report-payment easypaisa";
    }
    if (value === "jazzcash") {
      return "report-payment jazzcash";
    }

    return "report-payment";
  };

  const handlePresetChange = (key) => {
    setPreset(key);
  };

  return (
    <div className="reports-page">
      {/* ================= HEADER ================= */}

      <div className="reports-page-header">
        <div className="reports-header-content">
          <div className="reports-eyebrow">
            <FileBarChart size={15} />
            Business Intelligence
          </div>

          <h1>Reports & Analytics</h1>

          <p>
            Monitor sales, profitability, expenses, inventory and
            outstanding balances from one place.
          </p>
        </div>

        <div className="reports-header-badge">
          <BarChart3 size={18} />
          <span>Financial Overview</span>
        </div>
      </div>

      {/* ================= DATE FILTER ================= */}

      <div className="reports-filter-card">
        <div className="reports-filter-header">
          <div className="reports-filter-title">
            <span className="reports-filter-icon">
              <CalendarDays size={18} />
            </span>

            <div>
              <h3>Report Period</h3>
              <p>Select the period you want to analyze.</p>
            </div>
          </div>

          <div className="reports-active-range">
            {activeRange.from} → {activeRange.to}
          </div>
        </div>

        <div className="report-filters">
          {PRESETS.map((p) => (
            <button
              key={p.key}
              type="button"
              className={
                preset === p.key
                  ? "report-filter-btn active"
                  : "report-filter-btn"
              }
              onClick={() => handlePresetChange(p.key)}
            >
              {p.label}
            </button>
          ))}
        </div>

        {preset === "custom" && (
          <div className="report-custom-range">
            <label>
              <span>From</span>

              <input
                type="date"
                value={customFrom}
                max={customTo}
                onChange={(e) =>
                  setCustomFrom(e.target.value)
                }
              />
            </label>

            <span className="range-separator">to</span>

            <label>
              <span>To</span>

              <input
                type="date"
                value={customTo}
                min={customFrom}
                max={toDateStr(new Date())}
                onChange={(e) =>
                  setCustomTo(e.target.value)
                }
              />
            </label>
          </div>
        )}
      </div>

      {/* ================= ERROR ================= */}

      {error && (
        <div className="reports-alert">
          <AlertTriangle size={18} />

          <div>
            <strong>Unable to load reports</strong>
            <p>{error}</p>
          </div>

          <button
            type="button"
            onClick={fetchSummary}
            className="reports-retry-btn"
          >
            <RefreshCw size={15} />
            Retry
          </button>
        </div>
      )}

      {/* ================= LOADING ================= */}

      {loading ? (
        <div className="reports-loading-card">
          <div className="reports-loading-icon">
            <BarChart3 size={28} />
          </div>

          <h3>Loading reports...</h3>

          <p>
            Preparing your business performance data.
          </p>
        </div>
      ) : !data ? null : (
        <>
          <div className="report-range-label">
            <span>Reporting period</span>

            <strong>
              {data.range.from} — {data.range.to}
            </strong>
          </div>

          {/* ================= KPI CARDS ================= */}

          <div className="reports-kpi-grid">
            <div className="reports-kpi-card sales">
              <div className="reports-kpi-top">
                <div className="reports-kpi-icon">
                  <CircleDollarSign size={21} />
                </div>

                <span className="reports-kpi-label">
                  Total Sales
                </span>
              </div>

              <strong className="reports-kpi-value">
                {fmt(data.sales.total_sales)}
              </strong>

              <div className="reports-kpi-footer">
                <TrendingUp size={15} />
                <span>
                  {data.sales.total_invoices || 0} invoices
                </span>
              </div>
            </div>

            <div className="reports-kpi-card average">
              <div className="reports-kpi-top">
                <div className="reports-kpi-icon">
                  <CreditCard size={21} />
                </div>

                <span className="reports-kpi-label">
                  Average Invoice
                </span>
              </div>

              <strong className="reports-kpi-value">
                {fmt(data.sales.average_invoice_value)}
              </strong>

              <div className="reports-kpi-footer">
                <ArrowUpRight size={15} />
                <span>Per completed sale</span>
              </div>
            </div>

            <div className="reports-kpi-card profit">
              <div className="reports-kpi-top">
                <div className="reports-kpi-icon">
                  <TrendingUp size={21} />
                </div>

                <span className="reports-kpi-label">
                  Gross Profit
                </span>
              </div>

              <strong className="reports-kpi-value">
                {fmt(data.profit.gross_profit)}
              </strong>

              <div className="reports-kpi-footer">
                <span>Sales minus COGS</span>
              </div>
            </div>

            <div className="reports-kpi-card net">
              <div className="reports-kpi-top">
                <div className="reports-kpi-icon">
                  <BarChart3 size={21} />
                </div>

                <span className="reports-kpi-label">
                  Net Profit
                </span>
              </div>

              <strong className="reports-kpi-value">
                {fmt(data.profit.net_profit)}
              </strong>

              <div className="reports-kpi-footer">
                <TrendingUp size={15} />
                <span>After expenses</span>
              </div>
            </div>

            <div className="reports-kpi-card expense">
              <div className="reports-kpi-top">
                <div className="reports-kpi-icon">
                  <Wallet size={21} />
                </div>

                <span className="reports-kpi-label">
                  Total Expenses
                </span>
              </div>

              <strong className="reports-kpi-value">
                {fmt(data.expenses.total_expenses)}
              </strong>

              <div className="reports-kpi-footer">
                <TrendingDown size={15} />
                <span>Selected period</span>
              </div>
            </div>

            <div className="reports-kpi-card customer">
              <div className="reports-kpi-top">
                <div className="reports-kpi-icon">
                  <Users size={21} />
                </div>

                <span className="reports-kpi-label">
                  Customer Due
                </span>
              </div>

              <strong className="reports-kpi-value">
                {fmt(data.customers.total_due)}
              </strong>

              <div className="reports-kpi-footer">
                <span>All-time outstanding</span>
              </div>
            </div>

            <div className="reports-kpi-card supplier">
              <div className="reports-kpi-top">
                <div className="reports-kpi-icon">
                  <Truck size={21} />
                </div>

                <span className="reports-kpi-label">
                  Supplier Payable
                </span>
              </div>

              <strong className="reports-kpi-value">
                {fmt(data.suppliers.total_payable)}
              </strong>

              <div className="reports-kpi-footer">
                <span>All-time outstanding</span>
              </div>
            </div>

            <div className="reports-kpi-card inventory">
              <div className="reports-kpi-top">
                <div className="reports-kpi-icon">
                  <Package size={21} />
                </div>

                <span className="reports-kpi-label">
                  Stock Valuation
                </span>
              </div>

              <strong className="reports-kpi-value">
                {fmt(data.inventory.stock_valuation)}
              </strong>

              <div className="reports-kpi-footer">
                <span>Current inventory value</span>
              </div>
            </div>
          </div>

          {/* ================= PAYMENT METHODS ================= */}

          <section className="report-section-card">
            <div className="report-section-header">
              <div className="report-section-title">
                <span className="report-section-icon blue">
                  <CreditCard size={19} />
                </span>

                <div>
                  <h2>Sales by Payment Method</h2>
                  <p>
                    Breakdown of sales collected through each
                    payment channel.
                  </p>
                </div>
              </div>

              <span className="report-section-count">
                {data.payment_methods.length} methods
              </span>
            </div>

            {data.payment_methods.length === 0 ? (
              <div className="report-empty">
                <CreditCard size={24} />
                <span>No sales in this period.</span>
              </div>
            ) : (
              <div className="report-table-wrapper">
                <table className="report-table">
                  <thead>
                    <tr>
                      <th>Payment Method</th>
                      <th className="text-right">
                        Total Sales
                      </th>
                      <th className="text-right">
                        Transactions
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {data.payment_methods.map(
                      (item, index) => (
                        <tr key={index}>
                          <td>
                            <span
                              className={getPaymentClass(
                                item.payment_method
                              )}
                            >
                              <CreditCard size={14} />
                              {formatMethod(
                                item.payment_method
                              )}
                            </span>
                          </td>

                          <td className="text-right report-money">
                            {fmt(item.total_amount)}
                          </td>

                          <td className="text-right report-number">
                            {item.total_transactions || 0}
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* ================= EXPENSE BREAKDOWN ================= */}

          <div className="reports-two-col">
            <section className="report-section-card">
              <div className="report-section-header">
                <div className="report-section-title">
                  <span className="report-section-icon red">
                    <Wallet size={19} />
                  </span>

                  <div>
                    <h2>Expenses by Category</h2>
                    <p>Where business expenses are going.</p>
                  </div>
                </div>
              </div>

              {data.expenses.by_category.length === 0 ? (
                <div className="report-empty compact">
                  <Wallet size={22} />
                  <span>No expenses in this period.</span>
                </div>
              ) : (
                <div className="report-table-wrapper">
                  <table className="report-table">
                    <thead>
                      <tr>
                        <th>Category</th>
                        <th className="text-right">Total</th>
                      </tr>
                    </thead>

                    <tbody>
                      {data.expenses.by_category.map(
                        (row, i) => (
                          <tr key={i}>
                            <td>
                              <span className="report-category">
                                {row.category}
                              </span>
                            </td>

                            <td className="text-right report-money danger-money">
                              {fmt(row.total)}
                            </td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="report-section-card">
              <div className="report-section-header">
                <div className="report-section-title">
                  <span className="report-section-icon purple">
                    <CreditCard size={19} />
                  </span>

                  <div>
                    <h2>Expenses by Payment</h2>
                    <p>Expense distribution by payment channel.</p>
                  </div>
                </div>
              </div>

              {data.expenses.by_payment_method.length ===
              0 ? (
                <div className="report-empty compact">
                  <CreditCard size={22} />
                  <span>No expenses in this period.</span>
                </div>
              ) : (
                <div className="report-table-wrapper">
                  <table className="report-table">
                    <thead>
                      <tr>
                        <th>Method</th>
                        <th className="text-right">Total</th>
                      </tr>
                    </thead>

                    <tbody>
                      {data.expenses.by_payment_method.map(
                        (row, i) => (
                          <tr key={i}>
                            <td>
                              <span
                                className={getPaymentClass(
                                  row.payment_method
                                )}
                              >
                                <CreditCard size={14} />
                                {formatMethod(
                                  row.payment_method
                                )}
                              </span>
                            </td>

                            <td className="text-right report-money danger-money">
                              {fmt(row.total)}
                            </td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>

          {/* ================= CUSTOMER / SUPPLIER ================= */}

          <div className="reports-two-col">
            <section className="report-section-card">
              <div className="report-section-header">
                <div className="report-section-title">
                  <span className="report-section-icon amber">
                    <Users size={19} />
                  </span>

                  <div>
                    <h2>Customer-wise Due</h2>
                    <p>Outstanding customer balances.</p>
                  </div>
                </div>

                <span className="report-section-count warning">
                  {data.customers.customer_wise.length}
                </span>
              </div>

              {data.customers.customer_wise.length === 0 ? (
                <div className="report-empty compact">
                  <Users size={22} />
                  <span>
                    No outstanding customer dues.
                  </span>
                </div>
              ) : (
                <div className="report-table-wrapper">
                  <table className="report-table">
                    <thead>
                      <tr>
                        <th>Customer</th>
                        <th className="text-right">Due</th>
                      </tr>
                    </thead>

                    <tbody>
                      {data.customers.customer_wise.map(
                        (row) => (
                          <tr key={row.id}>
                            <td>
                              <div className="report-person-cell">
                                <span className="report-person-avatar">
                                  <Users size={14} />
                                </span>

                                <span>{row.name}</span>
                              </div>
                            </td>

                            <td className="text-right report-money warning-money">
                              {fmt(row.due)}
                            </td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="report-section-card">
              <div className="report-section-header">
                <div className="report-section-title">
                  <span className="report-section-icon orange">
                    <Truck size={19} />
                  </span>

                  <div>
                    <h2>Supplier-wise Payable</h2>
                    <p>Outstanding supplier balances.</p>
                  </div>
                </div>

                <span className="report-section-count danger">
                  {data.suppliers.supplier_wise.length}
                </span>
              </div>

              {data.suppliers.supplier_wise.length === 0 ? (
                <div className="report-empty compact">
                  <Truck size={22} />
                  <span>
                    No outstanding supplier payables.
                  </span>
                </div>
              ) : (
                <div className="report-table-wrapper">
                  <table className="report-table">
                    <thead>
                      <tr>
                        <th>Supplier</th>
                        <th className="text-right">
                          Payable
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {data.suppliers.supplier_wise.map(
                        (row) => (
                          <tr key={row.id}>
                            <td>
                              <div className="report-person-cell">
                                <span className="report-person-avatar supplier">
                                  <Truck size={14} />
                                </span>

                                <span>{row.name}</span>
                              </div>
                            </td>

                            <td className="text-right report-money danger-money">
                              {fmt(row.payable)}
                            </td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>

          {/* ================= INVENTORY ================= */}

          <div className="reports-two-col">
            <section className="report-section-card">
              <div className="report-section-header">
                <div className="report-section-title">
                  <span className="report-section-icon amber">
                    <AlertTriangle size={19} />
                  </span>

                  <div>
                    <h2>Low Stock</h2>
                    <p>Products approaching their stock threshold.</p>
                  </div>
                </div>

                <span className="report-section-count warning">
                  {data.inventory.low_stock_count}
                </span>
              </div>

              {data.inventory.low_stock.length === 0 ? (
                <div className="report-empty compact success-empty">
                  <TrendingUp size={22} />
                  <span>No low-stock products.</span>
                </div>
              ) : (
                <div className="report-table-wrapper">
                  <table className="report-table">
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th className="text-right">Stock</th>
                        <th className="text-right">
                          Threshold
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {data.inventory.low_stock.map(
                        (row) => (
                          <tr key={row.id}>
                            <td>
                              <div className="report-product-cell">
                                <span className="report-product-icon warning">
                                  <Package size={14} />
                                </span>

                                <span>{row.name}</span>
                              </div>
                            </td>

                            <td className="text-right report-stock warning-stock">
                              {row.stock}
                            </td>

                            <td className="text-right report-number">
                              {row.low_stock_limit}
                            </td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="report-section-card">
              <div className="report-section-header">
                <div className="report-section-title">
                  <span className="report-section-icon red">
                    <XCircle size={19} />
                  </span>

                  <div>
                    <h2>Out of Stock</h2>
                    <p>Products currently unavailable in inventory.</p>
                  </div>
                </div>

                <span className="report-section-count danger">
                  {data.inventory.out_of_stock_count}
                </span>
              </div>

              {data.inventory.out_of_stock.length === 0 ? (
                <div className="report-empty compact success-empty">
                  <Package size={22} />
                  <span>No out-of-stock products.</span>
                </div>
              ) : (
                <div className="report-table-wrapper">
                  <table className="report-table">
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th className="text-right">Stock</th>
                      </tr>
                    </thead>

                    <tbody>
                      {data.inventory.out_of_stock.map(
                        (row) => (
                          <tr key={row.id}>
                            <td>
                              <div className="report-product-cell">
                                <span className="report-product-icon danger">
                                  <Package size={14} />
                                </span>

                                <span>{row.name}</span>
                              </div>
                            </td>

                            <td className="text-right report-stock danger-stock">
                              {row.stock}
                            </td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}

export default Reports;