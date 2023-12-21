import React, { createContext, useContext, useMemo } from "react";

import type { Locales } from "remix-utils/locales/server";

import { SupaStripeStackError } from "./error";

type LocaleContext = {
	locales: Locales;
	timeZone: string;
};

type LocaleProviderProps = {
	locales: Locales;
	timeZone: string;
	children: React.ReactNode;
};

const Context = createContext<LocaleContext | null>(null);

export const LocaleProvider = ({
	locales,
	timeZone,
	children,
}: LocaleProviderProps) => {
	const value = useMemo(() => ({ locales, timeZone }), [locales, timeZone]);

	return <Context.Provider value={value}>{children}</Context.Provider>;
};

export const useLocales = () => {
	const context = useContext(Context);

	if (!context) {
		throw new SupaStripeStackError({
			message: `useLocales must be used within a LocaleProvider.`,
		});
	}
	return context;
};

//@credits https://donavon.com/blog/remix-locale
