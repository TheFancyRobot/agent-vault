# Implementation Notes

- Registered `vault_extract` in `pi-package/extensions/index.ts` with the same selector shape as the MCP server (`note_path`, `heading`, `block`, `include_markers`) and delegated execution to the shared extraction helper.
- Added pi-extension coverage in `test/core/vault-extract-pi-extension.test.ts` and `test/pi-extension-vault-extract.test.ts` to verify schema registration plus heading/block extraction behavior.
- Fixed stale workflow prompt references so shared prompt templates call the current tool names (`vault_refresh`, `vault_validate`, `vault_create`) rather than removed aliases.
- Added `test/core/vault-help-pi-extension.test.ts` and wrapped `vault_help` error handling in MCP/pi paths so unknown commands return structured tool errors instead of thrown exceptions.

## Related Notes

- Step: [[02_Phases/Phase_02_targeted_context_extraction/Steps/Step_02_expose-vault-extract-in-pi-extension-and-workflow-docs|STEP-02-02 Expose vault_extract in pi extension and workflow docs]]
- Phase: [[02_Phases/Phase_02_targeted_context_extraction/Phase|Phase 02 targeted context extraction]]
