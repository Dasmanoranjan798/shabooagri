const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const jwt = require('jsonwebtoken');

async function test() {
  const owner = await prisma.user.findFirst({ where: { role: { systemKey: 'owner' } }});
  
  const fs = require('fs');
  const env = fs.readFileSync('/home/ubuntu/shabooagri/backend/.env', 'utf-8');
  const secretLine = env.split('\n').find(l => l.startsWith('JWT_ACCESS_SECRET='));
  const secret = secretLine ? secretLine.split('=')[1] : 'supersecret123';
  
  const payload = {
    sub: owner.id,
    companyId: owner.companyId,
    roleId: owner.roleId,
    type: 'access'
  };
  const token = jwt.sign(payload, secret, { expiresIn: '1h' });

  const res = await fetch('http://localhost:4000/machine-types', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ name: "Tractor " + Date.now() })
  });
  console.log(res.status, await res.text());
}
test().catch(console.error).finally(() => prisma.$disconnect());
