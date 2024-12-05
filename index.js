require('dotenv').config();
const express = require('express');
const app = express();
const cors = require('cors'); 
const userRoutes = require('./routes/users');

const PORT = process.env.PORT || 3000;

const allowedOrigins = [
  'http://localhost:3000', 
  'https://tu-frontend.vercel.app',
  '*' 
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
      callback(null, true); 
    } else {
      callback(new Error('Origen no permitido por CORS')); 
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));



app.use(express.json());

app.use('/user', userRoutes);

app.get('/', (req, res) => {
  res.send('¡Servidor funcionando!');
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
