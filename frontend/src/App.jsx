import { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import { FiShoppingCart } from "react-icons/fi";
import { supabase } from "./api/supabaseClient";

// Import Layouts
import AdminLayout from "./admin/components/AdminLayout";
import CustomerLayout from "./customer/components/CustomerLayout";
import EmployeeLayout from "./employee/components/EmployeeLayout";

// Import Pages (adjust paths as needed)
import StaffProfile from "./pages/StaffProfile";
import StaffSetup from "./pages/StaffSetup";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Profile from "./pages/Profile";
import OrderHistory from "./pages/OrderHistory";
import OrderDetails from "./pages/OrderDetails";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import Payment from "./pages/Payment";
import OrderConfirmation from "./pages/OrderConfirmation";

// Admin Pages
import AdminDashboard from "./admin/pages/Admindashboard";
import Users from "./admin/pages/users/Users";
import AddEmployee from "./admin/pages/users/AddEmployee";
import CustomerProfile from "./admin/pages/users/CustomerProfile";
import Customers from "./admin/pages/users/Customers";
import EmployeeProfile from "./admin/pages/users/EmployeeProfile";
import Employees from "./admin/pages/users/Employees";
import InventoryManagement from "./admin/pages/InventoryManagement";
import StockInManagement from "./admin/pages/StockInManagement";
import SupplierManagement from "./admin/pages/SupplierManagement";
import DeliveryManagement from "./admin/pages/Delivery";
import PreviousSalesOrders from "./admin/pages/PreviousSalesOrders";
import AdminFinanceIncome from "./admin/pages/AdminFinanceIncome";
import OrderStatusManager from "./admin/pages/OrderStatusManager";
import PurchaseOrder from "./admin/pages/PurchaseOrder";

// Customer Pages
import CustomerProducts from "./customer/pages/CustomerProducts";
import RequestForm from "./customer/pages/RequestForm";
import Dashboard from "./customer/pages/Dashboard";

function App() {
  const [loggedInUser, setLoggedInUser] = useState(
    JSON.parse(localStorage.getItem("loggedInUser")) || null
  );
  const [cart, setCart] = useState([]);
  const [profileName, setProfileName] = useState(null);

  // Fetch and set user profile data
  const fetchUserProfile = async (userId) => {
    try {
      // Try staff_profiles first
      let { data: staff } = await supabase
        .from("staff_profiles")
        .select("name, role")
        .eq("id", userId)
        .maybeSingle();

      if (staff?.name) {
        setProfileName(staff.name);
        return staff;
      }

      // Else, try customer profiles
      let { data: customer } = await supabase
        .from("profiles")
        .select("name")
        .eq("id", userId)
        .maybeSingle();

      if (customer?.name) {
        setProfileName(customer.name);
        return customer;
      }
      return null;
    } catch (err) {
      console.error("Error fetching user profile:", err.message);
      return null;
    }
  };

  // Update loggedInUser and localStorage
  const updateLoggedInUser = (user) => {
    setLoggedInUser(user);
    localStorage.setItem("loggedInUser", JSON.stringify(user));
  };

  // Handle session changes (login, logout)
  useEffect(() => {
    const handleSessionChange = async () => {
      const { data: sessionData, error: sessionError } =
        await supabase.auth.getSession();
      if (sessionError) {
        console.error("Error getting session:", sessionError.message);
        return;
      }

      if (sessionData?.session?.user?.id) {
        const userId = sessionData.session.user.id;
        const profile = await fetchUserProfile(userId);

        if (profile) {
          const updatedUser = {
            ...sessionData.session.user,
            name: profile.name, // Add name to loggedInUser
            role: profile.role || "customer", // Default to 'customer' if no role
          };
          updateLoggedInUser(updatedUser);
        } else {
          //if no profile is found.
          updateLoggedInUser(sessionData.session.user);
        }
      } else {
        // No session, clear logged in user
        updateLoggedInUser(null);
        setProfileName(null);
      }
    };

    handleSessionChange(); // Initial fetch

    const { subscription: authListener } = supabase.auth.onAuthStateChange(
      () => {
        // Corrected this line
        handleSessionChange();
      }
    );

    const profileUpdateListener = () => {
      handleSessionChange();
    };

    window.addEventListener("profile-updated", profileUpdateListener);

    return () => {
      authListener?.unsubscribe(); // Use optional chaining
      window.removeEventListener("profile-updated", profileUpdateListener);
    };
  }, []);

  // Load cart from localStorage
  useEffect(() => {
    const savedCart = JSON.parse(localStorage.getItem("cart")) || [];
    setCart(savedCart);
  }, []);

  // Update cart in localStorage
  useEffect(() => {
    const updateCart = () => {
      const savedCart = JSON.parse(localStorage.getItem("cart")) || [];
      setCart(savedCart);
    };

    window.addEventListener("cartUpdated", updateCart);
    return () => window.removeEventListener("cartUpdated", updateCart);
  }, []);

  // Handle logout
  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      localStorage.removeItem("loggedInUser");
      updateLoggedInUser(null); // Clear state
      setProfileName(null);
      // Redirect to login page after logout
      window.location.href = "/login";
    } catch (error) {
      console.error("Error logging out:", error.message);
    }
  };

  // Determine user role
  const getUserRole = () => {
    if (!loggedInUser) return null;
    return loggedInUser.role || "customer"; // Default to customer if no role
  };

  const userRole = getUserRole();

  return (
    <Router>
      {/* Navigation Bar */}
      <nav className="bg-white shadow-md px-6 py-4 flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <Link to={loggedInUser ? `/${userRole}` : "/"}>
            <img
              src="/src/assets/logo.png"
              alt="BabyGlo Logo"
              className="w-32"
            />
          </Link>
          {loggedInUser && (
            <div className="flex items-center space-x-2 group relative">
              <span className="text-gray-700 text-lg font-medium">
                Welcome, {profileName || "Loading..."}
              </span>
              <span
                className={`text-xs font-semibold px-2 py-1 rounded-full ${
                  userRole === "admin"
                    ? "bg-purple-100 text-purple-700"
                    : userRole === "employee"
                    ? "bg-yellow-100 text-yellow-700"
                    : "bg-blue-100 text-blue-700"
                }`}
              >
                {userRole === "admin" && "🧑‍💼 Admin"}
                {userRole === "employee" && "🛠️ Employee"}
                {userRole === "customer" && "🛍️ Customer"}
              </span>
              {/* Role Description Tooltip */}
              <div className="absolute top-10 left-0 w-max px-3 py-2 text-sm rounded-md shadow-lg bg-white border border-gray-200 opacity-0 group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap">
                {userRole === "admin" &&
                  "Admin access to manage system-wide settings and data."}
                {userRole === "employee" &&
                  "Employee access to inventory, orders, and delivery modules."}
                {userRole === "customer" &&
                  "Customer access to browse, order, and manage their account."}
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
                    Order History
                  </Link>
                  <Link
                    to="/profile"
                    className="text-gray-700 hover:text-blue-500"
                  >
                    Profile
                  </Link>
                  <Link
                    to="/customer/dashboard"
                    className="text-gray-700 hover:text-blue-500"
                  >
                    Dashboard
                  </Link>
                </>
              )}
              <button
                onClick={handleLogout}
                className="text-red-500 hover:text-red-700"
              >
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

          {/* Links */}
          {loggedInUser?.role === "admin" && (
            <>
              <Link to="/admin" className="text-gray-700 hover:text-blue-500">
                Dashboard
              </Link>
              <Link
                to="/staff/profile"
                className="text-gray-700 hover:text-blue-500"
              >
                Profile
              </Link>
            </>
          )}

          {loggedInUser?.role === "employee" && (
            <>
              <Link
                to="/employee/inventory-management"
                className="text-gray-700 hover:text-blue-500"
              >
                Inventory
              </Link>
              <Link
                to="/employee/supplier-management"
                className="text-gray-700 hover:text-blue-500"
              >
                Suppliers
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* Routes */}
      <Routes>
        {/* Public Routes */}
        <Route
          path="/"
          element={<Login setLoggedInUser={updateLoggedInUser} />}
        />
        <Route path="/signup" element={<Signup />} />
        <Route
          path="/login"
          element={<Login setLoggedInUser={updateLoggedInUser} />}
        />

        {/* Common Routes */}
        <Route path="/staff/profile" element={<StaffProfile />} />
        <Route path="/staff/setup" element={<StaffSetup />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/order-history" element={<OrderHistory />} />
        <Route path="/order-details" element={<OrderDetails />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/payment" element={<Payment />} />
        <Route path="/order-confirmation" element={<OrderConfirmation />} />

        {/* Admin Routes */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="users" element={<Users />} />
          <Route path="add-staff" element={<AddEmployee />} />
          <Route path="users/customers" element={<Customers />} />
          <Route path="users/customers/:id" element={<CustomerProfile />} />
          <Route path="users/employees" element={<Employees />} />
          <Route path="users/employees/:id" element={<EmployeeProfile />} />
          <Route path="/admin/purchase-orders" element={<PurchaseOrder />} />
          <Route
            path="inventory-management"
            element={<InventoryManagement />}
          />
          <Route path="/admin/stockin" element={<StockInManagement />} />
          <Route path="supplier-management" element={<SupplierManagement />} />
          <Route path="delivery-management" element={<DeliveryManagement />} />
          <Route path="update-orders" element={<OrderStatusManager />} />
          <Route
            path="sales/previous-orders"
            element={<PreviousSalesOrders />}
          />
          <Route path="finance/income" element={<AdminFinanceIncome />} />
          <Route path="finance/expenses" element={<div>Expenses Page</div>} />
        </Route>

        {/* Employee Routes */}
        <Route path="/employee" element={<EmployeeLayout />}>
          {/* Define employee routes,  */}
          <Route
            path="inventory-management"
            element={<InventoryManagement />}
          />
          <Route path="supplier-management" element={<SupplierManagement />} />
        </Route>

        {/* Customer Routes */}
        <Route path="/customer" element={<CustomerLayout />}>
          <Route index element={<CustomerProducts />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="request-form" element={<RequestForm />} />
          <Route path="order-history" element={<OrderHistory />} />
        </Route>

        {/* Catch-all route */}
        <Route path="*" element={<p>404 Not Found</p>} />
      </Routes>
    </Router>
  );
}

export default App;
