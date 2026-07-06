import express from 'express';
import pool from '../db/index.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();
router.use(authMiddleware);

// LISTA CLIENTI
router.get('/', async (req, res) => {
  try {
    const { search, relazione } = req.query;
    let query = 'SELECT * FROM clienti WHERE attivo = true';
    const params = [];
    if (search) {
      params.push(`%${search}%`);
      query += ` AND (nome ILIKE $${params.length} OR telefono ILIKE $${params.length} OR email ILIKE $${params.length} OR codice ILIKE $${params.length} OR piva ILIKE $${params.length})`;
    }
    if (relazione) {
      params.push(relazione);
      query += ` AND tipo_relazione = $${params.length}`;
    }
    query += ' ORDER BY nome';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// SINGOLO CLIENTE
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM clienti WHERE id = $1', [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ error: 'Cliente non trovato' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// CREA CLIENTE
router.post('/', async (req, res) => {
  try {
    const { nome, telefono, email, tipo_cliente, tipo_relazione, settore, piva, codice_fiscale, indirizzo, data_nascita, note } = req.body;
    
    // Controllo duplicati
    if (telefono) {
      const dup = await pool.query('SELECT id, nome FROM clienti WHERE telefono = $1', [telefono]);
      if (dup.rows[0]) return res.status(409).json({ error: `Telefono già associato a: ${dup.rows[0].nome}`, cliente: dup.rows[0] });
    }
    if (email) {
      const dup = await pool.query('SELECT id, nome FROM clienti WHERE email = $1', [email]);
      if (dup.rows[0]) return res.status(409).json({ error: `Email già associata a: ${dup.rows[0].nome}`, cliente: dup.rows[0] });
    }

    // Genera codice cliente
    const count = await pool.query('SELECT COUNT(*) FROM clienti');
    const codice = `CP${String(parseInt(count.rows[0].count) + 1).padStart(4, '0')}`;

    const result = await pool.query(
      `INSERT INTO clienti (codice, nome, telefono, email, tipo_cliente, tipo_relazione, settore, piva, codice_fiscale, indirizzo, data_nascita, note)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [codice, nome, telefono, email, tipo_cliente, tipo_relazione, settore, piva, codice_fiscale, indirizzo, data_nascita, note]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// AGGIORNA CLIENTE
router.put('/:id', async (req, res) => {
  try {
    const { nome, telefono, email, tipo_cliente, tipo_relazione, settore, piva, codice_fiscale, indirizzo, data_nascita, note } = req.body;
    const result = await pool.query(
      `UPDATE clienti SET nome=$1, telefono=$2, email=$3, tipo_cliente=$4, tipo_relazione=$5, settore=$6, piva=$7, codice_fiscale=$8, indirizzo=$9, data_nascita=$10, note=$11, updated_at=NOW()
       WHERE id=$12 RETURNING *`,
      [nome, telefono, email, tipo_cliente, tipo_relazione, settore, piva, codice_fiscale, indirizzo, data_nascita, note, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
