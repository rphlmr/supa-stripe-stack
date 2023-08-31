import { db } from "~/database";
import { SupaStripeStackError } from "~/utils";

import type { TierId, Tier } from "./types";

const tag = "Tier service 📊";

export async function updateTier(
	tierId: TierId,
	{
		name,
		active,
		description,
	}: Pick<Tier, "name" | "active" | "description">,
) {
	try {
		const { id, updatedAt } = await db.tier.update({
			where: {
				id: tierId,
			},
			data: {
				name,
				active,
				description,
			},
			select: { updatedAt: true, id: true },
		});

		return { id, updatedAt };
	} catch (cause) {
		throw new SupaStripeStackError({
			cause,
			message: "Unable to update tier",
			metadata: { tierId, name, active, description },
			tag,
		});
	}
}
