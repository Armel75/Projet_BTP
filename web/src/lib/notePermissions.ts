import { User } from "../types";
import { ExecutionNote } from "../types";

/**
 * Determines whether the current user is allowed to act on a given execution note
 * (pin / resolve / archive).
 *
 * Authorization hierarchy (first match wins):
 *  1. User has `project:read:all` permission → Admin / Directeur bypass → ✅ always allowed
 *  2. User is the note creator (`created_by`)                           → ✅ allowed
 *  3. User is the project manager of the note's project                 → ✅ allowed
 *  4. Otherwise                                                         → ❌ denied
 *
 * NOTE: This is a UI helper that mirrors the backend authorization logic in
 * `ExecutionNoteController.authorizeNoteAction`. Both layers must stay in sync.
 */
export function canActOnNote(user: User | null, note: ExecutionNote): boolean {
  if (!user) return false;

  // 1. Admin / Directeur de projet bypass
  if (user.permissions?.includes("project:read:all")) return true;

  const userId = Number(user.id);

  // 2. Creator
  if (note.created_by != null && note.created_by === userId) return true;

  // 3. Project manager
  if (
    note.project?.project_manager_id != null &&
    note.project.project_manager_id === userId
  ) {
    return true;
  }

  return false;
}
