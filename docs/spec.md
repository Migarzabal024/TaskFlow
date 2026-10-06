# FamilyTask — MASTER IMPLEMENTATION SPECIFICATION FOR CLAUDE CODE
Version: 1.0
Date: 2026-10-06

## 1. PURPOSE

Build FamilyTask, a responsive mobile-first web application for managing household tasks.

Core flow:
PLAN → ASSIGN → EXECUTE → COMMUNICATE → SUPERVISE

FamilyTask allows one family leader to create and assign household tasks to family members, track execution, communicate inside each task, receive notifications, inspect history, and view basic statistics.

This document is the authoritative implementation brief. Do not invent product behavior that contradicts it.

---

## 2. MVP PRODUCT RULES

### Included
- Authentication: register, login, logout, current-user profile.
- Exactly one family per user in MVP.
- Family creation.
- Family invitations.
- Accept/reject invitations.
- Leader/member roles.
- Family member management.
- Simple tasks.
- Composite tasks with one level of subtasks.
- Different assignees for subtasks.
- Task assignment and reassignment.
- Task dates and optional time.
- Priorities: LOW, MEDIUM, HIGH.
- Task execution states.
- Cannot-complete reporting with mandatory reason.
- Task cancellation using logical deletion/soft delete.
- Task-level communication.
- Task history/audit trail.
- Notifications.
- Basic statistics.
- Responsive mobile-first web UI.
- PWA-ready structure/installability where practical.

### Explicitly OUT OF SCOPE
Do not implement:
- AI.
- WhatsApp integration.
- General family chat.
- Gamification.
- Points.
- Rewards.
- Payments.
- Advertising.
- Multiple families per user.
- Native Android application.
- Native iOS application.
- Complex recurring tasks.
- Advanced analytics.
- Social features.

Future functionality may be documented, but must not be implemented in MVP.

---

## 3. ACTORS

### LEADER
Can:
- create/manage the family;
- invite members;
- view family members;
- create, edit, assign, reassign and cancel tasks;
- create composite tasks;
- assign subtasks;
- see all family tasks;
- see task history;
- receive task notifications;
- view basic statistics.

### MEMBER
Can:
- view own assigned tasks;
- view task details;
- start tasks;
- complete simple tasks;
- complete assigned subtasks;
- report inability to complete with a mandatory reason;
- send/read messages inside tasks;
- receive notifications;
- view own profile.

Backend must enforce permissions. Never trust frontend role checks.

---

## 4. DEFINITIVE TASK MODEL

A task can be:

### Simple
No subtasks.
Must have an assignee.

### Composite
Has subtasks.
The parent task may have no assignee because responsibility can be distributed among subtasks.

Subtasks:
- belong to one parent;
- can have different assignees;
- cannot contain subtasks themselves;
- must use the same family;
- cannot outlive the parent logically.

### Parent status
Do not store a manually editable parent progress percentage.

Compute parent status from subtasks:
- no completed/started subtasks → PENDING
- at least one started/completed subtask but not all completed → IN_PROGRESS
- all subtasks completed → COMPLETED

A parent with pending subtasks cannot be manually marked COMPLETED.

---

## 5. TASK STATUSES

Enum:
- PENDING
- IN_PROGRESS
- COMPLETED
- CANNOT_COMPLETE
- CANCELLED
- EXPIRED

Priority:
- LOW
- MEDIUM
- HIGH

Rules:
- PENDING → IN_PROGRESS when started.
- PENDING/IN_PROGRESS → COMPLETED when valid completion occurs.
- PENDING/IN_PROGRESS → CANNOT_COMPLETE when the responsible member reports inability.
- PENDING/IN_PROGRESS → CANCELLED by authorized leader.
- Overdue incomplete tasks can become EXPIRED according to backend expiration logic.
- COMPLETED/CANCELLED should not be casually reopened in MVP.
- A cancelled task remains in history; never physically delete it.

For a composite task, child status changes must update the derived parent status.

---

## 6. DATA MODEL

Use PostgreSQL + Prisma.

Entities:

### User
- id
- name
- email
- passwordHash
- createdAt
- updatedAt

### Family
- id
- name
- createdAt
- updatedAt

### FamilyMember
- id
- familyId
- userId
- role
- joinedAt

Constraints:
- one user belongs to exactly one family in MVP;
- unique(familyId, userId).

### Invitation
- id
- familyId
- email
- token
- status
- expiresAt
- invitedById
- createdAt
- updatedAt

