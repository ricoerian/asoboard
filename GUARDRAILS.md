# GUARDRAILS.md — AsoBoard MVP

This file records past incidents and known risks to prevent repeating the same mistakes.
Append new entries as incidents occur.

## Related Documentation
- [AGENTS](AGENTS.md) - Project overview and agent guidelines
- [PLANNING](PLANNING.md) - Project roadmap and business logic
- [Architecture](Architecture.md) - System architecture and component interactions
- [Database](Database.md) - Schema and relationships

---

## Absolute Prohibitions

### 1. Do not change SDK versions without approval
- Changes to `compileSdk`, `minSdk`, `targetSdk` require prior approval
- Compose BOM version changes also require confirmation

### 2. Do not modify signing configuration
- Do not change `signingConfigs`, keystore, or related settings

### 3. Do not independently change API contract
- API request/response formats must align with the Django backend
- Do not add custom API specifications without coordination

---

## Past Incidents

### Template
```
### [Date] Incident Name
- **What happened**: 
- **Root cause**: 
- **Countermeasure**: 
```
