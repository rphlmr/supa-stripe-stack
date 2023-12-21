import { CloudArrowUpIcon, TrashIcon } from "@heroicons/react/24/outline";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import {
	Form,
	useActionData,
	useFetcher,
	useLoaderData,
	useNavigation,
} from "@remix-run/react";
import { parseFormAny, useZorm } from "react-zorm";
import { z } from "zod";

import { Button, ButtonLink } from "~/components";
import { requireAuthSession } from "~/modules/auth";
import { createNote, updateNote, deleteNote, getNotes } from "~/modules/note";
import { getUserTierLimit } from "~/modules/user";
import {
	isFormProcessing,
	tw,
	response,
	parseData,
	SupaStripeStackError,
} from "~/utils";

/**
 * This route is just a simple example to show how to use tier limits
 *
 */

export async function loader({ request }: LoaderFunctionArgs) {
	const authSession = await requireAuthSession(request);
	const { userId } = authSession;

	try {
		const [notes, { maxNumberOfNotes }] = await Promise.all([
			getNotes({ userId }),
			getUserTierLimit(userId),
		]);

		return response.ok(
			{
				notes,
				isNotesThresholdReached: Boolean(
					maxNumberOfNotes && notes.length >= maxNumberOfNotes,
				),
				maxNumberOfNotes,
			},
			{ authSession },
		);
	} catch (cause) {
		throw response.error(cause, { authSession });
	}
}

const NoteFormSchema = z.object({
	content: z.string().trim().min(1),
});

export async function action({ request }: ActionFunctionArgs) {
	const authSession = await requireAuthSession(request);
	const { userId } = authSession;

	try {
		switch (request.method.toLowerCase()) {
			case "post": {
				const payload = await parseData(
					parseFormAny(await request.formData()),
					NoteFormSchema,
					"Payload is invalid",
				);

				const [notes, { maxNumberOfNotes }] = await Promise.all([
					getNotes({ userId }),
					getUserTierLimit(userId),
				]);

				if (maxNumberOfNotes && notes.length >= maxNumberOfNotes) {
					throw new SupaStripeStackError({
						message: "You have reached your notes limit",
						metadata: {
							userId,
							maxNumberOfNotes,
							notesCount: notes.length,
						},
					});
				}

				const { content } = payload;

				const createResult = await createNote({
					userId,
					content,
				});

				return response.ok(createResult, { authSession });
			}
			case "patch": {
				const payload = await parseData(
					parseFormAny(await request.formData()),
					NoteFormSchema.extend({
						id: z.string(),
					}),
					"Payload is invalid",
				);

				const { content, id } = payload;

				const updateResult = await updateNote({
					userId,
					content,
					id,
				});

				return response.ok(updateResult, { authSession });
			}
			case "delete": {
				const payload = await parseData(
					parseFormAny(await request.formData()),
					z.object({
						id: z.string(),
					}),
					"Payload is invalid",
				);

				const { id } = payload;

				const deleteResult = await deleteNote({ id, userId });

				return response.ok(deleteResult, { authSession });
			}
			default: {
				return response.error(
					new SupaStripeStackError({
						message: "Invalid HTTP method",
					}),
					{ authSession },
				);
			}
		}
	} catch (cause) {
		return response.error(cause, { authSession });
	}
}

export default function App() {
	const { notes, isNotesThresholdReached, maxNumberOfNotes } =
		useLoaderData<typeof loader>();
	const actionData = useActionData<typeof action>();
	const zo = useZorm("New note", NoteFormSchema);

	const navigation = useNavigation();
	const isProcessing = isFormProcessing(navigation.state);

	return (
		<div className="flex flex-col gap-y-10">
			<div>
				<span>
					<span>
						Notes: {notes.length}/
						{maxNumberOfNotes ? maxNumberOfNotes : "∞"}
					</span>
				</span>
			</div>
			<div className="min-w-0 flex-1">
				<Form
					key={!actionData?.error ? actionData?.id : "new-post"}
					ref={zo.ref}
					method="post"
					className="relative"
				>
					<div
						className={tw(
							"overflow-hidden rounded-lg border-2 border-white bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 focus-within:border-black focus-within:ring-1 focus-within:ring-black",
							isNotesThresholdReached && "opacity-25",
						)}
					>
						<label htmlFor="comment" className="sr-only">
							Add your Notee
						</label>
						<textarea
							minLength={1}
							rows={2}
							name={zo.fields.content()}
							className="block w-full resize-none border-0 bg-transparent py-3 text-xl text-white placeholder:text-white focus:ring-0"
							placeholder="Add your Notee..."
							disabled={isProcessing || isNotesThresholdReached}
						/>

						<div className="flex justify-end p-3">
							<Button
								disabled={
									isProcessing || isNotesThresholdReached
								}
							>
								{isProcessing ? "Creating..." : "Create"}
							</Button>
						</div>
					</div>
					{isNotesThresholdReached ? (
						<ButtonLink
							to="/subscription"
							className="absolute inset-0 flex items-center justify-center p-3"
						>
							<span className="rounded-md p-3 text-center text-xl font-bold text-white">
								Upgrade your plan to add more Note
							</span>
						</ButtonLink>
					) : null}
				</Form>
				{zo.errors.content()?.message && (
					<div className="pt-1 text-red-700" id="email-error">
						{zo.errors.content()?.message}
					</div>
				)}
			</div>
			<ul className="flex flex-col gap-y-4">
				{notes.map(({ id, content }) => (
					<Note key={id} id={id} content={content} />
				))}
			</ul>
		</div>
	);
}

function Note({ id, content }: { id: string; content: string }) {
	const noteFetcher = useFetcher<typeof action>();
	const isProcessing = isFormProcessing(noteFetcher.state);

	return (
		<div className="relative">
			<div
				className={tw(
					"overflow-hidden whitespace-pre rounded-lg border-2 border-white bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 p-3 text-white focus-within:border-black focus-within:ring-1 focus-within:ring-black",
					isProcessing && "opacity-50",
				)}
			>
				<p
					key={id}
					className={
						"block w-full resize-none border-0 py-3 text-lg focus:outline-none"
					}
					contentEditable={!isProcessing}
					suppressContentEditableWarning
					onBlur={(e) => {
						const updatedContent = e.target.textContent ?? "";

						if (content === updatedContent) return;

						noteFetcher.submit(
							{
								content: updatedContent,
								id,
							},
							{ method: "patch" },
						);
					}}
				>
					{content}
				</p>
				<div className="flex justify-end">
					<button disabled={isProcessing}>
						<TrashIcon
							className="h-6 w-6 stroke-2 text-white"
							onClick={() => {
								noteFetcher.submit(
									{
										id,
									},
									{ method: "delete" },
								);
							}}
						/>
					</button>
				</div>
			</div>
			{isProcessing ? (
				<div className="absolute inset-0 flex flex-col items-center justify-center text-white">
					<CloudArrowUpIcon className="h-12 w-12 stroke-2" />
					<span>Saving ...</span>
				</div>
			) : null}
		</div>
	);
}
