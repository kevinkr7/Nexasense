import { Navigate } from "react-router-dom";

const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
  const token = localStorage.getItem("nexasense_token");

  if (!token) {
    return <Navigate to="/demo" replace />;
  }

  return children;
};

export default ProtectedRoute;
