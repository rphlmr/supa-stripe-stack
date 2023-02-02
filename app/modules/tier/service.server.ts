import { db } from "~/database";
import { failure, success } from "~/utils/resolvers";

import type { TierId, Tier } from "./types";

const tag = "Tier service 📊";

export async function updateTier(
  id: TierId,
  { name, active, description }: Pick<Tier, "name" | "active" | "description">
) {
  try {
    const update = await db.tier.update({
      where: {
        id,
      },
      data: {
        name,
        active,
        description,
      },
      select: { updatedAt: true, id: true },
    });

    return success(update);
  } catch (cause) {
    return failure({
      cause,
      message: "Unable to update tier",
      metadata: { id, name, active, description },
      tag,
    });
  }
}
