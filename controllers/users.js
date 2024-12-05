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

exports.createUser = async (req, res) => {
  const { username, password, email } = req.body;
  const secretKey = process.env.SECRET_KEY;

  try {
    const encryptedPassword = encryptData(password, secretKey);
    const encryptedEmail = encryptData(email, secretKey);

    const [result] = await db.query(
      'INSERT INTO users (username, password_hash, email) VALUES (?, ?, ?)',
      [username, encryptedPassword, encryptedEmail]
    );

    res.status(201).json({ id: result.insertId, message: 'Usuario creado exitosamente' });
  } catch (error) {
    console.error('Error al crear usuario:', error);
    res.status(500).json({ error: 'Error al crear el usuario' });
  }
};

exports.getUserWithAuth = async (req, res) => {
    const { username, password } = req.body;
    const secretKey = process.env.SECRET_KEY;
    const jwtSecret = process.env.JWT_SECRET;
  
    try {
  
      const [rows] = await db.query('SELECT * FROM users WHERE username = ?', [username]);  
      if (rows.length === 0) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }
  
      const user = rows[0];
      const decryptedPassword = decryptData(user.password_hash, secretKey);  
      if (decryptedPassword !== password) {
        return res.status(401).json({ error: 'Credenciales inválidas' });
      }
  
      const token = jwt.sign(
        { id: user.id, username: user.username },
        jwtSecret,
        { expiresIn: '30m' }
      );
  
      await db.query('UPDATE users SET last_hash = ? WHERE id = ?', [token, user.id]);
  
      res.status(200).json({ hash: token });
    } catch (error) {
      console.error('Error al autenticar usuario:', error);
      res.status(500).json({ error: 'Error en el servidor' });
    }
  };
  
exports.validateUserHash = async (req, res) => {
    const { username, hash } = req.body; 
    const jwtSecret = process.env.JWT_SECRET;
  
    try {
      const [rows] = await db.query('SELECT * FROM users WHERE username = ?', [username]);
  
      if (rows.length === 0) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }
  
      const user = rows[0];
  
      if (user.last_hash !== hash) {
        return res.status(401).json({ error: 'Hash no válido' });
      }
      try {
        const decoded = jwt.verify(hash, jwtSecret);
        
        return res.status(200).json({ success: true, hash });
      } catch (err) {
        if (err.name === 'TokenExpiredError') {
          return res.status(401).json({ error: 'El hash ha expirado' });
        } else {
          return res.status(401).json({ error: 'Hash no válido' });
        }
      }
    } catch (error) {
      console.error('Error al validar hash:', error);
      res.status(500).json({ error: 'Error en el servidor' });
    }
  };
  
exports.sendEmailCode = async (req, res) => {
    const { username } = req.body;
    const secretKey = process.env.SECRET_KEY;


    const [rows] = await db.query('SELECT * FROM users WHERE username = ?', [username]);  
      if (rows.length === 0) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      const user = rows[0];
      const decryptedEmail = decryptData(user.email, secretKey);  
  
    try {
      const code = Math.floor(1000 + Math.random() * 9000);
  
      const transporter = nodemailer.createTransport({
        service: 'gmail', 
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD,
        },
      });
  
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: decryptedEmail,
        subject: 'Tu código de verificación',
        text: `Tu código de verificación es: ${code}`,
      };
  
      await transporter.sendMail(mailOptions);
      await db.query('UPDATE users SET lastOTP = ? WHERE id = ?', [code, user.id]);

  
      res.status(200).json({ 
        message: 'Código enviado correctamente'
       });
    } catch (error) {
      console.error('Error al enviar el código por correo:', error);
      res.status(500).json({ error: 'Error al enviar el código' });
    }
  };
  
exports.validateOTP = async (req, res) => {
    const { username, otp } = req.body;   
    try {
      const [rows] = await db.query('SELECT * FROM users WHERE username = ?', [username]);
  
      if (rows.length === 0) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }
      const user = rows[0];
      if (user.lastOTP !== otp) {
        return res.status(401).json({ error: 'Otp no válido' });
      }
      try {
        return res.status(200).json({ success: true, otp });
      } catch (err) {
          return res.status(401).json({ error: 'Otp no válido' });
      }
    } catch (error) {
      console.error('Error al validar otp:', error);
      res.status(500).json({ error: 'Error en el servidor' });
    }
  };