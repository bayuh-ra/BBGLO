import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../api/supabaseClient";
import PropTypes from "prop-types";

const ProtectedRoute = ({
  children,
  element,
  allowedRoles = [],
  user,
  redirectTo = "/unauthorized",
}) => {
  const navigate = useNavigate();

  useEffect(() => {
    const checkUserStatus = async () => {
      console.log("ProtectedRoute - Checking user status...");
      console.log("Current user:", user);
      console.log("Allowed roles:", allowedRoles);

      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      console.log("Session data:", session);
      console.log("Session error:", error);

      if (error || !session) {
        console.log("No session found, redirecting to login");
        navigate("/login");
        return;
      }

      const { data: staffProfile } = await supabase
        .from("staff_profiles")
        .select("status, role")
        .eq("id", session.user.id)
        .maybeSingle();

      console.log("Staff profile:", staffProfile);

      const status = staffProfile?.status;

      if (status === "Deleted" || status === "Deactivated") {
        console.log("Account is deleted or deactivated");
        await supabase.auth.signOut();
        navigate("/login");
        return;
      }

      const userRole = user?.role?.toLowerCase();
      console.log("User role:", userRole);
      console.log("Is role allowed?", allowedRoles.includes(userRole));

      if (allowedRoles.length > 0 && !allowedRoles.includes(userRole)) {
        console.log("Access denied - redirecting to:", redirectTo);
        navigate(redirectTo);
        return;
      }

      console.log("Access granted!");
    };

    checkUserStatus();
  }, [navigate, allowedRoles, user, redirectTo]);

  return children || element;
};

ProtectedRoute.propTypes = {
  children: PropTypes.node,
  element: PropTypes.node,
  allowedRoles: PropTypes.array,
  user: PropTypes.object,
  redirectTo: PropTypes.string,
};

export default ProtectedRoute;
