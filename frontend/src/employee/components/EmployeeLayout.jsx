import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../api/supabaseClient";
import { useUser } from "@supabase/auth-helpers-react";
import EmployeeSidebar from "./EmployeeSidebar";
import { Outlet } from "react-router-dom";

export default function EmployeeLayout() {
  const user = useUser();
  const navigate = useNavigate();

  useEffect(() => {
    const checkIfStillActive = async () => {
      if (!user) return;
      const { data } = await supabase
        .from("staff_profiles")
        .select("status")
        .eq("id", user.id)
        .single();

      if (data?.status === "Deactivated") {
        alert("Your account has been deactivated.");
        await supabase.auth.signOut();
        navigate("/login");
      }
    };

    checkIfStillActive();
  }, [user, navigate]);

  return (
    <div className="flex">
      <EmployeeSidebar />
      <div className="flex-1 p-4">
        <Outlet />
      </div>
    </div>
  );
}
