import { execSync } from 'child_process';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const command = `prisma migrate dev --name initial_migration`;

try {
  execSync(command, { stdio: 'inherit' });
} catch (error) {
  console.error('Prisma migration failed:', (error as Error).message);
  process.exit(1);
}
