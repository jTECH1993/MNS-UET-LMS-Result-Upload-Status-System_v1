import express from 'express';
import cors from 'cors';
import asyncHandler from 'express-async-handler';
import bcrypt from 'bcryptjs';
import { db } from './src/db/index.js';
import {
  users,
  programs,
  sessions,
  submissions,
  subjects,
  documents,
  documentPrograms,
  accessLogs,
  workOnDemand,
} from './src/db/schema.js';
import { eq, and, desc, or } from 'drizzle-orm';
import path from 'path';

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const PORT = 3000;

// Helper to verify bcrypt or plain text
function verifyPassword(input: string, stored: string): boolean {
  if (!input || !stored) return false;
  if (stored.startsWith('$2a$') || stored.startsWith('$2b$') || stored.startsWith('$2y$')) {
    try {
      return bcrypt.compareSync(input, stored);
    } catch {
      return input === stored;
    }
  }
  return input === stored;
}

// -----------------------------------------------------------------------------
// USER ACCOUNTS & AUTHENTICATION ENDPOINTS
// -----------------------------------------------------------------------------

// Fetch all users
app.get('/api/users', asyncHandler(async (req, res) => {
  const allUsers = await db.select().from(users);
  res.json(allUsers);
}));

// Insert or upsert a user
app.post('/api/users', asyncHandler(async (req, res) => {
  const data = req.body;
  if (!data.username || !data.name) {
    return res.status(400).json({ error: 'Username and name are required' });
  }

  const existing = await db.select().from(users).where(eq(users.id, data.id));
  const hashedPassword = data.password && (data.password.startsWith('$2a$') || data.password.startsWith('$2b$') || data.password.startsWith('$2y$'))
    ? data.password
    : bcrypt.hashSync(data.password || 'MnsUet#2026!', 10);

  if (existing.length > 0) {
    await db.update(users).set({
      name: data.name,
      email: data.email || existing[0].email,
      department: data.department || existing[0].department,
      designation: data.designation || existing[0].designation,
      role: data.role || existing[0].role,
      program: data.program !== undefined ? data.program : existing[0].program,
      assignedPrograms: data.assignedPrograms || existing[0].assignedPrograms,
      avatarUrl: data.avatarUrl !== undefined ? data.avatarUrl : existing[0].avatarUrl,
      themePreference: data.themePreference || existing[0].themePreference,
      lastLoginAt: data.lastLoginAt || existing[0].lastLoginAt,
      password: data.password ? hashedPassword : existing[0].password,
    }).where(eq(users.id, data.id));
  } else {
    await db.insert(users).values({
      id: data.id || `user_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      username: data.username,
      email: data.email || null,
      password: hashedPassword,
      name: data.name,
      department: data.department,
      designation: data.designation,
      role: data.role || 'LECTURER',
      program: data.program || null,
      assignedPrograms: data.assignedPrograms || null,
      createdAt: data.createdAt || new Date().toISOString(),
      lastLoginAt: data.lastLoginAt || new Date().toISOString(),
      avatarUrl: data.avatarUrl || null,
      themePreference: data.themePreference || 'emerald',
    });
  }

  res.json({ success: true });
}));

// Update a user profile
app.put('/api/users/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const data = req.body;
  const existing = await db.select().from(users).where(eq(users.id, id));

  if (existing.length === 0) {
    return res.status(404).json({ error: 'User not found' });
  }

  const updateFields: any = {};
  if (data.name !== undefined) updateFields.name = data.name;
  if (data.email !== undefined) updateFields.email = data.email;
  if (data.department !== undefined) updateFields.department = data.department;
  if (data.designation !== undefined) updateFields.designation = data.designation;
  if (data.role !== undefined) updateFields.role = data.role;
  if (data.program !== undefined) updateFields.program = data.program;
  if (data.assignedPrograms !== undefined) updateFields.assignedPrograms = data.assignedPrograms;
  if (data.avatarUrl !== undefined) updateFields.avatarUrl = data.avatarUrl;
  if (data.themePreference !== undefined) updateFields.themePreference = data.themePreference;
  if (data.password !== undefined) {
    updateFields.password = (data.password.startsWith('$2a$') || data.password.startsWith('$2b$') || data.password.startsWith('$2y$'))
      ? data.password
      : bcrypt.hashSync(data.password, 10);
  }

  await db.update(users).set(updateFields).where(eq(users.id, id));
  res.json({ success: true });
}));

// Delete user account (core admin & vc protected)
app.delete('/api/users/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const target = await db.select().from(users).where(eq(users.id, id));
  if (target.length === 0) {
    return res.status(404).json({ error: 'User not found' });
  }
  if (target[0].username.toLowerCase() === 'admin' || target[0].username.toLowerCase() === 'vc') {
    return res.status(403).json({ error: 'Cannot delete institutional root accounts' });
  }
  await db.delete(users).where(eq(users.id, id));
  res.json({ success: true });
}));

// Auth Login endpoint
app.post('/api/auth/login', asyncHandler(async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  const cleanUser = username.trim().toLowerCase();
  const allUsers = await db.select().from(users);
  const user = allUsers.find(
    (u) =>
      u.username.toLowerCase() === cleanUser ||
      (u.email && u.email.toLowerCase() === cleanUser)
  );

  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  if (user.isLocked) {
    if (user.lockoutUntil && new Date(user.lockoutUntil) > new Date()) {
      return res.status(401).json({
        error: 'Account locked',
        lockoutUntil: user.lockoutUntil,
      });
    } else {
      await db.update(users)
        .set({ isLocked: false, lockoutUntil: null, failedLoginAttempts: 0 })
        .where(eq(users.id, user.id));
    }
  }

  const isPasswordCorrect = verifyPassword(password, user.password);

  if (!isPasswordCorrect) {
    const attempts = (user.failedLoginAttempts || 0) + 1;
    let isLocked = false;
    let lockoutUntil = null;

    if (attempts >= 6) {
      isLocked = true;
      lockoutUntil = new Date(Date.now() + 3 * 60 * 1000).toISOString();
    }

    await db.update(users)
      .set({ failedLoginAttempts: attempts, isLocked, lockoutUntil })
      .where(eq(users.id, user.id));

    if (isLocked) {
      return res.status(401).json({ error: 'Account locked due to consecutive failed attempts', lockoutUntil });
    }
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // Login successful
  await db.update(users)
    .set({
      failedLoginAttempts: 0,
      isLocked: false,
      lockoutUntil: null,
      lastLoginAt: new Date().toISOString(),
    })
    .where(eq(users.id, user.id));

  res.json({
    id: user.id,
    username: user.username,
    email: user.email,
    name: user.name,
    role: user.role,
    designation: user.designation,
    department: user.department,
    program: user.program,
    assignedPrograms: user.assignedPrograms,
    themePreference: user.themePreference,
    token: `auth_tok_${Date.now()}`,
  });
}));

// Reset password endpoint
app.post('/api/auth/reset-password', asyncHandler(async (req, res) => {
  const { id, username, email, password } = req.body;
  if (!password) {
    return res.status(400).json({ error: 'Password is required' });
  }

  let targetUser = null;
  if (id) {
    const list = await db.select().from(users).where(eq(users.id, id));
    if (list.length > 0) targetUser = list[0];
  }
  if (!targetUser && email) {
    const list = await db.select().from(users).where(eq(users.email, email.trim().toLowerCase()));
    if (list.length > 0) targetUser = list[0];
  }
  if (!targetUser && username) {
    const list = await db.select().from(users).where(eq(users.username, username.trim()));
    if (list.length > 0) targetUser = list[0];
  }

  if (!targetUser) {
    return res.status(404).json({ error: 'Account not found' });
  }

  const hashedPassword = (password.startsWith('$2a$') || password.startsWith('$2b$') || password.startsWith('$2y$'))
    ? password
    : bcrypt.hashSync(password, 10);

  await db.update(users)
    .set({
      password: hashedPassword,
      failedLoginAttempts: 0,
      isLocked: false,
      lockoutUntil: null,
    })
    .where(eq(users.id, targetUser.id));

  res.json({ success: true, message: 'Password updated successfully' });
}));

// -----------------------------------------------------------------------------
// SESSIONS & SUBMISSION ENDPOINTS
// -----------------------------------------------------------------------------

app.get('/api/sessions', asyncHandler(async (req, res) => {
  const sess = await db.select().from(sessions);
  res.json(sess);
}));

app.get('/api/submissions', asyncHandler(async (req, res) => {
  const subs = await db.select().from(submissions).orderBy(desc(submissions.createdAt));
  const subsWithSubjects = await Promise.all(
    subs.map(async (sub) => {
      const subjs = await db.select().from(subjects).where(eq(subjects.submissionId, sub.id));
      return { ...sub, subjects: subjs };
    })
  );
  res.json(subsWithSubjects);
}));

app.post('/api/submissions', asyncHandler(async (req, res) => {
  const data = req.body;
  const id = `${data.department}__${data.program}__${data.degreeLevel}__${data.shift}__${data.session}__${data.semester}__${data.section || 'A'}`;

  await db.transaction(async (tx) => {
    const existing = await tx.select().from(submissions).where(eq(submissions.id, id));

    if (existing.length > 0) {
      await tx.update(submissions).set({
        hodCoordinator: data.hodCoordinator,
        submissionDate: data.submissionDate,
        accessedBy: data.accessedBy,
        userDesignation: data.userDesignation,
        updatedAt: new Date().toISOString(),
      }).where(eq(submissions.id, id));

      await tx.delete(subjects).where(eq(subjects.submissionId, id));
    } else {
      await tx.insert(submissions).values({
        id,
        department: data.department,
        program: data.program,
        degreeLevel: data.degreeLevel,
        shift: data.shift,
        section: data.section || 'A',
        session: data.session,
        semester: data.semester,
        hodCoordinator: data.hodCoordinator,
        submissionDate: data.submissionDate,
        accessedBy: data.accessedBy,
        userDesignation: data.userDesignation,
        updatedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      });
    }

    if (data.subjects && data.subjects.length > 0) {
      const subjectsToInsert = data.subjects.map((s: any) => ({
        id: Math.random().toString(36).substring(7),
        submissionId: id,
        courseCode: s.courseCode,
        subjectTitle: s.subjectTitle,
        creditHours: s.creditHours,
        sectionShift: s.sectionShift,
        status: s.status,
        dateUploaded: s.dateUploaded,
        uploadedBy: s.uploadedBy,
        remarks: s.remarks,
      }));
      await tx.insert(subjects).values(subjectsToInsert);
    }
  });

  res.json({ success: true, id });
}));

app.delete('/api/submissions/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  await db.delete(subjects).where(eq(subjects.submissionId, id));
  await db.delete(submissions).where(eq(submissions.id, id));
  res.json({ success: true });
}));

// -----------------------------------------------------------------------------
// SYSTEM WIPE (PURGE SAVED SUBMISSION DATA, KEEP USER ACCOUNTS INTACT)
// -----------------------------------------------------------------------------
app.post('/api/reset-data', asyncHandler(async (req, res) => {
  await db.transaction(async (tx) => {
    await tx.delete(subjects);
    await tx.delete(submissions);
    await tx.delete(accessLogs);
    await tx.delete(workOnDemand);
  });
  res.json({
    success: true,
    message: 'All submission records and logs successfully purged. Login accounts preserved.',
  });
}));

// -----------------------------------------------------------------------------
// ACCESS LOGS & WORK ON DEMAND ENDPOINTS
// -----------------------------------------------------------------------------
app.get('/api/access-logs', asyncHandler(async (req, res) => {
  const logs = await db.select().from(accessLogs).orderBy(desc(accessLogs.timestamp)).limit(100);
  res.json(logs);
}));

app.post('/api/access-logs', asyncHandler(async (req, res) => {
  const log = req.body;
  await db.insert(accessLogs).values({
    id: log.id || `${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    userName: log.userName || 'System',
    designation: log.designation || 'Staff',
    department: log.department || 'General',
    action: log.action || 'Access',
    program: log.program || null,
    shift: log.shift || null,
    timestamp: log.timestamp || new Date().toISOString(),
  });
  res.json({ success: true });
}));

app.get('/api/work-on-demand', asyncHandler(async (req, res) => {
  const requisitions = await db.select().from(workOnDemand);
  res.json(requisitions);
}));

app.post('/api/work-on-demand', asyncHandler(async (req, res) => {
  const reqData = req.body;
  await db.insert(workOnDemand).values({
    id: reqData.id || `req_${Date.now()}`,
    moduleName: reqData.moduleName,
    category: reqData.category,
    requestedBy: reqData.requestedBy,
    requestorRole: reqData.requestorRole,
    department: reqData.department,
    targetSession: reqData.targetSession,
    priority: reqData.priority,
    status: reqData.status || 'SUBMITTED',
    submittedAt: reqData.submittedAt || new Date().toISOString(),
    technicalRequirements: reqData.technicalRequirements || '',
    hardwareOrApiNeeded: reqData.hardwareOrApiNeeded || '',
  });
  res.json({ success: true });
}));

app.delete('/api/work-on-demand/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  await db.delete(workOnDemand).where(eq(workOnDemand.id, id));
  res.json({ success: true });
}));

// Fallback for vite middleware in dev, or static files in prod
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
