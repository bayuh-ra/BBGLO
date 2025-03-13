import { BrowserRouter as Router, Routes, Route, Link} from "react-router-dom";
import { useState, useEffect } from "react";


import Home from "./Home";
import AdminLayout from "./admin/components/AdminLayout";
import AdminLogin from "./admin/pages/AdminLogin";
import AdminSignup from "./admin/pages/AdminSignup";
import DeliveryManagement from "./admin/pages/Delivery";
import InventoryManagement from "./admin/pages/InventoryManagement";
import SupplierManagement from "./admin/pages/SupplierManagement";
import PendingSalesOrders from "./admin/pages/PendingSalesOrders";
import PreviousSalesOrders from "./admin/pages/PreviousSalesOrders";
import AdminFinanceIncome from "./admin/pages/AdminFinanceIncome";
//import OrderHistory from "./customer/pages/OrderHistory";
//import Profile from "./customer/pages/Profile";
import Dashboard from "./customer/pages/Dashboard";


import { FiShoppingCart } from "react-icons/fi"; 
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import Payment from "./pages/Payment";
import OrderConfirmation from "./pages/OrderConfirmation"; 
import Signup from "./pages/Signup";
import Login from "./pages/Login";
import Profile from "./pages/Profile";
import OrderHistory from "./pages/OrderHistory";
import OrderDetails from "./pages/OrderDetails";



// Import Users Management pages from "src/admin/pages/users/"
import CustomerProfile from "./admin/pages/users/CustomerProfile";
import Customers from "./admin/pages/users/Customers";
import EmployeeProfile from "./admin/pages/users/EmployeeProfile";
import Employees from "./admin/pages/users/Employees";
import Users from "./admin/pages/users/Users";

import CustomerLayout from "./customer/components/CustomerLayout";
import CustomerLogin from "./customer/pages/CustomerLogin";
import CustomerSignup from "./customer/pages/CustomerSignup";
import RequestForm from "./customer/pages/RequestForm";

import EmployeeLayout from "./employee/components/EmployeeLayout";
import EmployeeLogin from "./employee/pages/EmployeeLogin";
import EmployeeSignup from "./employee/pages/EmployeeSignup";



function App() {
  const [loggedInUser, setLoggedInUser] = useState(null);
  const [cart, setCart] = useState([]);

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("loggedInUser"));
    if (storedUser) {
      setLoggedInUser(storedUser);
    }

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


  return (
    <Router>
        {/* ✅ Navigation Bar */}
        <nav className="bg-white shadow-md px-6 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <Link to="/">
              <img src="/src/assets/logo.png" alt="BabyGlo Logo" className="w-32" />
            </Link>

            {/* ✅ Show "Welcome, User's Name" next to the logo if logged in */}
            {loggedInUser && (
              <span className="text-gray-700 text-lg font-semibold">
                Welcome, {loggedInUser.name}
              </span>
            )}
          </div>

          <div className="space-x-6 flex items-center">
            {/* ✅ Show Shopping Cart only if logged in */}
            {loggedInUser && (
              <div className="relative cursor-pointer" onClick={() => window.location.href = "/cart"}>
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
                <Link to="/order-history" className="text-gray-700 hover:text-blue-500">
                  My Orders
                </Link>

                <Link to="/profile" className="text-gray-700 hover:text-blue-500">
                  Profile
                </Link>

                <button onClick={handleLogout} className="text-red-500 hover:text-red-700">
                  Logout
                </button>
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
          </div>
        </nav>




      {/* ✅ Routes */}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/payment" element={<Payment />} />
        <Route path="/order-confirmation" element={<OrderConfirmation />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/login" element={<Login setLoggedInUser={setLoggedInUser} />} />
        <Route path="/profile" element={<Profile />} /> 
        <Route path="/order-history" element={<OrderHistory />} /> 
        <Route path="/order-details" element={<OrderDetails />} /> 






































        
        {/* Admin routes */}
        <Route path="/admin-signup" element={<AdminSignup />} />
        <Route path="/admin-login" element={<AdminLogin />} />
        <Route path="/admin" element={<AdminLayout />}>
          {/* Admin nested routes */}
          <Route path="inventory-management" element={<InventoryManagement />} />
          <Route path="supplier-management" element={<SupplierManagement />} />
          <Route path="delivery-management" element={<DeliveryManagement />} />
          {/*<Route path="admin-finance-income" element={<AdminFinanceIncome />} /> */}
          <Route path="finance/income" element={<AdminFinanceIncome />} />

          {/* Users Management */}
          <Route path="users" element={<Users />} />
          <Route path="users/customers" element={<Customers />} />
          <Route path="users/customers/:id" element={<CustomerProfile />} />
          <Route path="users/employees" element={<Employees />} />
          <Route path="users/employees/:id" element={<EmployeeProfile />} />

          <Route path="purchase-order" element={<div>Purchase Order Page</div>} />
          <Route path="sales/pending-orders" element={<PendingSalesOrders />} />
          <Route path="sales/previous-orders" element={<PreviousSalesOrders/>} />
          <Route path="finance/income" element={<div>Income Page</div>} />
          <Route path="finance/expenses" element={<div>Expenses Page</div>} />
        </Route>


        {/* Employee routes */}
        <Route path="/employee-signup" element={<EmployeeSignup />} />
        <Route path="/employee-login" element={<EmployeeLogin />} />
        <Route path="/employee" element={<EmployeeLayout />}>
          {/* Employee nested routes */}
          <Route path="inventory-management" element={<InventoryManagement />} />
          <Route path="supplier-management" element={<SupplierManagement />} />
        </Route>


        {/* Customer routes */}
        <Route path="/customer-signup" element={<CustomerSignup />} />
        <Route path="/customer-login" element={<CustomerLogin />} />
        <Route path="/customer" element={<CustomerLayout />}>
         {/* Customer nested routes */}
          <Route path="dashboard" element={<Dashboard/>} />
          <Route path="profile" element={<Profile />} />
          <Route path="request-form" element={<RequestForm />} />
          <Route path="order-history" element={<OrderHistory/>} />

        </Route>


      </Routes>
    </Router>
  );
}

export default App;
