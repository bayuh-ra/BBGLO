import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";

export default function EmployeeSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [expandedMenu, setExpandedMenu] = useState(null);

  // Toggle the expanded menu
  const toggleMenu = (menu) => {
    setExpandedMenu(expandedMenu === menu ? null : menu);
  };

  // Function to handle logout
  const handleLogout = () => {
    localStorage.removeItem("authToken"); // Remove authentication token if stored
    sessionStorage.clear(); // Clear session storage
    alert("You have been logged out."); // Inform the user

    navigate("/", { replace: true });

    // Block the back button after logout
    setTimeout(() => {
      window.history.pushState(null, "", window.location.href);
      window.history.forward(); // Force forward navigation
    }, 0);
  };

  // Prevent going back after logout
  useEffect(() => {
    const preventBack = () => {
      window.history.pushState(null, "", window.location.href);
    };
    preventBack();
    window.addEventListener("popstate", preventBack);

    return () => {
      window.removeEventListener("popstate", preventBack);
    };
  }, []);

  const menuItems = [
    {
      name: "Inventory",
      submenus: [
        { name: "Inventory Management", path: "/employee/inventory-management" },
        { name: "Suppliers", path: "/employee/supplier-management" }, // Fixed typo
      ],
    },
    {
      name: "Sales",
      submenus: [
        { name: "Pending Sales Orders", path: "/employee/sales/pending-orders" },
        { name: "Previous Orders", path: "/employee/sales/previous-orders" },
      ],
    },
    {
      name: "Delivery",
      submenus: [],
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
        onClick={handleLogout} // Call logout function
      >
        Logout
      </button>
    </div>
  );
}
