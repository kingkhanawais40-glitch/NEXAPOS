import { useEffect, useState } from "react";
import api from "../services/api";
import { useSettings } from "../context/SettingsContext";

function toDateStr(d) {
  return d.toISOString().split("T")[0];
}

function getRangeForPreset(preset) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (preset) {
    case "today":
      return { from: toDateStr(today), to: toDateStr(today) };

    case "yesterday": {
      const y = new Date(today);
      y.setDate(y.getDate() - 1);
      return { from: toDateStr(y), to: toDateStr(y) };
    }

    case "this_week": {
      const start = new Date(today);
      const day = start.getDay();
      start.setDate(start.getDate() - day);
      return { from: toDateStr(start), to: toDateStr(today) };
    }

    case "this_month": {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      return { from: toDateStr(start), to: toDateStr(today) };
    }

    case "last_month": {
      const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const end = new Date(today.getFullYear(), today.getMonth(), 0);
      return { from: toDateStr(start), to: toDateStr(end) };
    }

    default:
      return { from: toDateStr(today), to: toDateStr(today) };
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
  const [customFrom, setCustomFrom] = useState(toDateStr(new Date()));
  const [customTo, setCustomTo] = useState(toDateStr(new Date()));

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const activeRange =
    preset === "custom"
      ? { from: customFrom, to: customTo }
      : getRangeForPreset(preset);

  const fetchSummary = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("/reports/summary", {
        params: { from: activeRange.from, to: activeRange.to },
      });

      setData(response.data.data);
    } catch (err) {
      setError(
        err.response?.data?.message || "Failed to load reports"
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

  const fmt = (n) => `${currency} ${Number(n || 0).toLocaleString()}`;

  return (
    <div className="reports-page">
      <div className="page-header">
        <div>
          <h1>Reports</h1>
          <p>
            View business performance, sales, profit and financial
            reports.
          </p>
        </div>
      </div>

      <div className="report-filters">
        {PRESETS.map((p) => (
          <button
            key={p.key}
            className={preset === p.key ? "filter-active" : ""}
            onClick={() => setPreset(p.key)}
          >
            {p.label}
          </button>
        ))}
      </div>

      {preset === "custom" && (
        <div className="report-custom-range">
          <label>
            From
            <input
              type="date"
              value={customFrom}
              max={customTo}
              onChange={(e) => setCustomFrom(e.target.value)}
            />
          </label>

          <label>
            To
            <input
              type="date"
              value={customTo}
              min={customFrom}
              max={toDateStr(new Date())}
              onChange={(e) => setCustomTo(e.target.value)}
            />
          </label>
        </div>
      )}

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <div className="suppliers-card">
          <p>Loading reports...</p>
        </div>
      ) : !data ? null : (
        <>
          <p className="report-range-label">
            Showing data from <strong>{data.range.from}</strong> to{" "}
            <strong>{data.range.to}</strong>
          </p>

          {/* ================= SALES ================= */}
          <div className="reports-grid">
            <div className="dashboard-card">
              <h3>Total Sales</h3>
              <strong>{fmt(data.sales.total_sales)}</strong>
              <p>Invoices: {data.sales.total_invoices}</p>
            </div>

            <div className="dashboard-card">
              <h3>Average Invoice Value</h3>
              <strong>{fmt(data.sales.average_invoice_value)}</strong>
              <p>Per completed sale.</p>
            </div>

            <div className="dashboard-card">
              <h3>Gross Profit</h3>
              <strong>{fmt(data.profit.gross_profit)}</strong>
              <p>Sales minus cost of goods sold.</p>
            </div>

            <div className="dashboard-card">
              <h3>Net Profit</h3>
              <strong>{fmt(data.profit.net_profit)}</strong>
              <p>Gross profit minus expenses.</p>
            </div>

            <div className="dashboard-card">
              <h3>Total Expenses</h3>
              <strong>{fmt(data.expenses.total_expenses)}</strong>
              <p>In selected period.</p>
            </div>

            <div className="dashboard-card">
              <h3>Customer Due</h3>
              <strong>{fmt(data.customers.total_due)}</strong>
              <p>Total outstanding (all-time).</p>
            </div>

            <div className="dashboard-card">
              <h3>Supplier Payable</h3>
              <strong>{fmt(data.suppliers.total_payable)}</strong>
              <p>Total outstanding (all-time).</p>
            </div>

            <div className="dashboard-card">
              <h3>Stock Valuation</h3>
              <strong>{fmt(data.inventory.stock_valuation)}</strong>
              <p>Current inventory value.</p>
            </div>
          </div>

          {/* ================= PAYMENT METHODS ================= */}
          <div className="suppliers-card">
            <h2>Sales by Payment Method</h2>

            {data.payment_methods.length === 0 ? (
              <p>No sales in this period.</p>
            ) : (
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Payment Method</th>
                      <th>Total Sales</th>
                      <th>Transactions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.payment_methods.map((item, index) => (
                      <tr key={index}>
                        <td style={{ textTransform: "capitalize" }}>
                          {item.payment_method || "-"}
                        </td>
                        <td>{fmt(item.total_amount)}</td>
                        <td>{item.total_transactions || 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ================= EXPENSES BREAKDOWN ================= */}
          <div className="reports-two-col">
            <div className="suppliers-card">
              <h2>Expenses by Category</h2>
              {data.expenses.by_category.length === 0 ? (
                <p>No expenses in this period.</p>
              ) : (
                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>Category</th>
                        <th>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.expenses.by_category.map((row, i) => (
                        <tr key={i}>
                          <td>{row.category}</td>
                          <td>{fmt(row.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="suppliers-card">
              <h2>Expenses by Payment Method</h2>
              {data.expenses.by_payment_method.length === 0 ? (
                <p>No expenses in this period.</p>
              ) : (
                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>Method</th>
                        <th>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.expenses.by_payment_method.map((row, i) => (
                        <tr key={i} style={{ textTransform: "capitalize" }}>
                          <td>{row.payment_method}</td>
                          <td>{fmt(row.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* ================= CUSTOMER / SUPPLIER WISE ================= */}
          <div className="reports-two-col">
            <div className="suppliers-card">
              <h2>Customer-wise Due</h2>
              {data.customers.customer_wise.length === 0 ? (
                <p>No outstanding customer dues.</p>
              ) : (
                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>Customer</th>
                        <th>Due</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.customers.customer_wise.map((row) => (
                        <tr key={row.id}>
                          <td>{row.name}</td>
                          <td>{fmt(row.due)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="suppliers-card">
              <h2>Supplier-wise Payable</h2>
              {data.suppliers.supplier_wise.length === 0 ? (
                <p>No outstanding supplier payables.</p>
              ) : (
                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>Supplier</th>
                        <th>Payable</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.suppliers.supplier_wise.map((row) => (
                        <tr key={row.id}>
                          <td>{row.name}</td>
                          <td>{fmt(row.payable)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* ================= INVENTORY ================= */}
          <div className="reports-two-col">
            <div className="suppliers-card">
              <h2>Low Stock ({data.inventory.low_stock_count})</h2>
              {data.inventory.low_stock.length === 0 ? (
                <p>No low-stock products.</p>
              ) : (
                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th>Stock</th>
                        <th>Threshold</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.inventory.low_stock.map((row) => (
                        <tr key={row.id}>
                          <td>{row.name}</td>
                          <td>{row.stock}</td>
                          <td>{row.low_stock_limit}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="suppliers-card">
              <h2>Out of Stock ({data.inventory.out_of_stock_count})</h2>
              {data.inventory.out_of_stock.length === 0 ? (
                <p>No out-of-stock products.</p>
              ) : (
                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th>Stock</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.inventory.out_of_stock.map((row) => (
                        <tr key={row.id}>
                          <td>{row.name}</td>
                          <td>{row.stock}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default Reports;
