import { Outlet } from "react-router-dom";
import CustomerSidebar from "./CustomerSidebar";

export default function CustomerLayout() {
  return (
    <div className="flex">
      <CustomerSidebar />
      <div className="flex-1 p-4">
        <Outlet />
      </div>
    </div>
  );
}
