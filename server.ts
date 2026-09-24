import express from 'express';
import cors from 'cors';
import asyncHandler from 'express-async-handler';
import bcrypt from 'bcryptjs';
import { db } from './src/db/index.js';
import { GoogleGenAI } from '@google/genai';
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
import fs from 'fs';
import { UNIVERSITY_DEPARTMENTS } from './src/data/departmentsData.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

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
      assignedShifts: data.assignedShifts || existing[0].assignedShifts,
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
      assignedShifts: data.assignedShifts || null,
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
  if (data.assignedShifts !== undefined) updateFields.assignedShifts = data.assignedShifts;
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

app.get('/api/programs', asyncHandler(async (req, res) => {
  const progs = await db.select().from(programs);
  res.json(progs);
}));

app.get('/api/session-roster/:session', asyncHandler(async (req, res) => {
  const { session } = req.params;
  const progs = await db.select().from(programs);
  const roster: Record<string, string[]> = {};
  progs.forEach((p) => {
    const isActive = session === '2023' ? p.session2023 : true;
    if (isActive) {
      if (!roster[p.department]) roster[p.department] = [];
      roster[p.department].push(p.name);
    }
  });
  res.json({ session, roster });
}));

app.post('/api/session-roster/:session', asyncHandler(async (req, res) => {
  const { session } = req.params;
  const { department, programs: activeList } = req.body;
  if (session === '2023' && department && Array.isArray(activeList)) {
    const progsInDept = await db.select().from(programs).where(eq(programs.department, department));
    for (const p of progsInDept) {
      const shouldBeActive = activeList.some(
        (n: string) => n.trim().toLowerCase() === p.name.trim().toLowerCase()
      );
      await db.update(programs).set({ session2023: shouldBeActive }).where(eq(programs.id, p.id));
    }
  }
  res.json({ success: true, session, department, count: activeList?.length || 0 });
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
  const data = req.body || {};
  const department = data.department || 'General';
  const program = data.program || 'General Program';
  const degreeLevel = data.degreeLevel || 'BS';
  const shift = data.shift || 'Morning';
  const session = String(data.session || '2023').trim();
  const semester = String(data.semester || '1').trim();
  const section = (data.section || 'A').trim().toUpperCase();

  const id = data.id || `${department}__${program}__${degreeLevel}__${shift}__${session}__${semester}__${section}`;
  const now = new Date().toISOString();
  const hodCoordinator = data.hodCoordinator || data.coordinatorName || 'Department Coordinator';
  const submissionDate = data.submissionDate || now.split('T')[0];
  const accessedBy = data.accessedBy || hodCoordinator || 'System User';
  const userDesignation = data.userDesignation || 'Coordinator';

  await db.transaction(async (tx) => {
    const existing = await tx.select().from(submissions).where(eq(submissions.id, id));

    if (existing.length > 0) {
      await tx.update(submissions).set({
        hodCoordinator,
        submissionDate,
        accessedBy,
        userDesignation,
        updatedAt: now,
      }).where(eq(submissions.id, id));

      await tx.delete(subjects).where(eq(subjects.submissionId, id));
    } else {
      await tx.insert(submissions).values({
        id,
        department,
        program,
        degreeLevel,
        shift,
        section,
        session,
        semester,
        hodCoordinator,
        submissionDate,
        accessedBy,
        userDesignation,
        updatedAt: now,
        createdAt: data.createdAt || now,
      });
    }

    if (Array.isArray(data.subjects) && data.subjects.length > 0) {
      const subjectsToInsert = data.subjects.map((s: any) => ({
        id: s.id || Math.random().toString(36).substring(2, 11),
        submissionId: id,
        courseCode: s.courseCode || '',
        subjectTitle: s.subjectTitle || '',
        creditHours: String(s.creditHours || '3(3-0)'),
        sectionShift: s.sectionShift || shift,
        status: s.status || 'Pending',
        dateUploaded: s.dateUploaded || '',
        uploadedBy: s.uploadedBy || '',
        remarks: s.remarks || '',
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

app.delete('/api/submissions/program/:department/:program', asyncHandler(async (req, res) => {
  const { department, program } = req.params;
  const matching = await db.select().from(submissions).where(
    and(
      eq(submissions.department, department),
      eq(submissions.program, program)
    )
  );
  for (const s of matching) {
    await db.delete(subjects).where(eq(subjects.submissionId, s.id));
    await db.delete(submissions).where(eq(submissions.id, s.id));
  }
  res.json({ success: true, deletedCount: matching.length });
}));

app.delete('/api/submissions/department/:department', asyncHandler(async (req, res) => {
  const { department } = req.params;
  const matching = await db.select().from(submissions).where(
    eq(submissions.department, department)
  );
  for (const s of matching) {
    await db.delete(subjects).where(eq(subjects.submissionId, s.id));
    await db.delete(submissions).where(eq(submissions.id, s.id));
  }
  res.json({ success: true, deletedCount: matching.length });
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

// -----------------------------------------------------------------------------
// AI EXECUTIVE ASSISTANT ENDPOINT (GEMINI API)
// -----------------------------------------------------------------------------
app.post('/api/gemini/vc-assistant', asyncHandler(async (req, res) => {
  const { question, currentRecords } = req.body;
  if (!question) {
    return res.status(400).json({ error: 'Question is required' });
  }

  let summarizedSubmissions: any[] = [];
  let usersList: any[] = [];
  let reqs: any[] = [];
  let logs: any[] = [];

  // Gather fallback info from SQLite for items not sent by client
  try {
    usersList = await db.select().from(users);
    reqs = await db.select().from(workOnDemand);
    logs = await db.select().from(accessLogs).orderBy(desc(accessLogs.timestamp)).limit(30);
  } catch (e) {
    console.error('Failed to query SQLite fallback:', e);
  }

  // Use client-provided high-fidelity dynamic records, or fall back to SQLite
  if (currentRecords && Array.isArray(currentRecords)) {
    summarizedSubmissions = currentRecords.map((sub: any) => {
      const list = sub.subjects || [];
      const total = list.length;
      const uploaded = list.filter((c: any) => c.status === 'Uploaded').length;
      const pending = list.filter((c: any) => c.status === 'Pending' || !c.status).length;
      const inProgress = list.filter((c: any) => c.status === 'In Progress').length;
      
      return {
        id: sub.id,
        department: sub.department,
        program: sub.program,
        shift: sub.shift,
        session: sub.session,
        semester: sub.semester,
        section: sub.section || 'A',
        coordinator: sub.hodCoordinator || 'Unassigned',
        totalCourses: total,
        uploadedCourses: uploaded,
        pendingCourses: pending,
        inProgressCourses: inProgress,
        updatedAt: sub.updatedAt,
        courses: list.map((c: any) => ({
          code: c.courseCode,
          title: c.subjectTitle,
          status: c.status,
          instructor: c.uploadedBy || 'Unassigned'
        }))
      };
    });
  } else {
    try {
      const subs = await db.select().from(submissions);
      const subjs = await db.select().from(subjects);
      
      const subMap: Record<string, typeof subjs> = {};
      subjs.forEach(s => {
        if (s.submissionId) {
          if (!subMap[s.submissionId]) subMap[s.submissionId] = [];
          subMap[s.submissionId].push(s);
        }
      });

      summarizedSubmissions = subs.map(sub => {
        const list = subMap[sub.id] || [];
        const total = list.length;
        const uploaded = list.filter(c => c.status === 'Uploaded').length;
        const pending = list.filter(c => c.status === 'Pending' || !c.status).length;
        const inProgress = list.filter(c => c.status === 'In Progress').length;
        
        return {
          id: sub.id,
          department: sub.department,
          program: sub.program,
          shift: sub.shift,
          session: sub.session,
          semester: sub.semester,
          section: sub.section,
          coordinator: sub.hodCoordinator || 'Unassigned',
          totalCourses: total,
          uploadedCourses: uploaded,
          pendingCourses: pending,
          inProgressCourses: inProgress,
          updatedAt: sub.updatedAt,
          courses: list.map(c => ({
            code: c.courseCode,
            title: c.subjectTitle,
            status: c.status,
            instructor: c.uploadedBy || 'Unassigned'
          }))
        };
      });
    } catch (e) {
      console.error('Failed to build SQLite submission summary:', e);
    }
  }

  const summaryText = `
Academics Database Summary:
- Total submissions in system: ${summarizedSubmissions.length}
- Submissions Details:
${JSON.stringify(summarizedSubmissions, null, 2)}

User Accounts:
${JSON.stringify(usersList.map(u => ({ name: u.name, role: u.role, dept: u.department, designation: u.designation, isLocked: u.isLocked })), null, 2)}

Work On Demand Requisitions:
${JSON.stringify(reqs, null, 2)}

Recent Access Logs:
${JSON.stringify(logs, null, 2)}
`;

  const systemInstruction = `You are the executive AI assistant to the Vice Chancellor of MNS-UET. 
You are answering questions about the university's academic compliance, grade sheet submissions, delays, and coordinator status.
Use the structured Academics Database Summary below to answer the VC's question. 
You MUST provide actual facts, numbers, names, and specifics (like course codes, department names, program names, and coordinator/HOD names) as evidence for your answers.
If there are no issues, state that clearly. DO NOT invent or make up any records, numbers, or details. Keep your response highly professional, structured, and easy for an executive to read (use clear bolding, bullet points, and tables where appropriate).`;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    // Local High-Fidelity Analyzer report
    let responseText = `### MNS-UET Local Database Analyzer (Grounded Engine)\n`;
    responseText += `*(Note: The process is executing direct system queries using real-time database parameters to bypass any external API connection limits)*\n\n`;
    
    const lowerQuestion = question.toLowerCase();
    if (lowerQuestion.includes('delay') || lowerQuestion.includes('overdue') || lowerQuestion.includes('pending')) {
      const lagging = summarizedSubmissions.filter(s => s.pendingCourses > 0);
      if (lagging.length > 0) {
        responseText += `### Delays & Pending Uploads Report:\n`;
        lagging.forEach(l => {
          responseText += `- **${l.program}** (${l.shift}, Semester ${l.semester}, Section ${l.section}):\n`;
          responseText += `  - **Status**: **${l.pendingCourses} pending courses** out of ${l.totalCourses} total (${Math.round((l.uploadedCourses / l.totalCourses) * 100)}% complete).\n`;
          responseText += `  - **Coordinator**: *${l.coordinator}*\n`;
          responseText += `  - **Last Updated**: ${l.updatedAt ? new Date(l.updatedAt).toLocaleString() : 'N/A'}\n`;
          const pendingList = l.courses.filter((c: any) => c.status === 'Pending' || !c.status).map((c: any) => `\`${c.code}\` (*${c.title}*)`);
          if (pendingList.length > 0) {
            responseText += `  - **Lagging Subjects**: ${pendingList.join(', ')}\n`;
          }
          responseText += `\n`;
        });
      } else {
        responseText += `✓ **Perfect Compliance**: There are currently **no lagging or pending courses** in the entire system database! All submissions are fully uploaded.\n`;
      }
    } else if (lowerQuestion.includes('hod') || lowerQuestion.includes('coordinator')) {
      responseText += `### HOD & Coordinator Assignment Audit:\n\n`;
      const criticalProgs = summarizedSubmissions.filter(s => s.coordinator === 'Unassigned' || s.coordinator === 'Not Assigned');
      if (criticalProgs.length > 0) {
        responseText += `⚠️ **Unassigned Roster Delays**:\n`;
        criticalProgs.forEach(p => {
          responseText += `- **${p.program}** (Semester ${p.semester}, ${p.shift}): Marked as *Unassigned*. (Has ${p.pendingCourses} pending courses)\n`;
        });
      } else {
        responseText += `✓ All active student cohorts in the database currently have an assigned Program Coordinator.\n\n`;
      }
      const lockedCoords = usersList.filter(u => (u.role === 'COORDINATOR' || u.role === 'HOD') && u.isLocked);
      if (lockedCoords.length > 0) {
        responseText += `🔒 **Account Locks**: The following leadership accounts are locked:\n`;
        lockedCoords.forEach(c => {
          responseText += `- **${c.name}** (${c.role} - ${c.dept || 'General'})\n`;
        });
      } else {
        responseText += `✓ All registered HOD & Coordinator portal accounts are active and unlocked.\n`;
      }
    } else {
      const totalCohorts = summarizedSubmissions.length;
      const completed = summarizedSubmissions.filter(s => s.pendingCourses === 0).length;
      const rate = totalCohorts > 0 ? Math.round((completed / totalCohorts) * 100) : 100;
      
      responseText += `### Today's Executive Academic Monitoring Summary:\n\n`;
      responseText += `- **University Academic Compliance**: **${rate}%**\n`;
      responseText += `- **Total Tracked Cohorts**: **${totalCohorts}** across all faculties\n`;
      responseText += `- **Fully Completed Submissions**: **${completed}** cohorts\n`;
      responseText += `- **Action Interventions Needed**: **${totalCohorts - completed}** active cohorts\n\n`;
      
      const laggingDepts = Array.from(new Set(summarizedSubmissions.filter(s => s.pendingCourses > 0).map(s => s.department)));
      if (laggingDepts.length > 0) {
        responseText += `⚠️ **Key Delays Identified In**:\n`;
        laggingDepts.forEach(d => {
          const count = summarizedSubmissions.filter(s => s.department === d && s.pendingCourses > 0).length;
          responseText += `- *${d.replace('Department of ', '')}* (${count} cohorts stalling)\n`;
        });
      }
    }
    return res.json({ response: responseText });
  }

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: `Question from VC: "${question}"\n\nStructured Database Context:\n${summaryText}`,
      config: {
        systemInstruction,
        temperature: 0.1
      }
    });

    res.json({ response: response.text || 'No response generated by the model.' });
  } catch (error: any) {
    console.error('Gemini API execution error, switching to direct database query report:', error);
    
    let responseText = `### MNS-UET Local Database Analyzer (Bypass Mode)\n`;
    responseText += `*(Google Gemini API reported: ${error.message || 'Rate limit / quota exceeded'}. Real-time queries have been completed locally to guarantee immediate database visibility for your inquiry)*\n\n`;
    
    const lowerQuestion = question.toLowerCase();
    if (lowerQuestion.includes('delay') || lowerQuestion.includes('overdue') || lowerQuestion.includes('pending')) {
      const lagging = summarizedSubmissions.filter(s => s.pendingCourses > 0);
      if (lagging.length > 0) {
        responseText += `### Delays & Pending Uploads Report:\n`;
        lagging.forEach(l => {
          responseText += `- **${l.program}** (${l.shift}, Semester ${l.semester}, Section ${l.section}):\n`;
          responseText += `  - **Status**: **${l.pendingCourses} pending courses** out of ${l.totalCourses} total (${Math.round((l.uploadedCourses / l.totalCourses) * 100)}% complete).\n`;
          responseText += `  - **Coordinator**: *${l.coordinator}*\n`;
          responseText += `  - **Last Updated**: ${l.updatedAt ? new Date(l.updatedAt).toLocaleString() : 'N/A'}\n`;
          const pendingList = l.courses.filter((c: any) => c.status === 'Pending' || !c.status).map((c: any) => `\`${c.code}\` (*${c.title}*)`);
          if (pendingList.length > 0) {
            responseText += `  - **Lagging Subjects**: ${pendingList.join(', ')}\n`;
          }
          responseText += `\n`;
        });
      } else {
        responseText += `✓ **Perfect Compliance**: There are currently **no lagging or pending courses** in the entire system database! All submissions are fully uploaded.\n`;
      }
    } else if (lowerQuestion.includes('hod') || lowerQuestion.includes('coordinator')) {
      responseText += `### HOD & Coordinator Assignment Audit:\n\n`;
      const criticalProgs = summarizedSubmissions.filter(s => s.coordinator === 'Unassigned' || s.coordinator === 'Not Assigned');
      if (criticalProgs.length > 0) {
        responseText += `⚠️ **Unassigned Roster Delays**:\n`;
        criticalProgs.forEach(p => {
          responseText += `- **${p.program}** (Semester ${p.semester}, ${p.shift}): Marked as *Unassigned*. (Has ${p.pendingCourses} pending courses)\n`;
        });
      } else {
        responseText += `✓ All active student cohorts in the database currently have an assigned Program Coordinator.\n\n`;
      }
    } else {
      const totalCohorts = summarizedSubmissions.length;
      const completed = summarizedSubmissions.filter(s => s.pendingCourses === 0).length;
      const rate = totalCohorts > 0 ? Math.round((completed / totalCohorts) * 100) : 100;
      
      responseText += `### Today's Executive Academic Monitoring Summary:\n\n`;
      responseText += `- **University Academic Compliance**: **${rate}%**\n`;
      responseText += `- **Total Tracked Cohorts**: **${totalCohorts}** across all faculties\n`;
      responseText += `- **Fully Completed Submissions**: **${completed}** cohorts\n`;
      responseText += `- **Action Interventions Needed**: **${totalCohorts - completed}** active cohorts\n\n`;
      
      const laggingDepts = Array.from(new Set(summarizedSubmissions.filter(s => s.pendingCourses > 0).map(s => s.department)));
      if (laggingDepts.length > 0) {
        responseText += `⚠️ **Key Delays Identified In**:\n`;
        laggingDepts.forEach(d => {
          const count = summarizedSubmissions.filter(s => s.department === d && s.pendingCourses > 0).length;
          responseText += `- *${d.replace('Department of ', '')}* (${count} cohorts stalling)\n`;
        });
      }
    }
    
    res.json({ response: responseText });
  }
}));

// -----------------------------------------------------------------------------
// CAMPUS OFFICIAL BANNER PHOTO ENDPOINTS
// -----------------------------------------------------------------------------
const CAMPUS_CONFIG_FILE = path.join(process.cwd(), 'campus-photo-config.json');

// Get active campus photo
app.get('/api/campus-photo', (req, res) => {
  try {
    let customImage = null;
    let fitMode = 'cover';
    let updatedAt = Date.now();

    if (fs.existsSync(CAMPUS_CONFIG_FILE)) {
      try {
        const config = JSON.parse(fs.readFileSync(CAMPUS_CONFIG_FILE, 'utf-8'));
        if (config.photoUrl) customImage = config.photoUrl;
        else if (config.image) customImage = config.image;
        if (config.fitMode) fitMode = config.fitMode;
        if (config.updatedAt) updatedAt = config.updatedAt;
      } catch (e) {}
    }

    const publicDir = path.join(process.cwd(), 'public');
    const c3Path = path.join(publicDir, 'c3.jpeg');
    const publicJpg = path.join(publicDir, 'mns-uet-campus.jpg');
    let mtime = updatedAt;

    if (fs.existsSync(c3Path)) {
      mtime = Math.max(mtime, fs.statSync(c3Path).mtimeMs);
    } else if (fs.existsSync(publicJpg)) {
      mtime = Math.max(mtime, fs.statSync(publicJpg).mtimeMs);
    }

    // Determine primary resolved photo URL
    let resolvedUrl = customImage;
    if (!resolvedUrl) {
      if (fs.existsSync(c3Path)) {
        resolvedUrl = `/c3.jpeg?v=${Math.round(mtime)}`;
      } else {
        resolvedUrl = `/mns-uet-campus.jpg?v=${Math.round(mtime)}`;
      }
    }

    res.json({
      photoUrl: resolvedUrl,
      fitMode,
      isCustom: true,
      updatedAt: mtime,
      availablePresets: [
        { id: 'c3', name: 'MNS-UET Multan Main Academic Block (c3.jpeg)', url: `/c3.jpeg?v=${Math.round(mtime)}` },
        { id: 'default', name: 'Official Institutional Campus Facade', url: `/mns-uet-campus.jpg?v=${Math.round(mtime)}` }
      ]
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Upload & persist a new campus photo across the entire university portal
app.post('/api/campus-photo', (req, res) => {
  try {
    const { image, photoUrl, fitMode = 'cover' } = req.body;
    const effectiveImage = image || photoUrl;
    if (!effectiveImage || typeof effectiveImage !== 'string') {
      return res.status(400).json({ error: 'Image data URL or photo URL is required' });
    }

    const updatedAt = Date.now();
    const configData: any = {
      image: effectiveImage,
      photoUrl: photoUrl || (effectiveImage.startsWith('data:') ? undefined : effectiveImage),
      fitMode,
      updatedAt,
    };
    fs.writeFileSync(CAMPUS_CONFIG_FILE, JSON.stringify(configData, null, 2), 'utf-8');

    // Extract base64 buffer and write directly to public and dist
    const match = effectiveImage.match(/^data:image\/([a-zA-Z0-9+.-]+);base64,(.+)$/);
    if (match) {
      const buffer = Buffer.from(match[2], 'base64');
      const publicDir = path.join(process.cwd(), 'public');
      const distDir = path.join(process.cwd(), 'dist');

      if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });
      fs.writeFileSync(path.join(publicDir, 'mns-uet-campus.jpg'), buffer);
      fs.writeFileSync(path.join(publicDir, 'mns-uet-campus.png'), buffer);
      fs.writeFileSync(path.join(publicDir, 'mns-uet-campus-alt.jpg'), buffer);

      if (fs.existsSync(distDir)) {
        fs.writeFileSync(path.join(distDir, 'mns-uet-campus.jpg'), buffer);
        fs.writeFileSync(path.join(distDir, 'mns-uet-campus.png'), buffer);
        fs.writeFileSync(path.join(distDir, 'mns-uet-campus-alt.jpg'), buffer);
      }
    } else if (effectiveImage.includes('c3.jpeg')) {
      const publicDir = path.join(process.cwd(), 'public');
      const c3Path = path.join(publicDir, 'c3.jpeg');
      if (fs.existsSync(c3Path)) {
        const c3Buf = fs.readFileSync(c3Path);
        fs.writeFileSync(path.join(publicDir, 'mns-uet-campus.jpg'), c3Buf);
        fs.writeFileSync(path.join(publicDir, 'mns-uet-campus.png'), c3Buf);
        fs.writeFileSync(path.join(publicDir, 'mns-uet-campus-alt.jpg'), c3Buf);
        const distDir = path.join(process.cwd(), 'dist');
        if (fs.existsSync(distDir)) {
          fs.writeFileSync(path.join(distDir, 'mns-uet-campus.jpg'), c3Buf);
          fs.writeFileSync(path.join(distDir, 'mns-uet-campus.png'), c3Buf);
          fs.writeFileSync(path.join(distDir, 'mns-uet-campus-alt.jpg'), c3Buf);
        }
      }
    }

    res.json({
      success: true,
      message: 'Campus photo successfully updated and saved across all institutional users!',
      photoUrl: effectiveImage,
      fitMode,
    });
  } catch (err: any) {
    console.error('Error saving campus photo:', err);
    res.status(500).json({ error: err.message });
  }
});

// Reset to official default MNS-UET Multan campus building photo
app.delete('/api/campus-photo', (req, res) => {
  try {
    if (fs.existsSync(CAMPUS_CONFIG_FILE)) {
      fs.unlinkSync(CAMPUS_CONFIG_FILE);
    }
    const publicDir = path.join(process.cwd(), 'public');
    const c3Path = path.join(publicDir, 'c3.jpeg');
    if (fs.existsSync(c3Path)) {
      const c3Buf = fs.readFileSync(c3Path);
      fs.writeFileSync(path.join(publicDir, 'mns-uet-campus.jpg'), c3Buf);
      fs.writeFileSync(path.join(publicDir, 'mns-uet-campus.png'), c3Buf);
      fs.writeFileSync(path.join(publicDir, 'mns-uet-campus-alt.jpg'), c3Buf);
    }

    res.json({
      success: true,
      message: 'Restored official MNS UET Multan Main Academic Block default photo.',
      photoUrl: `/c3.jpeg?v=${Date.now()}`,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

async function initDatabaseDefaults() {
  try {
    const existingProgs = await db.select().from(programs).limit(1);
    if (existingProgs.length === 0) {
      for (const dept of UNIVERSITY_DEPARTMENTS) {
        for (const prog of dept.programs) {
          try {
            await db.insert(programs).values({
              id: `prog_${dept.code}_${prog.name.replace(/[^a-zA-Z0-9]/g, '_')}`,
              name: prog.name,
              department: dept.name,
              degreeLevel: prog.degreeLevel,
              session2023: prog.session2023 === true,
            });
          } catch (e) {}
        }
      }
    }
    const existingSessions = await db.select().from(sessions).limit(1);
    if (existingSessions.length === 0) {
      try {
        await db.insert(sessions).values([
          { id: '2023', name: 'Session 2023', isActive: true, startDate: '2023-09-01', endDate: '2027-06-30' },
          { id: '2024', name: 'Session 2024', isActive: true, startDate: '2024-09-01', endDate: '2028-06-30' },
        ]);
      } catch (e) {}
    }
  } catch (e) {
    console.error('Error seeding database defaults:', e);
  }
}

// Fallback for vite middleware in dev, or static files in prod
async function startServer() {
  await initDatabaseDefaults();
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
