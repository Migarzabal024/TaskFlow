const {
  pgTable,
  pgEnum,
  serial,
  integer,
  varchar,
  text,
  timestamp,
  date,
  time,
  jsonb,
  uniqueIndex,
  index,
} = require("drizzle-orm/pg-core");
const { relations } = require("drizzle-orm");

// ---------------------------------------------------------------------------
// Enums (spec section 6)
// ---------------------------------------------------------------------------

const familyRoleEnum = pgEnum("family_role", ["LEADER", "MEMBER"]);

const taskStatusEnum = pgEnum("task_status", [
  "PENDING",
  "IN_PROGRESS",
  "COMPLETED",
  "CANNOT_COMPLETE",
  "CANCELLED",
  "EXPIRED",
]);

const taskPriorityEnum = pgEnum("task_priority", ["LOW", "MEDIUM", "HIGH"]);

const invitationStatusEnum = pgEnum("invitation_status", [
  "PENDING",
  "ACCEPTED",
  "REJECTED",
  "EXPIRED",
]);

const notificationTypeEnum = pgEnum("notification_type", [
  "TASK_ASSIGNED",
  "TASK_REASSIGNED",
  "TASK_COMPLETED",
  "TASK_CANNOT_COMPLETE",
  "TASK_MESSAGE",
  "TASK_EXPIRED",
  "TASK_CANCELLED",
]);

const taskHistoryActionEnum = pgEnum("task_history_action", [
  "CREATED",
  "UPDATED",
  "ASSIGNED",
  "REASSIGNED",
  "STARTED",
  "COMPLETED",
  "CANNOT_COMPLETE",
  "CANCELLED",
  "STATUS_CHANGED",
]);

// ---------------------------------------------------------------------------
// Tables (spec section 6)
// ---------------------------------------------------------------------------

const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 120 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  emailUnique: uniqueIndex("users_email_unique").on(table.email),
}));

const families = pgTable("families", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 120 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

const familyMembers = pgTable("family_members", {
  id: serial("id").primaryKey(),
  familyId: integer("family_id").notNull().references(() => families.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: familyRoleEnum("role").notNull(),
  joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  familyUserUnique: uniqueIndex("family_members_family_user_unique").on(table.familyId, table.userId),
  userIdx: index("family_members_user_idx").on(table.userId),
}));

const invitations = pgTable("invitations", {
  id: serial("id").primaryKey(),
  familyId: integer("family_id").notNull().references(() => families.id, { onDelete: "cascade" }),
  email: varchar("email", { length: 255 }).notNull(),
  token: varchar("token", { length: 255 }).notNull(),
  status: invitationStatusEnum("status").notNull().default("PENDING"),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  invitedById: integer("invited_by_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  tokenUnique: uniqueIndex("invitations_token_unique").on(table.token),
  familyIdx: index("invitations_family_idx").on(table.familyId),
  emailIdx: index("invitations_email_idx").on(table.email),
}));

const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  familyId: integer("family_id").notNull().references(() => families.id, { onDelete: "cascade" }),
  parentTaskId: integer("parent_task_id").references(() => tasks.id, { onDelete: "cascade" }),
  createdById: integer("created_by_id").notNull().references(() => users.id),
  assignedToId: integer("assigned_to_id").references(() => users.id),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  status: taskStatusEnum("status").notNull().default("PENDING"),
  priority: taskPriorityEnum("priority").notNull().default("MEDIUM"),
  dueDate: date("due_date").notNull(),
  dueTime: time("due_time"),
  startedAt: timestamp("started_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  cannotCompleteReason: text("cannot_complete_reason"),
  cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
  cancelledById: integer("cancelled_by_id").references(() => users.id),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  familyIdx: index("tasks_family_idx").on(table.familyId),
  parentIdx: index("tasks_parent_idx").on(table.parentTaskId),
  assignedIdx: index("tasks_assigned_idx").on(table.assignedToId),
  statusIdx: index("tasks_status_idx").on(table.status),
  dueDateIdx: index("tasks_due_date_idx").on(table.dueDate),
}));

