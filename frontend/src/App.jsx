import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import Home from "./Home";
import CustomerSignup from "./customer/pages/CustomerSignup";
import CustomerLogin from "./customer/pages/CustomerLogin";
import AdminSignup from "./admin/pages/AdminSignup";
import AdminLogin from "./admin/pages/AdminLogin";
import AdminLayout from "./admin/components/AdminLayout";
import InventoryManagement from "./admin/pages/InventoryManagement";
import SupplierManagement from "./admin/pages/SupplierManagement";
import EmployeeSignup from "./employee/pages/EmployeeSignup";
import EmployeeLogin from "./employee/pages/EmployeeLogin";
import EmployeeLayout from "./employee/components/EmployeeLayout";

// Import Users Management pages from "src/admin/pages/users/"
import Customers from "./admin/pages/users/Customers";
import CustomerProfile from "./admin/pages/users/CustomerProfile";
import Employees from "./admin/pages/users/Employees";
import EmployeeProfile from "./admin/pages/users/EmployeeProfile";
import Users from "./admin/pages/users/Users";


function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        {/* Customer routes */}
        <Route path="/customer-signup" element={<CustomerSignup />} />
        <Route path="/customer-login" element={<CustomerLogin />} />

        {/* Employee routes */}
        <Route path="/employee-signup" element={<EmployeeSignup />} />
        <Route path="/employee-login" element={<EmployeeLogin />} />
        <Route path="/employee" element={<EmployeeLayout />}>
          {/* Employee nested routes */}
          <Route path="inventory-management" element={<InventoryManagement />} />
          <Route path="supplier-management" element={<SupplierManagement />} />
          <Route path="purchase-order" element={<div>Purchase Order Page</div>} />
          <Route path="sales/pending-orders" element={<div>Pending Sales Orders</div>} />
          <Route path="sales/previous-orders" element={<div>Previous Orders</div>} />
        </Route>

        {/* Admin routes */}
        <Route path="/admin-signup" element={<AdminSignup />} />
        <Route path="/admin-login" element={<AdminLogin />} />
        <Route path="/admin" element={<AdminLayout />}>
          {/* Admin nested routes */}
          <Route path="inventory-management" element={<InventoryManagement />} />
          <Route path="supplier-management" element={<SupplierManagement />} />

          {/* Users Management */}
          <Route path="users" element={<Users />} />
          <Route path="users/customers" element={<Customers />} />
          <Route path="users/customers/:id" element={<CustomerProfile />} />
          <Route path="users/employees" element={<Employees />} />
          <Route path="users/employees/:id" element={<EmployeeProfile />} />

          <Route path="purchase-order" element={<div>Purchase Order Page</div>} />
          <Route path="sales/pending-orders" element={<div>Pending Sales Orders</div>} />
          <Route path="sales/previous-orders" element={<div>Previous Orders</div>} />
          <Route path="finance/income" element={<div>Income Page</div>} />
          <Route path="finance/expenses" element={<div>Expenses Page</div>} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
