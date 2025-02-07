import { Link, useLocation } from "react-router-dom";
import { useState } from "react";

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
    }    
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
      <button className="mt-8 p-2 w-full bg-red-500 text-white rounded">
        Logout
      </button>
    </div>
  );
}
