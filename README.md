# MNS-UET Central Academic Monitoring Portal & LMS Result Management System

> **Muhammad Nawaz Sharif University of Engineering & Technology, Multan**  
> Official University Portal: [https://mnsuet.edu.pk/](https://mnsuet.edu.pk/)

An institutional-grade, enterprise web application built for the **Vice Chancellor, Deans, Heads of Departments (HODs), and Academic Program Coordinators** of Muhammad Nawaz Sharif University of Engineering & Technology (MNS-UET), Multan. The system provides real-time logging, departmental auditing, section-wise performance telemetry, and executive compliance monitoring for LMS semester result submissions across all university faculties.

---

## 📑 Table of Contents

- [Institutional Overview](#-institutional-overview)
- [Enterprise Architecture & Database](#-enterprise-architecture--database)
- [System Core Modules](#-system-core-modules)
  - [1. Server-Side Authentication & Security](#1-server-side-authentication--security)
  - [2. Vice Chancellor & Deans Executive Dashboard](#2-vice-chancellor--deans-executive-dashboard)
  - [3. Multi-Program Coordinator Architecture](#3-multi-program-coordinator-architecture)
  - [4. Visual Themes & Customization](#4-visual-themes--customization)
- [Database Schema & Entity Relationships](#-database-schema--entity-relationships)
- [Mathematical Formulation of Metrics & Percentage Means](#-mathematical-formulation-of-metrics--percentage-means)
- [Technology Stack](#-technology-stack)
- [Installation & Local Setup](#-installation--local-setup)

---

## 🏛️ Institutional Overview

Timely declaration and upload of academic semester results onto the Learning Management System (LMS) is a foundational pillar of Higher Education Commission (HEC) compliance, accreditation board criteria (PEC, NCEAC, NBEAC), and academic governance at MNS-UET Multan.

The **MNS-UET Central Academic Monitoring Portal** eliminates administrative bottlenecks, paper memos, and unverified estimates by introducing:

- **Verified Cohort Tracking**: Monitors genuine enrolled cohorts (e.g. Session 2023, 2024).
- **Cross-Department Coordination**: Enables senior faculty managing interdisciplinary programs to seamlessly log records across faculties.
- **Enterprise-Grade Single Source of Truth**: Data is centrally stored on an SQL database, eliminating browser storage discrepancies.

---

## 🏢 Enterprise Architecture & Database

The application has been transformed from an MVP into a production-ready enterprise application featuring:

- **Full-Stack Node.js/Express Backend**: Replaced insecure frontend storage with a resilient REST API server.
- **Relational SQL Database (SQLite/libSQL)**: Engineered using **Drizzle ORM** for deterministic and type-safe database transactions.
- **Real-Time Concurrent Sync**: Implemented background polling (`apiSyncSubmissions`) to ensure VC dashboards update dynamically even when multiple coordinators are submitting results simultaneously.
- **Transactional Safety**: All LMS submissions and subject lists are recorded using isolated database transactions, eliminating orphaned data and race conditions.

---

## 🧩 System Core Modules

### 1. Server-Side Authentication & Security

- **Anti-Brute Force Lockouts**: Database-enforced 6-attempt lockout policy resulting in a mandatory 3-minute freeze.
- **Server-Authoritative Validation**: Security logic is enforced on the Node.js backend (`/api/auth/login`), preventing frontend manipulation.
- **Role-Based Access Control (RBAC)**: Secure access tiering for `ADMIN`, `VC`, `HOD`, `COORDINATOR`, and `LECTURER`.

### 2. Vice Chancellor & Deans Executive Dashboard

A comprehensive command center delivering immediate operational clarity:
- **Institutional Key Metrics**: Total Active Programs, Uploaded vs. Pending Cohorts, and University Upload Percentage Mean.
- **Live Sync Polling**: VC dashboard automatically fetches changes globally to remain perfectly accurate.
- **Section Parity Analytics**: Detects syllabus or result disparities between Section A and Section B within the same degree program.

### 3. Multi-Program Coordinator Architecture

Faculty members at MNS-UET frequently serve as Academic Program Coordinators across more than one degree level or academic discipline.
- Select primary operating programs and append cross-departmental programs natively from the Profile menu.

### 4. Visual Themes & Customization

The system features robust multi-theme support to adapt to various environmental conditions and user preferences:
- **Institutional Emerald (Day Mode)**: Official university green & slate daylight canvas.
- **Executive Midnight (Night Mode)**: Deep slate and emerald, tailored for low-light environments.
- **Oxford Academic Navy**: Prestigious collegiate royal navy preferred by Deans & Council.
- **Sunset Scholar (Warm)**: Warm stone & amber tones to reduce eye fatigue during extended use.
- **Auditor High-Contrast**: Ultra-crisp monochrome for projector presentations & audit clarity.

---

## 🗄️ Database Schema & Entity Relationships

The system utilizes a structured relational database with 9 core tables:

1. **`users` Table**: Master account credentials, encrypted tracking, themes, active sessions, and lockouts (`failed_login_attempts`, `is_locked`, `lockout_until`).
2. **`programs` Table**: Master list of university degrees, levels, and department associations.
3. **`sessions` Table**: Tracks active and inactive academic cohorts (e.g., "2023", "2024").
4. **`submissions` Table**: The primary transaction record for a specific cohort (identified by department, program, degree, shift, section, session, and semester). Includes transaction metadata (`hod_coordinator`, `updated_at`).
5. **`subjects` Table**: Associated 1:N with `submissions`. Holds the actual course metadata (`course_code`, `subject_title`, `status`).
6. **`documents` Table**: Stores institutional documentation and compliance notes.
7. **`document_programs` Table**: Junction table (N:M) securely associating documents with multiple programs.
8. **`access_logs` Table**: Immutable audit trail for system-wide read/write actions.
9. **`work_on_demand` Table**: Request ticketing system for IT and software infrastructure upgrades.

---

## 🧮 Mathematical Formulation of Metrics & Percentage Means

The application uses deterministic mathematics to summarize university compliance accurately:

### Course / Subject Level Calculation
- **Status Classification**: Each subject is strictly marked as `Uploaded`, `Pending`, `In Progress`, or `Not Applicable`.
- **Subject Base Score**: `BaseScore = (Total Subjects - Not Applicable)`. If `BaseScore` is 0, the form yields `0%` (or `N/A`).
- **Section Percentage**: `(Uploaded / BaseScore) * 100`.

### Departmental & University-Wide Completion Rates
- **Global Roll-Up**: The VC dashboard iterates through every combination of `Department -> Program -> Shift -> Section -> Semester`.
- **Global Base Calculation**: 
  - `Global Uploaded = SUM(All Uploaded Subjects across university)`
  - `Global Target = SUM(All Uploaded + Pending + In Progress)`
- **University Mean**: `(Global Uploaded / Global Target) * 100`.

### Section Parity Index Calculation
Calculates identical progression across shifts/sections (e.g. Morning Section A vs. Evening Section B).
- **Progress Variance**: `| % Section A - % Section B |`
- **Parity Status**: Highlighted in `Green` if `< 5%` variance, `Yellow` for `5-15%`, and `Red` (Disparity Warning) for `> 15%`.

---

## 💻 Technology Stack

**Frontend Framework & UI**
- **React 19** with **Vite** (Typescript).
- **Tailwind CSS v4** (Utility-first styling, sophisticated day/night color schemes).
- **Lucide React** (Consistent institutional iconography).
- **Recharts** (Performance telemtry & analytics).

**Enterprise Backend & Database**
- **Node.js & Express**: API framework handling REST requests.
- **Drizzle ORM**: Next-generation TypeScript ORM.
- **SQLite / libSQL**: Lightning-fast localized transactional database.
- **esbuild**: Server bundling and compilation.

---

## 🚀 Installation & Local Setup

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Database Initialization & Seeding**:
   ```bash
   npx drizzle-kit push
   # The seed script is automatically invoked on development startup.
   ```

3. **Start Full-Stack Environment**:
   ```bash
   npm run dev
   # Bootstraps SQLite, seeds the DB, mounts API middleware, and starts Vite.
   ```

4. **Production Build**:
   ```bash
   npm run build
   # Compiles React into /dist and bundles Express backend into /dist/server.cjs.
   npm run start
   ```
   - Side-by-side grouped bars comparing Section A vs Section B across Verified Uploaded, In Progress, Pending Delay, and Total Courses.
3. **Departmental Section Disparity Matrix**:
   - Visualizes Section A % versus Section B % for every academic department (CS, EE, ME, CE, ChE, BSH, MS).
   - Automatically highlights departments with critical disparity ($\ge 20\%$).
4. **Semester Trajectory by Section (Semesters 1 through 8)**:
   - Dual-trend line chart showing progression curves for Section A vs Section B across all academic terms.
5. **Actionable Section Disparity Alert Feed**:
   - Automatically flags specific program cohorts where Section A is completed but Section B is delayed (or vice-versa), providing one-click inspection buttons.

---

### 5. HOD & Program Coordinator Entry Sheet

- **Department & Program Selection**: Pre-populated with official academic faculties from [mnsuet.edu.pk](https://mnsuet.edu.pk/).
- **Degree Level Auto-Fill**: Selecting a program automatically infers the appropriate degree level (`BS`, `B.Tech`, `MS`, `PhD`).
- **Dynamic Course Rows**: Add or remove course entries with course code, title, credit hours, section/shift, teacher name, LMS status, and bottleneck remarks.
- **Official LMS Statuses**:
  - `Uploaded` (Emerald): Fully graded and committed to LMS.
  - `In Progress` (Blue): Exam papers marked, awaiting final LMS entry.
  - `Pending` (Amber): Awaiting submission from instructor.
  - `Not Applicable` (Slate): Course not offered in current term (excluded from percentage calculations).
- **Executive Summary Card**: Instant calculation of course statistics, active workload, and net completion percentage before database commit.

---

### 6. Executive Compliance Notices & Formal Reporting

- **Formal Institutional Report**: Generates an Academic Council and Vice Chancellor Secretariat-compliant audit report.
- **Formal Compliance Notices**: Automatically drafts formal letters with official reference numbers, deadlines, and specific program lists addressed to HODs whose departments fall below university standards.
- **Print & Export Engine**: Built-in CSS print styling for clean official letterheads, as well as CSV export for external spreadsheet analysis.

---

## 📐 Mathematical Formulation of Metrics & Percentage Means

A transparent mathematical specification of how calculations, averages, and means are derived across sections, semesters, and sessions:

### Course / Subject Level Calculation

For any given submission record $R$, let the set of subjects be $S = \{s_1, s_2, \dots, s_n\}$. Each subject has a status $T(s) \in \{\text{Uploaded}, \text{In Progress}, \text{Pending}, \text{Not Applicable}\}$.

1. **Active Workload (Total Subjects)**:
   $$\text{Total Active} = \sum_{s \in S} \mathbb{I}(T(s) \neq \text{'Not Applicable'})$$

2. **Uploaded Subjects Count**:
   $$U = \sum_{s \in S} \mathbb{I}(T(s) = \text{'Uploaded'})$$

3. **Pending Subjects Count**:
   $$P = \sum_{s \in S} \mathbb{I}(T(s) = \text{'Pending'})$$

4. **In Progress Subjects Count**:
   $$IP = \sum_{s \in S} \mathbb{I}(T(s) = \text{'In Progress'})$$

5. **Program Sheet Completion Rate ($C_R$)**:
   $$C_R = \begin{cases} \text{round}\left(\frac{U}{\text{Total Active}} \times 100\right), & \text{if Total Active} > 0 \\ 0, & \text{otherwise} \end{cases}$$

---

### Section-Wise Filtering & Cohort Aggregation

When evaluating cohorts by section:

- **Single Section Selected (e.g. Section A)**:
  - Only records where $r.\text{section} = \text{'A'}$ are selected.
  - Un-submitted sections do not penalize or inflate Section A metrics.
- **All Sections Selected ('ALL')**:
  - The system aggregates the distinct courses of all active sections ($\text{Section A} + \text{Section B} + \dots$) for each program cohort without double-counting:
    $$U_{\text{cohort}} = U_{\text{Sec A}} + U_{\text{Sec B}}$$
    $$\text{Total Active}_{\text{cohort}} = \text{Total Active}_{\text{Sec A}} + \text{Total Active}_{\text{Sec B}}$$
    $$C_{\text{cohort}} = \text{round}\left(\frac{U_{\text{cohort}}}{\text{Total Active}_{\text{cohort}}} \times 100\right)$$

---

### Session Aggregation (Single Active Session vs. Multi-Session Mode)

Let $\mathcal{A}_{\text{sessions}}$ be the set of active academic sessions.

1. **If Single Session is Active (e.g., $\mathcal{A}_{\text{sessions}} = \{\text{"2023"}\}$)**:
   - The database filter enforces:
     $$\text{Record } r \text{ is included} \iff r.\text{session} = \text{"2023"}$$
   - Any records from Session 2022 or 2024 are strictly excluded from all charts, departmental averages, and university completion rates.
   - Active degree rosters are matched solely against Session 2023 offerings.

2. **If Multiple Sessions are Active (e.g., $\mathcal{A}_{\text{sessions}} = \{\text{"2022"}, \text{"2023"}, \text{"2024"}\}$)**:
   - The database filter enforces:
     $$\text{Record } r \text{ is included} \iff r.\text{session} \in \mathcal{A}_{\text{sessions}}$$
   - Active degree rosters merge programs active across any of the activated sessions:
     $$\text{Active Programs}(D) = \bigcup_{s \in \mathcal{A}_{\text{sessions}}} \text{SessionPrograms}(D, s)$$
   - The metrics sum across all matching records in the active session window.

---

### Departmental & University-Wide Completion Rates

1. **Departmental Result Upload Percentage Mean ($C_{\text{dept}}$)**:
   For a department $D$ with matching records $\mathcal{R}_D$ within the active session and filter criteria:
   $$U_D = \sum_{r \in \mathcal{R}_D} U(r), \quad \text{Total}_D = \sum_{r \in \mathcal{R}_D} \text{Total Active}(r)$$
   $$C_{\text{dept}} = \begin{cases} \text{round}\left(\frac{U_D}{\text{Total}_D} \times 100\right), & \text{if } \text{Total}_D > 0 \\ 0, & \text{otherwise} \end{cases}$$

2. **University-Wide Result Upload Percentage Mean ($C_{\text{uni}}$)**:
   Aggregated across all university faculties $\mathcal{D}_{\text{all}}$:
   $$C_{\text{uni}} = \begin{cases} \text{round}\left(\frac{\sum_{D \in \mathcal{D}_{\text{all}}} U_D}{\sum_{D \in \mathcal{D}_{\text{all}}} \text{Total}_D} \times 100\right), & \text{if } \sum \text{Total}_D > 0 \\ 0, & \text{otherwise} \end{cases}$$

---

### Section Parity Index Calculation

To quantify parity between Section A and Section B:

1. Let $R_A$ be the completion rate of Section A, and $R_B$ be the completion rate of Section B.
2. The **Disparity Gap** is:
   $$\Delta_{\text{section}} = |R_A - R_B|$$
3. The **Section Parity Index** is:
   $$\text{Parity Index} = \max(0, 100 - \Delta_{\text{section}})$$
   - $\text{Parity Index} = 100 \implies$ Absolute parity between sections.
   - $\Delta_{\text{section}} \le 10\% \implies$ Balanced cohort progression.
   - $\Delta_{\text{section}} > 15\% \implies$ Disparity warning triggered in VC alert feed.

---

## 🏛️ Academic Faculties & Programs Supported

The portal includes the full academic structure of MNS-UET Multan:

### 1. Faculty of Computing & Information Technology
- **Department of Computer Science**
  - BS Computer Science
  - B.Sc. Software Engineering Technology (B.Tech)
  - BS Software Engineering
  - BS Artificial Intelligence
  - BS Cyber Security
  - BS Data Science
  - BS Information Technology
  - BS Internet of Things (IoT)
  - MS Computer Science
  - PhD Computer Science

### 2. Faculty of Electrical & Electronics Engineering
- **Department of Electrical Engineering & Technology**
  - B.Sc. Electrical Engineering
  - B.Sc. Electrical Engineering Technology
  - M.Sc. Electrical Engineering
  - PhD Electrical Engineering

### 3. Faculty of Mechanical & Industrial Engineering
- **Department of Mechanical Engineering & Technology**
  - B.Sc. Mechanical Engineering
  - B.Sc. Mechanical Engineering Technology
  - M.Sc. Mechanical Engineering

### 4. Faculty of Civil & Environmental Engineering
- **Department of Civil Engineering & Technology**
  - B.Sc. Civil Engineering
  - B.Sc. Civil Engineering Technology
  - M.Sc. Civil Engineering

### 5. Faculty of Chemical & Materials Engineering
- **Department of Chemical Engineering & Technology**
  - B.Sc. Chemical Engineering
  - B.Sc. Chemical Engineering Technology

### 6. Faculty of Sciences & Humanities
- **Department of Basic Sciences and Humanities**
  - BS Mathematics
  - BS Physics
  - BS Chemistry
  - M.Sc. Mathematics
  - M.Phil. Physics
  - M.Phil. Chemistry

### 7. School of Business & Management Sciences
- **Department of Management Sciences**
  - BBA (Bachelor of Business Administration)
  - BS Technology Management
  - MBA (Executive)

---

## 🔒 Role-Based Access Control (RBAC) & Audit Trails

The system supports four distinct operational tiers:

| Role | Access Level & Capabilities |
| :--- | :--- |
| **Vice Chancellor / Dean** | Full university oversight, executive compliance notice drafting, departmental parity analysis, institutional report printing. |
| **Head of Department (HOD)** | Departmental overview, session program roster customization, submission verification, departmental audit logs. |
| **Program Coordinator** | Multi-program result logging, section-by-section course entries, credit hour assignment, bottleneck remarks recording. |
| **Quality Audit / Registrar** | Read-only compliance inspection, verification timestamps, and CSV exports for external reporting. |

### Audit Logging Engine
Every database mutation (save, update, delete, session modification) automatically records:
- Operating user's Name and Designation
- Academic department and target degree program
- Shift (`Morning` / `Evening`), Session (`2022`, `2023`, `2024`), and Semester (`1` – `8`)
- Section designation (`A`, `B`, `C`, etc.)
- ISO timestamp and change description

---

## 🛠️ Technology Stack

- **Frontend Core**: React 19, TypeScript 5.5+
- **Application Bundler**: Vite 6
- **Styling Architecture**: Tailwind CSS v4 with full dark mode and CSS print stylesheets
- **Data Visualization & Charts**: Recharts (Responsive Bar, Grouped Bar, Line, Pie, and Area charts)
- **Icons**: Lucide React
- **Data Persistence**: Resilient local storage service with schema migrations, multi-session keys, and session synchronization events
- **Document Generation**: Native browser print engine with official MNS-UET typography and layout standards

---

## 🚀 Installation & Local Setup

### Prerequisites
- [Node.js](https://nodejs.org/) v18.0.0 or higher
- `npm` or `pnpm`

### Step-by-Step Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-org/mnsuet-lms-monitoring-portal.git
   cd mnsuet-lms-monitoring-portal
   ```

2. **Install project dependencies**:
   ```bash
   npm install
   ```

3. **Launch the development server**:
   ```bash
   npm run dev
   ```

4. Open your browser and navigate to:
   ```
   http://localhost:3000
   ```

---

## 📦 Production Build & Deployment

To compile an optimized, standalone production bundle:

```bash
npm run build
```

This compiles static assets into the `dist/` directory, ready for deployment to any enterprise web server (Nginx, Apache, Cloud Run, Vercel, or AWS S3).

---

## 📜 Institutional Governance & Compliance

Developed for academic monitoring and quality assurance at **Muhammad Nawaz Sharif University of Engineering & Technology, Multan**.  
Official Web Portal: [https://mnsuet.edu.pk/](https://mnsuet.edu.pk/)

*All institutional trademarks, academic department structures, and logos belong to MNS-UET Multan.*

### Extended Analytics Modules
To ensure data-driven executive oversight, the Vice Chancellor dashboard utilizes multi-dimensional scaling capabilities for tracking:
- **Institutional Completion Heatmap Grid**: Density maps projecting upload intensity across every department mapped securely across semesters 1 through 8.
- **University Progress Trajectory**: Live timeline tracking visualizing the progression momentum, allowing stakeholders to easily detect stagnation periods and completion velocity.

## Modular & Scalable Database Architecture
The backend is architected explicitly for zero-downtime extensibility. The relational data warehouse is modeled using **Drizzle ORM** with explicitly mapped tables for tracking metrics (`access_logs`, `work_on_demand`, `sessions`). 
This guarantees that **if new compliance or monitoring modules are required in the future (such as advanced biometric tracking or external accreditation monitoring), new tables can be seamlessly migrated and joined without disturbing or mutating historical application data.**
