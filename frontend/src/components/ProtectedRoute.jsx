import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../api/supabaseClient";

const ProtectedRoute = ({ children }) => {
  const navigate = useNavigate();

  useEffect(() => {
    const checkUserStatus = async () => {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error || !session) {
          navigate("/login");
          return;
        }

        // Check staff profile status
        const { data: staffProfile, error: staffError } = await supabase
          .from("staff_profiles")
          .select("status")
          .eq("id", session.user.id)
          .single();

        if (staffError) {
          console.error("Error checking staff status:", staffError);
          return;
        }

        if (
          staffProfile?.status === "Deleted" ||
          staffProfile?.status === "Deactivated"
        ) {
          await supabase.auth.signOut();
          navigate("/login");
        }
      } catch (err) {
        console.error("Error in ProtectedRoute:", err);
        navigate("/login");
      }
    };

    checkUserStatus();
  }, [navigate]);

  return children;
};

export default ProtectedRoute;