### Task
- id
- familyId
- parentTaskId nullable
- createdById
- assignedToId nullable
- title
- description nullable
- status
- priority
- dueDate
- dueTime nullable
- startedAt nullable
- completedAt nullable
- cannotCompleteReason nullable
- cancelledAt nullable
- cancelledById nullable
- deletedAt nullable
- createdAt
- updatedAt

### TaskMessage
- id
- taskId
- senderId
- content
- createdAt
- updatedAt

### TaskHistory
- id
- taskId
- userId
- action
- previousStatus nullable
- newStatus nullable
- metadata nullable JSON
- createdAt

### Notification
- id
- userId
- type
- taskId nullable
- message
- readAt nullable
- createdAt

Enums:

FamilyRole:
LEADER, MEMBER

TaskStatus:
PENDING, IN_PROGRESS, COMPLETED, CANNOT_COMPLETE, CANCELLED, EXPIRED

TaskPriority:
LOW, MEDIUM, HIGH

InvitationStatus:
PENDING, ACCEPTED, REJECTED, EXPIRED

NotificationType:
TASK_ASSIGNED
TASK_REASSIGNED
TASK_COMPLETED
TASK_CANNOT_COMPLETE
TASK_MESSAGE
TASK_EXPIRED
TASK_CANCELLED

TaskHistoryAction:
CREATED
UPDATED
ASSIGNED
REASSIGNED
STARTED
COMPLETED
CANNOT_COMPLETE
CANCELLED
STATUS_CHANGED

Add appropriate indexes and foreign keys.

---

## 7. SECURITY

Use:
- bcrypt for passwords;
- JWT authentication;
- environment variables for secrets;
- centralized authentication middleware;
- centralized authorization middleware;
- input validation;
- Prisma parameterized queries;
- safe error responses;
- no passwords in responses;
- no secrets in Git.

`.env` must never be committed.

Create `.env.example`.

Suggested:
PORT=3000
DATABASE_URL="postgresql://..."
JWT_SECRET="..."
NODE_ENV="development"

Use strong JWT configuration and reasonable token expiration.

---

## 8. API DESIGN

Base:
`/api`

Response success:
{
  "success": true,
  "data": {}
}

Response error:
{
  "success": false,
  "message": "Human readable message"
}

### Authentication
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
GET /api/auth/me

### Families
POST /api/families
GET /api/families/me
GET /api/families/members
DELETE /api/families/members/:memberId

### Invitations
POST /api/invitations
GET /api/invitations
POST /api/invitations/:token/accept
POST /api/invitations/:token/reject

### Tasks
POST /api/tasks
GET /api/tasks
GET /api/tasks/:id
PUT /api/tasks/:id
DELETE /api/tasks/:id
PATCH /api/tasks/:id/status
PATCH /api/tasks/:id/assign
PATCH /api/tasks/:id/cannot-complete

### Subtasks
POST /api/tasks/:id/subtasks
GET /api/tasks/:id/subtasks
PUT /api/tasks/:taskId/subtasks/:subtaskId
PATCH /api/tasks/:taskId/subtasks/:subtaskId/status
PATCH /api/tasks/:taskId/subtasks/:subtaskId/assign

### Messages
GET /api/tasks/:taskId/messages
POST /api/tasks/:taskId/messages

### History
GET /api/tasks/:taskId/history

### Notifications
GET /api/notifications
PATCH /api/notifications/:id/read
PATCH /api/notifications/read-all

### Statistics
GET /api/statistics

Every endpoint must validate:
1. authenticated user;
2. family membership;
3. role/permission;
4. entity ownership/family relation;
5. business-state transition.

Never rely only on frontend checks.

---

## 9. TASK CREATION RULES

### Simple task
Required:
- title;
- dueDate;
- assignee.

Optional:
- description;
- dueTime;
- priority.

### Composite task
Required:
- title;
- dueDate;
- at least one subtask.

Parent assignee can be null.

Each subtask:
- title;
- assignee;
- optional description/dueTime/priority as appropriate.

All assigned users must belong to the same family.

Do not allow nested subtasks.

---

## 10. CANNOT-COMPLETE RULE

A member can report inability only for a task/subtask they are responsible for.

Reason is mandatory.

On confirmation:
- status becomes CANNOT_COMPLETE;
- reason is stored;
- history is created;
- leader receives notification.

Do not silently overwrite the reason.

---

## 11. COMMUNICATION

There is no general family chat.

Every message belongs to a task.

Authorized family members may read/send messages according to task/family permissions.

