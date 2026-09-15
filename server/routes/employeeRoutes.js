const express = require("express");
const router = express.Router();

const db = require("../database/db");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

// =====================================================
// ADD EMPLOYEE
// ADMIN ONLY
// =====================================================

router.post(
    "/",
    authMiddleware,
    roleMiddleware("admin"),
    (req, res) => {
        try {
            const {
                name,
                phone,
                address,
                role,
                salary,
                joining_date,
                status
            } = req.body;

            if (!name || !name.trim()) {
                return res.status(400).json({
                    success: false,
                    message: "Employee name is required"
                });
            }

            if (
                salary !== undefined &&
                salary !== "" &&
                (isNaN(Number(salary)) || Number(salary) < 0)
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Salary cannot be negative"
                });
            }

            const result = db.prepare(`
INSERT INTO employees(
    name,
    phone,
    address,
    role,
    salary,
    joining_date,
    status
)
VALUES( ? , ? , ? , ? , ? , ? , ? )
`).run(
                name.trim(),
                phone || null,
                address || null,
                role || "cashier",
                Number(salary || 0),
                joining_date || null,
                status || "active"
            );

            res.status(201).json({
                success: true,
                message: "Employee added successfully",
                data: {
                    id: result.lastInsertRowid
                }
            });

        } catch (error) {
            console.error("Add Employee Error:", error);

            res.status(500).json({
                success: false,
                message: "An unexpected error occurred. Please try again."
            });
        }
    }
);


// =====================================================
// GET ALL EMPLOYEES
// ADMIN + MANAGER
// SALARY HIDDEN FROM MANAGER
// =====================================================

router.get(
    "/",
    authMiddleware,
    roleMiddleware("admin", "manager"),
    (req, res) => {
        try {
            let employees;

            if (req.user.role === "admin") {
                employees = db.prepare(`
SELECT *
    FROM employees
ORDER BY id DESC
    `).all();
            } else {
                employees = db.prepare(`
SELECT
id,
name,
phone,
address,
role,
joining_date,
status
FROM employees
ORDER BY id DESC
    `).all();
            }

            res.json({
                success: true,
                data: employees
            });

        } catch (error) {
            console.error("Get Employees Error:", error);

            res.status(500).json({
                success: false,
                message: "An unexpected error occurred. Please try again."
            });
        }
    }
);


// =====================================================
// GET ALL SALARY PAYMENTS
// ADMIN ONLY
// =====================================================

router.get(
    "/salary-payments",
    authMiddleware,
    roleMiddleware("admin"),
    (req, res) => {
        try {
            const payments = db.prepare(`
SELECT
esp.id,
    esp.employee_id,
    e.name AS employee_name,
    e.role,
    esp.salary_month,
    esp.amount,
    esp.payment_date,
    esp.payment_method,
    esp.notes,
    esp.created_at
FROM employee_salary_payments esp
INNER JOIN employees e
ON esp.employee_id = e.id
ORDER BY esp.id DESC `).all();

            res.json({
                success: true,
                data: payments
            });

        } catch (error) {
            console.error("Get Salary Payments Error:", error);

            res.status(500).json({
                success: false,
                message: "An unexpected error occurred. Please try again."
            });
        }
    }
);


// =====================================================
// ADD EMPLOYEE SALARY PAYMENT
// ADMIN ONLY
// =====================================================

router.post(
    "/salary-payment",
    authMiddleware,
    roleMiddleware("admin"),
    (req, res) => {
        try {
            const {
                employee_id,
                salary_month,
                amount,
                payment_date,
                payment_method,
                notes
            } = req.body;

            if (!employee_id) {
                return res.status(400).json({
                    success: false,
                    message: "Employee ID is required"
                });
            }

            if (!salary_month) {
                return res.status(400).json({
                    success: false,
                    message: "Salary month is required"
                });
            }

            if (!amount || Number(amount) <= 0 || isNaN(Number(amount))) {
                return res.status(400).json({
                    success: false,
                    message: "Valid salary amount is required"
                });
            }

            if (!payment_date) {
                return res.status(400).json({
                    success: false,
                    message: "Payment date is required"
                });
            }

            const employee = db.prepare(`
SELECT id, name
FROM employees
WHERE id = ?
    `).get(employee_id);

            if (!employee) {
                return res.status(404).json({
                    success: false,
                    message: "Employee not found"
                });
            }

            const result = db.prepare(`
INSERT INTO employee_salary_payments(
    employee_id,
    salary_month,
    amount,
    payment_date,
    payment_method,
    notes
)
VALUES( ? , ? , ? , ? , ? , ? )
`).run(
                employee_id,
                salary_month,
                Number(amount),
                payment_date,
                payment_method || "cash",
                notes || null
            );

            res.status(201).json({
                success: true,
                message: "Salary payment recorded successfully",
                data: {
                    id: result.lastInsertRowid,
                    employee_id,
                    employee_name: employee.name
                }
            });

        } catch (error) {
            console.error("Salary Payment Error:", error);

            res.status(500).json({
                success: false,
                message: "An unexpected error occurred. Please try again."
            });
        }
    }
);


