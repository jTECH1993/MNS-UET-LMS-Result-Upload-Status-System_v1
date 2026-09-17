const fs = require('fs');

const methods = `
  public static getSystemDeadline(): string | null {
    return localStorage.getItem('mnsuet_system_deadline_v99');
  }

  public static setSystemDeadline(isoString: string | null): void {
    if (isoString) {
      localStorage.setItem('mnsuet_system_deadline_v99', isoString);
    } else {
      localStorage.removeItem('mnsuet_system_deadline_v99');
    }
  }

  public static getAvailableSessions(): string[] {
    try {
      const stored = localStorage.getItem('mnsuet_available_sessions_v99');
      if (stored) return JSON.parse(stored);
    } catch(e) {}
    return ['2023', '2024'];
  }

  public static addAcademicSession(newSession: string): string[] {
    const trimmed = newSession.trim();
    const current = this.getAvailableSessions();
    if (!current.includes(trimmed)) {
      const updated = [trimmed, ...current];
      localStorage.setItem('mnsuet_available_sessions_v99', JSON.stringify(updated));
      return updated;
    }
    return current;
  }

  public static getSelectedSession(): string {
    return localStorage.getItem('mnsuet_current_active_session_v99') || '2023';
  }

  public static setSelectedSession(session: string): void {
    localStorage.setItem('mnsuet_current_active_session_v99', session);
  }

  public static getActiveSessions(): string[] {
    try {
      const stored = localStorage.getItem('mnsuet_active_sessions_list_v99');
      if (stored) return JSON.parse(stored);
    } catch(e) {}
    return ['2023'];
  }

  public static setActiveSessions(sessions: string[]): void {
    const clean = Array.from(new Set(sessions.map(s => s.trim()).filter(Boolean)));
    const toSave = clean.length > 0 ? clean : ['2023'];
    localStorage.setItem('mnsuet_active_sessions_list_v99', JSON.stringify(toSave));
    if (toSave.length > 0) {
      localStorage.setItem('mnsuet_current_active_session_v99', toSave[0]);
    }
  }

  public static toggleActiveSession(session: string): string[] {
    const current = this.getActiveSessions();
    const updated = current.includes(session) ? current.filter(s => s !== session) : [...current, session];
    this.setActiveSessions(updated);
    return this.getActiveSessions();
  }

  public static isSessionActive(session: string): boolean {
    return this.getActiveSessions().includes(session);
  }

  public static getSessionPrograms(departmentName: string, sessionName: string = '2023'): string[] {
    const roster = this.getAllSessionRoster(sessionName);
    if (roster[departmentName]) return roster[departmentName];
    // fallback to DEFAULT_ACADEMIC_SESSIONS or empty
    return [];
  }

  public static getSession2023Programs(departmentName: string): string[] {
    return this.getSessionPrograms(departmentName, '2023');
  }

  public static getAllSessionRoster(sessionName: string = '2023'): Record<string, string[]> {
    try {
      const stored = localStorage.getItem('mnsuet_session_active_roster_v99__' + sessionName);
      if (stored) return JSON.parse(stored);
    } catch(e) {}
    return {};
  }

  public static getAllSession2023Roster(): Record<string, string[]> {
    return this.getAllSessionRoster('2023');
  }

  public static setSessionPrograms(departmentName: string, programNames: string[], sessionName: string = '2023'): void {
    const roster = this.getAllSessionRoster(sessionName);
    roster[departmentName] = programNames;
    localStorage.setItem('mnsuet_session_active_roster_v99__' + sessionName, JSON.stringify(roster));
  }

  public static setSession2023Programs(departmentName: string, programNames: string[]): void {
    this.setSessionPrograms(departmentName, programNames, '2023');
  }

  public static resetSession2023Roster(): void {
    localStorage.removeItem('mnsuet_session_active_roster_v99__2023');
  }

  public static getStore(): Record<string, SubmissionRecord> {
    try {
      const stored = localStorage.getItem('mnsuet_lms_result_records_v99');
      if (stored) return JSON.parse(stored);
    } catch(e) {}
    return {};
  }

  private static setStore(data: Record<string, SubmissionRecord>): void {
    localStorage.setItem('mnsuet_lms_result_records_v99', JSON.stringify(data));
  }

  public static getActiveUser(): ActiveUserSession {
    try {
      const stored = localStorage.getItem('mnsuet_lms_active_user_v99');
      if (stored) return JSON.parse(stored);
    } catch(e) {}
    return {} as ActiveUserSession;
  }

  public static setActiveUser(user: ActiveUserSession): void {
    localStorage.setItem('mnsuet_lms_active_user_v99', JSON.stringify(user));
  }

  public static getAccessLogs(): AccessLogEntry[] {
    try {
      const stored = localStorage.getItem('mnsuet_lms_access_logs_v99');
      if (stored) return JSON.parse(stored);
    } catch(e) {}
    return [];
  }

  public static logAccess(action: string, department?: string, program?: string): void {
    try {
      const logs = this.getAccessLogs();
      const user = this.getActiveUser();
      const entry: AccessLogEntry = {
        id: Date.now().toString(),
        userName: user?.name || 'System',
        designation: user?.designation || 'System',
        department: department || user?.department || 'System',
        action,
        program,
        timestamp: new Date().toISOString()
      };
      const updated = [entry, ...logs].slice(0, 100);
      localStorage.setItem('mnsuet_lms_access_logs_v99', JSON.stringify(updated));
    } catch(e) {}
  }

  public static getSubmission(
    department: string,
    program: string,
    degreeLevel: string,
    shift: string,
    session: string,
    semester: string,
    section: string
  ): SubmissionRecord | null {
    const key = department + program + degreeLevel + shift + session + semester + section; // approximation
    const store = this.getStore();
    return Object.values(store).find(r => 
      r.department === department && 
      r.program === program && 
      r.degreeLevel === degreeLevel && 
      r.shift === shift && 
      r.session === session && 
      r.semester === semester && 
      (r.section === section || (!r.section && section === 'A'))
    ) || null;
  }
`;

let code = fs.readFileSync('src/services/storageService.ts', 'utf8');

// Insert after initFirebaseSync
code = code.replace(
  /(\}, 2000\);\n  \})/,
  "$1\n\n" + methods
);

fs.writeFileSync('src/services/storageService.ts', code);
