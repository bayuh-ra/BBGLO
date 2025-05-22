import { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link,
  useLocation,
  useNavigate,
  Navigate,
} from "react-router-dom";
import { FiShoppingCart, FiMenu, FiX, FiBell } from "react-icons/fi";
import {
  FaBoxes,
  FaChartBar,
  FaCar,
  FaMoneyBill,
  FaUsers,
} from "react-icons/fa";
import { supabase } from "./api/supabaseClient";
import "react-toastify/dist/ReactToastify.css";
import { ToastContainer } from "react-toastify";
import ProtectedRoute from "./components/ProtectedRoute";
import Unauthorized from "./pages/Unauthorized";
import PropTypes from "prop-types";
import Home from "./Home";
import NotificationDropdown from "./components/NotificationDropdown";

// Import Pages (adjust paths as needed)
import StaffProfile from "./admin/pages/StaffProfile";
import StaffSetup from "./pages/StaffSetup";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import UpdatePassword from "./pages/UpdatePassword";

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
import AdminFinanceIncome from "./admin/pages/AdminFinanceIncome";
import SalesOrders from "./admin/pages/SalesOrders";
import PurchaseOrder from "./admin/pages/PurchaseOrder";
import DeletedAccounts from "./admin/pages/users/DeletedAccounts";
import Expenses from "./admin/pages/Expenses";
import Vehicles from "./admin/pages/Vehicles";

// Customer Pages
import Products from "./customer/pages/Products";
import Dashboard from "./customer/pages/Dashboard";
import OrderHistory from "./customer/pages/OrderHistory";
import OrderProcess from "./customer/pages/OrderProcess";
import CustomerProfilePage from "./customer/pages/Profile";

