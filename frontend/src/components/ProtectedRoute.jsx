import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../api/supabaseClient";
import PropTypes from "prop-types";

const ProtectedRoute = ({
  children,
  allowedRoles = [],
  user,
  redirectTo = "/unauthorized",
}) => {
  const navigate = useNavigate();

  useEffect(() => {
    const checkUserStatus = async () => {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error || !session) {
        navigate("/login");
        return;
      }

      const { data: staffProfile } = await supabase
        .from("staff_profiles")
        .select("status")
        .eq("id", session.user.id)
        .maybeSingle();

      const status = staffProfile?.status;

      if (status === "Deleted" || status === "Deactivated") {
        await supabase.auth.signOut();
        navigate("/login");
        return;
      }

      if (
        allowedRoles.length > 0 &&
        !allowedRoles.includes(user?.role?.toLowerCase())
      ) {
        navigate(redirectTo);
      }
    };

    checkUserStatus();
  }, [navigate, allowedRoles, user, redirectTo]);

  return children;
};

ProtectedRoute.propTypes = {
  children: PropTypes.node.isRequired,
  allowedRoles: PropTypes.array,
  user: PropTypes.object,
  redirectTo: PropTypes.string,
};

export default ProtectedRoute;
