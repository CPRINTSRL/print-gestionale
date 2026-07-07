import express from 'express';
import pool from '../db/index.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();
router.use(authMiddleware);

// LISTA CATEGORIE SERVIZI ATTIVE
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM categorie_servizi WHERE attivo = true ORDER BY nome');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
