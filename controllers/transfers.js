const CryptoJS = require('crypto-js');
const sql = require('../models/db');

function encryptData(data, secretKey) {
  return CryptoJS.AES.encrypt(data, secretKey).toString();
}

function decryptData(ciphertext, secretKey) {
  const bytes = CryptoJS.AES.decrypt(ciphertext, secretKey);
  return bytes.toString(CryptoJS.enc.Utf8);
}

exports.newTransfer = async (req, res) => {
  const { fromAccount, toAccount, amount } = req.body;
  const secretKey = process.env.SECRET_KEY;

  if (isNaN(amount) || typeof amount !== 'number') {
    return res.status(400).json({ error: 'El abono debe ser un número decimal válido' });
  }

  const rowsFrom = await sql`SELECT * FROM jc_accounts WHERE "accountNo" = ${fromAccount}`;
  if (rowsFrom.length === 0) return res.status(404).json({ error: 'No existe la cuenta indicada' });

  const account = rowsFrom[0];
  const balance = parseFloat(decryptData(account.balance, secretKey));
  if (isNaN(balance)) return res.status(500).json({ error: 'El balance de la cuenta no es válido' });
  if (balance < amount) return res.status(404).json({ error: 'Fondos insuficientes para realizar la transferencia' });

  const rowsTo = await sql`SELECT * FROM jc_accounts WHERE "accountNo" = ${toAccount}`;
  if (rowsTo.length === 0) return res.status(404).json({ error: 'No existe la cuenta indicada' });

  const account2 = rowsTo[0];
  const balance2 = parseFloat(decryptData(account2.balance, secretKey));
  if (isNaN(balance2)) return res.status(500).json({ error: 'El balance de la cuenta no es válido' });

  try {
    if (account.currency !== account2.currency) {
      return res.status(500).json({ error: 'Las cuentas manejan distintas monedas' });
    }

    const date = new Date();
    const formattedDate = `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;

    const encryptedBalance = encryptData((balance - amount).toFixed(2), secretKey);
    const encryptedBalance2 = encryptData((balance2 + amount).toFixed(2), secretKey);

    await sql`UPDATE jc_accounts SET balance = ${encryptedBalance} WHERE "accountNo" = ${fromAccount}`;
    await sql`UPDATE jc_accounts SET balance = ${encryptedBalance2} WHERE "accountNo" = ${toAccount}`;

    await sql`
      INSERT INTO jc_transactions ("accountNo", amount, created_at, type, "relatedAccount")
      VALUES
        (${fromAccount}, ${amount}, ${formattedDate}, 'enviada', ${toAccount}),
        (${toAccount}, ${amount}, ${formattedDate}, 'recibida', ${fromAccount})
    `;

    res.status(200).json({ message: 'Transferencia realizada exitosamente' });
  } catch (error) {
    console.error('Error al realizar la transferencia:', error);
    res.status(500).json({ error: 'Error al realizar la transferencia' });
  }
};

exports.history = async (req, res) => {
  const { accountNo } = req.body;

  try {
    const rows = await sql`SELECT * FROM jc_transactions WHERE "accountNo" = ${accountNo}`;
    if (rows.length === 0) return res.status(404).json({ error: 'No hay transferencias disponibles' });

    res.status(200).json(rows);
  } catch (error) {
    console.error('Error al obtener las transferencias:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
};
