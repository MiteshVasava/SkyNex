import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export async function auth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    if (!header.startsWith('Bearer ')) return res.status(401).json({ message: 'Authentication required. Please sign in.' });
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) return res.status(503).json({ message: 'Server authentication is not configured. Set JWT_SECRET in server/.env.' });
    const payload = jwt.verify(header.slice(7), process.env.JWT_SECRET, { issuer: 'skynex-api', audience: 'skynex-app' });
    const user = await User.findById(payload.id).select('_id name email role permissions active');
    if (!user || user.active === false) return res.status(401).json({ message: 'This account is unavailable. Please contact the administrator.' });
    req.user = {
      id: String(user._id), name: user.name, email: user.email,
      role: user.role, permissions: user.permissions || []
    };
    return next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') return res.status(401).json({ message: 'Your session expired. Please sign in again.' });
    return res.status(401).json({ message: 'Your session is invalid. Please sign in again.' });
  }
}

export function role(...roles) {
  return (req, res, next) => roles.includes(req.user.role)
    ? next()
    : res.status(403).json({ message: 'Insufficient role permissions.' });
}

export function permission(area) {
  return (req, res, next) => req.user.role === 'admin' ||
    (req.user.role === 'staff' && (req.user.permissions || []).includes(area))
    ? next()
    : res.status(403).json({ message: 'This staff account does not have permission for this operation.' });
}
