import { Link, useNavigate } from 'react-router-dom';
import { Menu, Search, UserRound, ShoppingCart, ChevronDown, X, Heart } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useEffect, useState } from 'react';
import { api } from '../api';

export default function Layout({ children }) {
  const { cart, user } = useApp();
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [cats, setCats] = useState([]);
  const [settings, setSettings] = useState({});
  const nav = useNavigate();

  useEffect(() => {
    api('/categories').then(setCats).catch(() => setCats([]));
    api('/content').then(c => {
      setSettings(c.settings || {});
      const t = c.theme || {};
      const root = document.documentElement;
      root.style.setProperty('--site-primary', t.primary || '#5521d8');
      root.style.setProperty('--site-accent', t.accent || '#a855f7');
      root.style.setProperty('--site-bg', t.background || '#fff');
      root.style.setProperty('--site-text', t.text || '#18152b');
      document.body.style.fontFamily = `${t.fontFamily || 'Inter'}, system-ui, sans-serif`;
      document.body.style.fontSize = `${t.bodySize || 15}px`;
      document.body.style.background = t.background || '#fff';
    }).catch(() => {});
  }, []);

  const submit = e => {
    e.preventDefault();
    if (search.trim()) nav('/products?search=' + encodeURIComponent(search.trim()));
  };

  const categoryName = c => typeof c === 'string' ? c : c.name;
  const categoryLink = c => '/products?category=' + encodeURIComponent(categoryName(c));

  return <>
    <header className="site-header">
      <div className="head">
        <button className="mobile-menu" aria-label="Open categories" onClick={() => setOpen(v => !v)}><Menu size={21}/></button>
        <Link className="logo" to="/"><span className="logo-mark">✦</span><span className="logo-word">SkyNex</span><small>{settings.tagline || 'THE TECH HUB'}</small></Link>
        <form className="search" onSubmit={submit}><Search size={17}/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search for products, brands and more..."/><button aria-label="Search"><Search size={18}/></button></form>
        <div className="head-actions">
          <Link to="/account" className="wishlist-action"><Heart size={19}/><span>Wishlist</span></Link>
          <Link to="/cart" className="cart"><ShoppingCart size={19}/><span>Cart</span>{cart.length > 0 && <b>{cart.reduce((s, x) => s + x.quantity, 0)}</b>}</Link>
          <Link to={user ? '/account' : '/login'} className="login-action"><UserRound size={16}/><span>{user ? 'Account' : 'Login'}</span></Link>
        </div>
      </div>
      <nav className="public-nav">
        <button className="category-trigger" onClick={() => setOpen(v => !v)}><Menu size={16}/> All Categories <ChevronDown size={14}/></button>
        <Link to="/">Home</Link>
        {cats.slice(0, 7).map(c => <Link key={c._id || c.name} to={categoryLink(c)}>{categoryName(c)}</Link>)}
        <Link to="/products?featured=true" className="nav-offers">Offers <span>✦</span></Link>
      </nav>
      {open && <div className="category-row"><div className="category-row-inner"><div className="category-row-title"><b>Browse categories</b><button onClick={() => setOpen(false)} aria-label="Close categories"><X size={17}/></button></div><div className="category-links">{cats.map(c => <Link key={c._id || c.name} to={categoryLink(c)} onClick={() => setOpen(false)}>{categoryName(c)}<span>→</span></Link>)}</div></div></div>}
    </header>
    {children}
    <footer><div><Link className="logo" to="/"><span className="logo-mark">✦</span><span className="logo-word">SkyNex</span><small>{settings.tagline || 'THE TECH HUB'}</small></Link><p>{settings.tagline || 'Technology shopping, made simple.'}</p></div><div><h4>Shop</h4><Link to="/products">All products</Link><Link to="/products?category=Laptops">Laptops</Link><Link to="/products?category=Graphics Cards">Graphics Cards</Link><Link to="/products?category=Accessories">Accessories</Link></div><div><h4>Customer care</h4><Link to="/account">My Account</Link><Link to="/orders">My Orders</Link><Link to="/support">Support</Link></div><div><h4>Contact</h4><p>{settings.supportEmail || 'support@skynex.local'}</p><p>{settings.supportPhone || '+91 1800 123 456'}</p><p>© 2026 SkyNex</p></div></footer>
  </>;
}
