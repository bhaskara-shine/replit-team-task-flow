import { Router } from "express";
import { db } from "@workspace/db";
import {
  tasksTable,
  membersTable,
  activityTable,
} from "@workspace/db";
import { eq, and } from "drizzle-orm";
import {
  CreateTaskBody,
  UpdateTaskBody,
  ListTasksQueryParams,
} from "@workspace/api-zod";

const router = Router();

router.get("/tasks", async (req, res) => {
  const parsed = ListTasksQueryParams.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.message });
  }
  try {
    const { projectId, ownerId, status, priority } = parsed.data;

    const conditions = [];
    if (projectId !== undefined) conditions.push(eq(tasksTable.projectId, projectId));
    if (ownerId !== undefined) conditions.push(eq(tasksTable.ownerId, ownerId));
    if (status !== undefined) conditions.push(eq(tasksTable.status, status));
    if (priority !== undefined) conditions.push(eq(tasksTable.priority, priority));

    const tasks = await db
      .select({
        id: tasksTable.id,
        projectId: tasksTable.projectId,
        title: tasksTable.title,
        description: tasksTable.description,
        status: tasksTable.status,
        priority: tasksTable.priority,
        ownerId: tasksTable.ownerId,
        dueDate: tasksTable.dueDate,
        createdAt: tasksTable.createdAt,
        updatedAt: tasksTable.updatedAt,
        owner: {
          id: membersTable.id,
          name: membersTable.name,
          email: membersTable.email,
          role: membersTable.role,
          avatarColor: membersTable.avatarColor,
          createdAt: membersTable.createdAt,
        },
      })
      .from(tasksTable)
      .leftJoin(membersTable, eq(tasksTable.ownerId, membersTable.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(tasksTable.createdAt);

    const result = tasks.map((t) => ({
      ...t,
      owner: t.owner?.id ? t.owner : null,
    }));

    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Failed to list tasks");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/tasks", async (req, res) => {
  const parsed = CreateTaskBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.message });
  }
  try {
    const { projectId, title, description, status, priority, ownerId, dueDate } =
      parsed.data;

    const [task] = await db
      .insert(tasksTable)
      .values({
        projectId,
        title,
        description: description ?? null,
        status: status ?? "todo",
        priority: priority ?? "medium",
        ownerId: ownerId ?? null,
        dueDate: dueDate ? new Date(dueDate) : null,
      })
      .returning();

    // Log activity
    await db.insert(activityTable).values({
      type: "task_created",
      description: `Task "${title}" was created`,
      entityId: task.id,
      entityType: "task",
    });

    // Fetch with owner
    const [taskWithOwner] = await db
      .select({
        id: tasksTable.id,
        projectId: tasksTable.projectId,
        title: tasksTable.title,
        description: tasksTable.description,
        status: tasksTable.status,
        priority: tasksTable.priority,
        ownerId: tasksTable.ownerId,
        dueDate: tasksTable.dueDate,
        createdAt: tasksTable.createdAt,
        updatedAt: tasksTable.updatedAt,
        owner: {
          id: membersTable.id,
          name: membersTable.name,
          email: membersTable.email,
          role: membersTable.role,
          avatarColor: membersTable.avatarColor,
          createdAt: membersTable.createdAt,
        },
      })
      .from(tasksTable)
      .leftJoin(membersTable, eq(tasksTable.ownerId, membersTable.id))
      .where(eq(tasksTable.id, task.id));

    res.status(201).json({
      ...taskWithOwner,
      owner: taskWithOwner.owner?.id ? taskWithOwner.owner : null,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to create task");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/tasks/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  try {
    const [task] = await db
      .select({
        id: tasksTable.id,
        projectId: tasksTable.projectId,
        title: tasksTable.title,
        description: tasksTable.description,
        status: tasksTable.status,
        priority: tasksTable.priority,
        ownerId: tasksTable.ownerId,
        dueDate: tasksTable.dueDate,
        createdAt: tasksTable.createdAt,
        updatedAt: tasksTable.updatedAt,
        owner: {
          id: membersTable.id,
          name: membersTable.name,
          email: membersTable.email,
          role: membersTable.role,
          avatarColor: membersTable.avatarColor,
          createdAt: membersTable.createdAt,
        },
      })
      .from(tasksTable)
      .leftJoin(membersTable, eq(tasksTable.ownerId, membersTable.id))
      .where(eq(tasksTable.id, id));

    if (!task) return res.status(404).json({ error: "Task not found" });
    res.json({ ...task, owner: task.owner?.id ? task.owner : null });
  } catch (err) {
    req.log.error({ err }, "Failed to get task");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/tasks/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  const parsed = UpdateTaskBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.message });
  }
  try {
    const { title, description, status, priority, ownerId, dueDate, projectId } =
      parsed.data;
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (status !== undefined) updates.status = status;
    if (priority !== undefined) updates.priority = priority;
    if (ownerId !== undefined) updates.ownerId = ownerId;
    if (dueDate !== undefined) updates.dueDate = dueDate ? new Date(dueDate) : null;
    if (projectId !== undefined) updates.projectId = projectId;

    const [updated] = await db
      .update(tasksTable)
      .set(updates)
      .where(eq(tasksTable.id, id))
      .returning();

    if (!updated) return res.status(404).json({ error: "Task not found" });

    if (status === "done") {
      await db.insert(activityTable).values({
        type: "task_completed",
        description: `Task "${updated.title}" was completed`,
        entityId: updated.id,
        entityType: "task",
      });
    } else if (status !== undefined) {
      await db.insert(activityTable).values({
        type: "task_updated",
        description: `Task "${updated.title}" status changed to ${status}`,
        entityId: updated.id,
        entityType: "task",
      });
    }

    // Fetch with owner
    const [taskWithOwner] = await db
      .select({
        id: tasksTable.id,
        projectId: tasksTable.projectId,
        title: tasksTable.title,
        description: tasksTable.description,
        status: tasksTable.status,
        priority: tasksTable.priority,
        ownerId: tasksTable.ownerId,
        dueDate: tasksTable.dueDate,
        createdAt: tasksTable.createdAt,
        updatedAt: tasksTable.updatedAt,
        owner: {
          id: membersTable.id,
          name: membersTable.name,
          email: membersTable.email,
          role: membersTable.role,
          avatarColor: membersTable.avatarColor,
          createdAt: membersTable.createdAt,
        },
      })
      .from(tasksTable)
      .leftJoin(membersTable, eq(tasksTable.ownerId, membersTable.id))
      .where(eq(tasksTable.id, id));

    res.json({
      ...taskWithOwner,
      owner: taskWithOwner?.owner?.id ? taskWithOwner.owner : null,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to update task");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/tasks/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  try {
    await db.delete(tasksTable).where(eq(tasksTable.id, id));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete task");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
