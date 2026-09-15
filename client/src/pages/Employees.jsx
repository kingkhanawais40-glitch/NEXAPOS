import { useEffect, useState } from "react";
import api from "../services/api";
import { useSettings } from "../context/SettingsContext";
import { useNotification } from "../context/NotificationContext";

function Employees() {
  const { currency } = useSettings();
  const { showSuccess, showError, confirm } = useNotification();

  // =========================
  // EMPLOYEES
  // =========================
  const [employees, setEmployees] = useState([]);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [employeeSearch, setEmployeeSearch] = useState("");

  const [form, setForm] = useState({
    name: "",
    phone: "",
    address: "",
    role: "cashier",
    salary: "",
    joining_date: "",
    status: "active",
  });

  // =========================
  // SALARY PAYMENTS
  // =========================
  const [salaryPayments, setSalaryPayments] = useState([]);
  const [salarySummary, setSalarySummary] = useState([]);
  const [salaryStats, setSalaryStats] = useState(null);

  const [editingSalaryPayment, setEditingSalaryPayment] =
    useState(null);

  const [salaryLoading, setSalaryLoading] = useState(false);

  const [salaryForm, setSalaryForm] = useState({
    employee_id: "",
    salary_month: new Date().toISOString().slice(0, 7),
    amount: "",
    payment_date: new Date().toISOString().slice(0, 10),
    payment_method: "cash",
    notes: "",
  });

  // =========================
  // FETCH EMPLOYEES
  // =========================
  const fetchEmployees = async () => {
    try {
      const response = await api.get("/employees");

      setEmployees(response.data.data || []);
    } catch (error) {
      console.error(
        error.response?.data?.message ||
          "Failed to load employees"
      );
    }
  };

  // =========================
  // FETCH SALARY PAYMENTS
  // =========================
  const fetchSalaryPayments = async () => {
    try {
      const response = await api.get(
        "/employees/salary-payments"
      );

      setSalaryPayments(response.data.data || []);
    } catch (error) {
      console.error(
        error.response?.data?.message ||
          "Failed to load salary payments"
      );
    }
  };

  // =========================
  // FETCH SALARY SUMMARY
  // =========================
  const fetchSalarySummary = async () => {
    try {
      const response = await api.get(
        "/employees/salary-summary"
      );

      setSalarySummary(
        Array.isArray(response.data.data)
          ? response.data.data
          : response.data.data?.employees || []
      );
    } catch (error) {
      console.error(
        error.response?.data?.message ||
          "Failed to load salary summary"
      );
    }
  };

  // =========================
  // FETCH SALARY STATS
  // =========================
  const fetchSalaryStats = async () => {
    try {
      const response = await api.get(
        "/employees/salary-stats"
      );

      setSalaryStats(response.data.data || null);
    } catch (error) {
      console.error(
        error.response?.data?.message ||
          "Failed to load salary stats"
      );
    }
  };

  // =========================
  // INITIAL LOAD
  // =========================
  useEffect(() => {
    fetchEmployees();
    fetchSalaryPayments();
    fetchSalarySummary();
    fetchSalaryStats();
  }, []);

  // =========================
  // EMPLOYEE FORM CHANGE
  // =========================
  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  // =========================
  // EMPLOYEE SUBMIT
  // =========================
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.name.trim()) {
      showError("Employee name is required");
      return;
    }

    if (!form.salary || Number(form.salary) < 0) {
      showError("Please enter a valid salary");
      return;
    }

    try {
      if (editingEmployee) {
        await api.put(`/employees/${editingEmployee.id}`, {
          ...form,
          salary: Number(form.salary),
        });

        showSuccess("Employee updated successfully");
      } else {
        await api.post("/employees", {
          ...form,
          salary: Number(form.salary),
        });

        showSuccess("Employee added successfully");
      }

      setForm({
        name: "",
        phone: "",
        address: "",
        role: "cashier",
        salary: "",
        joining_date: "",
        status: "active",
      });

      setEditingEmployee(null);

      fetchEmployees();
      fetchSalarySummary();
      fetchSalaryStats();
    } catch (error) {
      showError(
        error.response?.data?.message ||
          "Failed to save employee"
      );
    }
  };

  // =========================
  // EDIT EMPLOYEE
  // =========================
  const handleEditEmployee = (employee) => {
    setEditingEmployee(employee);

    setForm({
      name: employee.name || "",
      phone: employee.phone || "",
      address: employee.address || "",
      role: employee.role || "cashier",
      salary: employee.salary || "",
      joining_date: employee.joining_date || "",
      status: employee.status || "active",
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  // =========================
  // DELETE EMPLOYEE
  // =========================
  const handleDeleteEmployee = async (employee) => {
    const confirmed = await confirm(
      `Are you sure you want to delete ${employee.name}?`
    );

    if (!confirmed) {
      return;
    }

    try {
      await api.delete(`/employees/${employee.id}`);

      showSuccess("Employee deleted successfully");

      fetchEmployees();
      fetchSalaryPayments();
      fetchSalarySummary();
      fetchSalaryStats();
    } catch (error) {
      showError(
        error.response?.data?.message ||
          "Failed to delete employee"
      );
    }
  };

  // =========================
  // SALARY FORM CHANGE
  // =========================
  const handleSalaryChange = (e) => {
    setSalaryForm({
      ...salaryForm,
      [e.target.name]: e.target.value,
    });
  };

  // =========================
  // SALARY SUBMIT
  // =========================
  const handleSalarySubmit = async (e) => {
    e.preventDefault();

    if (!salaryForm.employee_id) {
      showError("Please select an employee");
      return;
    }

    if (
      !salaryForm.amount ||
      Number(salaryForm.amount) <= 0
    ) {
      showError("Please enter a valid salary amount");
      return;
    }

    try {
      setSalaryLoading(true);

      // =========================
      // UPDATE SALARY PAYMENT
      // =========================
      if (editingSalaryPayment) {
        await api.put(
          `/employees/salary-payment/${editingSalaryPayment.id}`,
          {
            salary_month: salaryForm.salary_month,
            amount: Number(salaryForm.amount),
            payment_date: salaryForm.payment_date,
            payment_method: salaryForm.payment_method,
            notes: salaryForm.notes,
          }
        );

        showSuccess("Salary payment updated successfully");
      }

      // =========================
      // ADD SALARY PAYMENT
      // =========================
      else {
        await api.post("/employees/salary-payment", {
          employee_id: Number(salaryForm.employee_id),
          salary_month: salaryForm.salary_month,
          amount: Number(salaryForm.amount),
          payment_date: salaryForm.payment_date,
          payment_method: salaryForm.payment_method,
          notes: salaryForm.notes,
        });

        showSuccess("Salary payment recorded successfully");
      }

      // Reset salary form
      setSalaryForm({
        employee_id: "",
        salary_month: new Date()
          .toISOString()
          .slice(0, 7),
        amount: "",
        payment_date: new Date()
          .toISOString()
          .slice(0, 10),
        payment_method: "cash",
        notes: "",
      });

      setEditingSalaryPayment(null);

      // Refresh data
      fetchSalaryPayments();
      fetchSalarySummary();
      fetchSalaryStats();
    } catch (error) {
      showError(
        error.response?.data?.message ||
          "Failed to save salary payment"
      );
    } finally {
      setSalaryLoading(false);
    }
  };

  const [selectedEmployeeHistory, setSelectedEmployeeHistory] =
  useState(null);

const [employeeSalaryHistory, setEmployeeSalaryHistory] =
  useState(null);

const fetchEmployeeSalaryHistory = async (employee) => {
  try {
    const response = await api.get(
      `/employees/${employee.id}/salary-payments`
    );

    setSelectedEmployeeHistory(employee);
    setEmployeeSalaryHistory(response.data.data || null);
  } catch (error) {
    showError(
      error.response?.data?.message ||
        "Failed to load employee salary history"
    );
  }
};

  // =========================
  // EDIT SALARY PAYMENT
  // =========================
  const handleEditSalaryPayment = (payment) => {
    setEditingSalaryPayment(payment);

    setSalaryForm({
      employee_id: String(payment.employee_id || ""),
      salary_month: payment.salary_month || "",
      amount: payment.amount || "",
      payment_date: payment.payment_date || "",
      payment_method:
        payment.payment_method || "cash",
      notes: payment.notes || "",
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  // =========================
  // DELETE SALARY PAYMENT
  // =========================
  const handleDeleteSalaryPayment = async (payment) => {
    const confirmed = await confirm(
      `Are you sure you want to delete the salary payment of ${currency} ${payment.amount} for ${payment.employee_name}?`
    );

    if (!confirmed) {
      return;
    }

    try {
      await api.delete(
        `/employees/salary-payment/${payment.id}`
      );

      showSuccess("Salary payment deleted successfully");

      fetchSalaryPayments();
      fetchSalarySummary();
      fetchSalaryStats();
    } catch (error) {
      showError(
        error.response?.data?.message ||
          "Failed to delete salary payment"
      );
    }
  };

  // =========================
  // CANCEL SALARY EDIT
  // =========================
  const filteredEmployees = employees.filter((employee) => {
    const term = employeeSearch.trim().toLowerCase();
    if (!term) return true;
    return (
      (employee.name || "").toLowerCase().includes(term) ||
      (employee.phone || "").toLowerCase().includes(term) ||
      (employee.role || "").toLowerCase().includes(term) ||
      (employee.address || "").toLowerCase().includes(term)
    );
  });

  const handleCancelSalaryEdit = () => {
    setEditingSalaryPayment(null);

    setSalaryForm({
      employee_id: "",
      salary_month: new Date()
        .toISOString()
        .slice(0, 7),
      amount: "",
      payment_date: new Date()
        .toISOString()
        .slice(0, 10),
      payment_method: "cash",
      notes: "",
    });
  };

  return (
    <div className="employees-page">
      <div className="page-header">
        <div>
          <h1>Employees</h1>
          <p>
            Manage employees and salary payments.
          </p>
        </div>
      </div>

      {/* =========================
          EMPLOYEE FORM
      ========================= */}
      <div className="suppliers-card">
        <h2>
          {editingEmployee
            ? "Edit Employee"
            : "Add Employee"}
        </h2>

        <form onSubmit={handleSubmit}>
          <div className="form-grid">

            <div className="form-group">
              <label>Name</label>

              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Employee name"
              />
            </div>

            <div className="form-group">
              <label>Phone</label>

              <input
                type="text"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                placeholder="03XXXXXXXXX"
              />
            </div>

            <div className="form-group">
              <label>Address</label>

              <input
                type="text"
                name="address"
                value={form.address}
                onChange={handleChange}
                placeholder="Employee address"
              />
            </div>

            <div className="form-group">
              <label>Role</label>

              <select
                name="role"
                value={form.role}
                onChange={handleChange}
              >
                <option value="cashier">
                  Cashier
                </option>

                <option value="manager">
                  Manager
                </option>

                <option value="staff">
                  Staff
                </option>
              </select>
            </div>

            <div className="form-group">
              <label>Salary</label>

              <input
                type="number"
                name="salary"
                value={form.salary}
                onChange={handleChange}
                placeholder="30000"
                min="0"
              />
            </div>

            <div className="form-group">
              <label>Joining Date</label>

              <input
                type="date"
                name="joining_date"
                value={form.joining_date}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label>Status</label>

              <select
                name="status"
                value={form.status}
                onChange={handleChange}
              >
                <option value="active">
                  Active
                </option>

                <option value="inactive">
                  Inactive
                </option>
              </select>
            </div>

          </div>

          <div className="form-actions">

            <button
              type="submit"
              className="primary-btn"
            >
              {editingEmployee
                ? "Update Employee"
                : "Add Employee"}
            </button>

            {editingEmployee && (
              <button
                type="button"
                className="secondary-btn"
                onClick={() => {
                  setEditingEmployee(null);

                  setForm({
                    name: "",
                    phone: "",
                    address: "",
                    role: "cashier",
                    salary: "",
                    joining_date: "",
                    status: "active",
                  });
                }}
              >
                Cancel
              </button>
            )}

          </div>
        </form>
      </div>

      {/* =========================
          SALARY STATS
      ========================= */}
      {salaryStats && (
        <div className="reports-grid">

          <div className="dashboard-card">
            <h3>Total Employees</h3>
            <strong>
              {salaryStats.total_employees}
            </strong>
          </div>

          <div className="dashboard-card">
            <h3>Active Employees</h3>
            <strong>
              {salaryStats.active_employees}
            </strong>
          </div>

          <div className="dashboard-card">
            <h3>Monthly Salary</h3>
            <strong>
              {currency} {salaryStats.total_monthly_salary}
            </strong>
          </div>

          <div className="dashboard-card">
            <h3>Paid This Month</h3>
            <strong>
              {currency} {salaryStats.total_paid_this_month}
            </strong>
          </div>

          <div className="dashboard-card">
            <h3>Remaining Salary</h3>
            <strong>
              {currency} {salaryStats.total_remaining_salary}
            </strong>
          </div>

          <div className="dashboard-card">
            <h3>Paid Employees</h3>
            <strong>
              {salaryStats.paid_employees}
            </strong>
          </div>

          <div className="dashboard-card">
            <h3>Partial Paid</h3>
            <strong>
              {salaryStats.partial_paid_employees}
            </strong>
          </div>

          <div className="dashboard-card">
            <h3>Unpaid Employees</h3>
            <strong>
              {salaryStats.unpaid_employees}
            </strong>
          </div>

        </div>
      )}

      {/* =========================
          SALARY PAYMENT FORM
      ========================= */}
      <div className="suppliers-card">
        <h2>
          {editingSalaryPayment
            ? "Edit Salary Payment"
            : "Record Salary Payment"}
        </h2>

        {editingSalaryPayment && (
          <p>
            Editing payment #{editingSalaryPayment.id}
            {" "}— {editingSalaryPayment.employee_name}
          </p>
        )}

        <form onSubmit={handleSalarySubmit}>
          <div className="form-grid">

            <div className="form-group">
              <label>Employee</label>

              <select
                name="employee_id"
                value={salaryForm.employee_id}
                onChange={handleSalaryChange}
                disabled={Boolean(
                  editingSalaryPayment
                )}
              >
                <option value="">
                  Select Employee
                </option>

                {employees.map((employee) => (
                  <option
                    key={employee.id}
                    value={employee.id}
                  >
                    {employee.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Salary Month</label>

              <input
                type="month"
                name="salary_month"
                value={salaryForm.salary_month}
                onChange={handleSalaryChange}
              />
            </div>

            <div className="form-group">
              <label>Amount</label>

              <input
                type="number"
                name="amount"
                value={salaryForm.amount}
                onChange={handleSalaryChange}
                placeholder="30000"
                min="1"
              />
            </div>

            <div className="form-group">
              <label>Payment Date</label>

              <input
                type="date"
                name="payment_date"
                value={salaryForm.payment_date}
                onChange={handleSalaryChange}
              />
            </div>

            <div className="form-group">
              <label>Payment Method</label>

              <select
                name="payment_method"
                value={salaryForm.payment_method}
                onChange={handleSalaryChange}
              >
                <option value="cash">
                  Cash
                </option>

                <option value="bank">
                  Bank
                </option>

                <option value="easypaisa">
                  Easypaisa
                </option>

                <option value="jazzcash">
                  JazzCash
                </option>
              </select>
            </div>

            <div className="form-group">
              <label>Notes</label>

              <input
                type="text"
                name="notes"
                value={salaryForm.notes}
                onChange={handleSalaryChange}
                placeholder="Optional notes"
              />
            </div>

          </div>

          <div className="form-actions">

            <button
              type="submit"
              className="primary-btn"
              disabled={salaryLoading}
            >
              {salaryLoading
                ? "Processing..."
                : editingSalaryPayment
                ? "Update Salary Payment"
                : "Record Salary Payment"}
            </button>

            {editingSalaryPayment && (
              <button
                type="button"
                className="secondary-btn"
                onClick={handleCancelSalaryEdit}
                disabled={salaryLoading}
              >
                Cancel
              </button>
            )}

          </div>
        </form>
      </div>

      {/* =========================
          SALARY SUMMARY
      ========================= */}
      <div className="suppliers-card">
        <h2>Salary Summary</h2>

        {salarySummary.length === 0 ? (
          <p>
            No salary summary available.
          </p>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Role</th>
                  <th>Monthly Salary</th>
                  <th>Paid This Month</th>
                  <th>Remaining</th>
                  <th>Status</th>
                </tr>
              </thead>

              <tbody>
                {salarySummary.map((employee) => (
                  <tr key={employee.id}>
                    <td>{employee.name}</td>

                    <td>{employee.role}</td>

                    <td>
                      {currency} {employee.salary}
                    </td>

                    <td>
                      {currency} {employee.paid_this_month}
                    </td>

                    <td>
                      {currency} {employee.remaining_salary}
                    </td>

                    <td>
  <span
    className={`salary-status ${String(
      employee.payment_status || ""
    ).toLowerCase()}`}
  >
    {employee.payment_status}
  </span>
</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedEmployeeHistory && employeeSalaryHistory && (
  <div className="suppliers-card">
    <h2>
      Salary History — {selectedEmployeeHistory.name}
    </h2>

    <p>
      Role: {employeeSalaryHistory.employee?.role ||
        selectedEmployeeHistory.role}
    </p>

    <div className="reports-grid">
      <div className="dashboard-card">
        <h3>Total Payments</h3>
        <strong>
          {employeeSalaryHistory.total_payments || 0}
        </strong>
      </div>

      <div className="dashboard-card">
        <h3>Total Paid</h3>
        <strong>
          {currency} {employeeSalaryHistory.total_paid || 0}
        </strong>
      </div>
    </div>

    {employeeSalaryHistory.payments?.length === 0 ? (
      <p>No salary payments found.</p>
    ) : (
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Salary Month</th>
              <th>Amount</th>
              <th>Payment Date</th>
              <th>Payment Method</th>
              <th>Notes</th>
            </tr>
          </thead>

          <tbody>
            {employeeSalaryHistory.payments.map((payment) => (
              <tr key={payment.id}>
                <td>{payment.salary_month}</td>
                <td>{currency} {payment.amount}</td>
                <td>{payment.payment_date}</td>
                <td>{payment.payment_method}</td>
                <td>{payment.notes || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}

    <button
      type="button"
      className="secondary-btn"
      onClick={() => {
        setSelectedEmployeeHistory(null);
        setEmployeeSalaryHistory(null);
      }}
    >
      Close History
    </button>
  </div>
)}

      {/* =========================
          SALARY PAYMENT HISTORY
      ========================= */}
      <div className="suppliers-card">
        <h2>Salary Payment History</h2>

        {salaryPayments.length === 0 ? (
          <p>
            No salary payments found.
          </p>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Role</th>
                  <th>Salary Month</th>
                  <th>Amount</th>
                  <th>Payment Date</th>
                  <th>Payment Method</th>
                  <th>Notes</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {salaryPayments.map((payment) => (
                  <tr key={payment.id}>

                    <td>
                      {payment.employee_name}
                    </td>

                    <td>
                      {payment.role}
                    </td>

                    <td>
                      {payment.salary_month}
                    </td>

                    <td>
                      {currency} {payment.amount}
                    </td>

                    <td>
                      {payment.payment_date}
                    </td>

                    <td>
                      {payment.payment_method}
                    </td>

                    <td>
                      {payment.notes || "-"}
                    </td>

                    <td>
                      <div
                        style={{
                          display: "flex",
                          gap: "8px",
                          alignItems: "center",
                        }}
                      >
                        <button
                          type="button"
                          className="secondary-btn"
                          onClick={() =>
                            handleEditSalaryPayment(
                              payment
                            )
                          }
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          className="danger-btn"
                          onClick={() =>
                            handleDeleteSalaryPayment(
                              payment
                            )
                          }
                        >
                          Delete
                        </button>
                      </div>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* =========================
          EMPLOYEE LIST
      ========================= */}
      <div className="suppliers-card">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "10px",
          }}
        >
          <h2>Employee List</h2>

          <input
            type="text"
            placeholder="Search by name, phone, role, address..."
            value={employeeSearch}
            onChange={(e) => setEmployeeSearch(e.target.value)}
            style={{ maxWidth: "280px" }}
          />
        </div>

        {employees.length === 0 ? (
          <p>No employees found.</p>
        ) : filteredEmployees.length === 0 ? (
          <p>No employees match your search.</p>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Phone</th>
                  <th>Role</th>
                  <th>Salary</th>
                  <th>Joining Date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredEmployees.map((employee) => (
                  <tr key={employee.id}>

                    <td>
                      {employee.name}
                    </td>

                    <td>
                      {employee.phone || "-"}
                    </td>

                    <td>
                      {employee.role}
                    </td>

                    <td>
                      {currency} {employee.salary}
                    </td>

                    <td>
                      {employee.joining_date || "-"}
                    </td>

                    <td>
                      {employee.status}
                    </td>

                    <td>
  <div
    style={{
      display: "flex",
      gap: "8px",
      flexWrap: "wrap",
    }}
  >
    <button
      type="button"
      className="secondary-btn"
      onClick={() =>
        handleEditEmployee(employee)
      }
    >
      Edit
    </button>

    <button
      type="button"
      className="secondary-btn"
      onClick={() =>
  fetchEmployeeSalaryHistory(employee)
}
    >
      Salary History
    </button>

    <button
      type="button"
      className="danger-btn"
      onClick={() =>
        handleDeleteEmployee(employee)
      }
    >
      Delete
    </button>
  </div>
</td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default Employees;
