// Board settings belong to org admins and leaders of the board's linked team.
export function canManageBoard(role: { admin: boolean; leads: string[] }, teamId?: string | null): boolean {
  return role.admin || (!!teamId && role.leads.includes(teamId));
}

// canManageRoadmaps: whether someone can create and change a project's roadmaps: an org admin, or a
// leader of a team with a board in the project, the same rule as the backend (TL-413). Unknown = no.
export function canManageRoadmaps(role: { admin: boolean; leads: string[] } | null, boards: { team_id?: string | null }[]): boolean {
  return !!role && (role.admin || boards.some((b) => !!b.team_id && role.leads.includes(b.team_id)));
}

// canRefine: whether someone can run refinement for a project: an org admin, or a team leader of one
// of its sprint boards (TL-241). Unknown role (still loading, or failed) = no.
export function canRefine(role: { admin: boolean; leads: string[] } | null, boards: { style?: string; team_id?: string | null }[]): boolean {
  return !!role && boards.some((b) => b.style !== 'kanban' && canManageBoard(role, b.team_id));
}
