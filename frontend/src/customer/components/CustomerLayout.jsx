import { Outlet } from "react-router-dom";
import CustomerSidebar from "./CustomerSidebar";

export default function CustomerLayout() {
  return (
    <div className="flex">
      {/* Sidebar */}
      <CustomerSidebar />

      {/* Main Content - Push content to start after the sidebar */}
      <div className="flex-1 p-6 ml-64">
        <Outlet />
      </div>
    </div>
  );
}
