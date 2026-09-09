# MNS-UET LMS Result Upload Status Monitoring System

> **Muhammad Nawaz Sharif University of Engineering & Technology, Multan**  
> Official University Portal: [https://mnsuet.edu.pk/](https://mnsuet.edu.pk/)

An institutional-grade web application designed for academic leadership, Heads of Departments (HODs), and Program Coordinators to monitor, log, and audit **Session 2023 – Semester 1** LMS result uploads across all academic faculties and degree programs.

---

## 📌 Project Overview

At MNS-UET Multan, monitoring the timely upload of semester results to the Learning Management System (LMS) is vital for institutional governance and accreditation. This system provides:

1. **HOD / Program Coordinator Entry Portal**: An intuitive, structured sheet allowing coordinators to select their department and program, auto-fill degree levels, and log subject-by-subject LMS result statuses.
2. **Vice Chancellor & Deans Executive Dashboard**: A centralized administrative command center computing real-time university-wide submission progress, faculty breakdowns, and LMS completion rates based strictly on active cohorts.
3. **Session 2023 Genuine Cohort Accuracy**: Protects university metrics from being skewed by un-offered or future programs by tracking only verified active 2023 cohorts (e.g., Computer Science tracking its active BS CS and B.Tech Software programs).
4. **Transparent User Traceability**: Lightweight audit logging that tracks who accessed, created, or updated result records without requiring complex login credentials or passwords.
5. **Zero Dummy Data**: Initializes with a clean database ready for official university data entry.

---

## ✨ Key Features

### 1. HOD / Program Coordinator Entry
- **Official University Departments**: Pre-configured with official academic departments and schools from [mnsuet.edu.pk](https://mnsuet.edu.pk/).
- **Dynamic Program Mapping & Degree Level Auto-Fill**: Selecting a program automatically populates its degree level (`BS`, `B.Tech`, `MS`, `PhD`).
  - *Example*: Selecting `B.Sc. Software Engineering Technology (B.Tech)` automatically assigns `B.Tech`.
- **Dynamic Subject Addition (`+ Add Subject`)**:
  - Starts with clean, active course rows rather than fixed empty boxes.
  - Clicking **"+ Add Subject / Course"** appends a new row and dynamically updates course totals and calculation percentages.
  - Supports quick clearing or individual row deletion.
- **Official LMS Statuses**:
  - `Uploaded` (Green)
  - `Pending` (Amber)
  - `In Progress` (Blue)
  - `Not Applicable` (Slate)
- **Live Executive Summary**: Instant calculation of total subjects, uploaded count, pending count, in-progress count, not applicable count, and net upload percentage.

### 2. Session 2023 Cohort Configuration
- **Accurate Cohort Filtering**: Toggle between viewing only active Session 2023 programs or all department offerings.
- **Roster Customization Modal**: HODs and administrators can click **"Select 2023 Programs"** to customize which degrees enrolled students for Session 2023.
- **Accurate Vice Chancellor Metrics**: When all active programs in a department submit their results, the department achieves a true 100% completion rate.

### 3. Vice Chancellor & Deans Executive Dashboard
- **Key Performance Indicators (KPIs)**:
  - Total Monitored Programs (Session 2023)
  - Submitted vs. Pending Departmental Sheets
  - Overall LMS Result Upload %
  - Aggregate Subject-Level Statistics
- **Departmental Comparison**: Tabular breakdown of each program's status with quick-action **"Inspect Sheet"** to review course-level details.
- **Search & Filters**: Instant search by department name or program, filterable by submission status.

### 4. Traceability & Reporting
- **Traceable User Identity**: HODs identify their name, designation, and department via a simple badge. All saved submissions record the coordinator's identity and timestamp.
- **Access Audit Trail**: View access and modification history across the institution.
- **Print & Export**:
  - Printable institutional report formatted for official submission to the Academic Council and Vice Chancellor Secretariat.
  - Export full university data to CSV for spreadsheet analysis.

---

## 🏛️ Supported Academic Departments & Programs

MNS-UET academic departments structured according to official university nomenclature:

- **Department of Computer Science**
  - BS Computer Science *(Session 2023 Active)*
  - B.Sc. Software Engineering Technology (B.Tech) *(Session 2023 Active)*
  - BS Software Engineering
  - BS Artificial Intelligence
  - BS Cyber Security
  - BS Data Science
  - BS Information Technology
  - BS Internet of Things (IoT)
  - MS Computer Science
  - PhD Computer Science
- **Department of Electrical Engineering & Technology**
  - B.Sc. Electrical Engineering
  - B.Sc. Electrical Engineering Technology
  - M.Sc. Electrical Engineering
  - PhD Electrical Engineering
- **Department of Mechanical Engineering & Technology**
  - B.Sc. Mechanical Engineering
  - B.Sc. Mechanical Engineering Technology
  - M.Sc. Mechanical Engineering
- **Department of Civil Engineering & Technology**
  - B.Sc. Civil Engineering
  - B.Sc. Civil Engineering Technology
  - M.Sc. Civil Engineering
- **Department of Chemical Engineering & Technology**
  - B.Sc. Chemical Engineering
  - B.Sc. Chemical Engineering Technology
- **Department of Basic Sciences and Humanities**
  - BS Mathematics
  - BS Physics
  - BS Chemistry
  - M.Sc. Mathematics
  - M.Phil. Physics
  - M.Phil. Chemistry
- **Department of Management Sciences**
  - BBA (Bachelor of Business Administration)
  - BS Technology Management
  - MBA (Executive)

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18.0.0 or higher recommended)
- npm or bun

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-username/mnsuet-lms-result-status.git
   cd mnsuet-lms-result-status
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the development server**:
   ```bash
   npm run dev
   ```
   The application will be accessible at `http://localhost:3000`.

4. **Build for production**:
   ```bash
   npm run build
   ```
   Outputs static assets to the `dist/` directory.

---

## 🛠️ Technology Stack

- **Framework**: [React 19](https://react.dev/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Build Tool**: [Vite 6](https://vitejs.dev/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **State & Storage**: Client-side resilient LocalStorage service with structured schemas and access logging

---

## 📋 Recommended Workflow for HODs

1. **Set User Identity**: Click the user badge in the header to confirm your Name, Designation (e.g. HOD / Coordinator), and Department.
2. **Select Department & Program**: Choose your department from the dropdown. The program list will display active Session 2023 cohorts.
3. **Review 2023 Roster**: If your department ran additional or fewer programs in 2023, click **"Select 2023 Programs"** to adjust.
4. **Enter Course Details**: Enter the course code, subject title, credit hours, section/shift, LMS status, and uploaded by faculty.
5. **Save to Database**: Click **"Save to Database"** to commit the record.
6. **Print or Export**: Use **"Print Sheet"** to generate an official document or **"Export to CSV"** for digital archiving.

---

## 📄 License

Developed for academic monitoring at **Muhammad Nawaz Sharif University of Engineering & Technology, Multan**. All rights reserved.
