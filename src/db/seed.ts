import { db } from './index.js';
import { users } from './schema.js';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

async function seed() {
  // 1. Admin Master Account
  const adminExists = await db.select().from(users).where(eq(users.username, 'admin'));
  if (adminExists.length === 0) {
    await db.insert(users).values({
      id: 'user_admin',
      username: 'admin',
      email: 'admin@mnsuet.edu.pk',
      password: bcrypt.hashSync('Qwe12!@!@', 10),
      name: 'System Administrator',
      department: 'Office of the Registrar / IT Directorate',
      designation: 'Director IT / Administrator',
      role: 'ADMIN',
      createdAt: '2026-09-01T08:00:00.000Z'
    });
  } else {
    // Ensure email and password hash are up to date
    await db.update(users).set({
      email: 'admin@mnsuet.edu.pk',
      password: bcrypt.hashSync('Qwe12!@!@', 10),
      name: 'System Administrator',
      designation: 'Director IT / Administrator',
      department: 'Office of the Registrar / IT Directorate'
    }).where(eq(users.username, 'admin'));
  }

  // 2. Vice Chancellor Master Account
  const vcExists = await db.select().from(users).where(eq(users.username, 'VC'));
  const vcLowerExists = await db.select().from(users).where(eq(users.username, 'vc'));
  if (vcExists.length === 0 && vcLowerExists.length === 0) {
    await db.insert(users).values({
      id: 'user_vc',
      username: 'VC',
      email: 'vc@mnsuet.edu.pk',
      password: bcrypt.hashSync('JHG45$%xz', 10),
      name: 'Prof. Dr. Vice Chancellor',
      department: 'Office of the Vice Chancellor',
      designation: 'Vice Chancellor',
      role: 'VC',
      createdAt: '2026-09-01T08:00:00.000Z'
    });
  } else {
    const targetUsername = vcExists.length > 0 ? 'VC' : 'vc';
    await db.update(users).set({
      username: 'VC',
      email: 'vc@mnsuet.edu.pk',
      password: bcrypt.hashSync('JHG45$%xz', 10),
      name: 'Prof. Dr. Vice Chancellor',
      designation: 'Vice Chancellor',
      department: 'Office of the Vice Chancellor'
    }).where(eq(users.username, targetUsername));
  }

  // 3. Coordinator Account (Engr. Muhammad Talha Jahangir)
  const talhaExists = await db.select().from(users).where(eq(users.username, 'mtalhajahangir'));
  if (talhaExists.length === 0) {
    await db.insert(users).values({
      id: 'user_talha_coord',
      username: 'mtalhajahangir',
      email: 'mtalhajahangir@mnsuet.edu.pk',
      password: bcrypt.hashSync('Qwe12!@!@', 10),
      name: 'Engr. Muhammad Talha Jahangir',
      department: 'Department of Computer Science',
      designation: 'Program Coordinator (BS AI) / Lecturer',
      role: 'COORDINATOR',
      program: 'BS Artificial Intelligence',
      createdAt: '2026-09-01T08:00:00.000Z'
    });
  } else {
    await db.update(users).set({
      email: 'mtalhajahangir@mnsuet.edu.pk',
      password: bcrypt.hashSync('Qwe12!@!@', 10),
      name: 'Engr. Muhammad Talha Jahangir',
      designation: 'Program Coordinator (BS AI) / Lecturer',
      department: 'Department of Computer Science',
      program: 'BS Artificial Intelligence'
    }).where(eq(users.username, 'mtalhajahangir'));
  }
}

seed().then(() => console.log('Database seeded with official university accounts successfully')).catch(console.error);
