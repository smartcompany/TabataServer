import { createHash, randomBytes } from 'crypto';

const password = process.argv[2];

if (!password) {
  console.error('Usage: npm run hash-dashboard-password -- <password>');
  process.exit(1);
}

const salt = randomBytes(16).toString('hex');
const digest = createHash('sha256')
  .update(`${salt}:${password}`, 'utf8')
  .digest('hex');

console.log(`${salt}.${digest}`);
