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

const SESSION_STATE_MAP: Record<string, string> = {
  PREPARING: 'preparing', IN_PROGRESS: 'in_progress', PAUSED: 'paused',
  COMPLETED: 'completed', EMERGENCY_STOPPED: 'emergency_stopped',
};
const EMDR_PHASE_MAP: Record<string, string> = {
  PREPARATION: 'preparation', ASSESSMENT: 'assessment', DESENSITIZATION: 'desensitization',
  INSTALLATION: 'installation', BODY_SCAN: 'body_scan', CLOSURE: 'closure',
  REEVALUATION: 'reevaluation', RESOURCE_INSTALLATION: 'resource_installation',
};

/**
 * Converts a shared (lowercase) EMDRPhase value — or an already-uppercase
 * Prisma key — into the Prisma enum key (UPPERCASE) the database column
 * expects. The inverse of the lowercasing done by {@link adaptPrismaSession}.
 * Returns `undefined` for an unrecognized phase.
 */
export function toPrismaPhase(phase: string): string | undefined {
  if (typeof phase !== 'string') return undefined;
  const key = phase.toUpperCase();
  return key in EMDR_PHASE_MAP ? key : undefined;
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

  if (typeof adapted.state === 'string' && SESSION_STATE_MAP[adapted.state]) {
    adapted.state = SESSION_STATE_MAP[adapted.state];
  }
  if (typeof adapted.phase === 'string' && EMDR_PHASE_MAP[adapted.phase]) {
    adapted.phase = EMDR_PHASE_MAP[adapted.phase];
  }

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