// Create a separate Navigation component
const Navigation = ({
  loggedInUser,
  userRole,
  profileName,
  cart,
  handleLogout,
}) => {
  const location = useLocation();
  const isLoginPage = location.pathname === "/login";
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState({});

  const toggleSection = (sectionName) => {
    setExpandedSections((prev) => ({
      ...prev,
      [sectionName]: !prev[sectionName],
    }));
  };

  const menuItems = [
    {
      name: "Inventory",
      icon: <FaBoxes className="inline-block mr-2" />,
      submenus: [
        { name: "Inventory Management", path: "/admin/inventory-management" },
        { name: "Suppliers", path: "/admin/supplier-management" },
        { name: "Purchase Orders", path: "/admin/purchase-orders" },
        { name: "Stock In", path: "/admin/stockin" },
      ],
    },
    {
      name: "Sales",
      path: "/admin/update-orders",
      icon: <FaChartBar className="inline-block mr-2" />,
      submenus: [{ name: "Manage Orders", path: "/admin/update-orders" }],
    },
    {
      name: "Delivery",
      path: "/admin/delivery-management",
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
        { name: "Vehicles", path: "/admin/finance/vehicles" },
      ],
    },
    {
      name: "Users",
      icon: <FaUsers className="inline-block mr-2" />,
      submenus: [
        { name: "Customers", path: "/admin/users/customers" },
        { name: "Employees", path: "/admin/users/employees" },
        { name: "Deleted Accounts", path: "/admin/deleted-accounts" },
      ],
    },
  ];

  if (isLoginPage) return null;

  return (
    <>
      <nav className="bg-white shadow-md px-6 py-4 flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <Link to={loggedInUser ? `/${userRole}` : "/"}>
            <img
              src="/src/assets/logo.png"
              alt="BabyGlo Logo"
              className="w-32"
            />
          </Link>
        </div>

        <div className="space-x-6 flex items-center">
          {loggedInUser ? (
            <>
              {userRole === "customer" && (
                <div className="flex items-center space-x-4">
                  <NotificationDropdown user={loggedInUser} />
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
                </div>
              )}

              {userRole === "admin" && (
                <div className="relative">
                  <FiBell className="text-2xl text-gray-700 hover:text-blue-500 cursor-pointer" />
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-4 h-4 flex items-center justify-center rounded-full">
                    3
                  </span>
                </div>
              )}

              {/* Hamburger menu for all roles */}
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="text-gray-700 hover:text-blue-500"
              >
                {isSidebarOpen ? <FiX size={24} /> : <FiMenu size={24} />}
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

      {/* Sidebar Overlay */}
      {isSidebarOpen &&
        [
          "admin",
          "customer",
          "employee",
          "cashier",
          "inventory clerk",
          "driver",
        ].includes(userRole?.toLowerCase()) && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity duration-300"
            onClick={() => setIsSidebarOpen(false)}
          ></div>
        )}

      {/* Admin Sidebar */}
      {userRole === "admin" && isSidebarOpen && (
        <div className="fixed inset-y-0 right-0 w-56 bg-gradient-to-b from-pink-100 via-blue-100 to-green-100 shadow-lg transform transition-transform duration-300 ease-in-out z-50">
          {/* Character Header */}
          <div className="p-4 border-b border-pink-300 relative">
            <div className="absolute top-2 right-2 flex space-x-1">
              <div className="w-3 h-3 rounded-full bg-pink-500 animate-pulse"></div>
              <div
                className="w-3 h-3 rounded-full bg-blue-500 animate-pulse"
                style={{ animationDelay: "0.2s" }}
              ></div>
              <div
                className="w-3 h-3 rounded-full bg-green-500 animate-pulse"
                style={{ animationDelay: "0.4s" }}
              ></div>
            </div>
            <Link
              to="/staff/profile"
              className="block text-center hover:bg-pink-200 p-2 rounded-lg transition-all duration-200 group"
            >
              <div className="font-bold text-lg text-pink-600 group-hover:text-pink-700">
                {profileName || "Loading..."}
              </div>
              <div className="text-sm text-purple-600 group-hover:text-purple-700">
                {userRole === "admin" ? "Admin" : "Employee"}
              </div>
            </Link>
            <p className="text-center text-xs text-gray-600 mt-2">
              Developed by: Hannah Bea Alcaide, Justinne Angelie Floresca,
              Joshua Sam Suarez
            </p>
          </div>

          <div className="p-4 overflow-y-auto h-[calc(100vh-8rem)]">
            <Link
              to="/admin/dashboard"
              className="block py-3 px-4 hover:bg-pink-200 rounded-lg mb-2 text-lg text-pink-600 font-semibold transition-all duration-200 hover:scale-105 hover:shadow-md"
            >
              Dashboard
            </Link>
            {menuItems.map((item, index) => (
              <div key={index} className="mb-2 group">
                <div
                  className="flex items-center justify-between py-3 px-4 hover:bg-pink-200 rounded-lg cursor-pointer text-lg text-purple-600 font-semibold transition-all duration-200 hover:scale-105 hover:shadow-md"
                  onClick={() => {
                    if (item.path) {
                      window.location.href = item.path;
                    } else {
                      toggleSection(item.name);
                    }
                  }}
                >
                  <div className="flex items-center">
                    {item.icon}
                    <span>{item.name}</span>
                  </div>
                </div>
                <div
                  className={`ml-4 pl-4 border-l-2 border-pink-300 group-hover:border-pink-400 transition-all duration-200 overflow-hidden ${
                    expandedSections[item.name] ? "max-h-96" : "max-h-0"
                  }`}
                >
                  {item.submenus.map((submenu, subIndex) => (
                    <Link
                      key={subIndex}
                      to={submenu.path}
                      className="block py-3 px-4 hover:bg-pink-200 rounded-lg text-base text-purple-600 transition-all duration-200 hover:scale-105 hover:shadow-md"
                      onClick={() => setIsSidebarOpen(false)}
                    >
                      {submenu.name}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
            <button
              onClick={handleLogout}
              className="w-full mt-4 py-3 px-4 text-red-500 hover:bg-red-100 rounded-lg text-lg font-semibold transition-all duration-200 hover:scale-105 hover:shadow-md"
            >
              Logout
            </button>
          </div>

          {/* Powerpuff Girls Footer */}
          <div className="absolute bottom-32 right-4 flex space-x-2">
            <div
              className="w-8 h-8 rounded-full bg-pink-500 animate-bounce flex items-center justify-center text-white font-bold"
              style={{ animationDelay: "0s" }}
            >
              B
            </div>
            <div
              className="w-8 h-8 rounded-full bg-blue-500 animate-bounce flex items-center justify-center text-white font-bold"
              style={{ animationDelay: "0.2s" }}
            >
              B
            </div>
            <div
              className="w-8 h-8 rounded-full bg-green-500 animate-bounce flex items-center justify-center text-white font-bold"
              style={{ animationDelay: "0.4s" }}
            >
              B
            </div>
          </div>
          <p className="absolute bottom-1 left-1/2 transform -translate-x-1/2 text-center text-xs text-gray-600 w-full">
            Developed by: Hannah Bea Alcaide, Justinne Angelie Floresca, Joshua
            Sam Suarez
          </p>
        </div>
      )}

      {/* Customer Sidebar */}
      {userRole === "customer" && isSidebarOpen && (
        <div className="fixed inset-y-0 right-0 w-56 bg-gradient-to-b from-pink-100 via-blue-100 to-green-100 shadow-lg transform transition-transform duration-300 ease-in-out z-50">
          {/* Character Header */}
          <div className="p-4 border-b border-pink-300 relative">
            <div className="absolute top-2 right-2 flex space-x-1">
              <div className="w-3 h-3 rounded-full bg-pink-500 animate-pulse"></div>
              <div
                className="w-3 h-3 rounded-full bg-blue-500 animate-pulse"
                style={{ animationDelay: "0.2s" }}
              ></div>
              <div
                className="w-3 h-3 rounded-full bg-green-500 animate-pulse"
                style={{ animationDelay: "0.4s" }}
              ></div>
            </div>
            <Link
              to="/profile"
              className="block text-center hover:bg-pink-200 p-2 rounded-lg transition-all duration-200 group"
            >
              <div className="font-bold text-lg text-pink-600 group-hover:text-pink-700">
                {profileName || "Loading..."}
              </div>
              <div className="text-sm text-purple-600 group-hover:text-purple-700">
                Customer
              </div>
            </Link>
            <p className="text-center text-xs text-gray-600 mt-2">
              Developed by: Hannah Bea Alcaide, Justinne Angelie Floresca,
              Joshua Sam Suarez
            </p>
          </div>

          <div className="p-4 overflow-y-auto h-[calc(100vh-8rem)]">
            <Link
              to="/customer/dashboard"
              className="block py-3 px-4 hover:bg-pink-200 rounded-lg mb-2 text-lg text-pink-600 font-semibold transition-all duration-200 hover:scale-105 hover:shadow-md"
            >
              Dashboard
            </Link>
            <Link
              to="/order-history"
              className="block py-3 px-4 hover:bg-pink-200 rounded-lg mb-2 text-lg text-purple-600 font-semibold transition-all duration-200 hover:scale-105 hover:shadow-md"
            >
              Order History
            </Link>
            <button
              onClick={handleLogout}
              className="w-full mt-4 py-3 px-4 text-red-500 hover:bg-red-100 rounded-lg text-lg font-semibold transition-all duration-200 hover:scale-105 hover:shadow-md"
            >
              Logout
            </button>
          </div>

          {/* Powerpuff Girls Footer */}
          <div className="absolute bottom-16 right-4 flex space-x-2">
            <div
              className="w-8 h-8 rounded-full bg-pink-500 animate-bounce flex items-center justify-center text-white font-bold"
              style={{ animationDelay: "0s" }}
            >
              B
            </div>
            <div
              className="w-8 h-8 rounded-full bg-blue-500 animate-bounce flex items-center justify-center text-white font-bold"
              style={{ animationDelay: "0.2s" }}
            >
              B
            </div>
            <div
              className="w-8 h-8 rounded-full bg-green-500 animate-bounce flex items-center justify-center text-white font-bold"
              style={{ animationDelay: "0.4s" }}
            >
              B
            </div>
          </div>
          <p className="absolute bottom-1 left-1/2 transform -translate-x-1/2 text-center text-xs text-gray-600 w-full">
            Developed by: Hannah Bea Alcaide, Justinne Angelie Floresca, Joshua
            Sam Suarez
          </p>
        </div>
      )}
      {/* Employee Sidebar */}
      {(userRole === "cashier" ||
        userRole === "inventory clerk" ||
        userRole === "driver") &&
        isSidebarOpen && (
          <div className="fixed inset-y-0 right-0 w-56 bg-gradient-to-b from-pink-100 via-blue-100 to-green-100 shadow-lg transform transition-transform duration-300 ease-in-out z-50">
            {/* Character Header */}
            <div className="p-4 border-b border-pink-300 relative">
              <div className="absolute top-2 right-2 flex space-x-1">
                <div className="w-3 h-3 rounded-full bg-pink-500 animate-pulse"></div>
                <div
                  className="w-3 h-3 rounded-full bg-blue-500 animate-pulse"
                  style={{ animationDelay: "0.2s" }}
                ></div>
                <div
                  className="w-3 h-3 rounded-full bg-green-500 animate-pulse"
                  style={{ animationDelay: "0.4s" }}
                ></div>
              </div>
              <Link
                to="/staff/profile"
                className="block text-center hover:bg-pink-200 p-2 rounded-lg transition-all duration-200 group"
              >
                <div className="font-bold text-lg text-pink-600 group-hover:text-pink-700">
                  {profileName || "Loading..."}
                </div>
                <div className="text-sm text-purple-600 group-hover:text-purple-700">
                  Employee
                </div>
              </Link>
              <p className="text-center text-xs text-gray-600 mt-2">
                Developed by: Hannah Bea Alcaide, Justinne Angelie Floresca,
                Joshua Sam Suarez
              </p>
            </div>

            <div className="p-4 overflow-y-auto h-[calc(100vh-8rem)]">
              <Link
                to="/staff/profile"
                className="block py-3 px-4 hover:bg-pink-200 rounded-lg mb-2 text-lg text-purple-600 font-semibold transition-all duration-200 hover:scale-105 hover:shadow-md"
              >
                Profile
              </Link>
              <button
                onClick={handleLogout}
                className="w-full mt-4 py-3 px-4 text-red-500 hover:bg-red-100 rounded-lg text-lg font-semibold transition-all duration-200 hover:scale-105 hover:shadow-md"
              >
                Logout
              </button>
            </div>

            {/* Footer Icons */}
            <div className="absolute bottom-16 right-4 flex space-x-2">
              <div className="w-8 h-8 rounded-full bg-pink-500 animate-bounce flex items-center justify-center text-white font-bold">
                B
              </div>
              <div
                className="w-8 h-8 rounded-full bg-blue-500 animate-bounce flex items-center justify-center text-white font-bold"
                style={{ animationDelay: "0.2s" }}
              >
                B
              </div>
              <div
                className="w-8 h-8 rounded-full bg-green-500 animate-bounce flex items-center justify-center text-white font-bold"
                style={{ animationDelay: "0.4s" }}
              >
                B
              </div>
            </div>
            <p className="absolute bottom-1 left-1/2 transform -translate-x-1/2 text-center text-xs text-gray-600 w-full">
              Developed by: Hannah Bea Alcaide, Justinne Angelie Floresca,
              Joshua Sam Suarez
            </p>
          </div>
        )}
    </>
  );
};

Navigation.propTypes = {
  loggedInUser: PropTypes.shape({
    role: PropTypes.string,
  }),
  userRole: PropTypes.string,
  profileName: PropTypes.string,
  cart: PropTypes.arrayOf(PropTypes.shape({})),
  handleLogout: PropTypes.func.isRequired,
};

// Create a separate AppContent component that uses hooks
const AppContent = () => {
  const [loggedInUser, setLoggedInUser] = useState(
    JSON.parse(localStorage.getItem("loggedInUser")) || null
  );
  const [cart, setCart] = useState([]);
  const [profileName, setProfileName] = useState(null);
  const navigate = useNavigate();

  // Fetch and set user profile data
  const fetchUserProfile = async (userId) => {
    try {
      let { data: staff } = await supabase
        .from("staff_profiles")
        .select("name, role")
        .eq("id", userId)
        .maybeSingle();

      if (staff?.name) {
        setProfileName(staff.name);
        return { name: staff.name, role: staff.role };
      }

      let { data: customer } = await supabase
        .from("profiles")
        .select("name")
        .eq("id", userId)
        .maybeSingle();

      if (customer?.name) {
        setProfileName(customer.name);
        return { name: customer.name, role: "customer" };
      }

      return { name: "Unknown User", role: "customer" }; // prevent logout
    } catch {
      return { name: "Unknown User", role: "customer" };
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
      const { data: sessionData } = await supabase.auth.getSession();

      if (sessionData?.session?.user?.id) {
        const userId = sessionData.session.user.id;
        const profile = await fetchUserProfile(userId);

        const updatedUser = {
          ...sessionData.session.user,
          name: profile?.name || "Guest",
          role: profile?.role || "customer",
        };

        updateLoggedInUser(updatedUser);
        setProfileName(profile?.name || "Guest");
      } else {
        updateLoggedInUser(null);
        setProfileName(null);
      }
    };

    handleSessionChange(); // Initial fetch

    const { subscription: authListener } = supabase.auth.onAuthStateChange(
      () => {
        handleSessionChange();
      }
    );

    const profileUpdateListener = () => {
      handleSessionChange();
    };

    window.addEventListener("profile-updated", profileUpdateListener);

    return () => {
      authListener?.unsubscribe?.();
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

  useEffect(() => {
    const setupRealtimeLogout = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const localUser = JSON.parse(localStorage.getItem("loggedInUser"));
      const role = localUser?.role;
      const table =
        role === "admin" || role === "employee" ? "staff_profiles" : "profiles";

      const channel = supabase
        .channel("logout-on-account-update")
        .on(
          "postgres_changes",
          {
            event: "*", // 👈 includes UPDATE and DELETE
            schema: "public",
            table,
            filter: `id=eq.${user.id}`,
          },
          async (payload) => {
            const newStatus = payload.new?.status;
            // const oldStatus = payload.old?.status; // ❌ remove to fix ESLint warning

            console.log("📡 Realtime change received:", payload);

            const isDeleted =
              payload.eventType === "UPDATE" && newStatus === "Deleted";
            const isDeactivated =
              payload.eventType === "UPDATE" &&
              (newStatus === "Deactivated" || newStatus === "Deleted");

            if (isDeleted || isDeactivated) {
              alert(
                isDeleted
                  ? "🗑️ Your account has been deleted. Logging out."
                  : "🚫 Your account has been deactivated. Logging out."
              );
              await supabase.auth.signOut();
              localStorage.removeItem("loggedInUser");
              window.location.href = "/login";
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    };

    setupRealtimeLogout();
  }, []);

  // Handle logout
  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      localStorage.removeItem("loggedInUser");
      updateLoggedInUser(null); // Clear state
      setProfileName(null);
      navigate("/login");
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
    <>
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
        limit={3}
      />
      <Navigation
        loggedInUser={loggedInUser}
        userRole={userRole}
        profileName={profileName}
        cart={cart}
        handleLogout={handleLogout}
      />
      <Routes>
        {/* Public Routes */}
        <Route
          path="/"
          element={<Login setLoggedInUser={updateLoggedInUser} />}
        />
        <Route
          path="/signup"
          element={loggedInUser ? <Navigate to={`/${userRole}`} /> : <Signup />}
        />

        <Route
          path="/login"
          element={<Login setLoggedInUser={updateLoggedInUser} />}
        />

        {/* Common Routes */}
        <Route
          path="/staff/profile"
          element={
            <ProtectedRoute
              allowedRoles={[
                "admin",
                "employee",
                "cashier",
                "inventory clerk",
                "driver",
              ]}
              user={loggedInUser}
              element={<StaffProfile />}
            />
          }
        />
        <Route path="/staff/setup" element={<StaffSetup />} />
        <Route path="/profile" element={<CustomerProfilePage />} />
        <Route path="/order-history" element={<OrderHistory />} />
        <Route path="/cart" element={<OrderProcess />} />

        {/* Admin Routes */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute
              allowedRoles={["admin"]}
              user={loggedInUser}
              redirectTo={`/${userRole}`}
            >
              <Home />
            </ProtectedRoute>
          }
        >
          <Route index element={<AdminDashboard />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="users" element={<Users />} />
          <Route path="add-staff" element={<AddEmployee />} />
          <Route path="users/customers" element={<Customers />} />
          <Route path="users/customers/:id" element={<CustomerProfile />} />
          <Route path="users/employees" element={<Employees />} />
          <Route path="users/employees/:id" element={<EmployeeProfile />} />
          <Route path="deleted-accounts" element={<DeletedAccounts />} />
          <Route path="purchase-orders" element={<PurchaseOrder />} />
          <Route
            path="inventory-management"
            element={<InventoryManagement />}
          />
          <Route path="stockin" element={<StockInManagement />} />
          <Route path="supplier-management" element={<SupplierManagement />} />
          <Route path="delivery-management" element={<DeliveryManagement />} />
          <Route
            path="update-orders"
            element={
              <ProtectedRoute
                allowedRoles={["admin", "employee"]}
                user={loggedInUser}
                element={<SalesOrders />}
                redirectTo="/unauthorized"
              />
            }
          />
          <Route path="finance/income" element={<AdminFinanceIncome />} />
          <Route
            path="finance/expenses"
            element={
              <ProtectedRoute allowedRoles={["admin"]} user={loggedInUser}>
                <Expenses />
              </ProtectedRoute>
            }
          />
          <Route
            path="finance/vehicles"
            element={
              <ProtectedRoute allowedRoles={["admin"]} user={loggedInUser}>
                <Vehicles />
              </ProtectedRoute>
            }
          />
        </Route>

        {/* Employee Routes */}
        <Route
          path="/employee"
          element={
            <ProtectedRoute
              allowedRoles={["employee"]}
              user={loggedInUser}
              redirectTo={`/${userRole}`}
            >
              <Home />
            </ProtectedRoute>
          }
        >
          <Route
            path="inventory-management"
            element={<InventoryManagement />}
          />
          <Route path="supplier-management" element={<SupplierManagement />} />
        </Route>

        {/* Customer Routes */}
        <Route path="/customer" element={<Home />}>
          <Route index element={<Products />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="order-history" element={<OrderHistory />} />
          <Route path="cart" element={<OrderProcess />} />
          <Route path="profile" element={<CustomerProfilePage />} />
        </Route>

        {/* Unauthorized Route */}
        <Route path="/unauthorized" element={<Unauthorized />} />

        {/* Update Password Route */}
        <Route path="/update-password" element={<UpdatePassword />} />

        {/* Catch-all route */}
        <Route path="*" element={<p>404 Not Found</p>} />
      </Routes>
    </>
  );
};

// Main App component that wraps everything in Router
function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
