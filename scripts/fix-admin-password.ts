import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function fixAdminPassword() {
  try {
    console.log('🔧 Fixing admin password...');

    // Delete existing admin user
    const deleted = await prisma.user.deleteMany({
      where: {
        OR: [
          { email: 'admin@schoolai.local' },
          { username: 'admin' }
        ]
      }
    });

    console.log(`🗑️  Deleted ${deleted.count} existing admin users`);

    // Hash the password properly
    const hashedPassword = await bcrypt.hash('admin', 12);
    console.log('🔒 Password hashed successfully');

    // Test the hash immediately
    const testHash = await bcrypt.compare('admin', hashedPassword);
    console.log('🧪 Hash test result:', testHash);

    // Create new admin user
    const adminUser = await prisma.user.create({
      data: {
        username: 'admin',
        email: 'admin@schoolai.local',
        password: hashedPassword,
        customRole: 'ADMIN',
        confirmed: true,
        blocked: false
      }
    });

    console.log('✅ Admin user created successfully!');
    
    // Verify the password works
    const verifyPassword = await bcrypt.compare('admin', adminUser.password!);
    console.log('✅ Password verification test:', verifyPassword);

    console.log('🔑 Login credentials:');
    console.log('   Email/Username: admin');
    console.log('   Password: admin');

  } catch (error) {
    console.error('❌ Error fixing admin password:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

fixAdminPassword()
  .then(() => {
    console.log('🎉 Admin password fixed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Failed to fix admin password:', error);
    process.exit(1);
  }); 