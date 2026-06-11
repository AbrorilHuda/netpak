import { Outlet } from 'react-router';
import { ProtectedRoute } from '~/components/ProtectedRoute';

export default function AuthenticatedLayout() {
  return (
    <ProtectedRoute>
      <Outlet />
    </ProtectedRoute>
  );
}
