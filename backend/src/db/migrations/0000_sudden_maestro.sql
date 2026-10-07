CREATE TYPE "public"."family_role" AS ENUM('LEADER', 'MEMBER');--> statement-breakpoint
CREATE TYPE "public"."task_status" AS ENUM('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANNOT_COMPLETE', 'CANCELLED', 'EXPIRED');--> statement-breakpoint
CREATE TYPE "public"."task_priority" AS ENUM('LOW', 'MEDIUM', 'HIGH');--> statement-breakpoint
CREATE TYPE "public"."invitation_status" AS ENUM('PENDING', 'ACCEPTED', 'REJECTED', 'EXPIRED');--> statement-breakpoint
CREATE TYPE "public"."notification_type" AS ENUM('TASK_ASSIGNED', 'TASK_REASSIGNED', 'TASK_COMPLETED', 'TASK_CANNOT_COMPLETE', 'TASK_MESSAGE', 'TASK_EXPIRED', 'TASK_CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."task_history_action" AS ENUM('CREATED', 'UPDATED', 'ASSIGNED', 'REASSIGNED', 'STARTED', 'COMPLETED', 'CANNOT_COMPLETE', 'CANCELLED', 'STATUS_CHANGED');--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(120) NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "families" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(120) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "family_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"family_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"role" "family_role" NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invitations" (
	"id" serial PRIMARY KEY NOT NULL,
	"family_id" integer NOT NULL,
	"email" varchar(255) NOT NULL,
	"token" varchar(255) NOT NULL,
	"status" "invitation_status" DEFAULT 'PENDING' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"invited_by_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" serial PRIMARY KEY NOT NULL,
	"family_id" integer NOT NULL,
	"parent_task_id" integer,
	"created_by_id" integer NOT NULL,
	"assigned_to_id" integer,
	"title" varchar(200) NOT NULL,
	"description" text,
	"status" "task_status" DEFAULT 'PENDING' NOT NULL,
	"priority" "task_priority" DEFAULT 'MEDIUM' NOT NULL,
	"due_date" date NOT NULL,
	"due_time" time,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"cannot_complete_reason" text,
	"cancelled_at" timestamp with time zone,
	"cancelled_by_id" integer,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"task_id" integer NOT NULL,
	"sender_id" integer NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"task_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"action" "task_history_action" NOT NULL,
	"previous_status" "task_status",
	"new_status" "task_status",
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"type" "notification_type" NOT NULL,
	"task_id" integer,
	"message" text NOT NULL,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "family_members" ADD CONSTRAINT "family_members_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "family_members" ADD CONSTRAINT "family_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_invited_by_id_users_id_fk" FOREIGN KEY ("invited_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_parent_task_id_tasks_id_fk" FOREIGN KEY ("parent_task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assigned_to_id_users_id_fk" FOREIGN KEY ("assigned_to_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_cancelled_by_id_users_id_fk" FOREIGN KEY ("cancelled_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_messages" ADD CONSTRAINT "task_messages_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_messages" ADD CONSTRAINT "task_messages_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_history" ADD CONSTRAINT "task_history_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_history" ADD CONSTRAINT "task_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_unique" ON "users" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "family_members_family_user_unique" ON "family_members" USING btree ("family_id","user_id");--> statement-breakpoint
CREATE INDEX "family_members_user_idx" ON "family_members" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "invitations_token_unique" ON "invitations" USING btree ("token");--> statement-breakpoint
CREATE INDEX "invitations_family_idx" ON "invitations" USING btree ("family_id");--> statement-breakpoint
CREATE INDEX "invitations_email_idx" ON "invitations" USING btree ("email");--> statement-breakpoint
CREATE INDEX "tasks_family_idx" ON "tasks" USING btree ("family_id");--> statement-breakpoint
CREATE INDEX "tasks_parent_idx" ON "tasks" USING btree ("parent_task_id");--> statement-breakpoint
CREATE INDEX "tasks_assigned_idx" ON "tasks" USING btree ("assigned_to_id");--> statement-breakpoint
CREATE INDEX "tasks_status_idx" ON "tasks" USING btree ("status");--> statement-breakpoint
CREATE INDEX "tasks_due_date_idx" ON "tasks" USING btree ("due_date");--> statement-breakpoint
CREATE INDEX "task_messages_task_idx" ON "task_messages" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX "task_history_task_idx" ON "task_history" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX "notifications_user_idx" ON "notifications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "notifications_read_idx" ON "notifications" USING btree ("read_at");