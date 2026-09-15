const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const db = require("../database/db");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const router = express.Router();


// =====================================================
// GET ALL USERS
// ADMIN ONLY
// =====================================================
router.get(
    "/",
    authMiddleware,
    roleMiddleware("admin"),
    (req, res) => {
        try {
            const users = db.prepare(`
                SELECT
                    id,
                    username,
                    role,
                    status
                FROM users
                ORDER BY id ASC
            `).all();

            return res.json({
                success: true,
                data: users
            });

        } catch (error) {
            console.error("Get Users Error:", error);

            return res.status(500).json({
                success: false,
                message: "Unable to load users"
            });
        }
    }
);


// =====================================================
// CREATE USER
// ADMIN ONLY
// =====================================================
router.post(
    "/",
    authMiddleware,
    roleMiddleware("admin"),
    async(req, res) => {
        try {
            let {
                username,
                password,
                role
            } = req.body;

            // -----------------------------
            // BASIC VALIDATION
            // -----------------------------
            if (
                typeof username !== "string" ||
                typeof password !== "string"
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Username and password are required"
                });
            }

            username = username.trim().toLowerCase();

            if (!username || !password) {
                return res.status(400).json({
                    success: false,
                    message: "Username and password are required"
                });
            }

            // -----------------------------
            // USERNAME VALIDATION
            // -----------------------------
            if (username.length < 3 || username.length > 50) {
                return res.status(400).json({
                    success: false,
                    message: "Username must be between 3 and 50 characters"
                });
            }

            // -----------------------------
            // PASSWORD VALIDATION
            // -----------------------------
            if (password.length < 6) {
                return res.status(400).json({
                    success: false,
                    message: "Password must be at least 6 characters"
                });
            }

            // -----------------------------
            // ALLOWED ROLES
            // -----------------------------
            const allowedRoles = [
                "admin",
                "manager",
                "cashier"
            ];

            role = role ?
                String(role).trim().toLowerCase() :
                "cashier";

            if (!allowedRoles.includes(role)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid role"
                });
            }

            // -----------------------------
            // CHECK EXISTING USER
            // -----------------------------
            const existingUser = db.prepare(`
                SELECT id
                FROM users
                WHERE LOWER(username) = ?
            `).get(username);

            if (existingUser) {
                return res.status(409).json({
                    success: false,
                    message: "Username already exists"
                });
            }

            // -----------------------------
            // HASH PASSWORD
            // -----------------------------
            const hashedPassword = await bcrypt.hash(
                password,
                10
            );

            // -----------------------------
            // CREATE USER
            // -----------------------------
            const result = db.prepare(`
                INSERT INTO users (
                    username,
                    password,
                    role
                )
                VALUES (?, ?, ?)
            `).run(
                username,
                hashedPassword,
                role
            );

            return res.status(201).json({
                success: true,
                message: "User created successfully",
                data: {
                    id: result.lastInsertRowid,
                    username,
                    role
                }
            });

        } catch (error) {
            console.error("User Creation Error:", error);

            return res.status(500).json({
                success: false,
                message: "An unexpected error occurred. Please try again."
            });
        }
    }
);


// =====================================================
// RESET USER PASSWORD
// ADMIN ONLY
// =====================================================
router.put(
    "/:id/reset-password",
    authMiddleware,
    roleMiddleware("admin"),
    async(req, res) => {
        try {
            const userId = Number(req.params.id);
            const { password } = req.body;

            // -----------------------------
            // VALIDATE USER ID
            // -----------------------------
            if (!Number.isInteger(userId) || userId <= 0) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid user ID"
                });
            }

            // -----------------------------
            // VALIDATE PASSWORD
            // -----------------------------
            if (
                typeof password !== "string" ||
                password.length < 6
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Password must be at least 6 characters"
                });
            }

            // -----------------------------
            // CHECK USER
            // -----------------------------
            const user = db.prepare(`
                SELECT
                    id,
                    username,
                    role
                FROM users
                WHERE id = ?
            `).get(userId);

            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: "User not found"
                });
            }

            // -----------------------------
            // HASH NEW PASSWORD
            // -----------------------------
            const hashedPassword = await bcrypt.hash(
                password,
                10
            );

            // -----------------------------
            // UPDATE PASSWORD
            // -----------------------------
            db.prepare(`
                UPDATE users
                SET password = ?
                WHERE id = ?
            `).run(
                hashedPassword,
                userId
            );

            return res.json({
                success: true,
                message: "User password reset successfully",
                data: {
                    id: user.id,
                    username: user.username,
                    role: user.role
                }
            });

        } catch (error) {
            console.error("Password Reset Error:", error);

            return res.status(500).json({
                success: false,
                message: "Unable to reset user password"
            });
        }
    }
);


