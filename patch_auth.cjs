const fs = require('fs');
let content = fs.readFileSync('src/services/authService.ts', 'utf8');

const regex = /public static async login\([\s\S]*?remainingSeconds\?: number \}> \{[\s\S]*?return \{ success: true, message: 'Authentication successful\.', session \};\n  \}/;

const replacement = `public static async login(
    usernameInput: string,
    passwordInput: string
  ): Promise<{ success: boolean; message: string; session?: ActiveUserSession; isLocked?: boolean; remainingSeconds?: number }> {
    const cleanUser = usernameInput.trim().toLowerCase();
    const cleanPass = passwordInput.trim();

    if (!cleanUser || !cleanPass) {
      return { success: false, message: 'Please enter both username and password.' };
    }

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: cleanUser, password: cleanPass })
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        if (data.lockoutUntil) {
          const remaining = Math.ceil((new Date(data.lockoutUntil).getTime() - Date.now()) / 1000);
          return {
            success: false,
            message: \`Account is temporarily locked due to repeated failed login attempts. Please wait \${remaining} seconds before trying again.\`,
            isLocked: true,
            remainingSeconds: remaining > 0 ? remaining : 0,
          };
        }
        return { success: false, message: data.error || 'Invalid credentials' };
      }
      
      const session: ActiveUserSession = {
        id: data.id,
        username: data.username,
        name: data.name,
        designation: data.designation,
        department: data.department,
        role: data.role,
        program: data.program,
        assignedPrograms: data.assignedPrograms,
        themePreference: data.themePreference
      };
      
      this.saveSession(session);
      
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('mnsuet_auth_changed', { detail: { session } }));
      }
      
      return { success: true, message: 'Authentication successful.', session };
    } catch (e) {
      console.error(e);
      return { success: false, message: 'Internal server error during login.' };
    }
  }`;

content = content.replace(regex, replacement);
fs.writeFileSync('src/services/authService.ts', content);
