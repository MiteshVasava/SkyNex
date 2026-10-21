import { Navigate, Route, Routes } from 'react-router-dom';
import { useState } from 'react';
import { api } from './api';
import { Provider, useAdmin } from './context';
import { ShieldCheck } from 'lucide-react';
import Dashboard from './Dashboard';
import './styles.css';

function Login() {
  const { login } = useAdmin();
  const [form, setForm] = useState({ email: '', password: '' });
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault(); setBusy(true); setMessage('');
    try {
      const data = await api('/auth/admin-login', { method: 'POST', body: JSON.stringify(form) });
      login(data.user, data.token);
      window.location.replace('/skynex-control');
    } catch (err) { setMessage(err.message); }
    finally { setBusy(false); }
  }
  return <main className="admin-auth"><div className="admin-auth-card">
    <div className="admin-logo"><span>Sky</span>Nex<small>ADMINISTRATION</small></div>
    <span className="eyebrow">PRIVATE CONTROL PANEL</span><h1>Administration login</h1>
    <p>Sign in with an authorized administrator or staff account.</p>
    <form onSubmit={submit}><label>Email<input type="email" required autoComplete="username" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></label>
    <label>Password<input type="password" required autoComplete="current-password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})}/></label>
    {message && <div className="error">{message}</div>}
    <button className="admin-primary" disabled={busy}>{busy?'Signing in…':'Sign in to Administration'}</button></form>
    <div className="admin-note"><ShieldCheck/> Protected by server-side role and permission checks</div>
  </div></main>;
}
function Gate() {
  const { user } = useAdmin();
  return user && ['admin','staff'].includes(user.role) ? <Dashboard/> : <Navigate to="/skynex-control/login" replace/>;
}
export default function AdminPortal() {
  return <Provider><Routes>
    <Route path="login" element={<Login/>}/>
    <Route path="*" element={<Gate/>}/>
  </Routes></Provider>;
}
