import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

// Gates crew-only pages behind login — isLoggedIn just means a token exists
// in localStorage, not that it's still valid; an expired token only gets
// caught once an actual API call hits requireAuth on the backend and 401s.
export function RequireAuth({ children }) {
    const { isLoggedIn } = useAuth();
    if (!isLoggedIn) return <Navigate to="/login" replace />;
    return children;
}

// Inverse — keeps an already-logged-in user off /login and /signup.
export function RedirectIfAuthed({ children }) {
    const { isLoggedIn } = useAuth();
    if (isLoggedIn) return <Navigate to="/" replace />;
    return children;
}
