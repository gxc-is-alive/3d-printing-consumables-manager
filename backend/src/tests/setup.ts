import 'dotenv/config';
import { prisma } from '../db';

// Connect to database before all tests
beforeAll(async () => {
  await prisma.$connect();
});

// Clean up database before each test
beforeEach(async () => {
  // Delete in order respecting foreign key constraints
  await prisma.usageRecord.deleteMany();
  await prisma.consumable.deleteMany();
  await prisma.brand.deleteMany();
  await prisma.consumableType.deleteMany();
  await prisma.user.deleteMany();
});

// Disconnect from database after all tests
afterAll(async () => {
  await prisma.$disconnect();
});
