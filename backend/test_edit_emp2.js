const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const jwt = require('jsonwebtoken');

async function test() {
  const owner = await prisma.user.findFirst({ where: { role: { systemKey: 'owner' } }});
  
  const fs = require('fs');
  const env = fs.readFileSync('/home/ubuntu/shabooagri/backend/.env', 'utf-8');
  const secretLine = env.split('\n').find(l => l.startsWith('JWT_ACCESS_SECRET='));
  const secret = secretLine ? secretLine.split('=')[1] : 'supersecret123';
  const token = jwt.sign({ sub: owner.id, companyId: owner.companyId, roleId: owner.roleId, type: 'access' }, secret, { expiresIn: '1h' });

  // 1. Create employee
  const res1 = await fetch('http://localhost:4000/employees', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ name: "John Doe " + Date.now(), employmentStatus: "ACTIVE", compensationType: "HOURLY" })
  });
  const emp = await res1.json();

  if (emp.id) {
    const payload = {
      name: emp.name + " Edited",
      roleTitle: undefined,
      phone: undefined,
      employmentStatus: "ACTIVE",
      compensationType: "HOURLY",
      hourlyRate: undefined,
      monthlySalary: undefined,
      yearlySalary: undefined,
      joinedDate: undefined,
    };
    const res2 = await fetch(`http://localhost:4000/employees/${emp.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(payload)
    });
    console.log("Edit status:", res2.status);
    console.log("Edit response:", await res2.text());
  }
}
test().catch(console.error).finally(() => prisma.$disconnect());
