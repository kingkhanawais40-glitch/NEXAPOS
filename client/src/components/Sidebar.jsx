import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Users,
  Truck,
  Receipt,
  Wallet,
  RotateCcw,
  BarChart3,
  UserCog,
  Settings,
  Calculator,
  UserRoundCog,
} from "lucide-react";

import { useAuth } from "../context/AuthContext";

function Sidebar() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const menuItems = [
    { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
    { label: "POS", path: "/pos", icon: ShoppingCart },
    { label: "Products", path: "/products", icon: Package },
    { label: "Customers", path: "/customers", icon: Users },

    ...(isAdmin
      ? [
          { label: "Suppliers", path: "/suppliers", icon: Truck },
          { label: "Purchases", path: "/purchases", icon: Receipt },
          { label: "Returns", path: "/returns", icon: RotateCcw },
          { label: "Expenses", path: "/expenses", icon: Wallet },
          { label: "Daily Closing", path: "/daily-closing", icon: Calculator },
          { label: "Reports", path: "/reports", icon: BarChart3 },
          { label: "Employees", path: "/employees", icon: UserCog },
          { label: "User Management", path: "/users", icon: UserRoundCog },
          { label: "Settings", path: "/settings", icon: Settings },
        ]
      : []),
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <h2>NEXA</h2>
        <p>POS System</p>
      </div>

      <nav className="sidebar-nav">
        {menuItems.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                isActive ? "active" : ""
              }
            >
              <Icon size={20} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}

export default Sidebar;