---
note_type: architecture
template_version: 2
contract_version: 1
title: "<architecture note title>"
architecture_id: "ARCH-0000"
status: active
owner: ""
reviewed_on: "YYYY-MM-DD"
created: "YYYY-MM-DD"
updated: "YYYY-MM-DD"
related_notes: []
tags:
  - agent-vault
  - architecture
---

# Architecture Template

Use this note when a subsystem or cross-cutting concern needs durable explanation. This note is the source of truth for the area it covers. A new engineer should be able to read it and understand the shape of the system before editing code. Link outward to the related phase and decision notes so this record stays connected to execution and governance; use [[07_Templates/Phase_Template|Phase Template]] and [[07_Templates/Decision_Template|Decision Template]] as the neighboring note contracts.

## Purpose

- Explain what part of the system this note covers.
- Name the main responsibility and the key question this note answers.

## Overview

- Describe the subsystem at a high level.
- Explain how it fits into the wider product or monorepo.

## Key Components

<!-- AGENT-START:architecture-key-components -->
- Component or module name - Responsibility.
<!-- AGENT-END:architecture-key-components -->

## Important Paths

<!-- AGENT-START:architecture-important-paths -->
- \`packages/...\` - Why this path matters.
<!-- AGENT-END:architecture-important-paths -->

## Constraints

- Record invariants, contracts, dependencies, or operational rules that should not be broken.
- Include anything future changes must preserve.

## Failure Modes

- List the ways this area can fail.
- Include triggers, symptoms, and what to inspect first.

## Related Notes

<!-- AGENT-START:architecture-related-notes -->
- [[01_Architecture/<related note>|<related note>]]
- [[04_Decisions/<decision note>|<decision note>]]
- [[02_Phases/<phase path>/Phase|<phase name>]]
<!-- AGENT-END:architecture-related-notes -->