// =====================================================
// EMPLOYEE SALARY SUMMARY
// ADMIN ONLY
// =====================================================

router.get(
    "/salary-summary",
    authMiddleware,
    roleMiddleware("admin"),
    (req, res) => {
        try {
            const currentMonth = new Date().toISOString().slice(0, 7);

            const employees = db.prepare(`
SELECT
e.id,
    e.name,
    e.role,
    e.salary,
    e.status,

    COALESCE(
        SUM(
            CASE WHEN esp.salary_month = ?
            THEN esp.amount ELSE 0 END
        ),
        0
    ) AS paid_this_month,

    COALESCE(
        SUM(esp.amount),
        0
    ) AS total_paid

FROM employees e

LEFT JOIN employee_salary_payments esp
ON e.id = esp.employee_id

GROUP BY
e.id,
    e.name,
    e.role,
    e.salary,
    e.status

ORDER BY e.id DESC `).all(currentMonth);

            const summary = employees.map(employee => {
                const monthlySalary = Number(employee.salary || 0);
                const paidThisMonth = Number(employee.paid_this_month || 0);

                const remainingSalary = Math.max(
                    monthlySalary - paidThisMonth,
                    0
                );

                let paymentStatus = "Unpaid";

                if (paidThisMonth >= monthlySalary && monthlySalary > 0) {
                    paymentStatus = "Paid";
                } else if (paidThisMonth > 0) {
                    paymentStatus = "Partial";
                }

                return {
                    id: employee.id,
                    name: employee.name,
                    role: employee.role,
                    salary: monthlySalary,
                    paid_this_month: paidThisMonth,
                    remaining_salary: remainingSalary,
                    total_paid: Number(employee.total_paid || 0),
                    status: employee.status,
                    payment_status: paymentStatus
                };
            });

            const totals = summary.reduce(
                (acc, employee) => {
                    acc.total_monthly_salary += employee.salary;
                    acc.total_paid_this_month += employee.paid_this_month;
                    acc.total_remaining_salary += employee.remaining_salary;
                    acc.total_paid += employee.total_paid;

                    return acc;
                }, {
                    total_monthly_salary: 0,
                    total_paid_this_month: 0,
                    total_remaining_salary: 0,
                    total_paid: 0
                }
            );

            res.json({
                success: true,
                data: {
                    month: currentMonth,
                    summary: totals,
                    employees: summary
                }
            });

        } catch (error) {
            console.error("Employee Salary Summary Error:", error);

            res.status(500).json({
                success: false,
                message: "An unexpected error occurred. Please try again."
            });
        }
    }
);


// =====================================================
// EMPLOYEE SALARY DASHBOARD STATS
// ADMIN ONLY
// =====================================================

