import { useEffect, useState } from "react";
import api from "../services/api";
import { useSettings } from "../context/SettingsContext";

/* =========================================================
   DATE HELPERS
========================================================= */

// Returns today's date in YYYY-MM-DD format
// Uses local browser time instead of UTC.
function todayDate() {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

// Safely format a date for displaying in the history table.
function formatDate(dateValue) {
  if (!dateValue) {
    return "-";
  }

  // If backend already returns YYYY-MM-DD,
  // don't pass it through new Date() unnecessarily.
  if (
    typeof dateValue === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(dateValue)
  ) {
    const [year, month, day] = dateValue.split("-");

    return `${day}-${month}-${year}`;
  }

  const parsedDate = new Date(dateValue);

  // Prevent "Invalid Date"
  if (Number.isNaN(parsedDate.getTime())) {
    return "-";
  }

  const day = String(parsedDate.getDate()).padStart(2, "0");
  const month = String(parsedDate.getMonth() + 1).padStart(2, "0");
  const year = parsedDate.getFullYear();

  return `${day}-${month}-${year}`;
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
     UI
  ========================================================= */

  return (
    <div className="closing-page">

      {/* =====================================================
          PAGE HEADER
      ===================================================== */}

      <div className="page-header">
        <div>
          <h1>Daily Cash Closing</h1>

          <p>
            Reconcile today's expected cash against what was
            actually counted.
          </p>
        </div>

        <input
          type="date"
          value={date}
          max={todayDate()}
          onChange={(e) => {
            setDate(e.target.value);
          }}
        />
      </div>

      {/* =====================================================
          ALERTS
      ===================================================== */}

      {error && (
        <div className="alert alert-error">
          {error}
        </div>
      )}

      {successMsg && (
        <div className="alert alert-success">
          {successMsg}
        </div>
      )}

      {/* =====================================================
          LOADING / SUMMARY
      ===================================================== */}

      {loading ? (
        <p>Loading...</p>
      ) : summary ? (
        <>
          {/* =================================================
              SALES BY PAYMENT METHOD
          ================================================= */}

          <div className="closing-grid">

            <div className="closing-card">
              <h3>Sales by Payment Method</h3>

              <p>
                <span>Cash Sales</span>

                <span>
                  {currency}{" "}
                  {Number(
                    summary.cash_sales || 0
                  ).toLocaleString()}
                </span>
              </p>

              <p>
                <span>Bank Sales</span>

                <span>
                  {currency}{" "}
                  {Number(
                    summary.bank_sales || 0
                  ).toLocaleString()}
                </span>
              </p>

              <p>
                <span>Easypaisa Sales</span>

                <span>
                  {currency}{" "}
                  {Number(
                    summary.easypaisa_sales || 0
                  ).toLocaleString()}
                </span>
              </p>

              <p>
                <span>JazzCash Sales</span>

                <span>
                  {currency}{" "}
                  {Number(
                    summary.jazzcash_sales || 0
                  ).toLocaleString()}
                </span>
              </p>
            </div>

            {/* ===============================================
                OTHER CASH MOVEMENTS
            =============================================== */}

            <div className="closing-card">
              <h3>Other Cash Movements</h3>

              <p>
                <span>
                  Customer Cash Payments (in)
                </span>

                <span>
                  {currency}{" "}
                  {Number(
                    summary.customer_cash_payments || 0
                  ).toLocaleString()}
                </span>
              </p>

              <p>
                <span>Cash Expenses (out)</span>

                <span>
                  {currency}{" "}
                  {Number(
                    summary.cash_expenses || 0
                  ).toLocaleString()}
                </span>
              </p>

              <p>
                <span>
                  Supplier Cash Payments (out)
                </span>

                <span>
                  {currency}{" "}
                  {Number(
                    summary.supplier_cash_payments || 0
                  ).toLocaleString()}
                </span>
              </p>
            </div>
          </div>

          {/* =================================================
              CASH RECONCILIATION
          ================================================= */}

          <div className="closing-card closing-calc">

            <h3>
              Cash Reconciliation{" "}

              {isClosed && (
                <span className="closed-badge">
                  Already Closed
                </span>
              )}
            </h3>

            {/* ===============================================
                CASH INPUTS
            =============================================== */}

            <div className="closing-form-row">

              <label>
                Opening Cash

                <input
                  type="number"
                  min="0"
                  value={openingCash}
                  onChange={(e) =>
                    setOpeningCash(e.target.value)
                  }
                />
              </label>

              <label>
                Actual Cash Counted

                <input
                  type="number"
                  min="0"
                  value={actualCash}
                  onChange={(e) =>
                    setActualCash(e.target.value)
                  }
                  placeholder="Enter counted cash"
                />
              </label>
            </div>

            {/* ===============================================
                EXPECTED CASH
            =============================================== */}

            <p className="closing-line">

              <span>
                Expected Closing Cash
              </span>

              <strong>
                {currency}{" "}
                {expectedCash.toLocaleString()}
              </strong>
            </p>

            {/* ===============================================
                DIFFERENCE
            =============================================== */}

            {difference !== null && (
              <p
                className={
                  "closing-line closing-difference " +
                  (
                    difference > 0
                      ? "excess"
                      : difference < 0
                      ? "shortage"
                      : "balanced"
                  )
                }
              >
                <span>
                  {difference > 0
                    ? "Excess"
                    : difference < 0
                    ? "Shortage"
                    : "Balanced"}
                </span>

                <strong>
                  {currency}{" "}
                  {Math.abs(
                    difference
                  ).toLocaleString()}
                </strong>
              </p>
            )}

            {/* ===============================================
                NOTES
            =============================================== */}

            <label className="closing-notes-label">

              Notes (optional)

              <textarea
                rows={2}
                value={notes}
                onChange={(e) =>
                  setNotes(e.target.value)
                }
                placeholder="Any remarks about today's closing..."
              />
            </label>

            {/* ===============================================
                ACTION BUTTON
            =============================================== */}

            <div className="closing-actions">

              {!isClosed ? (
                <button
                  disabled={saving}
                  onClick={() =>
                    handleSave(false)
                  }
                >
                  {saving
                    ? "Saving..."
                    : "Save Daily Closing"}
                </button>
              ) : (
                <button
                  disabled={saving}
                  onClick={() =>
                    handleSave(true)
                  }
                >
                  {saving
                    ? "Saving..."
                    : "Reopen & Update Closing"}
                </button>
              )}

            </div>
          </div>
        </>
      ) : null}

      {/* =====================================================
          RECENT CLOSINGS
      ===================================================== */}

      <div className="closing-card">

        <h3>Recent Closings</h3>

        {history.length === 0 ? (
          <p>No closings recorded yet.</p>
        ) : (
          <div className="table-wrapper">

            <table>

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

                      {/* ===============================
                          SAFE DATE
                      =============================== */}

                      <td>
                        {formatDate(
                          row.closing_date
                        )}
                      </td>

                      {/* ===============================
                          OPENING
                      =============================== */}

                      <td>
                        {currency}{" "}
                        {Number(
                          row.opening_cash || 0
                        ).toLocaleString()}
                      </td>

                      {/* ===============================
                          EXPECTED
                      =============================== */}

                      <td>
                        {currency}{" "}
                        {Number(
                          row.expected_cash || 0
                        ).toLocaleString()}
                      </td>

                      {/* ===============================
                          ACTUAL
                      =============================== */}

                      <td>
                        {currency}{" "}
                        {Number(
                          row.actual_cash || 0
                        ).toLocaleString()}
                      </td>

                      {/* ===============================
                          DIFFERENCE
                      =============================== */}

                      <td
                        className={
                          rowDifference > 0
                            ? "text-excess"
                            : rowDifference < 0
                            ? "text-shortage"
                            : ""
                        }
                      >
                        {currency}{" "}
                        {rowDifference.toLocaleString()}
                      </td>

                      {/* ===============================
                          CLOSED BY
                      =============================== */}

                      <td>
                        {row.closed_by || "-"}
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