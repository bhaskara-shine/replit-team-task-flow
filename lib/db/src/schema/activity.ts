import {
  pgTable,
  serial,
  text,
  timestamp,
  integer,
  pgEnum,
} from "drizzle-orm/pg-core";

export const activityTypeEnum = pgEnum("activity_type", [
  "task_created",
  "task_updated",
  "task_completed",
  "project_created",
  "project_updated",
  "member_added",
]);

export const activityEntityTypeEnum = pgEnum("activity_entity_type", [
  "task",
  "project",
  "member",
]);

export const activityTable = pgTable("activity", {
  id: serial("id").primaryKey(),
  type: activityTypeEnum("type").notNull(),
  description: text("description").notNull(),
  entityId: integer("entity_id").notNull(),
  entityType: activityEntityTypeEnum("entity_type").notNull(),
  memberId: integer("member_id"),
  memberName: text("member_name"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Activity = typeof activityTable.$inferSelect;
