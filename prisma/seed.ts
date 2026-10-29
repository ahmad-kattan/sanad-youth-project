import 'dotenv/config';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { UserRole } from '../src/common/Enums/index.js';


const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password ) {
    throw new Error('ADMIN_EMAIL or ADMIN_PASSWORD is missing');
  }

  const passwordHash = await bcrypt.hash(password, 10);

   let admin = await prisma.user.findFirst({
    where: { email },
    omit:{
        password:true
    }
  });
  if (admin){
    admin = await prisma.user.update({
        where:{id:admin.id},
        data:{role:UserRole.ADMIN},
        omit:{password:true}
    })
  }

  else{
    admin = await prisma.user.create({
    data:{
      email,
      password:passwordHash,
      firstName:"admin",
      lastName:"admin",
      role: UserRole.ADMIN
    },
    omit:{password:true}
    
    });}

  console.log('Admin account ready:', admin);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });