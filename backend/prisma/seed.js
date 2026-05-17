const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('Seeding...');
    // Seed logic here
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
