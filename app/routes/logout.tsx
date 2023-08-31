import type { ActionArgs } from "@remix-run/node";

import { destroyAuthSession } from "~/modules/auth";
import { response } from "~/utils";

export async function action({ request }: ActionArgs) {
	return destroyAuthSession(request);
}

export async function loader() {
	return response.redirect("/", { authSession: null });
}
