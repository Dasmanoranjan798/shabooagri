const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const role = await prisma.role.findFirst({ where: { systemKey: 'owner' }, include: { rolePermissions: { include: { permission: true } } } });
  console.log("Owner perms:", role.rolePermissions.map(rp => rp.permission.key));
}
check().catch(console.error).finally(() => prisma.$disconnect());
