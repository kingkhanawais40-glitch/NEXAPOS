import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  KeyRound,
  Trash2,
  X,
  RefreshCw,
  Users,
  ShieldCheck,
  UserCheck,
  UserX,
  LockKeyhole,
  Search,
  Shield,
  UserRound,
  Crown,
  BriefcaseBusiness,
  CircleCheck,
  CircleAlert,
} from "lucide-react";

import api from "../services/api";
import { useAuth } from "../context/AuthContext";

function UserManagement() {
  const { user: currentUser } = useAuth();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);

  const [selectedUser, setSelectedUser] = useState(null);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("cashier");

  const [newPassword, setNewPassword] = useState("");

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [actionLoading, setActionLoading] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");

  // ===============================
  // LOAD USERS
  // ===============================
  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/users");

      setUsers(response.data.data || []);
    } catch (err) {
      setError(
        err.response?.data?.message || "Unable to load users."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // ===============================
  // CREATE USER
  // ===============================
  const handleCreateUser = async (e) => {
    e.preventDefault();

    setMessage("");
    setError("");

    if (!username.trim() || !password) {
      setError("Username and password are required.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    try {
      setActionLoading(true);

      const response = await api.post("/users", {
        username: username.trim(),
        password,
        role,
      });

      setMessage(
        response.data.message || "User created successfully."
      );

      setUsername("");
      setPassword("");
      setRole("cashier");

      setShowCreateModal(false);

      fetchUsers();
    } catch (err) {
      setError(
        err.response?.data?.message || "Unable to create user."
      );
    } finally {
      setActionLoading(false);
    }
  };

  // ===============================
  // RESET PASSWORD
  // ===============================
  const openResetModal = (user) => {
    setSelectedUser(user);
    setNewPassword("");
    setMessage("");
    setError("");
    setShowResetModal(true);
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();

    setMessage("");
    setError("");

    if (!newPassword) {
      setError("New password is required.");
      return;
    }

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    try {
      setActionLoading(true);

      const response = await api.put(
        `/users/${selectedUser.id}/reset-password`,
        {
          password: newPassword,
        }
      );

      setMessage(
        response.data.message ||
          "Password reset successfully."
      );

      setNewPassword("");
      setShowResetModal(false);

      fetchUsers();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to reset password."
      );
    } finally {
      setActionLoading(false);
    }
  };

  // ===============================
  // DELETE USER
  // ===============================
  const handleDeleteUser = async (user) => {
    setMessage("");
    setError("");

    // Prevent deleting currently logged-in user
    if (
      Number(user.id) === Number(currentUser?.id)
    ) {
      setError("You cannot delete your own account.");
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to delete user "${user.username}"?\n\nThis action cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingUserId(user.id);

      const response = await api.delete(
        `/users/${user.id}`
      );

      setMessage(
        response.data.message ||
          "User deleted successfully."
      );

      fetchUsers();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to delete user."
      );
    } finally {
      setDeletingUserId(null);
    }
  };

  // ===============================
  // CLOSE MODALS
  // ===============================
  const closeCreateModal = () => {
    if (actionLoading) return;

    setShowCreateModal(false);
    setUsername("");
    setPassword("");
    setRole("cashier");
  };

  const closeResetModal = () => {
    if (actionLoading) return;

    setShowResetModal(false);
    setSelectedUser(null);
    setNewPassword("");
  };

  // ===============================
  // FILTER USERS
  // ===============================
  const filteredUsers = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    if (!query) {
      return users;
    }

    return users.filter((user) => {
      return (
        String(user.id).toLowerCase().includes(query) ||
        String(user.username || "")
          .toLowerCase()
          .includes(query) ||
        String(user.role || "")
          .toLowerCase()
          .includes(query) ||
        String(user.status || "active")
          .toLowerCase()
          .includes(query)
      );
    });
  }, [users, searchTerm]);

  // ===============================
  // USER STATS
  // ===============================
  const totalUsers = users.length;

  const activeUsers = users.filter(
    (user) => (user.status || "active").toLowerCase() === "active"
  ).length;

  const inactiveUsers = users.filter(
    (user) => (user.status || "active").toLowerCase() === "inactive"
  ).length;

  const adminUsers = users.filter(
    (user) => user.role?.toLowerCase() === "admin"
  ).length;

  const managerUsers = users.filter(
    (user) => user.role?.toLowerCase() === "manager"
  ).length;

  const cashierUsers = users.filter(
    (user) => user.role?.toLowerCase() === "cashier"
  ).length;

  // ===============================
  // ROLE ICON
  // ===============================
  const getRoleIcon = (userRole) => {
    switch (userRole?.toLowerCase()) {
      case "admin":
        return Crown;

      case "manager":
        return BriefcaseBusiness;

      case "cashier":
        return UserRound;

      default:
        return Shield;
    }
  };

  return (
    <div className="users-page">

      {/* ===============================
          PAGE HEADER
      =============================== */}
      <div className="users-page-header">

        <div className="users-header-content">

          <div className="users-eyebrow">
            <ShieldCheck size={15} />
            <span>Security & Access Control</span>
          </div>

          <h1>User Management</h1>

          <p>
            Manage system users, passwords, roles and access permissions.
          </p>
        </div>

        <div className="users-header-actions">

          <button
            type="button"
            className="users-refresh-btn"
            onClick={fetchUsers}
            disabled={loading}
          >
            <RefreshCw
              size={17}
              className={loading ? "users-spin" : ""}
            />
            Refresh
          </button>

          <button
            type="button"
            className="users-create-btn"
            onClick={() => {
              setMessage("");
              setError("");
              setShowCreateModal(true);
            }}
          >
            <Plus size={18} />
            Create User
          </button>

        </div>
      </div>

      {/* ===============================
          ALERTS
      =============================== */}
      {message && (
        <div className="users-alert users-alert-success">
          <div className="users-alert-icon">
            <CircleCheck size={19} />
          </div>

          <div>
            <strong>Success</strong>
            <p>{message}</p>
          </div>

          <button
            type="button"
            onClick={() => setMessage("")}
            className="users-alert-close"
          >
            <X size={17} />
          </button>
        </div>
      )}

      {error && (
        <div className="users-alert users-alert-error">
          <div className="users-alert-icon">
            <CircleAlert size={19} />
          </div>

          <div>
            <strong>Action Failed</strong>
            <p>{error}</p>
          </div>

          <button
            type="button"
            onClick={() => setError("")}
            className="users-alert-close"
          >
            <X size={17} />
          </button>
        </div>
      )}

      {/* ===============================
          KPI CARDS
      =============================== */}
      <div className="users-kpi-grid">

        <div className="users-kpi-card blue">
          <div className="users-kpi-top">
            <div className="users-kpi-icon">
              <Users size={21} />
            </div>

            <span className="users-kpi-label">
              Total Users
            </span>
          </div>

          <div className="users-kpi-value">
            {totalUsers}
          </div>

          <div className="users-kpi-footer">
            All system accounts
          </div>
        </div>

        <div className="users-kpi-card green">
          <div className="users-kpi-top">
            <div className="users-kpi-icon">
              <UserCheck size={21} />
            </div>

            <span className="users-kpi-label">
              Active Users
            </span>
          </div>

          <div className="users-kpi-value">
            {activeUsers}
          </div>

          <div className="users-kpi-footer">
            Currently active
          </div>
        </div>

        <div className="users-kpi-card purple">
          <div className="users-kpi-top">
            <div className="users-kpi-icon">
              <Shield size={21} />
            </div>

            <span className="users-kpi-label">
              Admins
            </span>
          </div>

          <div className="users-kpi-value">
            {adminUsers}
          </div>

          <div className="users-kpi-footer">
            Administrative access
          </div>
        </div>

        <div className="users-kpi-card amber">
          <div className="users-kpi-top">
            <div className="users-kpi-icon">
              <BriefcaseBusiness size={21} />
            </div>

            <span className="users-kpi-label">
              Managers
            </span>
          </div>

          <div className="users-kpi-value">
            {managerUsers}
          </div>

          <div className="users-kpi-footer">
            Management accounts
          </div>
        </div>

        <div className="users-kpi-card slate">
          <div className="users-kpi-top">
            <div className="users-kpi-icon">
              <UserRound size={21} />
            </div>

            <span className="users-kpi-label">
              Cashiers
            </span>
          </div>

          <div className="users-kpi-value">
            {cashierUsers}
          </div>

          <div className="users-kpi-footer">
            POS access accounts
          </div>
        </div>

        <div className="users-kpi-card red">
          <div className="users-kpi-top">
            <div className="users-kpi-icon">
              <UserX size={21} />
            </div>

            <span className="users-kpi-label">
              Inactive
            </span>
          </div>

          <div className="users-kpi-value">
            {inactiveUsers}
          </div>

          <div className="users-kpi-footer">
            Disabled accounts
          </div>
        </div>

      </div>

      {/* ===============================
          USERS TABLE
      =============================== */}
      <div className="users-table-card">

        <div className="users-table-header">

          <div className="users-table-title">

            <div className="users-section-icon">
              <Users size={19} />
            </div>

            <div>
              <h2>System Users</h2>
              <p>
                Manage accounts and security access
              </p>
            </div>

          </div>

          <span className="users-count-badge">
            {filteredUsers.length}{" "}
            {filteredUsers.length === 1 ? "User" : "Users"}
          </span>

        </div>

        <div className="users-toolbar">

          <div className="users-search">
            <Search size={18} />

            <input
              type="text"
              value={searchTerm}
              onChange={(e) =>
                setSearchTerm(e.target.value)
              }
              placeholder="Search username, role, status..."
            />

            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="users-search-clear"
              >
                <X size={16} />
              </button>
            )}
          </div>

          <div className="users-security-note">
            <LockKeyhole size={16} />
            <span>Protected user accounts</span>
          </div>

        </div>

        <div className="users-table-wrapper">

          {loading ? (
            <div className="users-state-card">

              <div className="users-loading-icon">
                <RefreshCw size={25} />
              </div>

              <h3>Loading users...</h3>

              <p>
                Fetching system accounts and access information.
              </p>

            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="users-state-card">

              <div className="users-empty-icon">
                <Users size={27} />
              </div>

              <h3>
                {searchTerm
                  ? "No matching users"
                  : "No users found"}
              </h3>

              <p>
                {searchTerm
                  ? "Try a different search term."
                  : "Create your first system user to get started."}
              </p>

            </div>
          ) : (
            <table className="users-table">

              <thead>
                <tr>
                  <th>ID</th>
                  <th>User</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th className="users-actions-heading">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>

                {filteredUsers.map((user) => {

                  const isCurrentUser =
                    Number(user.id) ===
                    Number(currentUser?.id);

                  const RoleIcon =
                    getRoleIcon(user.role);

                  const userStatus =
                    user.status || "active";

                  const isActive =
                    userStatus.toLowerCase() === "active";

                  return (
                    <tr key={user.id}>

                      <td>
                        <span className="user-id">
                          #{user.id}
                        </span>
                      </td>

                      <td>

                        <div className="user-name-cell">

                          <div className="user-avatar">
                            <UserRound size={18} />
                          </div>

                          <div className="user-identity">

                            <strong>
                              {user.username}
                            </strong>

                            {isCurrentUser && (
                              <span className="current-user-badge">
                                <UserCheck size={12} />
                                You
                              </span>
                            )}

                          </div>

                        </div>

                      </td>

                      <td>

                        <span
                          className={`user-role-badge ${(
                            user.role || "cashier"
                          ).toLowerCase()}`}
                        >
                          <RoleIcon size={14} />

                          {user.role || "cashier"}
                        </span>

                      </td>

                      <td>

                        <span
                          className={`user-status-pill ${
                            isActive
                              ? "active"
                              : "inactive"
                          }`}
                        >
                          <span className="user-status-dot" />

                          {userStatus}
                        </span>

                      </td>

                      <td>

                        <div className="user-actions">

                          <button
                            type="button"
                            className="user-action-btn reset"
                            onClick={() =>
                              openResetModal(user)
                            }
                            title="Reset password"
                          >
                            <KeyRound size={16} />
                            <span>Reset Password</span>
                          </button>

                          <button
                            type="button"
                            className="user-action-btn delete"
                            onClick={() =>
                              handleDeleteUser(user)
                            }
                            disabled={
                              isCurrentUser ||
                              deletingUserId === user.id
                            }
                            title={
                              isCurrentUser
                                ? "You cannot delete your own account"
                                : "Delete user"
                            }
                          >
                            <Trash2 size={16} />

                            <span>
                              {deletingUserId === user.id
                                ? "Deleting..."
                                : "Delete"}
                            </span>
                          </button>

                        </div>

                      </td>

                    </tr>
                  );
                })}

              </tbody>

            </table>
          )}

        </div>

      </div>

      {/* ===============================
          CREATE USER MODAL
      =============================== */}
      {showCreateModal && (
        <div className="users-modal-overlay">

          <div className="users-modal">

            <div className="users-modal-header">

              <div className="users-modal-title">

                <div className="users-modal-icon blue">
                  <Plus size={20} />
                </div>

                <div>
                  <h2>Create User</h2>
                  <p>
                    Add a new system account
                  </p>
                </div>

              </div>

              <button
                type="button"
                className="users-modal-close"
                onClick={closeCreateModal}
                disabled={actionLoading}
              >
                <X size={19} />
              </button>

            </div>

            <div className="users-modal-security">
              <ShieldCheck size={17} />

              <span>
                Create an account with the appropriate access role.
              </span>
            </div>

            <form
              onSubmit={handleCreateUser}
              className="users-modal-form"
            >

              <div className="users-form-group">

                <label>
                  Username
                </label>

                <input
                  type="text"
                  value={username}
                  onChange={(e) =>
                    setUsername(e.target.value)
                  }
                  placeholder="Enter username"
                  disabled={actionLoading}
                  autoComplete="off"
                />

              </div>

              <div className="users-form-group">

                <label>
                  Password
                </label>

                <input
                  type="password"
                  value={password}
                  onChange={(e) =>
                    setPassword(e.target.value)
                  }
                  placeholder="Minimum 6 characters"
                  disabled={actionLoading}
                  autoComplete="new-password"
                />

                <span className="users-field-help">
                  Password must contain at least 6 characters.
                </span>

              </div>

              <div className="users-form-group">

                <label>
                  Role
                </label>

                <select
                  value={role}
                  onChange={(e) =>
                    setRole(e.target.value)
                  }
                  disabled={actionLoading}
                >
                  <option value="admin">
                    Admin
                  </option>

                  <option value="manager">
                    Manager
                  </option>

                  <option value="cashier">
                    Cashier
                  </option>
                </select>

              </div>

              <div className="users-role-info">

                <div className="users-role-info-icon">
                  <Shield size={17} />
                </div>

                <div>
                  <strong>
                    {role.charAt(0).toUpperCase() +
                      role.slice(1)}{" "}
                    access
                  </strong>

                  <p>
                    User permissions are controlled by the selected role.
                  </p>
                </div>

              </div>

              <div className="users-modal-actions">

                <button
                  type="button"
                  className="users-cancel-btn"
                  onClick={closeCreateModal}
                  disabled={actionLoading}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="users-submit-btn"
                  disabled={actionLoading}
                >
                  {actionLoading ? (
                    <>
                      <RefreshCw
                        size={17}
                        className="users-spin"
                      />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus size={17} />
                      Create User
                    </>
                  )}
                </button>

              </div>

            </form>

          </div>

        </div>
      )}

      {/* ===============================
          RESET PASSWORD MODAL
      =============================== */}
      {showResetModal && selectedUser && (
        <div className="users-modal-overlay">

          <div className="users-modal">

            <div className="users-modal-header">

              <div className="users-modal-title">

                <div className="users-modal-icon amber">
                  <KeyRound size={20} />
                </div>

                <div>
                  <h2>Reset Password</h2>
                  <p>
                    Update account password
                  </p>
                </div>

              </div>

              <button
                type="button"
                className="users-modal-close"
                onClick={closeResetModal}
                disabled={actionLoading}
              >
                <X size={19} />
              </button>

            </div>

            <div className="users-reset-user">

              <div className="users-reset-avatar">
                <UserRound size={19} />
              </div>

              <div>
                <span>Resetting password for</span>
                <strong>
                  {selectedUser.username}
                </strong>
              </div>

            </div>

            <div className="users-modal-security warning">
              <LockKeyhole size={17} />

              <span>
                The new password must contain at least 6 characters.
              </span>
            </div>

            <form
              onSubmit={handleResetPassword}
              className="users-modal-form"
            >

              <div className="users-form-group">

                <label>
                  New Password
                </label>

                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) =>
                    setNewPassword(e.target.value)
                  }
                  placeholder="Minimum 6 characters"
                  disabled={actionLoading}
                  autoComplete="new-password"
                  autoFocus
                />

              </div>

              <div className="users-modal-actions">

                <button
                  type="button"
                  className="users-cancel-btn"
                  onClick={closeResetModal}
                  disabled={actionLoading}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="users-submit-btn reset"
                  disabled={actionLoading}
                >
                  {actionLoading ? (
                    <>
                      <RefreshCw
                        size={17}
                        className="users-spin"
                      />
                      Resetting...
                    </>
                  ) : (
                    <>
                      <KeyRound size={17} />
                      Reset Password
                    </>
                  )}
                </button>

              </div>

            </form>

          </div>

        </div>
      )}

    </div>
  );
}

export default UserManagement;