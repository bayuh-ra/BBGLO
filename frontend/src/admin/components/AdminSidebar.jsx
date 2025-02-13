import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";

export default function AdminSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [expandedMenu, setExpandedMenu] = useState(null);

  // Toggle the expanded menu
  const toggleMenu = (menu) => {
    setExpandedMenu(expandedMenu === menu ? null : menu);
  };

  // Logout function (Completely disables back navigation)
  const handleLogout = () => {
    localStorage.removeItem("authToken"); // Remove authentication token
    sessionStorage.clear(); // Clear session storage
    alert("You have been logged out."); // Inform the user

    // Completely clear history & redirect to Home.jsx
    window.location.href = "/"; // Hard reload to Home
  };

  // **Fully Disable Back Navigation**
  useEffect(() => {
    const disableBackNavigation = () => {
      window.history.pushState(null, null, window.location.href);
    };

    disableBackNavigation();
    window.addEventListener("popstate", disableBackNavigation);

    return () => {
      window.removeEventListener("popstate", disableBackNavigation);
    };
  }, []);

  const menuItems = [
    {
      name: "Inventory",
      submenus: [
        { name: "Inventory Management", path: "/admin/inventory-management" },
        { name: "Suppliers", path: "/admin/supplier-management" },
      ],
    },
    {
      name: "Sales",
      submenus: [
        { name: "Pending Sales Orders", path: "/admin/sales/pending-orders" },
        { name: "Previous Orders", path: "/admin/sales/previous-orders" },
      ],
    },
    {
      name: "Delivery",
      submenus: [],
    },
    {
      name: "Finance",
      submenus: [
        { name: "Income", path: "/admin/finance/income" },
        { name: "Expenses", path: "/admin/finance/expenses" },
      ],
    },
    {
      name: "Users",
      submenus: [
        { name: "Customers", path: "/admin/users/customers" },
        { name: "Employees", path: "/admin/users/employees" },
      ],
    },
  ];

  return (
    <div className="w-64 bg-pink-100 h-screen p-4">
      <div className="text-xl font-bold mb-4">BabyGlo</div>
      <ul>
        {menuItems.map((menu) => (
          <li key={menu.name} className="mb-2">
            <button
              className={`block w-full text-left p-2 rounded hover:bg-pink-200 ${
                expandedMenu === menu.name ? "bg-pink-200" : ""
              }`}
              onClick={() => toggleMenu(menu.name)}
            >
              {menu.name}
            </button>
            {menu.submenus.length > 0 && expandedMenu === menu.name && (
              <ul className="ml-4">
                {menu.submenus.map((submenu) => (
                  <li key={submenu.name} className="mb-2">
                    <Link
                      to={submenu.path}
                      className={`block p-2 rounded hover:bg-pink-300 ${
                        location.pathname === submenu.path ? "bg-pink-300" : ""
                      }`}
                    >
                      {submenu.name}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
      {/* Logout Button */}
      <button
        className="mt-8 p-2 w-full bg-red-500 text-white rounded hover:bg-red-600"
        onClick={handleLogout}
      >
        Logout
      </button>
    </div>
  );
}
