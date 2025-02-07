import AdminSidebar from "./AdminSidebar";
import { Outlet } from "react-router-dom";

export default function AdminLayout() {
  return (
    <div className="flex">
      <AdminSidebar />
      <div className="flex-1 p-4">
        <Outlet />
      </div>
    </div>
  );
}
