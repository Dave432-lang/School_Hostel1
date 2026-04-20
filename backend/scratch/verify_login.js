const bcrypt = require('bcryptjs');
const password = 'admin123';
const hash = '$2a$10$FFUjRIeY7iViDymkw0vddOpSXjQKL6oEfY1UePDelsA9h2MzuCDSS';

bcrypt.compare(password, hash).then(res => {
  if (res) console.log('✅ PASS: admin123 matches the hash.');
  else console.error('❌ FAIL: admin123 does NOT match the hash.');
});
