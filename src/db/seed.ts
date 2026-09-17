import { db } from './index.js';
import { users } from './schema.js';
import { eq } from 'drizzle-orm';

async function seed() {
  const adminExists = await db.select().from(users).where(eq(users.username, 'admin'));
  if (adminExists.length === 0) {
    await db.insert(users).values({
      id: '1',
      username: 'admin',
      password: 'password123',
      name: 'Admin User',
      department: 'ALL',
      designation: 'System Administrator',
      role: 'ADMIN',
      createdAt: new Date().toISOString()
    });
  }

  const vcExists = await db.select().from(users).where(eq(users.username, 'vc'));
  if (vcExists.length === 0) {
    await db.insert(users).values({
      id: '2',
      username: 'vc',
      password: 'password123',
      name: 'Vice Chancellor',
      department: 'ALL',
      designation: 'Vice Chancellor',
      role: 'VC',
      createdAt: new Date().toISOString()
    });
  }
  
  const hodExists = await db.select().from(users).where(eq(users.username, 'hod_cs'));
  if (hodExists.length === 0) {
    await db.insert(users).values({
      id: '3',
      username: 'hod_cs',
      password: 'password123',
      name: 'Dr. HOD CS',
      department: 'Department of Computer Science',
      designation: 'Head of Department',
      role: 'HOD',
      createdAt: new Date().toISOString()
    });
  }
}

seed().then(() => console.log('Seeded successfully')).catch(console.error);
