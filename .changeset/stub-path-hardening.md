---
"@fancyrobot/agent-vault": minor
---

Harden path safety across context compilation, stub caching, and graph traversal:

- Stub writes (manifest and generated stubs) go through a containment- and symlink-safe writer: symlink targets are rejected, and content is written to a unique temp file inside the verified stubs directory and atomically renamed, so neither symlinked nor hard-linked targets can be followed or truncated.
- Source paths are re-validated after symlink resolution in both the stub cache and the context compiler: a symlink resolving outside the project root or to a policy-excluded target is rejected instead of rendered.
- Stub reads treat symlink-escaped stub artifacts as no cache.
- The obsidian graph-resolver fallback is cached together with its degradation warning, so repeated traversals reuse the fallback without silently swallowing the warning.
