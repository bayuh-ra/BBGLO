import EmployeeSidebar from "./EmployeeSidebar";
import { Outlet } from "react-router-dom";

export default function EmployeeLayout() {
  return (
    <div className="flex">
      <EmployeeSidebar />
      <div className="flex-1 p-4">
        <Outlet />
      </div>
    </div>
  );
}
