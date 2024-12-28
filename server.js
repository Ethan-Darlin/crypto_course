const express = require('express');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const path = require('path');
const fileUpload = require('express-fileupload');
const fs = require('fs');

const app = express();
const port = 3000;



// Middleware для обработки JSON и формы
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(fileUpload());

// Указываем статическую папку, где лежат HTML-файлы
app.use(express.static(path.join(__dirname, 'public')));

// Новый маршрут для отображения страницы Speck Cipher
app.get('/speck-cipher', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'speck.html'));
});


function encryptDES(text, key) {
  if (key.length !== 8) {
    throw new Error('Ключ должен быть длиной ровно 8 символов.');
  }

  const cipher = crypto.createCipheriv('des-ecb', Buffer.from(key, 'utf8'), null);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
}



function decryptDES(encryptedText, key) {
  if (key.length !== 8) {
    // Если ключ некорректный, сразу возвращаем ошибку, без времени расшифровки
    return { error: 'Ключ неверный. Перепроверьте его.' };
  }

  try {
    const decipher = crypto.createDecipheriv('des-ecb', Buffer.from(key, 'utf8'), null);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return { decrypted };
  } catch (err) {
    // В случае ошибки расшифровки тоже возвращаем ошибку
    return { error: 'Ключ неверный. Перепроверьте его.' };
  }
}


// Маршрут для шифрования текста
app.post('/encrypt', (req, res) => {
  const { text, key } = req.body;
  console.log(req.body);

  if (!text || !key || key.length !== 8) {
    return res.status(400).json({ error: 'Текст и ключ (ровно 8 символов) обязательны.' });
  }

  try {
    const startEncrypt = process.hrtime();
    const encrypted = encryptDES(text, key);
    const encryptTime = process.hrtime(startEncrypt);

    const startDecrypt = process.hrtime();
    const decrypted = decryptDES(encrypted, key); // В случае неверного ключа вернется случайная строка
    const decryptTime = process.hrtime(startDecrypt);

    res.json({
      encrypted,
      encryptTimeMs: (encryptTime[0] * 1e3 + encryptTime[1] / 1e6).toFixed(2),
      decryptTimeMs: (decryptTime[0] * 1e3 + decryptTime[1] / 1e6).toFixed(2),
      decrypted,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка при обработке данных. Проверьте входные данные.' });
  }
});

app.post('/decrypt', (req, res) => {
  const { encryptedText, key } = req.body;

  if (!encryptedText || !key || key.length !== 8) {
    return res.status(400).json({ error: 'Шифрованный текст и ключ (ровно 8 символов) обязательны.' });
  }

  const startDecrypt = process.hrtime();
  const result = decryptDES(encryptedText, key);

  if (result.error) {
    return res.status(400).json({ error: result.error }); // Возвращаем ошибку, если ключ неверный
  }

  const decryptTime = process.hrtime(startDecrypt);  // Рассчитываем время расшифровки

  res.json({
    decrypted: result.decrypted,
    decryptTimeMs: (decryptTime[0] * 1e3 + decryptTime[1] / 1e6).toFixed(2),  // Время расшифровки в миллисекундах
  });
});



// Маршрут для шифрования файла
app.post('/encrypt-file', (req, res) => {
  const { key } = req.body;
  const file = req.files.file;

  if (!file || key.length !== 8) {
    return res.status(400).json({ error: 'Файл и ключ (ровно 8 символов) обязательны.' });
  }

  try {
    const content = file.data.toString('utf8');
    const startEncrypt = process.hrtime();
    const encrypted = encryptDES(content, key);
    const encryptTime = process.hrtime(startEncrypt);

    const saveDir = path.join('C:', 'Users', 'ivane', 'OneDrive', 'Рабочий стол', 'Crypto_cours', 'test_crypt');

    if (!fs.existsSync(saveDir)) {
      fs.mkdirSync(saveDir, { recursive: true });
    }

    const filePath = path.join(saveDir, 'encrypted_' + file.name);
    fs.writeFileSync(filePath, encrypted);

    res.json({
      message: `Файл зашифрован и сохранен как ${filePath}`,
      encryptTimeMs: (encryptTime[0] * 1e3 + encryptTime[1] / 1e6).toFixed(2),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка при шифровании файла.' });
  }
});

// Маршрут для расшифровки файла
app.post('/decrypt-file', (req, res) => {
  const { key } = req.body;
  const file = req.files.file;

  if (!file || key.length !== 8) {
    return res.status(400).json({ error: 'Файл и ключ (ровно 8 символов) обязательны.' });
  }

  // Запускаем таймер для замера времени расшифровки
  const startDecrypt = process.hrtime();

  const encryptedContent = file.data.toString('utf8');
  const result = decryptDES(encryptedContent, key);

  if (result.error) {
    return res.status(400).json({ error: result.error }); // Возвращаем ошибку, если ключ неверный
  }

  try {
    // Сохраняем расшифрованный файл
    const saveDir = path.join('C:', 'Users', 'ivane', 'OneDrive', 'Рабочий стол', 'Crypto_cours', 'test_crypt');
    if (!fs.existsSync(saveDir)) {
      fs.mkdirSync(saveDir, { recursive: true });
    }

    const filePath = path.join(saveDir, 'decrypted_' + file.name);
    fs.writeFileSync(filePath, result.decrypted);

    // Рассчитываем время расшифровки
    const decryptTime = process.hrtime(startDecrypt); // время расшифровки
    const decryptTimeMs = (decryptTime[0] * 1e4 + decryptTime[1] / 1e7).toFixed(2);

    res.json({
      message: `Файл расшифрован и сохранен как ${filePath}`,
      decryptTimeMs, // Добавляем время расшифровки в ответ
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка при расшифровке файла! Проверьте ключ на правильность!' });
  }
});



// Запуск сервера
app.listen(port, () => {
  console.log(`Сервер запущен на http://localhost:${port}`);
});