Sending a message:
- validates content;
- stores message;
- creates task history where appropriate;
- notifies relevant users.

Prevent empty/whitespace-only messages.

---

## 12. CANCELLATION

Cancellation is logical.

DELETE /api/tasks/:id should perform cancellation, not physical deletion.

Set:
- status = CANCELLED
- cancelledAt
- cancelledById
- deletedAt

Create history.

Notify relevant assignee(s).

Cancelled tasks remain queryable for history/statistics according to product rules.

---

## 13. NOTIFICATIONS

Generate notifications for:
- task assigned;
- task reassigned;
- task completed;
- task cannot be completed;
- new task message;
- task expired;
- task cancelled.

MVP can use in-app notifications.

Do not implement external push/email/WhatsApp notification infrastructure unless separately requested.

---

## 14. STATISTICS

Basic statistics only.

At minimum:
- completed;
- pending;
- in progress;
- cannot complete;
- cancelled;
- expired.

Statistics must be calculated from task data.

Do not create a statistics persistence table unless technically necessary.

Respect family boundaries and soft-deleted/cancelled semantics.

---

## 15. FRONTEND

Use:
- React
- Vite
- JavaScript
- CSS
- React Router
- Axios or equivalent HTTP client
- React Hook Form
- Zod or equivalent validation

Do not introduce TypeScript unless explicitly requested later.

Use a clear feature-oriented structure.

Suggested:
src/
  app/
  components/
  features/
    auth/
    family/
    tasks/
    notifications/
    statistics/
  pages/
  layouts/
  hooks/
  services/
  utils/
  styles/

Keep business logic out of presentational components when possible.

---

## 16. ROUTES

Public:
/
/login
/register
/onboarding/create-family
/onboarding/invitation

Authenticated:
/app/dashboard
/app/tasks
/app/tasks/new
/app/tasks/:id
/app/tasks/:id/edit
/app/family
/app/family/members
/app/family/invite
/app/notifications
/app/statistics
/app/profile

Use protected routes.

Role-sensitive UI is allowed, but backend authorization is authoritative.

---

## 17. MAIN SCREENS

### Login
Email/password.

### Register
Name/email/password/password confirmation.

### Onboarding
Create family OR accept invitation.

### Leader Dashboard
Show:
- today's relevant tasks;
- pending;
- in progress;
- completed;
- alerts needing attention;
- quick create task.

### Member Dashboard
Show:
- today's assigned tasks;
- overdue tasks;
- tasks requiring action;
- notifications.

### Tasks
Filters:
- status;
- priority;
- date;
- assignee where authorized.

### Create Task
Support simple/composite mode.

### Task Detail
Show:
- title;
- description;
- status;
- priority;
- due date/time;
- assignee;
- subtasks;
- progress;
- actions;
- conversation;
- history.

### Family
Show family name and members.

### Notifications
List unread/read notifications.

### Statistics
Simple visual summary.

### Profile
User data and logout.

---

## 18. RESPONSIVE DESIGN

Mobile-first.

Target:
- mobile: 320px+
- tablet
- desktop

Mobile:
- bottom navigation;
- cards;
- full-width actions;
- touch-friendly controls;
- avoid dense tables.

Desktop:
- sidebar navigation;
- wider content area;
- multi-column dashboards where useful.

Do not create separate mobile and desktop applications. Use responsive layouts.

---

## 19. UI STATES

Every relevant screen/component must consider:
- normal;
- loading;
- empty;
- error;
- success;
- disabled;
- unauthorized;
- offline/network failure where relevant.

Never leave blank screens for errors.

Use confirmation dialogs for destructive/cancel actions.

---

## 20. ACCESSIBILITY

Minimum:
- semantic HTML;
- visible focus;
- keyboard navigation;
- labels for inputs;
- sufficient contrast;
- accessible modal behavior;
- buttons must communicate their purpose;
- do not rely on color alone for task status.

---

## 21. PROJECT STRUCTURE

Recommended repository:

familytask/
  client/
  server/
  docs/
  .gitignore
  README.md

Server:
server/src/
  config/
  controllers/
  middleware/
  routes/
  services/
  validators/
  utils/
  prisma/
  app.js
  server.js

Prefer:
routes → controllers → services → Prisma

Controllers should remain thin.
Business rules belong in services.

---

## 22. DEVELOPMENT ORDER

Do not try to implement the entire application in one uncontrolled pass.

Phase 0:
- repository;
- README;
- client/server folders;
- environment setup;
- Git.