router.get(
    "/salary-stats",
    authMiddleware,
    roleMiddleware("admin"),
    (req, res) => {
        try {
            const currentMonth = new Date().toISOString().slice(0, 7);

            const stats = db.prepare(`
SELECT
COUNT( * ) AS total_employees,

    COALESCE(
        SUM(salary),
        0
    ) AS total_monthly_salary,

    COALESCE(
        SUM(
            CASE WHEN status = 'active'
            THEN salary ELSE 0 END
        ),
        0
    ) AS active_monthly_salary

FROM employees
    `).get();

            const paymentStats = db.prepare(`
SELECT
COUNT(DISTINCT employee_id) AS employees_paid,

    COALESCE(
        SUM(amount),
        0
    ) AS total_paid_this_month

FROM employee_salary_payments
WHERE salary_month = ?
    `).get(currentMonth);

            const activeEmployees = db.prepare(`
SELECT
COUNT( * ) AS total
FROM employees
WHERE status = 'active'
`).get();

            const paidEmployees = db.prepare(`
SELECT
COUNT( * ) AS total
FROM employees e
WHERE e.status = 'active'
AND EXISTS(
    SELECT 1 FROM employee_salary_payments esp WHERE esp.employee_id = e.id AND esp.salary_month = ?
)
`).get(currentMonth);

            const partialEmployees = db.prepare(`
SELECT COUNT( * ) AS total
FROM employees e
WHERE e.status = 'active'
AND(
    SELECT COALESCE(SUM(esp.amount), 0) FROM employee_salary_payments esp WHERE esp.employee_id = e.id AND esp.salary_month = ?
) > 0
AND(
    SELECT COALESCE(SUM(esp.amount), 0) FROM employee_salary_payments esp WHERE esp.employee_id = e.id AND esp.salary_month = ?
) < e.salary `).get(currentMonth, currentMonth);

            const unpaidEmployees = Math.max(
                Number(activeEmployees.total || 0) -
                Number(paidEmployees.total || 0),
                0
            );

            const totalRemainingSalary = Math.max(
                Number(stats.active_monthly_salary || 0) -
                Number(paymentStats.total_paid_this_month || 0),
                0
            );

            res.json({
                success: true,
                data: {
                    month: currentMonth,

                    total_employees: Number(stats.total_employees || 0),

                    active_employees: Number(activeEmployees.total || 0),

                    total_monthly_salary: Number(stats.active_monthly_salary || 0),

                    total_paid_this_month: Number(paymentStats.total_paid_this_month || 0),

                    total_remaining_salary: totalRemainingSalary,

                    paid_employees: Number(paidEmployees.total || 0),

                    partial_paid_employees: Number(partialEmployees.total || 0),

                    unpaid_employees: unpaidEmployees
                }
            });

        } catch (error) {
            console.error("Employee Salary Stats Error:", error);

            res.status(500).json({
                success: false,
                message: "An unexpected error occurred. Please try again."
            });
        }
    }
);


// =====================================================
// GET EMPLOYEE SALARY HISTORY
// ADMIN ONLY
// =====================================================

router.get(
    "/:id/salary-payments",
    authMiddleware,
    roleMiddleware("admin"),
    (req, res) => {
        try {
            const employee = db.prepare(`
SELECT
id,
name,
role,
salary
FROM employees
WHERE id = ?
    `).get(req.params.id);

            if (!employee) {
                return res.status(404).json({
                    success: false,
                    message: "Employee not found"
                });
            }

            const payments = db.prepare(`
SELECT
id,
salary_month,
amount,
payment_date,
payment_method,
notes,
created_at
FROM employee_salary_payments
WHERE employee_id = ?
    ORDER BY payment_date DESC, id DESC `).all(req.params.id);

            const totalPaid = db.prepare(`
SELECT
COALESCE(SUM(amount), 0) AS total
FROM employee_salary_payments
WHERE employee_id = ?
    `).get(req.params.id);

            res.json({
                success: true,
                data: {
                    employee: {
                        id: employee.id,
                        name: employee.name,
                        role: employee.role,
                        salary: employee.salary
                    },
                    summary: {
                        total_payments: payments.length,
                        total_paid: Number(totalPaid.total || 0)
                    },
                    payments
                }
            });

        } catch (error) {
            console.error("Get Employee Salary History Error:", error);

            res.status(500).json({
                success: false,
                message: "An unexpected error occurred. Please try again."
            });
        }
    }
);


// =====================================================
// GET SINGLE EMPLOYEE
// ADMIN + MANAGER
// SALARY HIDDEN FROM MANAGER
// =====================================================

router.get(
    "/:id",
    authMiddleware,
    roleMiddleware("admin", "manager"),
    (req, res) => {
        try {
            let employee;

            if (req.user.role === "admin") {
                employee = db.prepare(`
SELECT *
    FROM employees
WHERE id = ?
    `).get(req.params.id);
            } else {
                employee = db.prepare(`
SELECT
id,
name,
phone,
address,
role,
joining_date,
status
FROM employees
WHERE id = ?
    `).get(req.params.id);
            }

            if (!employee) {
                return res.status(404).json({
                    success: false,
                    message: "Employee not found"
                });
            }

            res.json({
                success: true,
                data: employee
            });

        } catch (error) {
            console.error("Get Employee Error:", error);

            res.status(500).json({
                success: false,
                message: "An unexpected error occurred. Please try again."
            });
        }
    }
);


// =====================================================
// UPDATE EMPLOYEE
// ADMIN ONLY
// =====================================================

