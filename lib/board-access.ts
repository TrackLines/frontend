// Board settings belong to org admins and leaders of the board's linked team.
export function canManageBoard(role: { admin: boolean; leads: string[] }, teamId?: string | null): boolean {
  return role.admin || (!!teamId && role.leads.includes(teamId));
}
