# Bug Taxonomy

Use this taxonomy to keep bug notes consistent.

## Severity

- \`sev-1\` production-blocking, data loss, or security-impacting
- \`sev-2\` major feature failure with no reasonable workaround
- \`sev-3\` incorrect behavior with a workaround or limited blast radius
- \`sev-4\` minor defect, polish issue, or low-risk regression

## Category

- \`logic\` incorrect program behavior
- \`integration\` failure across boundaries or services
- \`regression\` previously working behavior now broken
- \`performance\` latency, memory, or throughput issue
- \`ux\` confusing or misleading user experience
- \`docs\` documentation mismatch or missing guidance
- \`test\` flaky or incorrect validation

## Lifecycle

- new
- investigating
- fix-in-progress
- fixed-awaiting-verification
- closed

## Minimum Bug Record

- id
- summary
- symptoms
- severity and category
- affected area
- reproduction steps
- root cause
- fix summary
- verification

## Related Notes

- [[00_Home/Bugs_Index|Bugs Index]]
- [[07_Templates/Bug_Template|Bug Template]]
