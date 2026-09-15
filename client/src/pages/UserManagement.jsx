import { useEffect, useState } from "react";
import { Plus, KeyRound, Trash2, X, RefreshCw } from "lucide-react";
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

  return (
    <div className="page-container">

      {/* ===============================
          HEADER
      =============================== */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "25px",
          gap: "15px",
          flexWrap: "wrap",
        }}
      >
        <div>
          <h1>User Management</h1>

          <p style={{ color: "#777", marginTop: "5px" }}>
            Manage system users, passwords and access roles.
          </p>
        </div>

        <div
          style={{
            display: "flex",
            gap: "10px",
          }}
        >
          <button
            type="button"
            onClick={fetchUsers}
            disabled={loading}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "7px",
            }}
          >
            <RefreshCw size={17} />
            Refresh
          </button>

          <button
            type="button"
            onClick={() => {
              setMessage("");
              setError("");
              setShowCreateModal(true);
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "7px",
            }}
          >
            <Plus size={18} />
            Create User
          </button>
        </div>
      </div>

      {/* ===============================
          SUCCESS MESSAGE
      =============================== */}
      {message && (
        <div
          style={{
            padding: "12px 15px",
            marginBottom: "15px",
            borderRadius: "8px",
            background: "#e8f7ee",
            color: "#176b36",
          }}
        >
          {message}
        </div>
      )}

      {/* ===============================
          ERROR MESSAGE
      =============================== */}
      {error && (
        <div
          style={{
            padding: "12px 15px",
            marginBottom: "15px",
            borderRadius: "8px",
            background: "#fdeaea",
            color: "#a52222",
          }}
        >
          {error}
        </div>
      )}

      {/* ===============================
          USERS TABLE
      =============================== */}
      <div className="table-container">

        {loading ? (
          <p style={{ padding: "20px" }}>
            Loading users...
          </p>
        ) : users.length === 0 ? (
          <p style={{ padding: "20px" }}>
            No users found.
          </p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Username</th>
                <th>Role</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {users.map((user) => {
                const isCurrentUser =
                  Number(user.id) ===
                  Number(currentUser?.id);

                return (
                  <tr key={user.id}>
                    <td>{user.id}</td>

                    <td>
                      <strong>{user.username}</strong>

                      {isCurrentUser && (
                        <span
                          style={{
                            marginLeft: "8px",
                            fontSize: "12px",
                            color: "#666",
                          }}
                        >
                          (You)
                        </span>
                      )}
                    </td>

                    <td>
                      <span
                        style={{
                          textTransform: "capitalize",
                        }}
                      >
                        {user.role}
                      </span>
                    </td>

                    <td>
                      <span
                        style={{
                          textTransform: "capitalize",
                        }}
                      >
                        {user.status || "active"}
                      </span>
                    </td>

                    <td>
                      <div
                        style={{
                          display: "flex",
                          gap: "8px",
                          flexWrap: "wrap",
                        }}
                      >
                        {/* RESET PASSWORD */}
                        <button
                          type="button"
                          onClick={() =>
                            openResetModal(user)
                          }
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "5px",
                          }}
                        >
                          <KeyRound size={16} />
                          Reset Password
                        </button>

                        {/* DELETE USER */}
                        <button
                          type="button"
                          onClick={() =>
                            handleDeleteUser(user)
                          }
                          disabled={
                            isCurrentUser ||
                            deletingUserId === user.id
                          }
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "5px",
                            color: "#b42318",
                            cursor:
                              isCurrentUser
                                ? "not-allowed"
                                : "pointer",
                            opacity:
                              isCurrentUser ? 0.5 : 1,
                          }}
                          title={
                            isCurrentUser
                              ? "You cannot delete your own account"
                              : "Delete user"
                          }
                        >
                          <Trash2 size={16} />

                          {deletingUserId === user.id
                            ? "Deleting..."
                            : "Delete"}
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

      {/* ===============================
          CREATE USER MODAL
      =============================== */}
      {showCreateModal && (
        <div className="modal-overlay">

          <div className="modal">

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <h2>Create User</h2>

              <button
                type="button"
                onClick={closeCreateModal}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateUser}>

              <div className="form-group">
                <label>Username</label>

                <input
                  type="text"
                  value={username}
                  onChange={(e) =>
                    setUsername(e.target.value)
                  }
                  placeholder="Enter username"
                  disabled={actionLoading}
                />
              </div>

              <div className="form-group">
                <label>Password</label>

                <input
                  type="password"
                  value={password}
                  onChange={(e) =>
                    setPassword(e.target.value)
                  }
                  placeholder="Minimum 6 characters"
                  disabled={actionLoading}
                />
              </div>

              <div className="form-group">
                <label>Role</label>

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

              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "10px",
                  marginTop: "20px",
                }}
              >
                <button
                  type="button"
                  onClick={closeCreateModal}
                  disabled={actionLoading}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={actionLoading}
                >
                  {actionLoading
                    ? "Creating..."
                    : "Create User"}
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
        <div className="modal-overlay">

          <div className="modal">

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <h2>Reset Password</h2>

              <button
                type="button"
                onClick={closeResetModal}
              >
                <X size={20} />
              </button>
            </div>

            <p style={{ marginBottom: "15px" }}>
              Reset password for{" "}
              <strong>
                {selectedUser.username}
              </strong>
            </p>

            <form onSubmit={handleResetPassword}>

              <div className="form-group">
                <label>New Password</label>

                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) =>
                    setNewPassword(e.target.value)
                  }
                  placeholder="Minimum 6 characters"
                  disabled={actionLoading}
                />
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "10px",
                  marginTop: "20px",
                }}
              >
                <button
                  type="button"
                  onClick={closeResetModal}
                  disabled={actionLoading}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={actionLoading}
                >
                  {actionLoading
                    ? "Resetting..."
                    : "Reset Password"}
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