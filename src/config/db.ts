import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('❌ DATABASE_URL is not defined in .env');
}

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: databaseUrl // ✅ toujours une string ici
    }
  }
});

process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

export default prisma;
