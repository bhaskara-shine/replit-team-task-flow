import { Router } from "express";
import { db } from "@workspace/db";
import {
  projectsTable,
  tasksTable,
  membersTable,
  activityTable,
} from "@workspace/db";
import { eq, lt, and, gte, lte } from "drizzle-orm";
import {
  GetRecentActivityQueryParams,
  GetUpcomingDeadlinesQueryParams,
} from "@workspace/api-zod";

const router = Router();

router.get("/dashboard/summary", async (req, res) => {
  try {
    const projects = await db.select().from(projectsTable);
    const tasks = await db.select().from(tasksTable);
    const members = await db.select().from(membersTable);

    const now = new Date();
    const totalProjects = projects.length;
    const activeProjects = projects.filter((p) => p.status === "active").length;
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((t) => t.status === "done").length;
    const inProgressTasks = tasks.filter((t) => t.status === "in_progress").length;
    const overdueTasks = tasks.filter(
      (t) => t.dueDate && t.dueDate < now && t.status !== "done"
    ).length;
    const totalMembers = members.length;
    const completionRate =
      totalTasks > 0
        ? Math.round((completedTasks / totalTasks) * 100 * 10) / 10
        : 0;

    res.json({
      totalProjects,
      activeProjects,
      totalTasks,
      completedTasks,
      inProgressTasks,
      overdueTasks,
      totalMembers,
      completionRate,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get dashboard summary");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/dashboard/activity", async (req, res) => {
  const parsed = GetRecentActivityQueryParams.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.message });
  }
  try {
    const limit = parsed.data.limit ?? 10;
    const activity = await db
      .select()
      .from(activityTable)
      .orderBy(activityTable.createdAt)
      .limit(limit);

    // Return in descending order
    res.json(activity.reverse());
  } catch (err) {
    req.log.error({ err }, "Failed to get activity");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/dashboard/workload", async (req, res) => {
  try {
    const members = await db.select().from(membersTable);
    const tasks = await db.select().from(tasksTable);

    const workload = members.map((member) => {
      const memberTasks = tasks.filter((t) => t.ownerId === member.id);
      return {
        memberId: member.id,
        memberName: member.name,
        avatarColor: member.avatarColor,
        totalTasks: memberTasks.length,
        completedTasks: memberTasks.filter((t) => t.status === "done").length,
        inProgressTasks: memberTasks.filter((t) => t.status === "in_progress")
          .length,
        todoTasks: memberTasks.filter((t) => t.status === "todo").length,
        blockedTasks: memberTasks.filter((t) => t.status === "blocked").length,
      };
    });

    res.json(workload);
  } catch (err) {
    req.log.error({ err }, "Failed to get workload");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/dashboard/upcoming", async (req, res) => {
  const parsed = GetUpcomingDeadlinesQueryParams.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.message });
  }
  try {
    const days = parsed.data.days ?? 7;
    const now = new Date();
    const future = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

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
      .where(
        and(
          gte(tasksTable.dueDate, now),
          lte(tasksTable.dueDate, future)
        )
      )
      .orderBy(tasksTable.dueDate);

    res.json(
      tasks.map((t) => ({ ...t, owner: t.owner?.id ? t.owner : null }))
    );
  } catch (err) {
    req.log.error({ err }, "Failed to get upcoming deadlines");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
