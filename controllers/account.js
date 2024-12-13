const CryptoJS = require('crypto-js');
const db = require('../models/db');

function encryptData(data, secretKey) {
  const ciphertext = CryptoJS.AES.encrypt(data, secretKey).toString();
  return ciphertext;
}

function decryptData(ciphertext, secretKey) {
  const bytes = CryptoJS.AES.decrypt(ciphertext, secretKey);
  const originalData = bytes.toString(CryptoJS.enc.Utf8);
  return originalData;
}

exports.createAccount = async (req, res) => {
    const { username, balance, type, currency } = req.body;
    const secretKey = process.env.SECRET_KEY;
    const accountNo = Math.floor(10000000 + Math.random() * 90000000); 

    if (!username || !type || !currency) {
        return res.status(400).json({ error: 'Faltan datos en la solicitud' });
    }

    try {
        if (isNaN(balance) || parseFloat(balance) < 0) {
            return res.status(400).json({ error: 'El balance debe ser un número válido y no negativo' });
        }
        const formattedBalance = parseFloat(balance).toFixed(2);

        const encryptedBalance = encryptData(formattedBalance, secretKey);
        if (!encryptedBalance) {
            return res.status(500).json({ error: 'Error al encriptar el balance' });
        }
        const [result] = await db.query(
            'INSERT INTO accounts (accountNo, user, balance, type, currency) VALUES (?, ?, ?, ?, ?)',
            [accountNo, username, encryptedBalance, type, currency]
        );

        res.status(201).json({ id: result.insertId, accountNo, message: 'Cuenta creada exitosamente' });
    } catch (error) {
        console.error('Error al crear cuenta:', error.message);
        res.status(500).json({ error: 'Error al crear la cuenta', details: error.message });
    }
};

exports.balance = async (req, res) => {
    const { username } = req.body;
    const secretKey = process.env.SECRET_KEY;
  
    try {
        const [rows] = await db.query('SELECT * FROM accounts WHERE user = ?', [username]);  
        if (rows.length === 0) {
            return res.status(404).json({ error: 'No hay cuentas disponibles' });
        }
        const accounts = rows.map(account => ({
            ...account,
            balance: decryptData(account.balance, secretKey) 
        }));

        res.status(200).json(accounts); 
    } catch (error) {
        console.error('Error al obtener las cuentas:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
};

exports.deposito = async (req, res) => {
    const { accountNo, abono } = req.body;
    const secretKey = process.env.SECRET_KEY;

    try {
        if (isNaN(abono) || typeof abono !== 'number') {
            return res.status(400).json({ error: 'El abono debe ser un número decimal válido' });
        }
        const [rows] = await db.query('SELECT * FROM accounts WHERE accountNo = ?', [accountNo]);  
        if (rows.length === 0) {
            return res.status(404).json({ error: 'No existe la cuenta indicada' });
        }
        const account = rows[0];
        const balance = parseFloat(decryptData(account.balance, secretKey));

        if (isNaN(balance)) {
            return res.status(500).json({ error: 'El balance de la cuenta no es válido' });
        }
        let tenis = balance + abono;
        tenis = Math.round(tenis * 100) / 100;

        const encryptedBalance = encryptData(tenis.toFixed(2), secretKey);
        await db.query('UPDATE accounts SET balance = ? WHERE accountNo = ?', [encryptedBalance, accountNo]);

        res.status(200).json({ message: `Se actualizó el balance. Nuevo balance: ${account.currency}.${tenis.toFixed(2)}` });
    } catch (error) {
        console.error('Error al procesar el depósito:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
};
