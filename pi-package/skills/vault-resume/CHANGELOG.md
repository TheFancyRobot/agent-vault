# Changelog

All notable changes to the vault-resume skill will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-04-06

### Added
- Initial implementation of vault-resume skill
- Ability to resume from most recent session
- Ability to resume from specific session by ID
- Automatic determination of continuation target
- Creation of continuation session with handoff information
- Loading of focused context for continuation
- Readiness check transition
- Session state maintenance throughout conversation
- Pi-teams integration support
- Comprehensive documentation (README.md)
- Test suite for core functionality

### Features
- **Session Location**: Scans `.agent-vault/05_Sessions/` for session notes sorted by timestamp
- **Continuation Target**: Determines next step based on priority order (in-progress → next incomplete → phase close-out → next phase)
- **Context Loading**: Uses vault_traverse to load related notes, bugs, and decisions
- **Session Creation**: Creates new session with carried-forward state and references
- **Handoff Completion**: Updates previous session status and completion summary
- **Readiness Check**: Validates step is ready for execution before proceeding

### Dependencies
- Requires Agent Vault structure (`.agent-vault/` directory)
- Requires session notes in `05_Sessions/`
- Requires phase and step notes with proper frontmatter
- Integrates with vault tools: `vault_create`, `vault_mutate`, `vault_traverse`

[1.0.0]: https://github.com/fancyrobot/agent-vault/releases/tag/vault-resume-1.0.0