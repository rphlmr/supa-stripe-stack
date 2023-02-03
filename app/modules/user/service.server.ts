import { db } from "~/database";
import { stripe } from "~/integrations/stripe";
import type { AuthSession } from "~/modules/auth";
import {
  createEmailAuthAccount,
  signInWithEmail,
  deleteAuthAccount,
} from "~/modules/auth";
import { failure, success } from "~/utils/resolvers";

import type { User } from "./types";

const tag = "User service 🧑";

type UserCreatePayload = Pick<AuthSession, "userId" | "email"> &
  Pick<User, "name">;

export async function getUserByEmail(email: User["email"]) {
  try {
    const user = await db.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    return success(user);
  } catch (cause) {
    return failure({
      cause,
      message: "Unable to get user by email",
      metadata: { email },
      tag,
    });
  }
}

async function createUser({ email, userId, name }: UserCreatePayload) {
  try {
    const { id: customerId } = await stripe.customers.create({
      email,
      name,
    });

    const user = await db.user.create({
      data: {
        email,
        id: userId,
        customerId,
        name,
        tierId: "free",
      },
    });

    return success(user);
  } catch (cause) {
    return failure({
      cause,
      message: "Unable to create user",
      metadata: { email, userId, name },
      tag,
    });
  }
}

async function tryCreateUser({ email, userId, name }: UserCreatePayload) {
  const user = await createUser({
    userId,
    email,
    name,
  });

  // At this point, user auth account is created but we are unable to store it in User table
  // We should delete the user account to allow retry create account again
  if (user.error) {
    // We mostly trust that it will be deleted.
    // If it's not the case, the user will face on a "user already exists" kind of error.
    // It'll require manual intervention to remove the account in Supabase Auth dashboard.
    await deleteAuthAccount(userId);
  }

  return user;
}

export async function createUserAccount(payload: {
  email: string;
  password: string;
  name: string;
}) {
  const { email, password, name } = payload;

  try {
    const newAuthAccount = await createEmailAuthAccount(email, password);

    // ok, no user account created
    if (newAuthAccount.error) {
      throw newAuthAccount.error;
    }

    const authSession = await signInWithEmail(email, password);

    // At this point, user auth account is created but we are unable to sign in
    // We should delete the user account to allow retry create account again
    if (authSession.error) {
      // We mostly trust that it will be deleted.
      // If it's not the case, the user will face on a "user already exists" kind of error.
      // It'll require manual intervention to remove the account in Supabase Auth dashboard.
      await deleteAuthAccount(newAuthAccount.data.id);
      throw authSession.error;
    }

    const { id: userId } = newAuthAccount.data;

    const user = await tryCreateUser({
      email,
      userId,
      name,
    });

    if (user.error) {
      throw user.error;
    }

    return success(authSession.data);
  } catch (cause) {
    return failure({
      cause,
      message: "Unable to create user account",
      metadata: { email, name },
      tag,
    });
  }
}

export async function getUserTierLimit(id: User["id"]) {
  try {
    const {
      tier: { tierLimit },
    } = await db.user.findUniqueOrThrow({
      where: { id },
      select: {
        tier: {
          include: { tierLimit: { select: { maxNumberOfNotes: true } } },
        },
      },
    });

    return success(tierLimit);
  } catch (cause) {
    return failure({
      cause,
      message: "Unable to find user tier limit",
      metadata: { id },
      tag,
    });
  }
}

export async function getUserTier(id: User["id"]) {
  try {
    const { tier } = await db.user.findUniqueOrThrow({
      where: { id },
      select: {
        tier: { select: { id: true, name: true } },
      },
    });

    return success(tier);
  } catch (cause) {
    return failure({
      cause,
      message: "Unable to find user tier",
      metadata: { id },
      tag,
    });
  }
}

export async function getBillingInfo(id: User["id"]) {
  try {
    const { customerId, currency } = await db.user.findUniqueOrThrow({
      where: { id },
      select: {
        customerId: true,
        currency: true,
      },
    });

    return success({ customerId, currency });
  } catch (cause) {
    return failure({
      cause,
      message: "Unable to find user stripe info",
      metadata: { id },
      tag,
    });
  }
}

export async function deleteUser(id: User["id"]) {
  try {
    const { data, error } = await getBillingInfo(id);

    if (error) {
      throw error;
    }

    await stripe.customers.del(data.customerId);
    await deleteAuthAccount(id);
    await db.user.delete({ where: { id } });

    return success(true);
  } catch (cause) {
    return failure({
      cause,
      message: "Oups, unable to delete your test account",
      metadata: { id },
      tag,
    });
  }
}
