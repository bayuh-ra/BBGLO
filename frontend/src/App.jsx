import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { FiShoppingCart } from "react-icons/fi";

import Home from "./Home";
import AdminLayout from "./admin/components/AdminLayout";
import DeliveryManagement from "./admin/pages/Delivery";
import InventoryManagement from "./admin/pages/InventoryManagement";
import SupplierManagement from "./admin/pages/SupplierManagement";
import PreviousSalesOrders from "./admin/pages/PreviousSalesOrders";
import AdminFinanceIncome from "./admin/pages/AdminFinanceIncome";
import OrderStatusManager from "./admin/pages/OrderStatusManager";

import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import Payment from "./pages/Payment";
import OrderConfirmation from "./pages/OrderConfirmation";
import Signup from "./pages/Signup";
import Login from "./pages/Login";
import Profile from "./pages/Profile";
import OrderHistory from "./pages/OrderHistory";
import OrderDetails from "./pages/OrderDetails";

import CustomerProfile from "./admin/pages/users/CustomerProfile";
import Customers from "./admin/pages/users/Customers";
import EmployeeProfile from "./admin/pages/users/EmployeeProfile";
import Employees from "./admin/pages/users/Employees";
import Users from "./admin/pages/users/Users";

import CustomerLayout from "./customer/components/CustomerLayout";
import CustomerSignup from "./customer/pages/CustomerSignup";
import RequestForm from "./customer/pages/RequestForm";
import Dashboard from "./customer/pages/Dashboard";

import EmployeeLayout from "./employee/components/EmployeeLayout";

