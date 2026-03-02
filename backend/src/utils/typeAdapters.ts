/**
 * Type adapters for converting Prisma query results to application types.
 *
 * Prisma returns `null` for optional fields, but the shared TypeScript
 * interfaces expect `undefined`. These utilities bridge that gap so that
 * the rest of the application can work with clean `T | undefined` types
 * instead of `T | null`.
 */

/**
 * Converts every `null` property value in a flat object to `undefined`.
 * Nested objects are **not** recursed into — use the dedicated adapt*
 * helpers for specific Prisma models that contain relations.
 */
export function nullToUndefined<T extends Record<string, unknown>>(
  obj: T,
): { [K in keyof T]: Exclude<T[K], null> | (null extends T[K] ? undefined : never) } {
  const result = { ...obj };
  for (const key of Object.keys(result)) {
    if (result[key] === null) {
      (result as Record<string, unknown>)[key] = undefined;
    }
  }
  return result as any;
}

/**
 * Adapts a Prisma EMDRSession row (and optional nested relations) so that
 * all `null` values become `undefined`.
 *
 * Handles the following nested relations when present:
 *   - `targetMemory`
 *   - `user`
 *   - `user.safetyProfile`
 */
export function adaptPrismaSession<T extends Record<string, unknown>>(prismaSession: T): any {
  const adapted: Record<string, unknown> = { ...nullToUndefined(prismaSession) };

  if (prismaSession.targetMemory && typeof prismaSession.targetMemory === 'object') {
    adapted.targetMemory = nullToUndefined(prismaSession.targetMemory as Record<string, unknown>);
  }

  if (prismaSession.user && typeof prismaSession.user === 'object') {
    const user = nullToUndefined(prismaSession.user as Record<string, unknown>);
    delete (user as Record<string, unknown>).hashedPassword;

    const rawUser = prismaSession.user as Record<string, unknown>;
    if (rawUser.safetyProfile && typeof rawUser.safetyProfile === 'object') {
      (user as Record<string, unknown>).safetyProfile = nullToUndefined(
        rawUser.safetyProfile as Record<string, unknown>,
      );
    }

    adapted.user = user;
  }

  if (Array.isArray(prismaSession.sets)) {
    adapted.sets = (prismaSession.sets as Record<string, unknown>[]).map(nullToUndefined);
  }

  if (Array.isArray(prismaSession.safetyChecks)) {
    adapted.safetyChecks = (prismaSession.safetyChecks as Record<string, unknown>[]).map(nullToUndefined);
  }

  return adapted;
}

/**
 * Adapts an array of Prisma EMDRSession rows.
 */
export function adaptPrismaSessions<T extends Record<string, unknown>>(sessions: T[]): any[] {
  return sessions.map(adaptPrismaSession);
}

/**
 * Adapts a Prisma EMDRSet row so that all `null` values become `undefined`.
 */
export function adaptPrismaSet<T extends Record<string, unknown>>(prismaSet: T): any {
  return nullToUndefined(prismaSet);
}
