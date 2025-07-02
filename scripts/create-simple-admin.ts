import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function createAdmin() {
  try {
    console.log('🔧 Creating admin user...');

    // Check if admin already exists
    const existingAdmin = await prisma.user.findUnique({
      where: { username: 'admin' }
    });

    if (existingAdmin) {
      console.log('✅ Admin user already exists!');
      return;
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash('admin', 12);

    // Create admin user
    const adminUser = await prisma.user.create({
      data: {
        username: 'admin',
        email: 'admin@schoolai.local',
        password: hashedPassword,
        customRole: 'ADMIN',
        confirmed: true
      }
    });

    console.log('✅ Admin user created successfully!');
    console.log('🔑 Login credentials:');
    console.log('   Username: admin');
    console.log('   Password: admin');
    console.log('   Email: admin@schoolai.local');

  } catch (error) {
    console.error('❌ Error creating admin user:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin()
  .then(() => {
    console.log('🎉 Admin creation completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Failed to create admin:', error);
    process.exit(1);
  }); 