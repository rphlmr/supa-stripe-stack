// find cookie by name from request headers
export function getCookie(name: string, headers: Headers) {
	const cookie = headers.get("cookie");
	if (!cookie) return;

	const match = cookie.match(new RegExp(`(^| )${name}=([^;]+)`));
	if (match) return match[2];
}
