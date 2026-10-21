import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { auth, role } from '../middleware/auth.js';

const r = Router();
const allowedPermissions = ['products', 'inventory', 'orders', 'support', 'manageSite', 'manageStaff', 'analytics', 'categories', 'customers'];

function safe(user) {
  return {
    _id: user._id, id: user._id, name: user.name, email: user.email,
    phone: user.phone || '', role: user.role, permissions: user.permissions || [],
    active: user.active !== false, addresses: user.addresses || [], wishlist: user.wishlist || []
  };
}
function issueToken(user) {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET is missing or too short. Set a random secret of at least 32 characters in server/.env and restart the API.');
  }
  return jwt.sign({ id: String(user._id) }, process.env.JWT_SECRET, { expiresIn: '8h', issuer: 'skynex-api', audience: 'skynex-app' });
}
function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}
function loginFailure(res) {
  return res.status(401).json({ message: 'Email or password is incorrect, or this account is inactive.' });
}

r.post('/register', async (req, res) => {
  try {
    const name = String(req.body.name || '').trim();
    const email = normalizeEmail(req.body.email);
    const password = String(req.body.password || '');
    const phone = String(req.body.phone || '').trim();
    if (!name || !email || !password) return res.status(400).json({ message: 'Name, email and password are required.' });
    if (password.length < 6) return res.status(400).json({ message: 'Password must contain at least 6 characters.' });
    if (await User.findOne({ email })) return res.status(409).json({ message: 'An account with this email already exists.' });
    const user = await User.create({ name, email, phone, password: await bcrypt.hash(password, 12), role: 'customer' });
    return res.status(201).json({ token: issueToken(user), user: safe(user) });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: 'An account with this email already exists.' });
    console.error('Customer registration failed:', error.message);
    return res.status(500).json({ message: error.message.includes('JWT_SECRET') ? error.message : 'Unable to create your account. Please try again.' });
  }
});

r.post('/login', async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const password = String(req.body.password || '');
    if (!email || !password) return res.status(400).json({ message: 'Enter your email and password.' });
    const user = await User.findOne({ email, role: 'customer' });
    if (!user || user.active === false || !(await bcrypt.compare(password, user.password))) return loginFailure(res);
    return res.json({ token: issueToken(user), user: safe(user) });
  } catch (error) {
    console.error('Customer login failed:', error.message);
    return res.status(500).json({ message: error.message.includes('JWT_SECRET') ? error.message : 'Login service is temporarily unavailable. Check the backend logs and database connection.' });
  }
});

r.post('/admin-login', async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const password = String(req.body.password || '');
    if (!email || !password) return res.status(400).json({ message: 'Enter your email and password.' });
    const user = await User.findOne({ email, role: { $in: ['admin', 'staff'] } });
    if (!user || user.active === false || !(await bcrypt.compare(password, user.password))) return loginFailure(res);
    return res.json({ token: issueToken(user), user: safe(user) });
  } catch (error) {
    console.error('Administration login failed:', error.message);
    return res.status(500).json({ message: error.message.includes('JWT_SECRET') ? error.message : 'Administration login is temporarily unavailable. Check the backend and MongoDB connection.' });
  }
});

r.get('/session', auth, (req, res) => res.json({
  user: { id: req.user.id, _id: req.user.id, name: req.user.name, email: req.user.email, role: req.user.role, permissions: req.user.permissions || [] }
}));

r.post('/logout', (_req, res) => {
  // JWT sessions are stateless; removing the token on the client ends this session.
  res.json({ ok: true });
});

r.get('/staff', auth, role('admin'), async (_req, res) => {
  res.json((await User.find({ role: 'staff' }).select('-password').sort({ createdAt: -1 })).map(safe));
});
r.post('/staff', auth, role('admin'), async (req, res) => {
  try {
    const name = String(req.body.name || '').trim();
    const email = normalizeEmail(req.body.email);
    const password = String(req.body.password || '');
    const permissions = Array.isArray(req.body.permissions) ? req.body.permissions : [];
    if (!name || !email || password.length < 8) return res.status(400).json({ message: 'Name, email and a password of at least 8 characters are required.' });
    if (await User.findOne({ email })) return res.status(409).json({ message: 'Email is already in use.' });
    const user = await User.create({
      name, email, password: await bcrypt.hash(password, 12), role: 'staff',
      permissions: [...new Set(permissions)].filter(p => allowedPermissions.includes(p))
    });
    return res.status(201).json(safe(user));
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: 'Email is already in use.' });
    return res.status(500).json({ message: 'Could not create staff account.' });
  }
});
r.put('/staff/:id', auth, role('admin'), async (req, res) => {
  try {
    const permissions = Array.isArray(req.body.permissions) ? req.body.permissions : [];
    const user = await User.findOneAndUpdate(
      { _id: req.params.id, role: 'staff' },
      { $set: { permissions: [...new Set(permissions)].filter(p => allowedPermissions.includes(p)), active: req.body.active !== false } },
      { new: true, runValidators: true }
    ).select('-password');
    if (!user) return res.status(404).json({ message: 'Staff account not found.' });
    return res.json(safe(user));
  } catch {
    return res.status(400).json({ message: 'Unable to update staff account.' });
  }
});
r.delete('/staff/:id', auth, role('admin'), async (req, res) => {
  const user = await User.findOneAndDelete({ _id: req.params.id, role: 'staff' });
  if (!user) return res.status(404).json({ message: 'Staff account not found.' });
  return res.json({ ok: true });
});

export default r;
