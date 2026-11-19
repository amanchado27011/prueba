import { prisma } from '../lib/prisma';

const SUBAREAS = ['Soporte', 'Atención', 'Operaciones IT', 'Desarrollo', 'Administración', 'Otro'];
const FAMILIES = ['Editoriales', 'Corporativos', 'Terceros', 'Infraestructura', 'Seguridad', 'Otro'];
const ACTIVITIES = [
  ['Soporte', 'soporte'],
  ['Atención', 'atencion'],
  ['Desarrollo de negocio', 'desarrollo-de-negocio'],
  ['Operaciones IT', 'operaciones-it'],
  ['Otro', 'otro'],
] as const;

function slug(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export async function ensureCatalogs(): Promise<void> {
  for (const [index, name] of SUBAREAS.entries()) {
    await prisma.subarea.upsert({
      where: { slug: slug(name) },
      update: {},
      create: { name, slug: slug(name), sortOrder: index, active: true },
    });
  }
  for (const [index, name] of FAMILIES.entries()) {
    await prisma.serviceFamily.upsert({
      where: { slug: slug(name) },
      update: {},
      create: { name, slug: slug(name), sortOrder: index, active: true },
    });
  }
  for (const [index, [name, activitySlug]] of ACTIVITIES.entries()) {
    await prisma.activityType.upsert({
      where: { slug: activitySlug },
      update: {},
      create: { name, slug: activitySlug, sortOrder: index, active: true, system: true },
    });
  }
}

export { slug };
