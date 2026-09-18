# MNS-UET Central Academic Monitoring Portal & LMS Result Management System

> **Muhammad Nawaz Sharif University of Engineering & Technology, Multan**  
> Official University Portal: [https://mnsuet.edu.pk/](https://mnsuet.edu.pk/)

An institutional-grade, enterprise web application built for the **Vice Chancellor (VC), Deans, Heads of Departments (HODs), and Academic Program Coordinators** of Muhammad Nawaz Sharif University of Engineering & Technology (MNS-UET), Multan. The system provides real-time result submission logging, departmental auditing, section-wise performance telemetry, and executive compliance monitoring for LMS semester result uploads across all university faculties.

---

## 📑 Table of Contents

1. [Overview & Key Features](#-overview--key-features)
2. [Dual-Database Architecture: Why Cloud Firestore AND SQLite?](#-dual-database-architecture-why-cloud-firestore-and-sqlite)
3. [System Architecture & Synchronization Diagram](#-system-architecture--synchronization-diagram)
4. [User Roles & Permissions Matrix](#-user-roles--permissions-matrix)
5. [Program Coordinator Self-Service Workflow](#-program-coordinator-self-service-workflow)
6. [Calculation Rules for Result Statistics](#-calculation-rules-for-result-statistics)
7. [Database Schema & Entity Relationships](#-database-schema--entity-relationships)
8. [Technology Stack](#-technology-stack)
9. [Installation & Local Setup](#-installation--local-setup)

---

## 🏛️ Overview & Key Features

The **MNS-UET Central Academic Monitoring Portal** streamlines semester result uploads onto the university Learning Management System (LMS) across all degree programs and sessions.

### Key Capabilities:
1. **Vice Chancellor Executive Dashboard**: Real-time university-wide result completion percentages, departmental radar graphs, shift parity metrics, and formal compliance notice generators.
2. **Submitted Data Completion Display**: Clearly separates **Uploaded %** and **Pending %** from data entered into submitted forms rather than displaying ambiguous global figures.
3. **Program Coordinator Self-Service Deletion & Request**: Program Coordinators can easily remove any program from their active coordination portfolio at any time without needing HOD approval. Adding a new program can be requested from the HOD with one click.
4. **Comprehensive Cohort Tracking**: Accurately aggregates result progress across active sessions (e.g. 2021, 2022, 2023, 2024), shifts (Morning/Evening), and sections (A, B, C).
5. **Multi-Database Real-Time Sync**: Instantaneous bidirectional synchronization across Browser Storage (`localStorage`), Cloud Firestore, and the SQLite Backend API.

---

## ⚡ Dual-Database Architecture: Why Cloud Firestore AND SQLite?

A common architectural question for this institutional system is: **"Why do we use BOTH Cloud Firestore AND SQLite in this application?"**

The system leverages a **Hybrid Dual-Database Strategy** where each datastore serves a distinct, specialized operational role:

```
+-----------------------------------------------------------------------------------+
|                            MNS-UET DUAL-DATABASE STRATEGY                         |
+-----------------------------------------------------------------------------------+
|                                                                                   |
|  1. CLOUD FIRESTORE (Client Real-Time Engine)                                      |
|     • Purpose: Instant multi-client synchronization & offline resilience.           |
|     • Strengths: Push-based websocket updates (onSnapshot) to all active browser   |
|       sessions (VC, Deans, HODs, Coordinators) without reloading or polling.     |
|     • Edge Resilience: Client-side caching (IndexedDB) allows faculty to fill      |
|       semester forms even when campus Wi-Fi or internet connection is spotty.     |
|                                                                                   |
|  2. SQLITE / Drizzle ORM (Server Relational Datastore)                            |
|     • Purpose: Server-authoritative storage, ORM schema migration, & SQL joins.   |
|     • Strengths: Structured SQL queries, complex JOIN operations, departmental      |
|       aggregations, ACID-compliant transactions, and fast local file persistence  |
|       (`app.db`) managed via Drizzle ORM on the Node.js backend server.           |
|     • Enterprise Auditing: Generates server-side PDF compliance reports and CSV   |
|       data exports without hitting cloud document read quotas.                    |
|                                                                                   |
+-----------------------------------------------------------------------------------+
```

### Benefits of the Dual-Database Paradigm:
- **Zero Data Loss & High Availability**: If the cloud network drops, local client storage and SQLite keep the portal operating offline seamlessly. When online, Cloud Firestore instantly broadcasts edits across all connected user devices.
- **Relational Integrity + Real-time Push**: Relational foreign keys and ORM constraints are enforced in SQLite, while live real-time subscription feeds are delivered to the frontend UI by Firestore.

---

## 🏢 System Architecture & Synchronization Diagram

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

## 👥 User Roles & Permissions Matrix

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
    |            |
    |            v
    |   +--------------------------+
    +-->|   PROGRAM COORDINATOR    |
        |      & LECTURER          |
        +--------------------------+
```

| Role | Access Scope | Key Capabilities |
| :--- | :--- | :--- |
| **Vice Chancellor (VC) / Deans** | Institutional (All Depts & Faculties) | Executive dashboard, completion radar, compliance notice issuance, section parity alerts, and system-wide audit logs. |
| **Head of Department (HOD)** | Departmental | Program allocation, approval/rejection of coordinator requests, course assignment, and department result auditing. |
| **Program Coordinator** | Coordinated Degree Programs | Form entry, course status management (`Uploaded`, `In Progress`, `Pending`), program self-deletion, and program request submission. |
| **Lecturer / Visiting Faculty** | Assigned Courses | Course result status updates and LMS verification logs. |

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
|  (No HOD permission required)     |        | Select Program & Shifts   |
+-----------------------------------+        +---------------------------+
         |                                                      |
         v                                                      v
+-----------------------------------+        +---------------------------+
| Instantly removed from Portfolio  |        | Sent to HOD Approval Queue|
| & synced across DBs + Audit Trail |        | (Auto-approved if set)    |
+-----------------------------------+        +---------------------------+
```

---

## 🧮 Calculation Rules for Result Statistics

### 1. Course Level Completion Rate
For any submitted semester record $R$ with active courses $S = \{s_1, s_2, \dots, s_n\}$:
* **Active Workload**: $\text{Total Active} = \sum \text{Status}(s) \neq \text{'Not Applicable'}$
* **Uploaded Courses**: $U = \sum \text{Status}(s) = \text{'Uploaded'}$
* **Pending Courses**: $P = \sum \text{Status}(s) = \text{'Pending'}$
* **In Progress Courses**: $IP = \sum \text{Status}(s) = \text{'In Progress'}$
* **Completion Rate**: $\text{Completion \%} = \frac{U}{\text{Total Active}} \times 100$

### 2. Submitted Data Uploaded vs. Pending Breakdown
* **Uploaded %**: $\frac{\text{Uploaded Courses}}{\text{Total Courses in Entered Forms}} \times 100$
* **Pending %**: $\frac{\text{Pending Courses}}{\text{Total Courses in Entered Forms}} \times 100$

---

## 🗄️ Database Schema & Entity Relationships

The relational datastore consists of 9 core entities managed via **Drizzle ORM** (SQLite) and mirrored in **Cloud Firestore**:

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
* **Cloud Database**: Cloud Firestore (Firebase SDK v10+).
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
