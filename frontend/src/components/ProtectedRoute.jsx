import { Navigate } from 'react-router-dom';
import { authService } from '../services/authService';

const ProtectedRoute = ({ children, requiredRole }) => {
  const isAuthenticated = authService.isAuthenticated();
  const user = authService.getCurrentUser();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && user) {
    const roleName = requiredRole.startsWith('ROLE_') 
      ? requiredRole 
      : `ROLE_${requiredRole.toUpperCase()}`;
    
    if (!user.roles || !user.roles.includes(roleName)) {
      // Redirect based on user role
      if (user.roles?.includes('ROLE_ADMIN')) {
        return <Navigate to="/admin/dashboard" replace />;
      } else if (user.roles?.includes('ROLE_DRIVER')) {
        return <Navigate to="/driver/dashboard" replace />;
      } else if (user.roles?.includes('ROLE_PASSENGER')) {
        return <Navigate to="/passenger/dashboard" replace />;
      }
      return <Navigate to="/" replace />;
    }
  }

  return children;
};

export default ProtectedRoute;

