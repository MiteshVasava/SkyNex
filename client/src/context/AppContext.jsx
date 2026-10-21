import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../api';

const C = createContext(null);
export const useApp = () => useContext(C);
const readJson = (key, fallback = null) => {
  try { const value = localStorage.getItem(key); return value ? JSON.parse(value) : fallback; }
  catch { return fallback; }
};

export function AppProvider({ children }) {
  const [user, setUser] = useState(() => {
    const u = readJson('skynex-user');
    return u?.role === 'customer' && localStorage.getItem('skynex-token') ? u : null;
  });
  const [cart, setCart] = useState(() => {
    const value = readJson('skynex-cart', []);
    return Array.isArray(value) ? value : [];
  });
  const [wishlist, setWishlist] = useState([]);

  useEffect(() => { localStorage.setItem('skynex-cart', JSON.stringify(cart)); }, [cart]);
  useEffect(() => {
    const expire = () => { setUser(null); setWishlist([]); };
    window.addEventListener('skynex:customer-session-expired', expire);
    return () => window.removeEventListener('skynex:customer-session-expired', expire);
  }, []);
  useEffect(() => {
    if (!localStorage.getItem('skynex-token')) return;
    let active = true;
    api('/users/me').then(x => {
      if (!active || x.role && x.role !== 'customer') return;
      setUser(x);
      setWishlist((x.wishlist || []).map(p => p._id || p));
      localStorage.setItem('skynex-user', JSON.stringify(x));
    }).catch(() => {
      if (active) { localStorage.removeItem('skynex-user'); setUser(null); setWishlist([]); }
    });
    return () => { active = false; };
  }, []);

  const add = p => setCart(c => {
    const existing = c.find(i => i.product === p._id);
    return existing
      ? c.map(i => i.product === p._id ? { ...i, quantity: i.quantity + 1 } : i)
      : [...c, { product: p._id, name: p.name, price: p.price, image: p.images?.[0] || '', quantity: 1 }];
  });
  const remove = id => setCart(c => c.filter(x => x.product !== id));
  const update = (id, q) => setCart(c => q <= 0 ? c.filter(x => x.product !== id) : c.map(x => x.product === id ? { ...x, quantity: q } : x));
  const login = (u, token) => {
    if (!token || u?.role !== 'customer') throw new Error('This login is for customer accounts only.');
    localStorage.setItem('skynex-token', token);
    localStorage.setItem('skynex-user', JSON.stringify(u));
    setUser(u);
  };
  const logout = () => {
    localStorage.removeItem('skynex-token');
    localStorage.removeItem('skynex-user');
    setUser(null); setWishlist([]);
  };
  const value = useMemo(() => ({ user, setUser, cart, add, remove, update, login, logout, wishlist, setWishlist }), [user, cart, wishlist]);
  return <C.Provider value={value}>{children}</C.Provider>;
}
