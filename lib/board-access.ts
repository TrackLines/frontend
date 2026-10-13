// Board settings belong to org admins and leaders of the board's linked team.
export function canManageBoard(role: { admin: boolean; leads: string[] }, teamId?: string | null): boolean {
  return role.admin || (!!teamId && role.leads.includes(teamId));
}

// canRefine: whether someone can run refinement for a project: an org admin, or a team leader of one
// of its sprint boards (TL-241). Unknown role (still loading, or failed) = no.
export function canRefine(role: { admin: boolean; leads: string[] } | null, boards: { style?: string; team_id?: string | null }[]): boolean {
  return !!role && boards.some((b) => b.style !== 'kanban' && canManageBoard(role, b.team_id));
}
