import { useLocales } from "~/utils";

export function Time({ date }: { date?: string | null }) {
	const { locales, timeZone } = useLocales();

	if (!date) return <span>-</span>;

	return (
		<time dateTime={date}>
			{new Intl.DateTimeFormat(locales, {
				dateStyle: "medium",
				timeStyle: "medium",
				timeZone,
			}).format(new Date(date))}
		</time>
	);
}