const taskMessages = pgTable("task_messages", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  senderId: integer("sender_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  taskIdx: index("task_messages_task_idx").on(table.taskId),
}));

const taskHistory = pgTable("task_history", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => users.id),
  action: taskHistoryActionEnum("action").notNull(),
  previousStatus: taskStatusEnum("previous_status"),
  newStatus: taskStatusEnum("new_status"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  taskIdx: index("task_history_task_idx").on(table.taskId),
}));

const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: notificationTypeEnum("type").notNull(),
  taskId: integer("task_id").references(() => tasks.id, { onDelete: "cascade" }),
  message: text("message").notNull(),
  readAt: timestamp("read_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  userIdx: index("notifications_user_idx").on(table.userId),
  readIdx: index("notifications_read_idx").on(table.readAt),
}));

// ---------------------------------------------------------------------------
// Relations (for Drizzle's relational query API)
// ---------------------------------------------------------------------------

const usersRelations = relations(users, ({ many }) => ({
  familyMemberships: many(familyMembers),
  createdTasks: many(tasks, { relationName: "createdTasks" }),
  assignedTasks: many(tasks, { relationName: "assignedTasks" }),
  notifications: many(notifications),
}));

const familiesRelations = relations(families, ({ many }) => ({
  members: many(familyMembers),
  tasks: many(tasks),
  invitations: many(invitations),
}));

const familyMembersRelations = relations(familyMembers, ({ one }) => ({
  family: one(families, { fields: [familyMembers.familyId], references: [families.id] }),
  user: one(users, { fields: [familyMembers.userId], references: [users.id] }),
}));

const invitationsRelations = relations(invitations, ({ one }) => ({
  family: one(families, { fields: [invitations.familyId], references: [families.id] }),
  invitedBy: one(users, { fields: [invitations.invitedById], references: [users.id] }),
}));

const tasksRelations = relations(tasks, ({ one, many }) => ({
  family: one(families, { fields: [tasks.familyId], references: [families.id] }),
  parentTask: one(tasks, { fields: [tasks.parentTaskId], references: [tasks.id], relationName: "subtasks" }),
  subtasks: many(tasks, { relationName: "subtasks" }),
  createdBy: one(users, { fields: [tasks.createdById], references: [users.id], relationName: "createdTasks" }),
  assignedTo: one(users, { fields: [tasks.assignedToId], references: [users.id], relationName: "assignedTasks" }),
  messages: many(taskMessages),
  history: many(taskHistory),
}));

const taskMessagesRelations = relations(taskMessages, ({ one }) => ({
  task: one(tasks, { fields: [taskMessages.taskId], references: [tasks.id] }),
  sender: one(users, { fields: [taskMessages.senderId], references: [users.id] }),
}));

const taskHistoryRelations = relations(taskHistory, ({ one }) => ({
  task: one(tasks, { fields: [taskHistory.taskId], references: [tasks.id] }),
  user: one(users, { fields: [taskHistory.userId], references: [users.id] }),
}));

const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, { fields: [notifications.userId], references: [users.id] }),
  task: one(tasks, { fields: [notifications.taskId], references: [tasks.id] }),
}));

module.exports = {
  // enums
  familyRoleEnum,
  taskStatusEnum,
  taskPriorityEnum,
  invitationStatusEnum,
  notificationTypeEnum,
  taskHistoryActionEnum,
  // tables
  users,
  families,
  familyMembers,
  invitations,
  tasks,
  taskMessages,
  taskHistory,
  notifications,
  // relations
  usersRelations,
  familiesRelations,
  familyMembersRelations,
  invitationsRelations,
  tasksRelations,
  taskMessagesRelations,
  taskHistoryRelations,
  notificationsRelations,
};
