import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const DEFAULT_ADMIN = {
  email: 'admin@example.com',
  password: 'Admin123!', // In Produktion sollte dies in einer Umgebungsvariable gespeichert werden
  name: 'Administrator'
};

async function main() {
  console.log('Seeding database...');
  
  // Überprüfen, ob bereits ein Admin-Konto existiert
  const adminExists = await prisma.user.findFirst({
    where: {
      role: Role.ADMIN
    }
  });

  if (!adminExists) {
    console.log('Creating default admin account...');
    
    // Passwort hashen
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(DEFAULT_ADMIN.password, saltRounds);
    
    // Admin-Konto erstellen
    await prisma.user.create({
      data: {
        email: DEFAULT_ADMIN.email,
        passwordHash: hashedPassword,
        name: DEFAULT_ADMIN.name,
        role: Role.ADMIN
      }
    });
    
    console.log(`Default admin account created with email: ${DEFAULT_ADMIN.email}`);
  } else {
    console.log('Admin account already exists, skipping creation');
  }
  
  console.log('Seeding completed');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