Phase 1:
- PostgreSQL;
- Prisma;
- schema;
- migrations;
- seed.

Phase 2:
- auth;
- JWT;
- register/login/me;
- middleware.

Phase 3:
- family creation;
- membership;
- invitations.

Phase 4:
- simple tasks;
- assignment;
- status transitions.

Phase 5:
- composite tasks/subtasks;
- derived parent status.

Phase 6:
- cannot-complete;
- cancellation;
- expiration.

Phase 7:
- task messages;
- history;
- notifications.

Phase 8:
- statistics.

Phase 9:
- React shell;
- auth;
- dashboards;
- tasks;
- task detail;
- family;
- notifications;
- statistics.

Phase 10:
- responsive refinement;
- PWA;
- accessibility;
- validation;
- error handling.

Phase 11:
- tests;
- seed/demo data;
- README;
- final acceptance checklist.

After each phase, run tests/lint/build and fix errors before continuing.

---

## 23. TESTING

At minimum implement:
- authentication tests;
- authorization tests;
- family membership tests;
- task creation tests;
- assignment tests;
- invalid status transition tests;
- cannot-complete permission tests;
- cancellation tests;
- composite-task parent status tests;
- message authorization tests;
- notification creation tests;
- statistics boundary tests.

Test important business rules rather than only HTTP status codes.

---

## 24. SEED DATA

Create development seed data:
- one demo family;
- one leader;
- two members;
- simple tasks;
- one composite task with several subtasks;
- messages;
- notifications;
- history.

Never use real personal data.

---

## 25. GIT RULES

Use meaningful commits, for example:
feat(auth): implement registration and login
feat(family): add family invitations
feat(tasks): create task workflow
feat(tasks): add composite tasks
feat(tasks): implement cannot-complete flow
feat(tasks): implement task cancellation
feat(chat): add task messages
feat(notifications): add in-app notifications
feat(stats): add family task statistics
fix(tasks): prevent invalid status transition

Do not commit:
.env
node_modules
build artifacts
local database files
credentials.

---

## 26. CLAUDE CODE WORKING RULES

You are the implementation agent.

Before changing code:
1. inspect the repository;
2. identify existing architecture;
3. do not overwrite working code unnecessarily;
4. explain conflicts with this specification;
5. make small, coherent changes.

For each feature:
1. implement backend model/rules;
2. add API;
3. test API/business rules;
4. implement frontend;
5. connect frontend;
6. test responsive behavior;
7. update README/docs.

Never:
- invent new MVP features;
- bypass authorization;
- store passwords in plain text;
- trust frontend permissions;
- physically delete tasks;
- allow nested subtasks;
- allow arbitrary parent completion;
- create a general family chat;
- add AI;
- add WhatsApp;
- add gamification.

When requirements are ambiguous, prefer the smallest implementation compatible with this document and record the assumption.

---

## 27. ACCEPTANCE CRITERIA

The MVP is acceptable only when:

AUTH
- user can register/login/logout;
- protected routes work;
- unauthorized requests are rejected.

FAMILY
- user can create one family;
- leader can invite;
- member can accept/reject;
- membership is enforced.

TASKS
- leader can create simple tasks;
- leader can assign/reassign;
- members see their tasks;
- members can start and complete valid tasks;
- inability requires a reason;
- cancellation is logical;
- history remains.

COMPOSITE TASKS
- parent can contain subtasks;
- subtasks have individual assignees;
- no nested subtasks;
- parent status is derived correctly.

COMMUNICATION
- messages are task-specific;
- authorized users can communicate;
- new messages create notifications as defined.

NOTIFICATIONS
- required task events generate in-app notifications.

STATISTICS
- basic status counts are correct.

UX
- mobile-first;
- responsive desktop;
- loading/empty/error/success states;
- accessible basic controls.

QUALITY
- no secrets in repository;
- migrations reproducible;
- seed works;
- tests pass;
- production build works.

---

## 28. FIRST CLAUDE CODE TASK

Do not immediately implement the entire app.

First:
1. inspect the repository;
2. create the project structure if empty;
3. create `/docs`;
4. create `README.md`;
5. create the initial client/server setup;
6. configure Git;
7. configure environment examples;
8. propose the implementation plan;
9. stop and wait for confirmation before beginning Phase 1 if this specification is being introduced into an existing repository.

If the repository is empty and the user explicitly asks to begin implementation, proceed with Phase 0 and then Phase 1.

This document is the source of truth for MVP scope.
