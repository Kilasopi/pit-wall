import { useState, useEffect } from 'react';
import { RELAY_HTTP_URL } from '@/lib/relay';

const STORAGE_KEY = 'pitwall.authToken';

export function useAuth() {
    const [token, setToken] = useState(() => localStorage.getItem(STORAGE_KEY));

    useEffect(() => {
        if (token) localStorage.setItem(STORAGE_KEY, token);
        else localStorage.removeItem(STORAGE_KEY);
    }, [token]);

    async function login(username, password) {
        const res = await fetch(`${RELAY_HTTP_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
        });
        if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data.error ?? 'Login Failed');
        }
        const { token } = await res.json();
        setToken(token);
    }

    async function register(username, password) {
        const res = await fetch(`${RELAY_HTTP_URL}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
        });
        if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data.error ?? 'Registration Failed');
        }
        const { token } = await res.json();
        setToken(token);
    }

    function logout() {
        setToken(null);
    }

    return { token, isLoggedIn: Boolean(token), login, register, logout };
}