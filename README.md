# MNS-UET Central Academic Monitoring Portal & LMS Result Management System

> **Muhammad Nawaz Sharif University of Engineering & Technology, Multan**  
> Official University Portal: [https://mnsuet.edu.pk/](https://mnsuet.edu.pk/)

An institutional-grade, enterprise web application built for the **Vice Chancellor, Deans, Heads of Departments (HODs), and Academic Program Coordinators** of Muhammad Nawaz Sharif University of Engineering & Technology (MNS-UET), Multan. The system provides real-time result submission logging, departmental auditing, section-wise performance telemetry, and executive compliance monitoring for LMS semester result uploads across all university faculties.

---

## 📑 Table of Contents

- [Overview & Key Features](#-overview--key-features)
- [System Architecture & Multi-Database Synchronization](#-system-architecture--multi-database-synchronization)
- [User Roles & Permissions Diagram](#-user-roles--permissions-diagram)
- [Program Coordinator Self-Service Workflow](#-program-coordinator-self-service-workflow)
- [Calculation Rules for Result Statistics](#-calculation-rules-for-result-statistics)
- [Database Schema & Entity Relationships](#-database-schema--entity-relationships)
- [Technology Stack](#-technology-stack)
- [Installation & Local Setup](#-installation--local-setup)

---

## 🏛️ Overview & Key Features

The **MNS-UET Central Academic Monitoring Portal** streamlines semester result uploads onto the university Learning Management System (LMS) across all degree programs and sessions.

### Key Capabilities:
1. **Vice Chancellor Executive Dashboard**: Real-time university-wide result completion percentages, departmental radar graphs, shift parity metrics, and formal compliance notice generators.
2. **Program Coordinator Self-Service Deletion & Request**: Program Coordinators can easily remove any program from their active coordination portfolio at any time without needing HOD approval. Adding a new program can be requested from the HOD with one click.
3. **Comprehensive Cohort Tracking**: Accurately aggregates result progress across active sessions (e.g. 2021, 2022, 2023, 2024), shifts (Morning/Evening), and sections (A, B, C).
4. **Result Completion & Pending Aggregation**: Calculates exact uploaded, pending, and incomplete course counts across all submitted semesters without phantom data or hardcoded numbers.
5. **Multi-Database Real-Time Sync**: Instantaneous bidirectional synchronization across Browser Storage (`localStorage`), Cloud Firestore, and the SQLite Backend API.

---

## 🏢 System Architecture & Multi-Database Synchronization

The application employs a 3-layer resilient synchronization strategy to ensure zero data loss across browser reloads, multi-user concurrent sessions, and cloud deployments.

```
+-----------------------------------------------------------------------+
|                         MNS-UET FRONTEND UI                           |
|      (React 19 + TypeScript + Vite + Tailwind CSS v4 + Recharts)      |
+-----------------------------------------------------------------------+
                                   |
         +-------------------------+-------------------------+
         |                                                   |
         v                                                   v
+-----------------------------------+             +---------------------+
|        CLIENT LOCAL STATE         |             |   DISPATCH EVENTS   |
|   (localStorage & EventBus)       |             | (mnsuet_sync_toast) |
+-----------------------------------+             +---------------------+
         |                                                   |
         +-------------------------+-------------------------+
                                   |
                                   v
+-----------------------------------------------------------------------+
|                    PERSISTENCE & SYNC CONTROLLER                      |
+-----------------------------------------------------------------------+
         |                                                   |
         v                                                   v
+----------------------------------+       +----------------------------+
|        CLOUD FIRESTORE DB        |       |    NODE.JS REST API SERVER |
|    (Firebase Realtime Store)     |       |   (Express + Drizzle ORM)  |
+----------------------------------+       +----------------------------+
                                                             |
                                                             v
                                                   +--------------------+
                                                   | SQLite DataStore   |
                                                   | (app.db Persistent)|
                                                   +--------------------+
```

---

## 👥 User Roles & Permissions Diagram

```
                              +--------------------+
                              |  VICE CHANCELLOR   |
                              |   & DEANS (VC)     |
                              +---------+----------+
                                        |
                 +----------------------+----------------------+
                 |                                             |
                 v                                             v
    +--------------------------+                 +---------------------------+
    |   HEAD OF DEPARTMENT     |                 |     ADMIN REGISTRAR       |
    |          (HOD)           |                 |    (SYSTEM MANAGER)       |
    +------------+-------------+                 +---------------------------+
                 |
                 v
    +--------------------------+
    |   PROGRAM COORDINATOR    |
    |      & LECTURER          |
    +--------------------------+
```

### Roles Breakdown:
* **Vice Chancellor (VC) / Deans**: Full institutional read/write authority, university completion radar, compliance notification issuance, section parity alerts, and institutional audit trail oversight.
* **Head of Department (HOD)**: Departmental oversight, approval of coordinator program requests, course allocation, and section result tracking.
* **Program Coordinator**: Full management of degree program courses. Can self-delete any assigned program from their profile or entry screen, add course rows, set LMS statuses (`Uploaded`, `In Progress`, `Pending`, `Not Applicable`), and request new programs.

---

## 🔄 Program Coordinator Self-Service Workflow

Coordinators can easily manage their coordinated degree programs using the simple workflow below:

```
+------------------------------------------------------------------------+
|                   COORDINATOR PROGRAM PORTFOLIO                        |
+------------------------------------------------------------------------+
         |                                                      |
         | [Delete Any Program]                                 | [Request New Program]
         v                                                      v
+-----------------------------------+        +---------------------------+
|  Click Trash Icon or "Remove"     |        | Click "+ Request Program" |
|  (No HOD permission required)    |        | Select Program & Shifts   |
+-----------------------------------+        +---------------------------+
         |                                                      |
         v                                                      v
+-----------------------------------+        +---------------------------+
| Instantly removed from Portfolio  |        | Sent to HOD Approval Queue|
| & synced across DBs + Audit Trail |        | (Auto-approved if set)    |
+-----------------------------------+        +---------------------------+
```

### Program Deletion Policy:
* **Deletion**: Coordinators have total authority to remove **any program** from their active portfolio, whether they coordinate 1 program or multiple programs. No HOD permission is required to delete a program.
* **Addition**: Adding a brand new program to a coordinator's profile is submitted to the HOD for approval, ensuring administrative accountability.

---

## 🧮 Calculation Rules for Result Statistics

### 1. Course Level Completion Rate
For any submitted semester record $R$ with active courses $S = \{s_1, s_2, \dots, s_n\}$:
* **Active Workload**: $\text{Total Active} = \sum \text{Status}(s) \neq \text{'Not Applicable'}$
* **Uploaded Courses**: $U = \sum \text{Status}(s) = \text{'Uploaded'}$
* **Pending Courses**: $P = \sum \text{Status}(s) = \text{'Pending'}$
* **In Progress Courses**: $IP = \sum \text{Status}(s) = \text{'In Progress'}$
* **Completion Rate**: $\text{Completion \%} = \frac{U}{\text{Total Active}} \times 100$

### 2. Multi-Semester Result Incomplete & Pending Aggregation
When reviewing program metrics across semesters (e.g. 4 semesters submitted across different programs):
* **Result Incomplete / Pending Count**: Aggregates the sum of all `Pending` + `In Progress` subjects across **only the semesters that have actually been submitted**.
* **Zero Phantom Data**: Programs or semesters without submitted forms are not artificially injected as pending, preventing misleading numbers.

---

## 🗄️ Database Schema & Entity Relationships

The relational datastore consists of 9 core entities managed via **Drizzle ORM**:

1. **`users`**: Master user credentials, academic roles (`VC`, `HOD`, `COORDINATOR`, `LECTURER`), department, assigned programs array, and security logs.
2. **`programs`**: University degree programs (e.g., "BS Computer Science", "BS Artificial Intelligence") mapped to academic faculties.
3. **`sessions`**: Academic session years (e.g., "2021", "2022", "2023", "2024").
4. **`submissions`**: Central record for a submitted semester form (Department, Program, Shift, Section, Session, Semester).
5. **`subjects`**: Course rows belonging to a submission (`course_code`, `subject_title`, `status`, `credit_hours`, `teacher_name`).
6. **`documents`**: Institutional notices, guidelines, and compliance letters.
7. **`document_programs`**: Junction table mapping documents to degree programs.
8. **`access_logs`**: System audit trail logging all save, update, and delete actions with user timestamps.
9. **`work_on_demand`**: System enhancement tickets and IT service requests.

---

## 💻 Technology Stack

* **Frontend**: React 19, TypeScript 5.5+, Vite 6, Tailwind CSS v4, Recharts, Lucide React Icons.
* **Backend**: Node.js, Express, Drizzle ORM, SQLite / libSQL, esbuild.
* **Real-Time Toast & Audio Engine**: Web Audio API sine synthesizers + Custom Event Bus (`mnsuet_sync_evidence`).

---

## 🚀 Installation & Local Setup

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Database Migration & Seeding**:
   ```bash
   npx drizzle-kit push
   ```

3. **Start Full-Stack Development Server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

4. **Production Build**:
   ```bash
   npm run build
   npm run start
   ```

---

> Developed for Academic Quality Monitoring and Governance at **Muhammad Nawaz Sharif University of Engineering & Technology, Multan**.  
> Official Web Portal: [https://mnsuet.edu.pk/](https://mnsuet.edu.pk/)
