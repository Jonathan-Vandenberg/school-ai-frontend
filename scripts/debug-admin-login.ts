import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function debugAdminLogin() {
  try {
    console.log('🔍 Debugging admin login...');

    // Find the admin user
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: 'admin' },
          { username: 'admin' }
        ]
      }
    });

    if (!user) {
      console.log('❌ No admin user found with email or username "admin"');
      return;
    }

    console.log('✅ Found admin user:');
    console.log('   ID:', user.id);
    console.log('   Username:', user.username);
    console.log('   Email:', user.email);
    console.log('   Role:', user.customRole);
    console.log('   Confirmed:', user.confirmed);
    console.log('   Blocked:', user.blocked);
    console.log('   Has Password:', !!user.password);

    if (user.password) {
      // Test password verification
      const isValidPassword = await bcrypt.compare('admin', user.password);
      console.log('   Password "admin" valid:', isValidPassword);
    }

    // Check auth conditions
    const authCheck = !user.blocked && user.confirmed;
    console.log('   Auth check passed:', authCheck);

    if (!authCheck) {
      console.log('❌ Auth check failed:');
      if (user.blocked) console.log('   - User is blocked');
      if (!user.confirmed) console.log('   - User is not confirmed');
    }

  } catch (error) {
    console.error('❌ Error debugging admin login:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugAdminLogin(); 