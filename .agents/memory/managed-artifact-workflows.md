---
name: Managed artifact workflows
description: Handling artifact-owned workflows when an imported app replaces a project scaffold.
---

Artifact-owned workflows cannot be removed with `removeWorkflow`; `stopWorkflow` can stop them. If an imported app replaces a scaffold, stop the old services and check whether their routes conflict with the imported app.

**Why:** Removing the scaffold workflows was rejected because they were managed by registered artifacts, while stopping them succeeded.

**How to apply:** During a repository import, use `stopWorkflow` for obsolete artifact-owned services. Preserve artifact metadata and move any conflicting route through the artifact metadata validator rather than deleting registered artifact files.

Stopping an obsolete artifact workflow does not exclude its production service from publishing.

**Why:** Publishing still executed the retired scaffold's production build after the imported app built successfully, causing a missing-dependency failure.

**How to apply:** When a standalone imported app supersedes an artifact service, remove that unused service's production configuration through the artifact metadata validator. Do not add obsolete scaffold dependencies just to satisfy its build.
