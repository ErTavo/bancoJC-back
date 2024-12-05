require('dotenv').config();
const express = require('express');
const app = express();
const cors = require('cors'); 
const userRoutes = require('./routes/users');

const PORT = process.env.PORT || 3000;


app.use(cors('*'));


app.use(express.json());

app.use('/api', userRoutes);

app.get('/', (req, res) => {
  res.send('¡Servidor funcionando!');
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
