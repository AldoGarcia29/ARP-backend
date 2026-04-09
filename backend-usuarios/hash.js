const bcrypt = require('bcrypt');

(async () => {
  const password = '123456'; // 🔥 aquí cambias la contraseña
  const hash = await bcrypt.hash(password, 10);
  console.log('HASH:', hash);
})();