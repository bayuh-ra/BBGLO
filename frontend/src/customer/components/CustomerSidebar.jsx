import { useEffect } from "react";
import {
  FaFileAlt,
  FaHistory,
  FaSignOutAlt,
  FaTachometerAlt,
  FaUser
} from "react-icons/fa";
import { Link, useLocation, useNavigate } from "react-router-dom";

export default function CustomerSidebar() {
  const location = useLocation();
  const navigate = useNavigate();

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
    { name: "Dashboard", path: "/customer/dashboard", icon: <FaTachometerAlt className="inline-block mr-2" /> },
    { name: "Profile", path: "/customer/profile", icon: <FaUser className="inline-block mr-2" /> },
    { name: "Request Form", path: "/customer/request-form", icon: <FaFileAlt className="inline-block mr-2" /> },
    { name: "Order History", path: "/customer/order-history", icon: <FaHistory className="inline-block mr-2" /> },
  ];

  return (
    <div className="w-64 bg-pink-100 h-screen p-4 flex flex-col justify-between">
      <div className="text-center mt-8 mb-8">
        <img src="/src/assets/logo2.png" alt="BabyGlo Logo" className="mx-auto w-32" />
      </div>
      <ul className="flex-grow">
        {menuItems.map((menu) => (
          <li key={menu.name} className="mb-2">
            <Link to={menu.path} className={`block w-full text-left p-2 rounded hover:bg-pink-200 ${location.pathname === menu.path ? "bg-pink-300" : ""}`}>{menu.icon} {menu.name}</Link>
          </li>
        ))}
      </ul>
      <button className="mt-8 p-2 w-full bg-red-500 text-white rounded flex items-center justify-center" onClick={handleLogout}>
        <FaSignOutAlt className="mr-2" /> Logout
      </button>
    </div>
  );
}