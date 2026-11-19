import 'dotenv/config';
import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';
import { ensureCatalogs } from '../apps/api/src/services/catalog-bootstrap';

const prisma = new PrismaClient();

async function main() {
  await ensureCatalogs();
  const email = (process.env.SEED_ADMIN_EMAIL || 'admin@gestion-demanda.local').toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD || 'ChangeMeDemo!23';
  const name = process.env.SEED_ADMIN_NAME || 'Administración';
  const passwordHash = await bcrypt.hash(password, Number(process.env.BCRYPT_ROUNDS || 10));
  await prisma.user.upsert({
    where: { email },
    update: { displayName: name, role: 'ADMIN', status: 'ACTIVE' },
    create: { email, displayName: name, passwordHash, role: 'ADMIN' },
  });

  let objective = await prisma.objective.findFirst({ where: { name: 'Reducir riesgo operativo' } });
  if (!objective) {
    objective = await prisma.objective.create({
      data: { name: 'Reducir riesgo operativo', description: 'Objetivo de ejemplo para clasificar la demanda.', sortOrder: 1 },
    });
  }
  const existingInitiative = await prisma.initiative.findFirst({ where: { name: 'Continuidad del servicio' } });
  if (!existingInitiative) {
    await prisma.initiative.create({
      data: {
        name: 'Continuidad del servicio',
        description: 'Iniciativa de ejemplo. La sincronización simulada puede asociarle las épicas si ninguna tiene iniciativa.',
        objectiveId: objective.id,
        status: 'ACTIVE',
        priority: 'HIGH',
      },
    });
  }
  console.log(`Usuario ADMIN listo: ${email}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
