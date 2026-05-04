import { Router } from "express";
import { db } from "@workspace/db";
import { membersTable, tasksTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  CreateMemberBody,
  UpdateMemberBody,
} from "@workspace/api-zod";

const router = Router();

router.get("/members", async (req, res) => {
  try {
    const members = await db
      .select()
      .from(membersTable)
      .orderBy(membersTable.createdAt);
    res.json(members);
  } catch (err) {
    req.log.error({ err }, "Failed to list members");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/members", async (req, res) => {
  const parsed = CreateMemberBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.message });
  }
  try {
    const { name, email, role, avatarColor } = parsed.data;
    const [member] = await db
      .insert(membersTable)
      .values({
        name,
        email,
        role: role ?? "member",
        avatarColor: avatarColor ?? "#6366f1",
      })
      .returning();
    res.status(201).json(member);
  } catch (err) {
    req.log.error({ err }, "Failed to create member");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/members/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  try {
    const [member] = await db
      .select()
      .from(membersTable)
      .where(eq(membersTable.id, id));
    if (!member) return res.status(404).json({ error: "Member not found" });
    res.json(member);
  } catch (err) {
    req.log.error({ err }, "Failed to get member");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/members/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  const parsed = UpdateMemberBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.message });
  }
  try {
    const { name, email, role, avatarColor } = parsed.data;
    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = name;
    if (email !== undefined) updates.email = email;
    if (role !== undefined) updates.role = role;
    if (avatarColor !== undefined) updates.avatarColor = avatarColor;

    const [member] = await db
      .update(membersTable)
      .set(updates)
      .where(eq(membersTable.id, id))
      .returning();
    if (!member) return res.status(404).json({ error: "Member not found" });
    res.json(member);
  } catch (err) {
    req.log.error({ err }, "Failed to update member");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/members/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  try {
    await db.delete(membersTable).where(eq(membersTable.id, id));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete member");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
