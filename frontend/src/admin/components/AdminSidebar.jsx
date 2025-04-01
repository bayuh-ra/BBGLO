import { useEffect, useState } from "react";
import {
  FaBoxes,
  FaCar,
  FaChartBar,
  FaMoneyBill,
  FaUsers,
} from "react-icons/fa";
import { Link, useLocation, useNavigate } from "react-router-dom";

export default function AdminSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [expandedMenu, setExpandedMenu] = useState(null);

  const toggleMenu = (menu) => {
    setExpandedMenu(expandedMenu === menu ? null : menu);
  };

  const handleLogout = () => {
    localStorage.removeItem("authToken");
    sessionStorage.clear();
    alert("You have been logged out.");
    navigate("/", { replace: true });
    setTimeout(() => {
      window.history.pushState(null, "", window.location.href);
      window.history.forward();
    }, 0);
  };

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
        { name: "Manage Orders", path: "/admin/update-orders" }, // ✅ Added this line
      ],
    },
    {
      name: "Delivery",
      icon: <FaCar className="inline-block mr-2" />,
      submenus: [
        { name: "Manage Deliveries", path: "/admin/delivery-management" },
      ],
    },
    {
      name: "Finance",
      icon: <FaMoneyBill className="inline-block mr-2" />,
      submenus: [
        { name: "Income", path: "/admin/finance/income" },
        { name: "Expenses", path: "/admin/finance/expenses" },
      ],
    },
    {
      name: "Users",
      icon: <FaUsers className="inline-block mr-2" />,
      submenus: [
        { name: "Customers", path: "/admin/users/customers" },
        { name: "Employees", path: "/admin/users/employees" },
      ],
    },
  ];

  return (
    <div className="w-64 bg-pink-100 h-900 p-4 flex flex-col justify-between fixed top-0 left-0 overflow-y-auto">
      <div className="text-center mt-8 mb-8">
        <img
          src="/src/assets/logo2.png"
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

      <button
        className="mt-8 p-2 w-full bg-red-500 text-white rounded flex items-center justify-center"
        onClick={handleLogout}
      >
        Logout
      </button>
    </div>
  );
}
