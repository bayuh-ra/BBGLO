import { useEffect, useState } from "react";
import { FaBoxes, FaCar, FaChartBar } from "react-icons/fa";
import { Link, useLocation, useNavigate } from "react-router-dom";

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
      icon: <FaBoxes className="inline-block mr-2" />,
      submenus: [
        { name: "Inventory Management", path: "/admin/inventory-management" },
        { name: "Suppliers", path: "/admin/supplier-management" },
      ],
    },
    {
      name: "Sales",
      icon: <FaChartBar className="inline-block mr-2" />,
      submenus: [
        { name: "Pending Sales Orders", path: "/admin/sales/pending-orders" },
        { name: "Previous Orders", path: "/admin/sales/previous-orders" },
      ],
    },
    {
      name: "Delivery",
      icon: <FaCar className="inline-block mr-2" />,
      submenus: [],
    },
  ];

  return (
    <div className="w-64 bg-pink-100 h-screen p-4 flex flex-col justify-between">
      <div className="text-center mt-8 mb-8">
        <img
          src="/src/assets/logo2.png" // Replace with the actual logo path
          alt="BabyGlo Logo"
          className="mx-auto w-32"
        />
      </div>
      <ul className="flex-grow">
        {menuItems.map((menu) => (
          <li key={menu.name} className="mb-2">
            <button
              className={`block w-full text-left p-2 rounded hover:bg-pink-200 ${
                expandedMenu === menu.name ? "bg-pink-200" : ""
              }`}
              onClick={() => toggleMenu(menu.name)}
            >
              {menu.icon} {menu.name}
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
        className="mt-8 p-2 w-full bg-red-500 text-white rounded flex items-center justify-center"
        onClick={handleLogout} // Call logout function
      >
        Logout
      </button>
    </div>
  );
}
