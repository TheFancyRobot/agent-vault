/**
 * Empty architecture stub content for newly initialized vaults.
 * Each stub keeps the required headings but stays intentionally thin.
 */

const ARCH_SECTIONS = (title: string, relatedNotes: string[]) => `# ${title}

## Purpose

- Explain what this note covers.

## Overview

- To be populated after vault initialization.

## Key Components

<!-- AGENT-START:architecture-key-components -->
- To be populated after vault initialization.
<!-- AGENT-END:architecture-key-components -->

## Important Paths

<!-- AGENT-START:architecture-important-paths -->
- To be populated after vault initialization.
<!-- AGENT-END:architecture-important-paths -->

## Constraints

- To be populated after vault initialization.

## Failure Modes

- To be populated after vault initialization.

## Related Notes

<!-- AGENT-START:architecture-related-notes -->
${relatedNotes.map((note) => `- ${note}`).join('\n')}
<!-- AGENT-END:architecture-related-notes -->
`;

export const SYSTEM_OVERVIEW_STUB = `---
note_type: architecture
template_version: 2
contract_version: 1
title: System Overview
architecture_id: "ARCH-0001"
status: active
owner: ""
reviewed_on: "YYYY-MM-DD"
created: "YYYY-MM-DD"
updated: "YYYY-MM-DD"
related_notes:
  - "[[01_Architecture/Domain_Model|Domain Model]]"
  - "[[01_Architecture/Code_Map|Code Map]]"
  - "[[01_Architecture/Integration_Map|Integration Map]]"
  - "[[01_Architecture/Agent_Workflow|Agent Workflow]]"
tags:
  - agent-vault
  - architecture
---

${ARCH_SECTIONS('System Overview', [
  '[[01_Architecture/Domain_Model|Domain Model]]',
  '[[01_Architecture/Code_Map|Code Map]]',
  '[[01_Architecture/Integration_Map|Integration Map]]',
  '[[01_Architecture/Agent_Workflow|Agent Workflow]]',
])}` as string;

export const CODE_MAP_STUB = `---
note_type: architecture
template_version: 2
contract_version: 1
title: Code Map
architecture_id: "ARCH-0002"
status: active
owner: ""
reviewed_on: "YYYY-MM-DD"
created: "YYYY-MM-DD"
updated: "YYYY-MM-DD"
related_notes:
  - "[[01_Architecture/System_Overview|System Overview]]"
  - "[[01_Architecture/Code_Graph|Code Graph]]"
tags:
  - agent-vault
  - architecture
---

${ARCH_SECTIONS('Code Map', [
  '[[01_Architecture/System_Overview|System Overview]]',
  '[[01_Architecture/Code_Graph|Code Graph]]',
])}` as string;

export const AGENT_WORKFLOW_STUB = `---
note_type: architecture
template_version: 2
contract_version: 1
title: Agent Workflow
architecture_id: "ARCH-0003"
status: active
owner: ""
reviewed_on: "YYYY-MM-DD"
created: "YYYY-MM-DD"
updated: "YYYY-MM-DD"
related_notes:
  - "[[01_Architecture/System_Overview|System Overview]]"
tags:
  - agent-vault
  - architecture
---

${ARCH_SECTIONS('Agent Workflow', [
  '[[01_Architecture/System_Overview|System Overview]]',
  '[[06_Shared_Knowledge/Agent_Workflow_Playbooks|Agent Workflow Playbooks]]',
])}` as string;

export const DOMAIN_MODEL_STUB = `---
note_type: architecture
template_version: 2
contract_version: 1
title: Domain Model
architecture_id: "ARCH-0004"
status: active
owner: ""
reviewed_on: "YYYY-MM-DD"
created: "YYYY-MM-DD"
updated: "YYYY-MM-DD"
related_notes:
  - "[[01_Architecture/System_Overview|System Overview]]"
tags:
  - agent-vault
  - architecture
---

${ARCH_SECTIONS('Domain Model', [
  '[[01_Architecture/System_Overview|System Overview]]',
])}` as string;

export const INTEGRATION_MAP_STUB = `---
note_type: architecture
template_version: 2
contract_version: 1
title: Integration Map
architecture_id: "ARCH-0005"
status: active
owner: ""
reviewed_on: "YYYY-MM-DD"
created: "YYYY-MM-DD"
updated: "YYYY-MM-DD"
related_notes:
  - "[[01_Architecture/System_Overview|System Overview]]"
tags:
  - agent-vault
  - architecture
---

${ARCH_SECTIONS('Integration Map', [
  '[[01_Architecture/System_Overview|System Overview]]',
])}` as string;
