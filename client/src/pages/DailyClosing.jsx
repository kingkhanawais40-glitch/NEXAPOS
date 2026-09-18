import { useEffect, useState } from "react";
import api from "../services/api";
import { useSettings } from "../context/SettingsContext";
import {
  CalendarDays,
  WalletCards,
  Banknote,
  Smartphone,
  ArrowDownToLine,
  ArrowUpFromLine,
  Calculator,
  CircleCheck,
  CircleAlert,
  TrendingUp,
  TrendingDown,
  RefreshCcw,
  Save,
  FileText,
  History,
  ShieldCheck,
  ReceiptText,
} from "lucide-react";

/* =========================================================
   DATE HELPERS
========================================================= */

function todayDate() {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDate(dateValue) {
  if (!dateValue) {
    return "-";
  }

  if (
    typeof dateValue === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(dateValue)
  ) {
    const [year, month, day] = dateValue.split("-");

    return `${day}-${month}-${year}`;
  }

  const parsedDate = new Date(dateValue);

  if (Number.isNaN(parsedDate.getTime())) {
    return "-";
  }

  const day = String(parsedDate.getDate()).padStart(2, "0");
  const month = String(parsedDate.getMonth() + 1).padStart(2, "0");
  const year = parsedDate.getFullYear();

  return `${day}-${month}-${year}`;
}

function formatMoney(value) {
  return Number(value || 0).toLocaleString();
}

function DailyClosing() {
  const { currency } = useSettings();

  const [date, setDate] = useState(todayDate());
  const [summary, setSummary] = useState(null);

  const [openingCash, setOpeningCash] = useState("0");
  const [actualCash, setActualCash] = useState("");
  const [notes, setNotes] = useState("");

  const [history, setHistory] = useState([]);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  /* =========================================================
     FETCH DAILY SUMMARY
  ========================================================= */

  const fetchSummary = async (selectedDate) => {
    setLoading(true);
    setError("");
    setSuccessMsg("");

    try {
      const response = await api.get("/daily-closing/summary", {
        params: {
          date: selectedDate,
        },
      });

      const data = response.data?.data;

      setSummary(data);

      if (data?.already_closed && data?.existing_closing) {
        setOpeningCash(
          String(data.existing_closing.opening_cash ?? 0)
        );

        setActualCash(
          String(data.existing_closing.actual_cash ?? 0)
        );

        setNotes(data.existing_closing.notes || "");
      } else {
        setOpeningCash(
          String(data?.suggested_opening_cash ?? 0)
        );

        setActualCash("");
        setNotes("");
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Failed to load daily closing summary"
      );

      setSummary(null);
    } finally {
      setLoading(false);
    }
  };

  /* =========================================================
     FETCH CLOSING HISTORY
  ========================================================= */

  const fetchHistory = async () => {
    try {
      const response = await api.get("/daily-closing/history");

      const data = response.data?.data || [];

      setHistory(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(
        err.response?.data?.message ||
          "Failed to load history"
      );

      setHistory([]);
    }
  };

  /* =========================================================
     LOAD SUMMARY WHEN DATE CHANGES
  ========================================================= */

  useEffect(() => {
    fetchSummary(date);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  /* =========================================================
     LOAD HISTORY
  ========================================================= */

  useEffect(() => {
    fetchHistory();
  }, []);

  /* =========================================================
     CASH CALCULATIONS
  ========================================================= */

  const expectedCash = summary
    ? Number(openingCash || 0) +
      Number(summary.cash_sales || 0) +
      Number(summary.customer_cash_payments || 0) -
      Number(summary.cash_expenses || 0) -
      Number(summary.supplier_cash_payments || 0)
    : 0;

  const difference =
    actualCash !== ""
      ? Number(actualCash) - expectedCash
      : null;

  const isClosed = summary?.already_closed;

  /* =========================================================
     SAVE DAILY CLOSING
  ========================================================= */

  const handleSave = async (reopen = false) => {
    setError("");
    setSuccessMsg("");

    if (
      actualCash === "" ||
      Number.isNaN(Number(actualCash))
    ) {
      setError("Please enter the actual cash counted.");
      return;
    }

    if (
      Number(actualCash) < 0 ||
      Number(openingCash) < 0
    ) {
      setError("Cash amounts cannot be negative.");
      return;
    }

    setSaving(true);

    try {
      await api.post("/daily-closing", {
        date,
        opening_cash: Number(openingCash),
        actual_cash: Number(actualCash),
        notes,
        reopen,
      });

      setSuccessMsg(
        "Daily closing saved successfully."
      );

      await fetchSummary(date);
      await fetchHistory();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Failed to save daily closing"
      );
    } finally {
      setSaving(false);
    }
  };

  /* =========================================================
     PAYMENT METHOD DATA
  ========================================================= */

  const paymentMethods = [
    {
      label: "Cash Sales",
      value: summary?.cash_sales || 0,
      icon: Banknote,
      className: "cash",
    },
    {
      label: "Bank Sales",
      value: summary?.bank_sales || 0,
      icon: WalletCards,
      className: "bank",
    },
    {
      label: "Easypaisa Sales",
      value: summary?.easypaisa_sales || 0,
      icon: Smartphone,
      className: "easypaisa",
    },
    {
      label: "JazzCash Sales",
      value: summary?.jazzcash_sales || 0,
      icon: Smartphone,
      className: "jazzcash",
    },
  ];

  const cashMovements = [
    {
      label: "Customer Cash Payments",
      description: "Cash received from customers",
      value: summary?.customer_cash_payments || 0,
      icon: ArrowDownToLine,
      type: "in",
    },
    {
      label: "Cash Expenses",
      description: "Cash paid for expenses",
      value: summary?.cash_expenses || 0,
      icon: ArrowUpFromLine,
      type: "out",
    },
    {
      label: "Supplier Cash Payments",
      description: "Cash paid to suppliers",
      value: summary?.supplier_cash_payments || 0,
      icon: ArrowUpFromLine,
      type: "out",
    },
  ];

  /* =========================================================
     UI
  ========================================================= */

  return (
    <div className="closing-page">

      {/* =====================================================
          PAGE HEADER
      ===================================================== */}

      <div className="closing-page-header">
        <div className="closing-header-content">
          <div className="closing-eyebrow">
            <WalletCards size={15} />
            CASH MANAGEMENT
          </div>

          <h1>Daily Cash Closing</h1>

          <p>
            Reconcile expected cash with the actual amount
            counted at the end of the business day.
          </p>
        </div>

        <div className="closing-date-picker">
          <CalendarDays size={18} />

          <div>
            <span>Closing Date</span>

            <input
              type="date"
              value={date}
              max={todayDate()}
              onChange={(e) => {
                setDate(e.target.value);
              }}
            />
          </div>
        </div>
      </div>

      {/* =====================================================
          ALERTS
      ===================================================== */}

      {error && (
        <div className="closing-alert closing-alert-error">
          <div className="closing-alert-icon">
            <CircleAlert size={19} />
          </div>

          <div>
            <strong>Unable to complete</strong>
            <p>{error}</p>
          </div>
        </div>
      )}

      {successMsg && (
        <div className="closing-alert closing-alert-success">
          <div className="closing-alert-icon">
            <CircleCheck size={19} />
          </div>

          <div>
            <strong>Closing Saved</strong>
            <p>{successMsg}</p>
          </div>
        </div>
      )}

      {/* =====================================================
          LOADING
      ===================================================== */}

      {loading ? (
        <div className="closing-loading-card">
          <div className="closing-loading-icon">
            <RefreshCcw size={22} />
          </div>

          <div>
            <strong>Loading daily summary...</strong>
            <p>Preparing today's cash reconciliation.</p>
          </div>
        </div>
      ) : summary ? (
        <>
          {/* =================================================
              SUMMARY OVERVIEW
          ================================================= */}

          <div className="closing-overview-grid">

            <div className="closing-overview-card primary">
              <div className="closing-overview-top">
                <div className="closing-overview-icon">
                  <Calculator size={21} />
                </div>

                <span className="closing-overview-label">
                  Expected Closing Cash
                </span>
              </div>

              <strong className="closing-overview-value">
                {currency} {formatMoney(expectedCash)}
              </strong>

              <span className="closing-overview-footer">
                Opening cash + cash inflows − cash outflows
              </span>
            </div>

            <div className="closing-overview-card">
              <div className="closing-overview-top">
                <div className="closing-overview-icon blue">
                  <Banknote size={21} />
                </div>

                <span className="closing-overview-label">
                  Cash Sales
                </span>
              </div>

              <strong className="closing-overview-value">
                {currency}{" "}
                {formatMoney(summary.cash_sales)}
              </strong>

              <span className="closing-overview-footer">
                Today's cash sales
              </span>
            </div>

            <div className="closing-overview-card">
              <div className="closing-overview-top">
                <div className="closing-overview-icon green">
                  <ArrowDownToLine size={21} />
                </div>

                <span className="closing-overview-label">
                  Cash Received
                </span>
              </div>

              <strong className="closing-overview-value">
                {currency}{" "}
                {formatMoney(
                  summary.customer_cash_payments
                )}
              </strong>

              <span className="closing-overview-footer">
                Customer payments received
              </span>
            </div>

            <div className="closing-overview-card">
              <div className="closing-overview-top">
                <div className="closing-overview-icon red">
                  <ArrowUpFromLine size={21} />
                </div>

                <span className="closing-overview-label">
                  Cash Outflow
                </span>
              </div>

              <strong className="closing-overview-value">
                {currency}{" "}
                {formatMoney(
                  Number(summary.cash_expenses || 0) +
                    Number(
                      summary.supplier_cash_payments || 0
                    )
                )}
              </strong>

              <span className="closing-overview-footer">
                Expenses + supplier payments
              </span>
            </div>

          </div>

          {/* =================================================
              PAYMENT METHODS + CASH MOVEMENTS
          ================================================= */}

          <div className="closing-section-grid">

            {/* =================================================
                SALES BY PAYMENT METHOD
            ================================================= */}

            <div className="closing-card closing-payment-card">

              <div className="closing-card-header">
                <div>
                  <div className="closing-card-title-row">
                    <div className="closing-section-icon blue">
                      <ReceiptText size={18} />
                    </div>

                    <h3>Sales by Payment Method</h3>
                  </div>

                  <p>
                    Breakdown of today's sales collection.
                  </p>
                </div>
              </div>

              <div className="closing-payment-list">

                {paymentMethods.map((method) => {
                  const Icon = method.icon;

                  return (
                    <div
                      className="closing-payment-row"
                      key={method.label}
                    >
                      <div className="closing-payment-left">
                        <div
                          className={`closing-payment-icon ${method.className}`}
                        >
                          <Icon size={18} />
                        </div>

                        <div>
                          <strong>{method.label}</strong>
                          <span>
                            {method.className === "cash"
                              ? "Physical cash"
                              : method.className === "bank"
                              ? "Bank / card payment"
                              : method.className ===
                                "easypaisa"
                              ? "Digital payment"
                              : "Mobile wallet"}
                          </span>
                        </div>
                      </div>

                      <strong className="closing-payment-value">
                        {currency}{" "}
                        {formatMoney(method.value)}
                      </strong>
                    </div>
                  );
                })}

              </div>
            </div>

            {/* =================================================
                OTHER CASH MOVEMENTS
            ================================================= */}

            <div className="closing-card closing-payment-card">

              <div className="closing-card-header">
                <div>
                  <div className="closing-card-title-row">
                    <div className="closing-section-icon purple">
                      <WalletCards size={18} />
                    </div>

                    <h3>Other Cash Movements</h3>
                  </div>

                  <p>
                    Additional cash coming in and going out.
                  </p>
                </div>
              </div>

              <div className="closing-payment-list">

                {cashMovements.map((movement) => {
                  const Icon = movement.icon;

                  return (
                    <div
                      className="closing-payment-row"
                      key={movement.label}
                    >
                      <div className="closing-payment-left">
                        <div
                          className={`closing-payment-icon ${
                            movement.type
                          }`}
                        >
                          <Icon size={18} />
                        </div>

                        <div>
                          <strong>{movement.label}</strong>
                          <span>
                            {movement.description}
                          </span>
                        </div>
                      </div>

                      <strong
                        className={`closing-payment-value ${
                          movement.type
                        }`}
                      >
                        {movement.type === "in"
                          ? "+"
                          : "-"}{" "}
                        {currency}{" "}
                        {formatMoney(movement.value)}
                      </strong>
                    </div>
                  );
                })}

              </div>
            </div>

          </div>

          {/* =================================================
              CASH RECONCILIATION
          ================================================= */}

          <div className="closing-card closing-reconciliation">

            <div className="closing-reconciliation-header">
              <div>
                <div className="closing-card-title-row">
                  <div className="closing-section-icon blue">
                    <Calculator size={19} />
                  </div>

                  <h3>Cash Reconciliation</h3>

                  {isClosed && (
                    <span className="closing-closed-badge">
                      <CircleCheck size={14} />
                      Already Closed
                    </span>
                  )}
                </div>

                <p>
                  Enter the opening balance and actual cash
                  counted to reconcile the day.
                </p>
              </div>

              <div className="closing-secure-badge">
                <ShieldCheck size={16} />
                Secure Closing
              </div>
            </div>

            {/* =================================================
                CASH INPUTS
            ================================================= */}

            <div className="closing-form-grid">

              <div className="closing-form-group">
                <label htmlFor="openingCash">
                  Opening Cash
                </label>

                <div className="closing-money-input">
                  <span>{currency}</span>

                  <input
                    id="openingCash"
                    type="number"
                    min="0"
                    value={openingCash}
                    onChange={(e) =>
                      setOpeningCash(e.target.value)
                    }
                  />
                </div>

                <small>
                  Cash available at the start of the day.
                </small>
              </div>

              <div className="closing-form-group">
                <label htmlFor="actualCash">
                  Actual Cash Counted
                </label>

                <div className="closing-money-input highlight">
                  <span>{currency}</span>

                  <input
                    id="actualCash"
                    type="number"
                    min="0"
                    value={actualCash}
                    onChange={(e) =>
                      setActualCash(e.target.value)
                    }
                    placeholder="0"
                  />
                </div>

                <small>
                  Physical cash counted at closing.
                </small>
              </div>

            </div>

            {/* =================================================
                EXPECTED CASH
            ================================================= */}

            <div className="closing-calculation-box">

              <div className="closing-calculation-row">
                <div className="closing-calculation-label">
                  <span>Opening Cash</span>
                  <strong>
                    {currency}{" "}
                    {formatMoney(openingCash)}
                  </strong>
                </div>

                <span className="closing-calculation-symbol">
                  +
                </span>

                <div className="closing-calculation-label">
                  <span>Cash Inflows</span>
                  <strong>
                    {currency}{" "}
                    {formatMoney(
                      Number(summary.cash_sales || 0) +
                        Number(
                          summary.customer_cash_payments ||
                            0
                        )
                    )}
                  </strong>
                </div>

                <span className="closing-calculation-symbol">
                  −
                </span>

                <div className="closing-calculation-label">
                  <span>Cash Outflows</span>
                  <strong>
                    {currency}{" "}
                    {formatMoney(
                      Number(summary.cash_expenses || 0) +
                        Number(
                          summary.supplier_cash_payments ||
                            0
                        )
                    )}
                  </strong>
                </div>

                <span className="closing-calculation-symbol">
                  =
                </span>

                <div className="closing-expected-result">
                  <span>Expected Cash</span>
                  <strong>
                    {currency}{" "}
                    {formatMoney(expectedCash)}
                  </strong>
                </div>
              </div>

            </div>

            {/* =================================================
                DIFFERENCE
            ================================================= */}

            {difference !== null && (
              <div
                className={`closing-difference-box ${
                  difference > 0
                    ? "excess"
                    : difference < 0
                    ? "shortage"
                    : "balanced"
                }`}
              >
                <div className="closing-difference-icon">
                  {difference > 0 ? (
                    <TrendingUp size={21} />
                  ) : difference < 0 ? (
                    <TrendingDown size={21} />
                  ) : (
                    <CircleCheck size={21} />
                  )}
                </div>

                <div className="closing-difference-content">
                  <span>
                    {difference > 0
                      ? "Cash Excess"
                      : difference < 0
                      ? "Cash Shortage"
                      : "Cash Balanced"}
                  </span>

                  <strong>
                    {difference > 0
                      ? "+"
                      : difference < 0
                      ? "-"
                      : ""}{" "}
                    {currency}{" "}
                    {formatMoney(
                      Math.abs(difference)
                    )}
                  </strong>
                </div>

                <p>
                  {difference > 0
                    ? "Actual cash is higher than the expected closing balance."
                    : difference < 0
                    ? "Actual cash is lower than the expected closing balance."
                    : "Actual cash exactly matches the expected closing balance."}
                </p>
              </div>
            )}

            {/* =================================================
                NOTES
            ================================================= */}

            <div className="closing-notes-group">
              <label htmlFor="closingNotes">
                <FileText size={16} />
                Notes
                <span>Optional</span>
              </label>

              <textarea
                id="closingNotes"
                rows={3}
                value={notes}
                onChange={(e) =>
                  setNotes(e.target.value)
                }
                placeholder="Add any remarks about today's closing..."
              />
            </div>

            {/* =================================================
                ACTIONS
            ================================================= */}

            <div className="closing-actions">

              <div className="closing-action-info">
                <CircleCheck size={16} />

                <span>
                  {isClosed
                    ? "This closing has already been recorded."
                    : "Review the amounts before saving the daily closing."}
                </span>
              </div>

              {!isClosed ? (
                <button
                  className="closing-save-btn"
                  disabled={saving}
                  onClick={() =>
                    handleSave(false)
                  }
                >
                  {saving ? (
                    <>
                      <RefreshCcw
                        size={17}
                        className="closing-spin"
                      />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save size={17} />
                      Save Daily Closing
                    </>
                  )}
                </button>
              ) : (
                <button
                  className="closing-reopen-btn"
                  disabled={saving}
                  onClick={() =>
                    handleSave(true)
                  }
                >
                  {saving ? (
                    <>
                      <RefreshCcw
                        size={17}
                        className="closing-spin"
                      />
                      Updating...
                    </>
                  ) : (
                    <>
                      <RefreshCcw size={17} />
                      Reopen & Update Closing
                    </>
                  )}
                </button>
              )}

            </div>

          </div>
        </>
      ) : null}

      {/* =====================================================
          RECENT CLOSINGS
      ===================================================== */}

      <div className="closing-card closing-history-card">

        <div className="closing-history-header">
          <div>
            <div className="closing-card-title-row">
              <div className="closing-section-icon slate">
                <History size={18} />
              </div>

              <h3>Recent Closings</h3>
            </div>

            <p>
              Review previously recorded daily cash closings.
            </p>
          </div>

          <span className="closing-history-count">
            {history.length}{" "}
            {history.length === 1
              ? "record"
              : "records"}
          </span>
        </div>

        {history.length === 0 ? (
          <div className="closing-empty-history">
            <div className="closing-empty-icon">
              <History size={25} />
            </div>

            <strong>No closings recorded yet</strong>

            <p>
              Completed daily closings will appear here.
            </p>
          </div>
        ) : (
          <div className="closing-table-wrapper">

            <table className="closing-table">

              <thead>
                <tr>
                  <th>Date</th>
                  <th>Opening</th>
                  <th>Expected</th>
                  <th>Actual</th>
                  <th>Difference</th>
                  <th>Closed By</th>
                </tr>
              </thead>

              <tbody>

                {history.map((row) => {
                  const rowDifference =
                    Number(row.difference || 0);

                  return (
                    <tr key={row.id}>

                      <td>
                        <div className="closing-date-cell">
                          <CalendarDays size={16} />

                          <span>
                            {formatDate(
                              row.closing_date
                            )}
                          </span>
                        </div>
                      </td>

                      <td>
                        <span className="closing-money-cell">
                          {currency}{" "}
                          {formatMoney(
                            row.opening_cash
                          )}
                        </span>
                      </td>

                      <td>
                        <span className="closing-money-cell">
                          {currency}{" "}
                          {formatMoney(
                            row.expected_cash
                          )}
                        </span>
                      </td>

                      <td>
                        <span className="closing-money-cell strong">
                          {currency}{" "}
                          {formatMoney(
                            row.actual_cash
                          )}
                        </span>
                      </td>

                      <td>
                        <span
                          className={`closing-history-difference ${
                            rowDifference > 0
                              ? "excess"
                              : rowDifference < 0
                              ? "shortage"
                              : "balanced"
                          }`}
                        >
                          {rowDifference > 0
                            ? "+"
                            : rowDifference < 0
                            ? "-"
                            : ""}{" "}
                          {currency}{" "}
                          {formatMoney(
                            Math.abs(rowDifference)
                          )}
                        </span>
                      </td>

                      <td>
                        <div className="closing-user-cell">
                          <div className="closing-user-avatar">
                            {(row.closed_by || "U")
                              .charAt(0)
                              .toUpperCase()}
                          </div>

                          <span>
                            {row.closed_by || "-"}
                          </span>
                        </div>
                      </td>

                    </tr>
                  );
                })}

              </tbody>

            </table>

          </div>
        )}
      </div>

    </div>
  );
}

export default DailyClosing;