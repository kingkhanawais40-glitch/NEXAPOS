import { Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { useAuth } from "../context/AuthContext";

function MainLayout() {
  const { user, logout } = useAuth();

  return (
    <div className="app-layout">
      <Sidebar />

      <div className="main-content">
        <header className="topbar">
          <div>
            <h2>NEXA POS</h2>
            <p>Business Management System</p>
          </div>

          <div className="topbar-user">
            <span>
              {user?.username} ({user?.role})
            </span>

            <button onClick={logout}>
              Logout
            </button>
          </div>
        </header>

        <main className="page-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default MainLayout;