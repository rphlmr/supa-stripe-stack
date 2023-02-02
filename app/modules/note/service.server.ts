import { db } from "~/database";
import { failure, success } from "~/utils/resolvers";

import type { Note } from "./types";

const tag = "Note service 📝";

export async function getNotes({ userId }: Pick<Note, "userId">) {
  try {
    const result = await db.note.findMany({
      where: { userId },
      select: { id: true, content: true },
      orderBy: { updatedAt: "desc" },
    });

    return success(result);
  } catch (cause) {
    return failure({
      cause,
      message: `Unable to get notes`,
      metadata: { userId },
      tag,
    });
  }
}

export async function createNote({
  content,
  userId,
}: Pick<Note, "content" | "userId">) {
  try {
    const result = await db.note.create({
      data: {
        content,
        userId,
      },

      select: { id: true, updatedAt: true },
    });

    return success(result);
  } catch (cause) {
    return failure({
      cause,
      message: `Unable to create the note`,
      metadata: { userId, content },
      tag,
    });
  }
}

export async function updateNote({
  content,
  userId,
  id,
}: Pick<Note, "content" | "userId" | "id">) {
  try {
    const result = await db.note.update({
      where: { id, userId },
      data: {
        content,
      },
      select: { id: true, updatedAt: true },
    });

    return success(result);
  } catch (cause) {
    return failure({
      cause,
      message: `Unable to create the note`,
      metadata: { userId, content },
      tag,
    });
  }
}

export async function deleteNote({ id, userId }: Pick<Note, "id" | "userId">) {
  try {
    const result = await db.note.delete({
      where: { id, userId },
      select: { id: true },
    });

    return success(result);
  } catch (cause) {
    return failure({
      cause,
      message: `Unable to delete the note`,
      metadata: { userId, id },
      tag,
    });
  }
}
