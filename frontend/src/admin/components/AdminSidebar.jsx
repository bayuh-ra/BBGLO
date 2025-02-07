import { Link, useLocation } from "react-router-dom";
import { useState } from "react";
import {
  FaBoxes,
  FaChartBar,
  FaMoneyBill,
  FaUsers,
  FaSignOutAlt,
} from "react-icons/fa";

export default function AdminSidebar() {
  const location = useLocation(); // To highlight active menu items
  const [expandedMenu, setExpandedMenu] = useState(null); // Tracks which menu is expanded

  // Toggle the expanded menu
  const toggleMenu = (menu) => {
    setExpandedMenu(expandedMenu === menu ? null : menu);
  };

  // Define the sidebar structure
  const menuItems = [
    {
      name: "Inventory",
      icon: <FaBoxes className="inline-block mr-2" />,
      submenus: [
        { name: "Inventory Management", path: "/admin/inventory-management" },
        { name: "Purchase Order", path: "/admin/purchase-order" },
        { name: "Products", path: "/admin/products" },
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
      submenus: [],
    },
  ];

  return (
    <div className="w-64 bg-pink-100 h-screen p-4 flex flex-col justify-between">
      {/* Logo Section */}
      <div className="text-center mt-8 mb-8">
        <img
          src="/src/assets/logo2.png" // Replace with the actual logo path
          alt="BabyGlo Logo"
          className="mx-auto w-32"
        />
      </div>

      {/* Menu Items */}
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
      <button className="mt-8 p-2 w-full bg-red-500 text-white rounded flex items-center justify-center">
        <FaSignOutAlt className="mr-2" />
        Logout
      </button>
    </div>
  );
}
