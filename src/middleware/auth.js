import jwt from 'jsonwebtoken';

export const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Non autorizzato' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: 'Token non valido' });
  }
};

export const adminOnly = (req, res, next) => {
  if (req.user.ruolo !== 'admin') return res.status(403).json({ error: 'Solo admin' });
  next();
};
