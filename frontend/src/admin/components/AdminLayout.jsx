import { useEffect, useState } from "react";
import { FaBoxes, FaCar, FaChartBar, FaMoneyBill, FaUsers } from "react-icons/fa";
import { Link, useLocation, Outlet, useNavigate } from "react-router-dom";
import { useUser } from "@supabase/auth-helpers-react";
import { supabase } from "../../api/supabaseClient";

const AdminSidebar = () => {
  const location = useLocation();
  const [expandedMenu, setExpandedMenu] = useState(null);

  const toggleMenu = (menu) => {
    setExpandedMenu(expandedMenu === menu ? null : menu);
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
        { name: "Manage Orders", path: "/admin/update-orders" },
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
    <aside className="w-64 p-4 shadow-lg">
      <ul className="space-y-3">
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
                      className={`block w-full text-left text-gray-700 hover:text-red-500 p-2 rounded-md ${
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
    </aside>
  );
};

export default function AdminLayout() {
  const user = useUser();
  const navigate = useNavigate();

  useEffect(() => {
    const checkIfStillActive = async () => {
      if (!user) return;
      const { data } = await supabase
        .from("staff_profiles")
        .select("status")
        .eq("id", user.id)
        .single();

      if (data?.status === "Deactivated") {
        alert("Your account has been deactivated.");
        await supabase.auth.signOut();
        navigate("/login");
      }
    };

    checkIfStillActive();
  }, [user, navigate]);

  return (
    <div className="h-screen flex p-6 bg-gray-100">
      <AdminSidebar />
      <div className="flex-1 p-6 ml-79 border-100 bg-gray-50 shadow-lg">
        <Outlet />
      </div>
    </div>
  );
}
