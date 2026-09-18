import { useEffect, useState } from "react";
import api from "../services/api";
import { useSettings } from "../context/SettingsContext";
import { useNotification } from "../context/NotificationContext";
import {
  Users,
  UserPlus,
  UserRound,
  Phone,
  MapPin,
  BriefcaseBusiness,
  Wallet,
  CalendarDays,
  CreditCard,
  Banknote,
  ReceiptText,
  History,
  Pencil,
  Trash2,
  Search,
  X,
  Clock3,
  CheckCircle2,
  AlertCircle,
  CircleDollarSign,
  UserCheck,
  UserRoundX,
  ShieldCheck,
  ArrowUpRight,
} from "lucide-react";

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
  // EMPLOYEE SALARY HISTORY
  // =========================
  const [selectedEmployeeHistory, setSelectedEmployeeHistory] =
    useState(null);

  const [employeeSalaryHistory, setEmployeeSalaryHistory] =
    useState(null);

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
      } else {
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

  // =========================
  // EMPLOYEE SALARY HISTORY
  // =========================
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

  // =========================
  // FILTER EMPLOYEES
  // =========================
  const filteredEmployees = employees.filter((employee) => {
    const term = employeeSearch.trim().toLowerCase();

    if (!term) return true;

    return (
      (employee.name || "")
        .toLowerCase()
        .includes(term) ||
      (employee.phone || "")
        .toLowerCase()
        .includes(term) ||
      (employee.role || "")
        .toLowerCase()
        .includes(term) ||
      (employee.address || "")
        .toLowerCase()
        .includes(term)
    );
  });

  // =========================
  // RESET EMPLOYEE EDIT
  // =========================
  const handleCancelEmployeeEdit = () => {
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
  };

  // =========================
  // PAYMENT METHOD ICON
  // =========================
  const getPaymentIcon = (method) => {
    switch (String(method || "").toLowerCase()) {
      case "bank":
        return <CreditCard size={15} />;

      case "easypaisa":
      case "jazzcash":
        return <Wallet size={15} />;

      default:
        return <Banknote size={15} />;
    }
  };

  // =========================
  // PAYMENT STATUS CLASS
  // =========================
  const getSalaryStatusClass = (status) => {
    return String(status || "")
      .toLowerCase()
      .replace(/\s+/g, "-");
  };

  return (
    <div className="employees-page">

      {/* =========================
          PAGE HEADER
      ========================= */}
      <div className="employees-page-header">
        <div className="employees-header-content">
          <div>
            <div className="employees-eyebrow">
              <Users size={15} />
              HR & Payroll Management
            </div>

            <h1>Employees</h1>

            <p>
              Manage your team, salaries and employee
              payment records from one workspace.
            </p>
          </div>

          <div className="employees-header-badge">
            <ShieldCheck size={18} />
            Admin Workspace
          </div>
        </div>
      </div>

      {/* =========================
          KPI CARDS
      ========================= */}
      {salaryStats && (
        <div className="employees-kpi-grid">

          <div className="employees-kpi-card blue">
            <div className="employees-kpi-top">
              <div className="employees-kpi-icon">
                <Users size={20} />
              </div>

              <span className="employees-kpi-label">
                Workforce
              </span>
            </div>

            <strong>
              {salaryStats.total_employees || 0}
            </strong>

            <span className="employees-kpi-footer">
              Total employees
            </span>
          </div>

          <div className="employees-kpi-card green">
            <div className="employees-kpi-top">
              <div className="employees-kpi-icon">
                <UserCheck size={20} />
              </div>

              <span className="employees-kpi-label">
                Active Staff
              </span>
            </div>

            <strong>
              {salaryStats.active_employees || 0}
            </strong>

            <span className="employees-kpi-footer">
              Currently active
            </span>
          </div>

          <div className="employees-kpi-card purple">
            <div className="employees-kpi-top">
              <div className="employees-kpi-icon">
                <CircleDollarSign size={20} />
              </div>

              <span className="employees-kpi-label">
                Monthly Payroll
              </span>
            </div>

            <strong>
              {currency}{" "}
              {salaryStats.total_monthly_salary || 0}
            </strong>

            <span className="employees-kpi-footer">
              Total monthly salary
            </span>
          </div>

          <div className="employees-kpi-card blue">
            <div className="employees-kpi-top">
              <div className="employees-kpi-icon">
                <Wallet size={20} />
              </div>

              <span className="employees-kpi-label">
                Paid This Month
              </span>
            </div>

            <strong>
              {currency}{" "}
              {salaryStats.total_paid_this_month || 0}
            </strong>

            <span className="employees-kpi-footer">
              Salary already paid
            </span>
          </div>

          <div className="employees-kpi-card amber">
            <div className="employees-kpi-top">
              <div className="employees-kpi-icon">
                <Clock3 size={20} />
              </div>

              <span className="employees-kpi-label">
                Remaining Salary
              </span>
            </div>

            <strong>
              {currency}{" "}
              {salaryStats.total_remaining_salary || 0}
            </strong>

            <span className="employees-kpi-footer">
              Pending this month
            </span>
          </div>

          <div className="employees-kpi-card green">
            <div className="employees-kpi-top">
              <div className="employees-kpi-icon">
                <CheckCircle2 size={20} />
              </div>

              <span className="employees-kpi-label">
                Fully Paid
              </span>
            </div>

            <strong>
              {salaryStats.paid_employees || 0}
            </strong>

            <span className="employees-kpi-footer">
              Employees fully paid
            </span>
          </div>

          <div className="employees-kpi-card amber">
            <div className="employees-kpi-top">
              <div className="employees-kpi-icon">
                <AlertCircle size={20} />
              </div>

              <span className="employees-kpi-label">
                Partial Paid
              </span>
            </div>

            <strong>
              {salaryStats.partial_paid_employees || 0}
            </strong>

            <span className="employees-kpi-footer">
              Partially paid
            </span>
          </div>

          <div className="employees-kpi-card red">
            <div className="employees-kpi-top">
              <div className="employees-kpi-icon">
                <UserRoundX size={20} />
              </div>

              <span className="employees-kpi-label">
                Unpaid
              </span>
            </div>

            <strong>
              {salaryStats.unpaid_employees || 0}
            </strong>

            <span className="employees-kpi-footer">
              Salary not recorded
            </span>
          </div>

        </div>
      )}

      {/* =========================
          EMPLOYEE FORM
      ========================= */}
      <div className="employee-workspace">

        <div className="employee-workspace-header">
          <div className="employee-section-heading">
            <div className="employee-section-icon blue">
              {editingEmployee ? (
                <Pencil size={18} />
              ) : (
                <UserPlus size={18} />
              )}
            </div>

            <div>
              <h2>
                {editingEmployee
                  ? "Edit Employee"
                  : "Add Employee"}
              </h2>

              <p>
                {editingEmployee
                  ? "Update employee information and payroll details."
                  : "Create a new employee profile for your business."}
              </p>
            </div>
          </div>

          <span className="employee-status-badge">
            <BriefcaseBusiness size={14} />
            Employee Profile
          </span>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="employee-form-grid">

            <div className="employee-form-group">
              <label>
                <UserRound size={14} />
                Name
              </label>

              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Employee name"
              />
            </div>

            <div className="employee-form-group">
              <label>
                <Phone size={14} />
                Phone
              </label>

              <input
                type="text"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                placeholder="03XXXXXXXXX"
              />
            </div>

            <div className="employee-form-group employee-form-wide">
              <label>
                <MapPin size={14} />
                Address
              </label>

              <input
                type="text"
                name="address"
                value={form.address}
                onChange={handleChange}
                placeholder="Employee address"
              />
            </div>

            <div className="employee-form-group">
              <label>
                <BriefcaseBusiness size={14} />
                Role
              </label>

              <select
                name="role"
                value={form.role}
                onChange={handleChange}
              >
                <option value="cashier">Cashier</option>
                <option value="manager">Manager</option>
                <option value="staff">Staff</option>
              </select>
            </div>

            <div className="employee-form-group">
              <label>
                <CircleDollarSign size={14} />
                Salary
              </label>

              <input
                type="number"
                name="salary"
                value={form.salary}
                onChange={handleChange}
                placeholder="30000"
                min="0"
              />
            </div>

            <div className="employee-form-group">
              <label>
                <CalendarDays size={14} />
                Joining Date
              </label>

              <input
                type="date"
                name="joining_date"
                value={form.joining_date}
                onChange={handleChange}
              />
            </div>

            <div className="employee-form-group">
              <label>
                <CheckCircle2 size={14} />
                Status
              </label>

              <select
                name="status"
                value={form.status}
                onChange={handleChange}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

          </div>

          <div className="employee-form-footer">
            <div className="employee-form-note">
              <ShieldCheck size={15} />
              Employee information is saved securely.
            </div>

            <div className="employee-form-actions">
              {editingEmployee && (
                <button
                  type="button"
                  className="employee-secondary-btn"
                  onClick={handleCancelEmployeeEdit}
                >
                  <X size={16} />
                  Cancel
                </button>
              )}

              <button
                type="submit"
                className="employee-primary-btn"
              >
                {editingEmployee ? (
                  <>
                    <Pencil size={16} />
                    Update Employee
                  </>
                ) : (
                  <>
                    <UserPlus size={16} />
                    Add Employee
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* =========================
          SALARY PAYMENT FORM
      ========================= */}
      <div className="employee-workspace salary-workspace">

        <div className="employee-workspace-header">
          <div className="employee-section-heading">
            <div className="employee-section-icon green">
              <Wallet size={18} />
            </div>

            <div>
              <h2>
                {editingSalaryPayment
                  ? "Edit Salary Payment"
                  : "Record Salary Payment"}
              </h2>

              <p>
                {editingSalaryPayment
                  ? `Editing payment #${editingSalaryPayment.id} — ${editingSalaryPayment.employee_name}`
                  : "Record employee salary payments and maintain payroll history."}
              </p>
            </div>
          </div>

          <span className="employee-status-badge green">
            <ReceiptText size={14} />
            Payroll
          </span>
        </div>

        <form onSubmit={handleSalarySubmit}>
          <div className="employee-form-grid">

            <div className="employee-form-group">
              <label>
                <UserRound size={14} />
                Employee
              </label>

              <select
                name="employee_id"
                value={salaryForm.employee_id}
                onChange={handleSalaryChange}
                disabled={Boolean(editingSalaryPayment)}
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

            <div className="employee-form-group">
              <label>
                <CalendarDays size={14} />
                Salary Month
              </label>

              <input
                type="month"
                name="salary_month"
                value={salaryForm.salary_month}
                onChange={handleSalaryChange}
              />
            </div>

            <div className="employee-form-group">
              <label>
                <CircleDollarSign size={14} />
                Amount
              </label>

              <input
                type="number"
                name="amount"
                value={salaryForm.amount}
                onChange={handleSalaryChange}
                placeholder="30000"
                min="1"
              />
            </div>

            <div className="employee-form-group">
              <label>
                <CalendarDays size={14} />
                Payment Date
              </label>

              <input
                type="date"
                name="payment_date"
                value={salaryForm.payment_date}
                onChange={handleSalaryChange}
              />
            </div>

            <div className="employee-form-group">
              <label>
                <CreditCard size={14} />
                Payment Method
              </label>

              <select
                name="payment_method"
                value={salaryForm.payment_method}
                onChange={handleSalaryChange}
              >
                <option value="cash">Cash</option>
                <option value="bank">Bank</option>
                <option value="easypaisa">Easypaisa</option>
                <option value="jazzcash">JazzCash</option>
              </select>
            </div>

            <div className="employee-form-group employee-form-wide">
              <label>
                <ReceiptText size={14} />
                Notes
              </label>

              <input
                type="text"
                name="notes"
                value={salaryForm.notes}
                onChange={handleSalaryChange}
                placeholder="Optional notes"
              />
            </div>

          </div>

          <div className="employee-form-footer">
            <div className="employee-form-note">
              <Wallet size={15} />
              Salary payment will be added to payroll records.
            </div>

            <div className="employee-form-actions">
              {editingSalaryPayment && (
                <button
                  type="button"
                  className="employee-secondary-btn"
                  onClick={handleCancelSalaryEdit}
                  disabled={salaryLoading}
                >
                  <X size={16} />
                  Cancel
                </button>
              )}

              <button
                type="submit"
                className="employee-primary-btn green"
                disabled={salaryLoading}
              >
                {salaryLoading ? (
                  <>
                    <span className="employee-spinner" />
                    Processing...
                  </>
                ) : editingSalaryPayment ? (
                  <>
                    <Pencil size={16} />
                    Update Payment
                  </>
                ) : (
                  <>
                    <Wallet size={16} />
                    Record Payment
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* =========================
          SALARY SUMMARY
      ========================= */}
      <div className="employee-table-card">

        <div className="employee-table-header">
          <div>
            <div className="employee-table-title">
              <div className="employee-section-icon purple">
                <CircleDollarSign size={18} />
              </div>

              <div>
                <h2>Salary Summary</h2>
                <p>
                  Current monthly payroll status by employee.
                </p>
              </div>
            </div>
          </div>

          <span className="employee-count-badge">
            {salarySummary.length} Employees
          </span>
        </div>

        {salarySummary.length === 0 ? (
          <div className="employee-empty-state">
            <div className="employee-empty-icon">
              <ReceiptText size={25} />
            </div>

            <h3>No salary summary available</h3>

            <p>
              Salary information will appear here once
              employees are available.
            </p>
          </div>
        ) : (
          <div className="employee-table-wrapper">
            <table className="employee-table">
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
                    <td>
                      <div className="employee-name-cell">
                        <div className="employee-avatar">
                          <UserRound size={17} />
                        </div>

                        <div>
                          <strong>{employee.name}</strong>
                          <span>
                            Employee #{employee.id}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td>
                      <span className="employee-role-badge">
                        {employee.role}
                      </span>
                    </td>

                    <td>
                      <span className="employee-money">
                        {currency} {employee.salary}
                      </span>
                    </td>

                    <td>
                      <span className="employee-money paid">
                        {currency}{" "}
                        {employee.paid_this_month}
                      </span>
                    </td>

                    <td>
                      <span
                        className={`employee-money ${
                          Number(employee.remaining_salary) > 0
                            ? "remaining"
                            : "cleared"
                        }`}
                      >
                        {currency}{" "}
                        {employee.remaining_salary}
                      </span>
                    </td>

                    <td>
                      <span
                        className={`salary-status ${getSalaryStatusClass(
                          employee.payment_status
                        )}`}
                      >
                        {String(
                          employee.payment_status || "-"
                        )}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* =========================
          EMPLOYEE SALARY HISTORY
      ========================= */}
      {selectedEmployeeHistory &&
        employeeSalaryHistory && (
          <div className="employee-history-detail-card">

            <div className="employee-history-detail-header">
              <div className="employee-table-title">
                <div className="employee-section-icon blue">
                  <History size={18} />
                </div>

                <div>
                  <h2>
                    Salary History —{" "}
                    {selectedEmployeeHistory.name}
                  </h2>

                  <p>
                    Role:{" "}
                    {employeeSalaryHistory.employee?.role ||
                      selectedEmployeeHistory.role}
                  </p>
                </div>
              </div>

              <button
                type="button"
                className="employee-close-history"
                onClick={() => {
                  setSelectedEmployeeHistory(null);
                  setEmployeeSalaryHistory(null);
                }}
              >
                <X size={17} />
              </button>
            </div>

            <div className="employee-history-stats">
              <div className="employee-history-stat">
                <div className="employee-history-stat-icon blue">
                  <ReceiptText size={18} />
                </div>

                <div>
                  <span>Total Payments</span>
                  <strong>
                    {employeeSalaryHistory.total_payments ||
                      0}
                  </strong>
                </div>
              </div>

              <div className="employee-history-stat">
                <div className="employee-history-stat-icon green">
                  <CircleDollarSign size={18} />
                </div>

                <div>
                  <span>Total Paid</span>
                  <strong>
                    {currency}{" "}
                    {employeeSalaryHistory.total_paid ||
                      0}
                  </strong>
                </div>
              </div>
            </div>

            {employeeSalaryHistory.payments?.length === 0 ? (
              <div className="employee-empty-state compact">
                <div className="employee-empty-icon">
                  <History size={24} />
                </div>

                <h3>No salary payments found</h3>

                <p>
                  This employee does not have any salary
                  payment records yet.
                </p>
              </div>
            ) : (
              <div className="employee-table-wrapper">
                <table className="employee-table">
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
                    {employeeSalaryHistory.payments.map(
                      (payment) => (
                        <tr key={payment.id}>
                          <td>
                            <span className="employee-month">
                              <CalendarDays size={14} />
                              {payment.salary_month}
                            </span>
                          </td>

                          <td>
                            <span className="employee-money paid">
                              {currency} {payment.amount}
                            </span>
                          </td>

                          <td>
                            <span className="employee-date">
                              {payment.payment_date}
                            </span>
                          </td>

                          <td>
                            <span
                              className={`employee-payment-badge ${String(
                                payment.payment_method ||
                                  "cash"
                              ).toLowerCase()}`}
                            >
                              {getPaymentIcon(
                                payment.payment_method
                              )}

                              {payment.payment_method}
                            </span>
                          </td>

                          <td>
                            <span className="employee-notes">
                              {payment.notes || "-"}
                            </span>
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>
            )}

            <div className="employee-history-footer">
              <button
                type="button"
                className="employee-secondary-btn"
                onClick={() => {
                  setSelectedEmployeeHistory(null);
                  setEmployeeSalaryHistory(null);
                }}
              >
                <X size={16} />
                Close History
              </button>
            </div>
          </div>
        )}

      {/* =========================
          SALARY PAYMENT HISTORY
      ========================= */}
      <div className="employee-table-card">

        <div className="employee-table-header">
          <div className="employee-table-title">
            <div className="employee-section-icon green">
              <ReceiptText size={18} />
            </div>

            <div>
              <h2>Salary Payment History</h2>
              <p>
                Complete record of employee salary payments.
              </p>
            </div>
          </div>

          <span className="employee-count-badge">
            {salaryPayments.length} Payments
          </span>
        </div>

        {salaryPayments.length === 0 ? (
          <div className="employee-empty-state">
            <div className="employee-empty-icon">
              <ReceiptText size={25} />
            </div>

            <h3>No salary payments found</h3>

            <p>
              Recorded salary payments will appear here.
            </p>
          </div>
        ) : (
          <div className="employee-table-wrapper">
            <table className="employee-table">
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
                      <div className="employee-name-cell">
                        <div className="employee-avatar">
                          <UserRound size={17} />
                        </div>

                        <div>
                          <strong>
                            {payment.employee_name}
                          </strong>

                          <span>
                            Payment #{payment.id}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td>
                      <span className="employee-role-badge">
                        {payment.role}
                      </span>
                    </td>

                    <td>
                      <span className="employee-month">
                        <CalendarDays size={14} />
                        {payment.salary_month}
                      </span>
                    </td>

                    <td>
                      <span className="employee-money paid">
                        {currency} {payment.amount}
                      </span>
                    </td>

                    <td>
                      <span className="employee-date">
                        {payment.payment_date}
                      </span>
                    </td>

                    <td>
                      <span
                        className={`employee-payment-badge ${String(
                          payment.payment_method ||
                            "cash"
                        ).toLowerCase()}`}
                      >
                        {getPaymentIcon(
                          payment.payment_method
                        )}

                        {payment.payment_method}
                      </span>
                    </td>

                    <td>
                      <span className="employee-notes">
                        {payment.notes || "-"}
                      </span>
                    </td>

                    <td>
                      <div className="employee-actions">
                        <button
                          type="button"
                          className="employee-action-btn edit"
                          onClick={() =>
                            handleEditSalaryPayment(
                              payment
                            )
                          }
                          title="Edit payment"
                        >
                          <Pencil size={15} />
                        </button>

                        <button
                          type="button"
                          className="employee-action-btn delete"
                          onClick={() =>
                            handleDeleteSalaryPayment(
                              payment
                            )
                          }
                          title="Delete payment"
                        >
                          <Trash2 size={15} />
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
      <div className="employee-table-card">

        <div className="employee-table-header employee-list-header">

          <div className="employee-table-title">
            <div className="employee-section-icon blue">
              <Users size={18} />
            </div>

            <div>
              <h2>Employee List</h2>
              <p>
                Manage employee profiles, roles and payroll.
              </p>
            </div>
          </div>

          <div className="employee-list-toolbar">

            <div className="employee-search">
              <Search size={17} />

              <input
                type="text"
                placeholder="Search name, phone, role..."
                value={employeeSearch}
                onChange={(e) =>
                  setEmployeeSearch(e.target.value)
                }
              />

              {employeeSearch && (
                <button
                  type="button"
                  onClick={() => setEmployeeSearch("")}
                  title="Clear search"
                >
                  <X size={15} />
                </button>
              )}
            </div>

            <span className="employee-count-badge">
              {filteredEmployees.length} of{" "}
              {employees.length}
            </span>
          </div>
        </div>

        {employees.length === 0 ? (
          <div className="employee-empty-state">
            <div className="employee-empty-icon">
              <Users size={25} />
            </div>

            <h3>No employees found</h3>

            <p>
              Add your first employee to start managing
              payroll.
            </p>
          </div>
        ) : filteredEmployees.length === 0 ? (
          <div className="employee-empty-state">
            <div className="employee-empty-icon">
              <Search size={25} />
            </div>

            <h3>No matching employees</h3>

            <p>
              Try searching with another name, phone or role.
            </p>

            <button
              type="button"
              className="employee-secondary-btn"
              onClick={() => setEmployeeSearch("")}
            >
              <X size={16} />
              Clear Search
            </button>
          </div>
        ) : (
          <div className="employee-table-wrapper">
            <table className="employee-table">
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
                      <div className="employee-name-cell">
                        <div className="employee-avatar">
                          <UserRound size={17} />
                        </div>

                        <div>
                          <strong>{employee.name}</strong>

                          <span>
                            {employee.address || "No address"}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td>
                      <span className="employee-contact">
                        <Phone size={14} />
                        {employee.phone || "-"}
                      </span>
                    </td>

                    <td>
                      <span className="employee-role-badge">
                        {employee.role}
                      </span>
                    </td>

                    <td>
                      <span className="employee-money">
                        {currency} {employee.salary}
                      </span>
                    </td>

                    <td>
                      <span className="employee-date">
                        <CalendarDays size={14} />
                        {employee.joining_date || "-"}
                      </span>
                    </td>

                    <td>
                      <span
                        className={`employee-status-pill ${String(
                          employee.status || ""
                        ).toLowerCase()}`}
                      >
                        <span className="employee-status-dot" />
                        {employee.status}
                      </span>
                    </td>

                    <td>
                      <div className="employee-actions">

                        <button
                          type="button"
                          className="employee-action-btn edit"
                          onClick={() =>
                            handleEditEmployee(employee)
                          }
                          title="Edit employee"
                        >
                          <Pencil size={15} />
                        </button>

                        <button
                          type="button"
                          className="employee-history-btn"
                          onClick={() =>
                            fetchEmployeeSalaryHistory(
                              employee
                            )
                          }
                        >
                          <History size={15} />
                          History
                          <ArrowUpRight size={13} />
                        </button>

                        <button
                          type="button"
                          className="employee-action-btn delete"
                          onClick={() =>
                            handleDeleteEmployee(employee)
                          }
                          title="Delete employee"
                        >
                          <Trash2 size={15} />
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