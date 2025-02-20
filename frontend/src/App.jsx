import { Route, BrowserRouter as Router, Routes } from "react-router-dom";
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
import OrderHistory from "./customer/pages/OrderHistory";
import Profile from "./customer/pages/Profile";
import Dashboard from "./customer/pages/Dashboard";



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
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
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
