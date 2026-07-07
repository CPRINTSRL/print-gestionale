import express from 'express';
import pool from '../db/index.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();
router.use(authMiddleware);

// LISTA ORDINI
router.get('/', async (req, res) => {
  try {
    const { stato, assegnato_a, urgente } = req.query;
    let query = `SELECT o.*, c.nome as cliente_nome_full, u.nome as operatore_nome
                 FROM ordini o
                 LEFT JOIN clienti c ON o.cliente_id = c.id
                 LEFT JOIN utenti u ON o.assegnato_a = u.id
                 WHERE 1=1`;
    const params = [];
    if (stato) { params.push(stato); query += ` AND o.stato = $${params.length}`; }
    if (assegnato_a) { params.push(assegnato_a); query += ` AND o.assegnato_a = $${params.length}`; }
    if (urgente) { params.push(true); query += ` AND o.urgente = $${params.length}`; }
    query += ' ORDER BY o.urgente DESC, o.data_ritiro_prevista ASC NULLS LAST, o.created_at ASC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// SINGOLO ORDINE
router.get('/:id', async (req, res) => {
  try {
    const ordine = await pool.query('SELECT * FROM ordini WHERE id = $1', [req.params.id]);
    const righe = await pool.query('SELECT * FROM ordini_righe WHERE ordine_id = $1', [req.params.id]);
    const acconti = await pool.query('SELECT * FROM ordini_acconti WHERE ordine_id = $1', [req.params.id]);
    res.json({ ...ordine.rows[0], righe: righe.rows, acconti: acconti.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// CREA ORDINE
router.post('/', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { cliente_id, cliente_nome, cliente_telefono, urgente, note, assegnato_a, data_ritiro_prevista, ritiro_concordato, righe } = req.body;
    
    const count = await client.query('SELECT COUNT(*) FROM ordini');
    const numero = `OS-${new Date().getFullYear()}-${String(parseInt(count.rows[0].count) + 1).padStart(4, '0')}`;

    const ordine = await client.query(
      `INSERT INTO ordini (numero, cliente_id, cliente_nome, cliente_telefono, urgente, note, assegnato_a, data_ritiro_prevista, ritiro_concordato, operatore_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [numero, cliente_id, cliente_nome, cliente_telefono, urgente, note, assegnato_a, data_ritiro_prevista, ritiro_concordato, req.user.id]
    );

    if (righe?.length) {
      for (const riga of righe) {
        await client.query(
          `INSERT INTO ordini_righe (ordine_id, categoria_id, descrizione, quantita, unita, prezzo_unitario, sconto_euro, totale, note)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
          [ordine.rows[0].id, riga.categoria_id, riga.descrizione, riga.quantita, riga.unita, riga.prezzo_unitario, riga.sconto_euro || 0, riga.totale, riga.note]
        );
      }
    }

    await client.query('COMMIT');
    res.status(201).json(ordine.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// AGGIORNA STATO ORDINE
router.patch('/:id/stato', async (req, res) => {
  try {
    const { stato } = req.body;
    const result = await pool.query(
      'UPDATE ordini SET stato=$1, updated_at=NOW() WHERE id=$2 RETURNING *',
      [stato, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
