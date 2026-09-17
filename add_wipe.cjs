const fs = require('fs');
let code = fs.readFileSync('src/services/storageService.ts', 'utf8');

const newMethod = `
  public static async wipeAllSubmissions(): Promise<boolean> {
    try {
      const records = this.getSubmissions();
      for (const record of records) {
        if (record.id) {
          await FirebaseStore.deleteSubmission(record.id).catch(console.error);
        }
      }
      localStorage.setItem('mnsuet_submission_records_v99', JSON.stringify([]));
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('mnsuet_storage_updated'));
      }
      return true;
    } catch (e) {
      console.error('Failed to wipe submissions', e);
      return false;
    }
  }
`;

code = code.replace(/public static async deleteSubmission\(/, newMethod + '\n  public static async deleteSubmission(');
fs.writeFileSync('src/services/storageService.ts', code);
