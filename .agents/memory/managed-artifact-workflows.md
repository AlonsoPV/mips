---
name: Managed artifact workflows
description: Handling artifact-owned workflows when an imported app replaces a project scaffold.
---

Artifact-owned workflows cannot be removed with `removeWorkflow`; `stopWorkflow` can stop them. If an imported app replaces a scaffold, stop the old services and check whether their routes conflict with the imported app.

**Why:** Removing the scaffold workflows was rejected because they were managed by registered artifacts, while stopping them succeeded.

**How to apply:** During a repository import, use `stopWorkflow` for obsolete artifact-owned services. Preserve artifact metadata and move any conflicting route through the artifact metadata validator rather than deleting registered artifact files.
