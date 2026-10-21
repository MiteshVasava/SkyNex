import { createContext, useContext, useEffect, useState } from 'react';
const C = createContext(null);
export const useAdmin = () => useContext(C);
function storedUser() {
  try {
    const user = JSON.parse(localStorage.getItem('skynex-admin-user') || 'null');
    return localStorage.getItem('skynex-admin-token') && ['admin', 'staff'].includes(user?.role) ? user : null;
  } catch { return null; }
}
export function Provider({ children }) {
  const [user, setUser] = useState(storedUser);
  useEffect(() => {
    const expire = () => setUser(null);
    window.addEventListener('skynex:admin-session-expired', expire);
    return () => window.removeEventListener('skynex:admin-session-expired', expire);
  }, []);
  const login = (u, token) => {
    if (!token || !['admin', 'staff'].includes(u?.role)) throw new Error('This login is for administration accounts only.');
    localStorage.setItem('skynex-admin-user', JSON.stringify(u));
    localStorage.setItem('skynex-admin-token', token);
    setUser(u);
  };
  const logout = () => {
    localStorage.removeItem('skynex-admin-user');
    localStorage.removeItem('skynex-admin-token');
    setUser(null);
  };
  return <C.Provider value={{ user, login, logout }}>{children}</C.Provider>;
}
