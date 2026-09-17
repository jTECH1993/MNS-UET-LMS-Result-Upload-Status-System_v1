import express from 'express';
import cors from 'cors';
import asyncHandler from 'express-async-handler';
import { db } from './src/db/index.js';
import { users, programs, sessions, submissions, subjects, documents, documentPrograms, accessLogs, workOnDemand } from './src/db/schema.js';
import { eq, and, desc, sql } from 'drizzle-orm';
import path from 'path';

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Auth endpoint
app.post('/api/auth/login', asyncHandler(async (req, res) => {
  const { username, password } = req.body;
  const userList = await db.select().from(users).where(eq(users.username, username));
  
  if (userList.length === 0) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  
  const user = userList[0];
  
  if (user.isLocked) {
    if (user.lockoutUntil && new Date(user.lockoutUntil) > new Date()) {
      return res.status(401).json({ 
        error: 'Account locked',
        lockoutUntil: user.lockoutUntil
      });
    } else {
      // Lock expired
      await db.update(users)
        .set({ isLocked: false, lockoutUntil: null, failedLoginAttempts: 0 })
        .where(eq(users.id, user.id));
    }
  }

  if (user.password !== password) {
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
      return res.status(401).json({ error: 'Account locked', lockoutUntil });
    }
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  
  // Success
  await db.update(users)
    .set({ failedLoginAttempts: 0, isLocked: false, lockoutUntil: null, lastLoginAt: new Date().toISOString() })
    .where(eq(users.id, user.id));
    
  res.json({
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
    designation: user.designation,
    department: user.department,
    program: user.program,
    assignedPrograms: user.assignedPrograms,
    themePreference: user.themePreference
  });
}));

app.get('/api/sessions', asyncHandler(async (req, res) => {
  const sess = await db.select().from(sessions);
  res.json(sess);
}));

app.get('/api/submissions', asyncHandler(async (req, res) => {
  const subs = await db.select().from(submissions).orderBy(desc(submissions.createdAt));
  const subsWithSubjects = await Promise.all(subs.map(async sub => {
    const subjs = await db.select().from(subjects).where(eq(subjects.submissionId, sub.id));
    return { ...sub, subjects: subjs };
  }));
  res.json(subsWithSubjects);
}));

app.post('/api/submissions', asyncHandler(async (req, res) => {
  const data = req.body;
  const id = `${data.department}__${data.program}__${data.degreeLevel}__${data.shift}__${data.session}__${data.semester}__${data.section || 'A'}`;
  
  await db.transaction(async (tx) => {
    // Check if exists
    const existing = await tx.select().from(submissions).where(eq(submissions.id, id));
    
    if (existing.length > 0) {
      await tx.update(submissions).set({
        hodCoordinator: data.hodCoordinator,
        submissionDate: data.submissionDate,
        accessedBy: data.accessedBy,
        userDesignation: data.userDesignation,
        updatedAt: new Date().toISOString()
      }).where(eq(submissions.id, id));
      
      // Delete old subjects
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
        createdAt: new Date().toISOString()
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
  await db.delete(submissions).where(eq(submissions.id, id));
  res.json({ success: true });
}));

// Fallback for vite middleware in dev, or static files in prod
if (process.env.NODE_ENV !== "production") {
  import("vite").then(async ({ createServer }) => {
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  });
} else {
  const distPath = path.join(process.cwd(), 'dist');
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
