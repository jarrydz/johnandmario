# Vendored libraries

Libraries for bespoke experiences live here **version-pinned in the folder name** (e.g. `gsap-3.12.5/`) and are imported explicitly by the pages that need them — **no CDN hot-linking, no `latest`** (ADR 0015: pages must still run in ten years). Add a library only when an experience actually needs it.
