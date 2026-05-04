import { Router } from "express";
import { db } from "@workspace/db";
import {
  projectsTable,
  tasksTable,
} from "@workspace/db";
import { eq, count, and, lt, sql } from "drizzle-orm";
import {
  CreateProjectBody,
  UpdateProjectBody,
} from "@workspace/api-zod";

const router = Router();

router.get("/projects", async (req, res) => {
  try {
    const projects = await db
      .select()
      .from(projectsTable)
      .orderBy(projectsTable.createdAt);
    res.json(projects);
  } catch (err) {
    req.log.error({ err }, "Failed to list projects");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/projects", async (req, res) => {
  const parsed = CreateProjectBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.message });
  }
  try {
    const { name, description, status, color, dueDate } = parsed.data;
    const [project] = await db
      .insert(projectsTable)
      .values({
        name,
        description: description ?? null,
        status: status ?? "active",
        color: color ?? "#6366f1",
        dueDate: dueDate ? new Date(dueDate) : null,
      })
      .returning();
    res.status(201).json(project);
  } catch (err) {
    req.log.error({ err }, "Failed to create project");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/projects/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  try {
    const [project] = await db
      .select()
      .from(projectsTable)
      .where(eq(projectsTable.id, id));
    if (!project) return res.status(404).json({ error: "Project not found" });
    res.json(project);
  } catch (err) {
    req.log.error({ err }, "Failed to get project");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/projects/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  const parsed = UpdateProjectBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.message });
  }
  try {
    const { name, description, status, color, dueDate } = parsed.data;
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (status !== undefined) updates.status = status;
    if (color !== undefined) updates.color = color;
    if (dueDate !== undefined) updates.dueDate = dueDate ? new Date(dueDate) : null;

    const [project] = await db
      .update(projectsTable)
      .set(updates)
      .where(eq(projectsTable.id, id))
      .returning();
    if (!project) return res.status(404).json({ error: "Project not found" });
    res.json(project);
  } catch (err) {
    req.log.error({ err }, "Failed to update project");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/projects/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  try {
    await db.delete(projectsTable).where(eq(projectsTable.id, id));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete project");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/projects/:id/progress", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  try {
    const tasks = await db
      .select()
      .from(tasksTable)
      .where(eq(tasksTable.projectId, id));

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((t) => t.status === "done").length;
    const inProgressTasks = tasks.filter((t) => t.status === "in_progress").length;
    const blockedTasks = tasks.filter((t) => t.status === "blocked").length;
    const todoTasks = tasks.filter((t) => t.status === "todo").length;
    const now = new Date();
    const overdueCount = tasks.filter(
      (t) => t.dueDate && t.dueDate < now && t.status !== "done"
    ).length;
    const completionPercentage =
      totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    res.json({
      projectId: id,
      totalTasks,
      completedTasks,
      inProgressTasks,
      blockedTasks,
      todoTasks,
      completionPercentage,
      overdueCount,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get project progress");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
