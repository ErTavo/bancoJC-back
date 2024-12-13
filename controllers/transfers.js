const CryptoJS = require('crypto-js');
const db = require('../models/db');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');

function encryptData(data, secretKey) {
  const ciphertext = CryptoJS.AES.encrypt(data, secretKey).toString();
  return ciphertext;
}

function decryptData(ciphertext, secretKey) {
  const bytes = CryptoJS.AES.decrypt(ciphertext, secretKey);
  const originalData = bytes.toString(CryptoJS.enc.Utf8);
  return originalData;
}

exports.newTransfer = async (req, res) => {
    const { fromAccount, toAccount, amount } = req.body;
    const secretKey = process.env.SECRET_KEY;

    if (isNaN(amount) || typeof amount !== 'number') {
        return res.status(400).json({ error: 'El abono debe ser un número decimal válido' });
    }
    let [rows] = await db.query('SELECT * FROM accounts WHERE accountNo = ?', [fromAccount]);  
    if (rows.length === 0) {
        return res.status(404).json({ error: 'No existe la cuenta indicada' });
    }
    const account = rows[0];
    const balance = parseFloat(decryptData(account.balance, secretKey));
    if (isNaN(balance)) {
        return res.status(500).json({ error: 'El balance de la cuenta no es válido' });
    }
    if (balance < amount){
        return res.status(404).json({ error: 'Fondos insuficientes para realizar la transferencia' });
    }

    [rows] = await db.query('SELECT * FROM accounts WHERE accountNo = ?', [toAccount]);  
    if (rows.length === 0) {
        return res.status(404).json({ error: 'No existe la cuenta indicada' });
    }
    const account2 = rows[0];
    const balance2 = parseFloat(decryptData(account2.balance, secretKey));
    if (isNaN(balance2)) {
        return res.status(500).json({ error: 'El balance de la cuenta no es válido' });
    }
    try {
        if(account.currency != account2.currency){
            return res.status(500).json({ error: 'Las cuentas manejan distintas monedas' });
        }
        const date = new Date();

        const formattedDate = `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;


        const encryptedBalance = encryptData((balance - amount).toFixed(2), secretKey);
        const encryptedBalance2 = encryptData((balance2 + amount).toFixed(2), secretKey);
        await db.query('UPDATE accounts SET balance = ? WHERE accountNo = ?', [encryptedBalance, fromAccount]);
        await db.query('UPDATE accounts SET balance = ? WHERE accountNo = ?', [encryptedBalance2, toAccount]);

        const [result] = await db.query(
            'INSERT INTO transactions (accountNo, amount, created_at, type, relatedAccount) VALUES (?, ?, ?, ?, ?)',
            [fromAccount, amount, formattedDate , "enviada", toAccount]
        );

        const [result2] = await db.query(
            'INSERT INTO transactions (accountNo, amount, created_at, type, relatedAccount) VALUES (?, ?, ?, ?, ?)',
            [toAccount, amount, formattedDate , "recibida", fromAccount]
        );

      res.status(200).json({
        message: 'Transferencia realizada exitosamente'
       });
    } catch (error) {
      console.error('Error al realizar la transferencia:', error);
      res.status(500).json({ error: 'Error al realizar la transferencia' });
    }
  };

exports.history = async (req, res) => {
    const { accountNo } = req.body;
  
    try {
        const [rows] = await db.query('SELECT * FROM transactions WHERE accountNo = ?', [accountNo]);  
        if (rows.length === 0) {
            return res.status(404).json({ error: 'No hay transferencias disponibles' });
        }
        const transactions = rows.map(transactions => ({
            ...transactions
        }));

        res.status(200).json(transactions); 
    } catch (error) {
        console.error('Error al obtener las transferencias:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
};