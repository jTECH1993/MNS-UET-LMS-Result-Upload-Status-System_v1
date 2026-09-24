import React from 'react';
import { SubjectRow, AcademicShift } from '../types';
import { BulkCSVImportModal } from './BulkCSVImportModal';

export interface Props {
  isOpen: boolean;
  onClose: () => void;
  onImportCourses: (
    courses: Partial<SubjectRow>[],
    mode: 'replace' | 'append',
    targetSection?: string
  ) => void;
  onImportDirectToSections?: (
    sectionData: Record<string, Partial<SubjectRow>[]>,
    mode: 'replace' | 'append'
  ) => void;
  currentCount: number;
  currentShift: AcademicShift;
  currentSemester: string;
  currentSection?: string;
  currentSession?: string;
  departmentName: string;
  programName: string;
  availableSections?: string[];
  onCommitSuccess?: () => void;
}

export const BulkCourseImportModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onImportCourses,
  onImportDirectToSections,
  currentCount,
  currentShift,
  currentSemester,
  currentSection = 'A',
  currentSession = '2023',
  departmentName,
  programName,
  availableSections = ['A', 'B'],
  onCommitSuccess,
}) => {
  return (
    <BulkCSVImportModal
      isOpen={isOpen}
      onClose={onClose}
      departmentName={departmentName}
      programName={programName}
      currentShift={currentShift}
      currentSemester={currentSemester}
      currentSection={currentSection}
      currentSession={currentSession}
      availableSections={availableSections}
      currentCount={currentCount}
      onImportCourses={onImportCourses}
      onImportDirectToSections={onImportDirectToSections}
      onCommitSuccess={() => {
        if (onCommitSuccess) onCommitSuccess();
      }}
    />
  );
};

export default BulkCourseImportModal;
