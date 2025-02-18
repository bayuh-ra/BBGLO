import AdminSidebar from "./AdminSidebar";
import { Outlet } from "react-router-dom";

export default function AdminLayout() {
  return (
    <div className="flex">
      {/* Sidebar */}
      <AdminSidebar />

      {/* Main Content */}
      <div className="flex-1 p-6 ml-64"> {/* Adds left margin to prevent overlap */}
        <Outlet />
      </div>
    </div>
  );
}
