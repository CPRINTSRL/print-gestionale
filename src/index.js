import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import clientiRoutes from './routes/clienti.js';
import ordiniRoutes from './routes/ordini.js';
import categorieRoutes from './routes/categorie.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'C PRINT Gestionale', version: '1.0.0' }));

app.use('/api/auth', authRoutes);
app.use('/api/clienti', clientiRoutes);
app.use('/api/ordini', ordiniRoutes);
app.use('/api/categorie', categorieRoutes);

app.listen(PORT, () => console.log(`C PRINT Gestionale in ascolto su porta ${PORT}`));
