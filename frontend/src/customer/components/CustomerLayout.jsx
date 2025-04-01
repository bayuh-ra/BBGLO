import { Outlet } from "react-router-dom";

export default function CustomerLayout() {
  return (
    <div className="flex">
      {/* Main Content - Push content to start after the sidebar */}
      <div className="flex-1 p-6 ml-100">
        <Outlet />
      </div>
    </div>
  );
}
