'use client';

import { McpPromptEditor } from '@/components/staff/mcp-prompt';
import { StaffShell } from '@/components/staff/staff-shell';

export default function StaffMcpPromptPage() {
  return <StaffShell tab="mcp-prompt"><McpPromptEditor /></StaffShell>;
}
