import { StorageService } from './storageService';

export interface InstitutionalDirective {
  id: string;
  senderRole: 'VC' | 'HOD' | 'ADMIN' | 'EXAM_CELL';
  senderName: string;
  senderEmail?: string;

  targetDepartment: string; // e.g. "Department of Computer Science" or "ALL"
  targetProgram?: string; // e.g. "BS Computer Science"
  targetRole: 'HOD' | 'COORDINATOR' | 'ALL';
  targetCoordinatorEmail?: string;

  title: string;
  message: string;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  deadline: string; // e.g. "Tomorrow 5:00 PM"

  status: 'OPEN' | 'FORWARDED' | 'IN_PROGRESS' | 'RESOLVED';

  createdAt: string;
  updatedAt: string;

  // Track chain of command
  forwardedByHOD?: {
    hodName: string;
    hodEmail?: string;
    forwardedAt: string;
    coordinatorName: string;
    coordinatorEmail?: string;
    noteToCoordinator: string;
  };

  resolutionDetails?: {
    resolvedBy: string;
    resolvedAt: string;
    completionNote: string;
  };
}

const STORAGE_KEY = 'mnsuet_institutional_directives_v1';

export class DirectiveService {
  /**
   * Get all directives
   */
  public static getDirectives(): InstitutionalDirective[] {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Failed to load directives from localStorage', e);
    }

    // Default sample directives matching institutional workflow
    const initialDirectives: InstitutionalDirective[] = [
      {
        id: 'dir-101',
        senderRole: 'VC',
        senderName: 'Prof. Dr. Vice Chancellor',
        targetDepartment: 'Department of Mechanical Engineering & Technology',
        targetProgram: 'B.Sc. Mechanical Engineering',
        targetRole: 'HOD',
        title: 'Accelerate Semester 6 LMS Result Uploads',
        message: 'Kindly expedite the pending LMS result uploads for Semester 6. Examination committee requires submission verification by 5:00 PM today.',
        priority: 'CRITICAL',
        deadline: 'Today 5:00 PM',
        status: 'OPEN',
        createdAt: new Date(Date.now() - 3600000 * 3).toISOString(),
        updatedAt: new Date(Date.now() - 3600000 * 3).toISOString(),
      },
      {
        id: 'dir-102',
        senderRole: 'VC',
        senderName: 'Exam Cell Controller',
        targetDepartment: 'Department of Chemical Engineering & Technology',
        targetProgram: 'B.Sc. Chemical Engineering',
        targetRole: 'HOD',
        title: 'Resolve Missing Practical Marks in CHE-302',
        message: '3 course result sheets are currently pending. Please contact program coordinator and ensure immediate tabulation.',
        priority: 'HIGH',
        deadline: 'Tomorrow 12:00 PM',
        status: 'FORWARDED',
        createdAt: new Date(Date.now() - 3600000 * 18).toISOString(),
        updatedAt: new Date(Date.now() - 3600000 * 12).toISOString(),
        forwardedByHOD: {
          hodName: 'Dr. Chemical HOD',
          forwardedAt: new Date(Date.now() - 3600000 * 12).toISOString(),
          coordinatorName: 'Chemical Program Coordinator',
          noteToCoordinator: 'Engr. Sahib, please review CHE-302 practical grades and finalize LMS upload as requested by VC Office.'
        }
      }
    ];

    DirectiveService.saveDirectives(initialDirectives);
    return initialDirectives;
  }

  /**
   * Save all directives
   */
  public static saveDirectives(directives: InstitutionalDirective[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(directives));
      window.dispatchEvent(new Event('mnsuet_directives_updated'));
    } catch (e) {
      console.error('Failed to save directives', e);
    }
  }

  /**
   * Create a new directive from VC / Exam Cell
   */
  public static createDirective(data: Omit<InstitutionalDirective, 'id' | 'createdAt' | 'updatedAt' | 'status'>): InstitutionalDirective {
    const list = DirectiveService.getDirectives();
    const newDirective: InstitutionalDirective = {
      ...data,
      id: `dir-${Date.now()}`,
      status: 'OPEN',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    list.unshift(newDirective);
    DirectiveService.saveDirectives(list);

    // Also record in audit trail
    StorageService.logAccess(`Directive issued to ${data.targetDepartment}: ${data.title}`, data.targetDepartment);

    return newDirective;
  }

  /**
   * Forward a directive from HOD to Coordinator
   */
  public static forwardDirectiveToCoordinator(
    directiveId: string,
    hodName: string,
    hodEmail: string | undefined,
    coordinatorName: string,
    coordinatorEmail: string | undefined,
    noteToCoordinator: string
  ): boolean {
    const list = DirectiveService.getDirectives();
    const index = list.findIndex(d => d.id === directiveId);
    if (index === -1) return false;

    list[index] = {
      ...list[index],
      status: 'FORWARDED',
      targetRole: 'COORDINATOR',
      targetCoordinatorEmail: coordinatorEmail,
      updatedAt: new Date().toISOString(),
      forwardedByHOD: {
        hodName,
        hodEmail,
        forwardedAt: new Date().toISOString(),
        coordinatorName,
        coordinatorEmail,
        noteToCoordinator
      }
    };

    DirectiveService.saveDirectives(list);

    // Activity log
    StorageService.logAccess(`HOD (${hodName}) forwarded directive to Coordinator (${coordinatorName})`, list[index].targetDepartment);

    return true;
  }

  /**
   * Mark a directive as resolved by Coordinator or HOD
   */
  public static resolveDirective(
    directiveId: string,
    resolvedBy: string,
    completionNote: string
  ): boolean {
    const list = DirectiveService.getDirectives();
    const index = list.findIndex(d => d.id === directiveId);
    if (index === -1) return false;

    list[index] = {
      ...list[index],
      status: 'RESOLVED',
      updatedAt: new Date().toISOString(),
      resolutionDetails: {
        resolvedBy,
        resolvedAt: new Date().toISOString(),
        completionNote
      }
    };

    DirectiveService.saveDirectives(list);

    // Activity log
    StorageService.logAccess(`Directive resolved by ${resolvedBy}: ${list[index].title}`, list[index].targetDepartment);

    return true;
  }

  /**
   * Filter directives for HOD
   */
  public static getDirectivesForDepartment(departmentName: string): InstitutionalDirective[] {
    const list = DirectiveService.getDirectives();
    return list.filter(d => 
      d.targetDepartment === 'ALL' || 
      d.targetDepartment.toLowerCase().trim() === departmentName.toLowerCase().trim() ||
      departmentName.toLowerCase().includes(d.targetDepartment.toLowerCase().replace('department of', '').trim())
    );
  }

  /**
   * Filter directives for Coordinator
   */
  public static getDirectivesForCoordinator(
    departmentName: string,
    programName?: string,
    userEmail?: string
  ): InstitutionalDirective[] {
    const deptDirectives = DirectiveService.getDirectivesForDepartment(departmentName);
    return deptDirectives.filter(d => {
      // Must be forwarded to coordinator or targeted at all
      if (d.targetRole === 'ALL' || d.targetRole === 'COORDINATOR' || d.status === 'FORWARDED') {
        if (!programName || !d.targetProgram) return true;
        return d.targetProgram.toLowerCase().trim() === programName.toLowerCase().trim();
      }
      return false;
    });
  }
}
