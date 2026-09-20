import { relations } from 'drizzle-orm';
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  username: text('username').notNull().unique(),
  email: text('email'),
  password: text('password').notNull(),
  name: text('name').notNull(),
  department: text('department').notNull(),
  designation: text('designation').notNull(),
  role: text('role').notNull(), // 'ADMIN', 'VC', 'HOD', 'COORDINATOR', 'LECTURER', 'VISITING_LECTURER'
  program: text('program'),
  assignedPrograms: text('assigned_programs', { mode: 'json' }).$type<string[]>(),
  assignedShifts: text('assigned_shifts', { mode: 'json' }).$type<string[]>(),
  createdAt: text('created_at').notNull(),
  lastLoginAt: text('last_login_at'),
  failedLoginAttempts: integer('failed_login_attempts').default(0),
  isLocked: integer('is_locked', { mode: 'boolean' }).default(false),
  lockoutUntil: text('lockout_until'),
  avatarUrl: text('avatar_url'),
  themePreference: text('theme_preference'),
});

export const programs = sqliteTable('programs', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  department: text('department').notNull(),
  degreeLevel: text('degree_level').notNull(),
  session2023: integer('session2023', { mode: 'boolean' }).default(false),
});

export const sessions = sqliteTable('sessions', {
  name: text('name').primaryKey(), // '2023', '2024'
  isActive: integer('is_active', { mode: 'boolean' }).default(false),
  isDefault: integer('is_default', { mode: 'boolean' }).default(false)
});

export const submissions = sqliteTable('submissions', {
  id: text('id').primaryKey(), // department__program__degreeLevel__shift__session__semester__sec
  department: text('department').notNull(),
  program: text('program').notNull(),
  degreeLevel: text('degree_level').notNull().default('BS'),
  shift: text('shift').notNull().default('Morning'),
  section: text('section').notNull().default('A'),
  session: text('session').notNull(),
  semester: text('semester').notNull(),
  hodCoordinator: text('hod_coordinator').notNull().default(''),
  submissionDate: text('submission_date').notNull().default(''),
  accessedBy: text('accessed_by'),
  userDesignation: text('user_designation'),
  updatedAt: text('updated_at').notNull(),
  createdAt: text('created_at').notNull(),
  referenceNumber: text('reference_number'),
  editPin: text('edit_pin'),
  auditTrail: text('audit_trail', { mode: 'json' }).$type<any[]>(),
});

export const subjects = sqliteTable('subjects', {
  id: text('id').primaryKey(),
  submissionId: text('submission_id').notNull().references(() => submissions.id, { onDelete: 'cascade' }),
  courseCode: text('course_code').notNull().default(''),
  subjectTitle: text('subject_title').notNull().default(''),
  creditHours: text('credit_hours').notNull().default('3(3-0)'),
  sectionShift: text('section_shift').notNull().default('Morning'),
  status: text('status').notNull().default('Pending'),
  dateUploaded: text('date_uploaded').notNull().default(''),
  uploadedBy: text('uploaded_by').notNull().default(''),
  remarks: text('remarks').notNull().default(''),
});

export const documents = sqliteTable('documents', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  content: text('content').notNull(),
  createdAt: text('created_at').notNull(),
});

export const documentPrograms = sqliteTable('document_programs', {
  documentId: text('document_id').notNull().references(() => documents.id, { onDelete: 'cascade' }),
  programName: text('program_name').notNull(),
});

export const accessLogs = sqliteTable('access_logs', {
  id: text('id').primaryKey(),
  userName: text('user_name').notNull(),
  designation: text('designation').notNull(),
  department: text('department').notNull(),
  action: text('action').notNull(),
  program: text('program'),
  shift: text('shift'),
  timestamp: text('timestamp').notNull(),
});

export const workOnDemand = sqliteTable('work_on_demand', {
  id: text('id').primaryKey(),
  moduleName: text('module_name').notNull(),
  category: text('category').notNull(),
  requestedBy: text('requested_by').notNull(),
  requestorRole: text('requestor_role').notNull(),
  department: text('department'),
  targetSession: text('target_session').notNull(),
  priority: text('priority').notNull(),
  status: text('status').notNull(),
  submittedAt: text('submitted_at').notNull(),
  technicalRequirements: text('technical_requirements').notNull(),
  hardwareOrApiNeeded: text('hardware_or_api_needed').notNull(),
});

export const usersRelations = relations(users, ({ many }) => ({}));
export const submissionsRelations = relations(submissions, ({ many }) => ({
  subjects: many(subjects),
}));
export const subjectsRelations = relations(subjects, ({ one }) => ({
  submission: one(submissions, {
    fields: [subjects.submissionId],
    references: [submissions.id],
  }),
}));
export const documentsRelations = relations(documents, ({ many }) => ({
  programs: many(documentPrograms),
}));
export const documentProgramsRelations = relations(documentPrograms, ({ one }) => ({
  document: one(documents, {
    fields: [documentPrograms.documentId],
    references: [documents.id],
  }),
}));