router.put(
    "/:id",
    authMiddleware,
    roleMiddleware("admin"),
    (req, res) => {
        try {
            const {
                name,
                phone,
                address,
                role,
                salary,
                joining_date,
                status
            } = req.body;

            const employee = db.prepare(`
SELECT *
    FROM employees
WHERE id = ?
    `).get(req.params.id);

            if (!employee) {
                return res.status(404).json({
                    success: false,
                    message: "Employee not found"
                });
            }

            if (
                salary !== undefined &&
                salary !== "" &&
                (isNaN(Number(salary)) || Number(salary) < 0)
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Salary cannot be negative"
                });
            }

            db.prepare(`
UPDATE employees
SET
name = ? ,
    phone = ? ,
    address = ? ,
    role = ? ,
    salary = ? ,
    joining_date = ? ,
    status = ?
    WHERE id = ?
    `).run(
                name ? name.trim() : employee.name,
                phone !== undefined ? phone : employee.phone,
                address !== undefined ? address : employee.address,
                role ? role : employee.role,
                salary !== undefined ?
                Number(salary) :
                employee.salary,
                joining_date !== undefined ?
                joining_date :
                employee.joining_date,
                status ? status : employee.status,
                req.params.id
            );

            res.json({
                success: true,
                message: "Employee updated successfully"
            });

        } catch (error) {
            console.error("Update Employee Error:", error);

            res.status(500).json({
                success: false,
                message: "An unexpected error occurred. Please try again."
            });
        }
    }
);


// =====================================================
// UPDATE EMPLOYEE SALARY PAYMENT
// ADMIN ONLY
// =====================================================

router.put(
    "/salary-payment/:id",
    authMiddleware,
    roleMiddleware("admin"),
    (req, res) => {
        try {
            const {
                salary_month,
                amount,
                payment_date,
                payment_method,
                notes
            } = req.body;

            const payment = db.prepare(`
SELECT *
    FROM employee_salary_payments
WHERE id = ?
    `).get(req.params.id);

            if (!payment) {
                return res.status(404).json({
                    success: false,
                    message: "Salary payment not found"
                });
            }

            if (
                amount !== undefined &&
                (Number(amount) <= 0 || isNaN(Number(amount)))
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Valid salary amount is required"
                });
            }

            db.prepare(`
UPDATE employee_salary_payments
SET
salary_month = ? ,
    amount = ? ,
    payment_date = ? ,
    payment_method = ? ,
    notes = ?
    WHERE id = ?
    `).run(
                salary_month ?
                salary_month :
                payment.salary_month,

                amount !== undefined ?
                Number(amount) :
                payment.amount,

                payment_date ?
                payment_date :
                payment.payment_date,

                payment_method ?
                payment_method :
                payment.payment_method,

                notes !== undefined ?
                notes :
                payment.notes,

                req.params.id
            );

            res.json({
                success: true,
                message: "Salary payment updated successfully"
            });

        } catch (error) {
            console.error("Update Salary Payment Error:", error);

            res.status(500).json({
                success: false,
                message: "An unexpected error occurred. Please try again."
            });
        }
    }
);


// =====================================================
// DELETE EMPLOYEE SALARY PAYMENT
// ADMIN ONLY
// =====================================================

router.delete(
    "/salary-payment/:id",
    authMiddleware,
    roleMiddleware("admin"),
    (req, res) => {
        try {
            const payment = db.prepare(`
SELECT *
    FROM employee_salary_payments
WHERE id = ?
    `).get(req.params.id);

            if (!payment) {
                return res.status(404).json({
                    success: false,
                    message: "Salary payment not found"
                });
            }

            db.prepare(`
DELETE FROM employee_salary_payments
WHERE id = ?
    `).run(req.params.id);

            res.json({
                success: true,
                message: "Salary payment deleted successfully"
            });

        } catch (error) {
            console.error("Delete Salary Payment Error:", error);

            res.status(500).json({
                success: false,
                message: "An unexpected error occurred. Please try again."
            });
        }
    }
);


// =====================================================
// DELETE EMPLOYEE
// ADMIN ONLY
// =====================================================

router.delete(
    "/:id",
    authMiddleware,
    roleMiddleware("admin"),
    (req, res) => {
        try {
            const employee = db.prepare(`
SELECT *
    FROM employees
WHERE id = ?
    `).get(req.params.id);

            if (!employee) {
                return res.status(404).json({
                    success: false,
                    message: "Employee not found"
                });
            }

            db.prepare(`
DELETE FROM employees
WHERE id = ?
    `).run(req.params.id);

            res.json({
                success: true,
                message: "Employee deleted successfully"
            });

        } catch (error) {
            console.error("Delete Employee Error:", error);

            res.status(500).json({
                success: false,
                message: "An unexpected error occurred. Please try again."
            });
        }
    }
);


// =====================================================
// EXPORT ROUTER
// =====================================================

module.exports = router;