// =====================================================
// DELETE USER
// ADMIN ONLY
// =====================================================
router.delete(
    "/:id",
    authMiddleware,
    roleMiddleware("admin"),
    (req, res) => {
        try {
            const userId = Number(req.params.id);

            // -----------------------------
            // VALIDATE USER ID
            // -----------------------------
            if (!Number.isInteger(userId) || userId <= 0) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid user ID"
                });
            }

            // -----------------------------
            // PREVENT ADMIN FROM
            // DELETING OWN ACCOUNT
            // -----------------------------
            if (Number(req.user.id) === userId) {
                return res.status(400).json({
                    success: false,
                    message: "You cannot delete your own account"
                });
            }

            // -----------------------------
            // CHECK USER
            // -----------------------------
            const user = db.prepare(`
                SELECT
                    id,
                    username,
                    role
                FROM users
                WHERE id = ?
            `).get(userId);

            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: "User not found"
                });
            }

            // -----------------------------
            // DELETE USER
            // -----------------------------
            db.prepare(`
                DELETE FROM users
                WHERE id = ?
            `).run(userId);

            return res.json({
                success: true,
                message: "User deleted successfully",
                data: {
                    id: user.id,
                    username: user.username,
                    role: user.role
                }
            });

        } catch (error) {
            console.error("Delete User Error:", error);

            return res.status(500).json({
                success: false,
                message: "Unable to delete user"
            });
        }
    }
);


// =====================================================
// LOGIN
// PUBLIC ROUTE
// =====================================================
router.post("/login", async(req, res) => {
    try {
        let {
            username,
            password
        } = req.body;

        // -----------------------------
        // BASIC VALIDATION
        // -----------------------------
        if (
            typeof username !== "string" ||
            typeof password !== "string"
        ) {
            return res.status(400).json({
                success: false,
                message: "Username and password are required"
            });
        }

        username = username.trim().toLowerCase();

        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: "Username and password are required"
            });
        }

        // -----------------------------
        // JWT SECRET CHECK
        // -----------------------------
        if (!process.env.JWT_SECRET) {
            console.error("JWT_SECRET is missing");

            return res.status(500).json({
                success: false,
                message: "Server configuration error"
            });
        }

        // -----------------------------
        // FIND ACTIVE USER
        // -----------------------------
        const user = db.prepare(`
            SELECT
                id,
                username,
                password,
                role,
                status
            FROM users
            WHERE LOWER(username) = ?
              AND status = 'active'
        `).get(username);

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Invalid username or password"
            });
        }

        // -----------------------------
        // VERIFY PASSWORD
        // -----------------------------
        const passwordMatch = await bcrypt.compare(
            password,
            user.password
        );

        if (!passwordMatch) {
            return res.status(401).json({
                success: false,
                message: "Invalid username or password"
            });
        }

        // -----------------------------
        // CREATE JWT
        // -----------------------------
        const token = jwt.sign({
                id: user.id,
                username: user.username,
                role: user.role
            },
            process.env.JWT_SECRET, {
                expiresIn: "1d"
            }
        );

        // -----------------------------
        // LOGIN SUCCESS
        // -----------------------------
        return res.json({
            success: true,
            message: "Login successful",
            data: {
                id: user.id,
                username: user.username,
                role: user.role,
                status: user.status,
                token
            }
        });

    } catch (error) {
        console.error("Login Error:", error);

        return res.status(500).json({
            success: false,
            message: "An unexpected error occurred. Please try again."
        });
    }
});


module.exports = router;