function App() {
  const [loggedInUser, setLoggedInUser] = useState(null);
  const [cart, setCart] = useState([]);

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("loggedInUser"));
    if (storedUser) setLoggedInUser(storedUser);

    const savedCart = JSON.parse(localStorage.getItem("cart")) || [];
    setCart(savedCart);
  }, []);

  useEffect(() => {
    const updateCart = () => {
      const savedCart = JSON.parse(localStorage.getItem("cart")) || [];
      setCart(savedCart);
    };

    window.addEventListener("cartUpdated", updateCart);
    return () => window.removeEventListener("cartUpdated", updateCart);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("loggedInUser");
    setLoggedInUser(null);
    window.location.reload();
  };

  const getUserRole = () => {
    if (!loggedInUser) return null;
    if (loggedInUser.role === "admin") return "admin";
    if (loggedInUser.role === "employee") return "employee";
    return "customer";
  };

  const userRole = getUserRole();

  return (
    <Router>
      {/* ✅ Navigation Bar */}
      <nav className="bg-white shadow-md px-6 py-4 flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <Link to="/">
            <img
              src="/src/assets/logo.png"
              alt="BabyGlo Logo"
              className="w-32"
            />
          </Link>
          {loggedInUser && (
            <div className="flex items-center space-x-2 group relative">
              <span className="text-gray-700 text-lg font-medium">
                Welcome, {loggedInUser.name}
              </span>
              <span
                className={`text-xs font-semibold px-2 py-1 rounded-full ${
                  loggedInUser.role === "admin"
                    ? "bg-purple-100 text-purple-700"
                    : loggedInUser.role === "employee"
                    ? "bg-yellow-100 text-yellow-700"
                    : "bg-blue-100 text-blue-700"
                }`}
              >
                {loggedInUser.role === "admin" && "🧑‍💼 Admin"}
                {loggedInUser.role === "employee" && "🛠️ Employee"}
                {!loggedInUser.role || loggedInUser.role === "customer"
                  ? "🛍️ Customer"
                  : ""}
              </span>
              <div className="absolute top-10 left-0 w-max px-3 py-2 text-sm rounded-md shadow-lg bg-white border border-gray-200 opacity-0 group-hover:opacity-100 transition-opacity z-50">
                {loggedInUser.role === "admin" &&
                  "Admin access to manage system-wide settings and data."}
                {loggedInUser.role === "employee" &&
                  "Employee access to inventory, orders, and delivery modules."}
                {!loggedInUser.role || loggedInUser.role === "customer"
                  ? "Customer access to browse, order, and manage their account."
                  : ""}
              </div>
            </div>
          )}
        </div>

        <div className="space-x-6 flex items-center">
          {userRole === "customer" && (
            <div
              className="relative cursor-pointer"
              onClick={() => (window.location.href = "/cart")}
            >
              <FiShoppingCart className="text-2xl text-gray-700 hover:text-red-500" />
              {cart.length > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs w-5 h-5 flex items-center justify-center rounded-full">
                  {cart.length}
                </span>
              )}
            </div>
          )}

          {loggedInUser ? (
            <>
              {userRole === "customer" && (
                <>
                  <Link
                    to="/order-history"
                    className="text-gray-700 hover:text-blue-500"
                  >
                    My Orders
                  </Link>
                  <Link
                    to="/profile"
                    className="text-gray-700 hover:text-blue-500"
                  >
                    Profile
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="text-red-500 hover:text-red-700"
                  >
                    Logout
                  </button>
                </>
              )}
            </>
          ) : (
            <>
              <Link to="/signup" className="text-blue-500 hover:text-blue-700">
                Create Account
              </Link>
              <Link to="/login" className="text-gray-700 hover:text-blue-500">
                Login
              </Link>
            </>
          )}

          {loggedInUser?.role === "admin" && (
            <>
              <Link to="/admin">Dashboard</Link>
              <Link to="/admin/update-orders">Manage Orders</Link>
              <button onClick={handleLogout}>Logout</button>
            </>
          )}

          {loggedInUser?.role === "employee" && (
            <>
              <Link to="/employee/inventory-management">Inventory</Link>
              <Link to="/employee/supplier-management">Suppliers</Link>
              <button onClick={handleLogout}>Logout</button>
            </>
          )}
        </div>
      </nav>

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/payment" element={<Payment />} />
        <Route path="/order-confirmation" element={<OrderConfirmation />} />
        <Route path="/signup" element={<Signup />} />
        <Route
          path="/login"
          element={<Login setLoggedInUser={setLoggedInUser} />}
        />
        <Route path="/profile" element={<Profile />} />
        <Route path="/order-history" element={<OrderHistory />} />
        <Route path="/order-details" element={<OrderDetails />} />

        {/* Admin routes */}
        {/* <Route path="/admin-signup" element={<AdminSignup />} /> */}
        {/* <Route path="/admin-login" element={<AdminLogin />} /> */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route
            path="inventory-management"
            element={<InventoryManagement />}
          />
          <Route path="supplier-management" element={<SupplierManagement />} />
          <Route path="delivery-management" element={<DeliveryManagement />} />
          <Route path="update-orders" element={<OrderStatusManager />} />
          <Route
            path="sales/previous-orders"
            element={<PreviousSalesOrders />}
          />
          <Route path="finance/income" element={<AdminFinanceIncome />} />
          <Route path="finance/expenses" element={<div>Expenses Page</div>} />
          <Route path="users" element={<Users />} />
          <Route path="users/customers" element={<Customers />} />
          <Route path="users/customers/:id" element={<CustomerProfile />} />
          <Route path="users/employees" element={<Employees />} />
          <Route path="users/employees/:id" element={<EmployeeProfile />} />
        </Route>

        {/* Employee routes */}
        {/* <Route path="/employee-signup" element={<EmployeeSignup />} /> */}
        {/* <Route path="/employee-login" element={<EmployeeLogin />} /> */}
        <Route path="/employee" element={<EmployeeLayout />}>
          <Route
            path="inventory-management"
            element={<InventoryManagement />}
          />
          <Route path="supplier-management" element={<SupplierManagement />} />
        </Route>

        {/* Customer routes */}
        <Route path="/customer-signup" element={<CustomerSignup />} />
        <Route path="/customer" element={<CustomerLayout />}>
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="profile" element={<Profile />} />
          <Route path="request-form" element={<RequestForm />} />
          <Route path="order-history" element={<OrderHistory />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
