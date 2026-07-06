import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../db/index.js';

const router = express.Router();

// LOGIN
router.post('/login', async (req, res) => {
  try {
    const { username, password, badge_code } = req.body;
    let user;

    if (badge_code) {
      const result = await pool.query('SELECT * FROM utenti WHERE badge_code = $1 AND attivo = true', [badge_code]);
      user = result.rows[0];
      if (!user) return res.status(401).json({ error: 'Badge non riconosciuto' });
    } else {
      const result = await pool.query('SELECT * FROM utenti WHERE username = $1 AND attivo = true', [username]);
      user = result.rows[0];
      if (!user) return res.status(401).json({ error: 'Credenziali non valide' });
      const validPassword = await bcrypt.compare(password, user.password_hash);
      if (!validPassword) return res.status(401).json({ error: 'Credenziali non valide' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, ruolo: user.ruolo, nome: user.nome },
      process.env.JWT_SECRET,
      { expiresIn: '12h' }
    );

    res.json({
      token,
      user: { id: user.id, nome: user.nome, cognome: user.cognome, username: user.username, ruolo: user.ruolo }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
