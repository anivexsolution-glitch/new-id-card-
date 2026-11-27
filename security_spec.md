# Security Specification & Payload-First TDD (`THE ID MAKER`)

## 1. Data Invariants
1. **Strict Multi-Tenant User Isolation**: All user data (`settings`, `students`, `customTemplates`, `exportHistory`) is nested under `/users/{userId}/...` where `userId == request.auth.uid` and `ownerId == request.auth.uid`. User A can never `get`, `list`, `create`, `update`, or `delete` any document belonging to User B.
2. **Master Gate Parent Existence**: Every subcollection document (`settings`, `students`, `customTemplates`, `exportHistory`) requires the parent `/users/{userId}` document to exist (or be created atomically in the same write batch).
3. **Immutable Ownership & Creation Timestamps**: `uid` / `ownerId` and `createdAt` cannot be modified after creation. `createdAt` must equal `request.time` on create; `updatedAt` must equal `request.time` on create and update.
4. **Verified Google Identity**: All authenticated mutations require `request.auth != null && request.auth.token.email_verified == true`.
5. **Bounded Sizes & Anti-Ghost Fields**: Every document write passes a strict key allowlist (`hasAll` + `hasOnly`) and explicit string `.size()` limits to prevent ghost field injection and document bloat.

## 2. "Dirty Dozen" Adversarial Test Payloads (Expected: `PERMISSION_DENIED`)
1. **Unauthenticated Read/List**: Anonymous client attempts `get(/users/userA/students/std_1)` -> `PERMISSION_DENIED`.
2. **Cross-Tenant Read**: `userB` attempts `get(/users/userA/students/std_1)` -> `PERMISSION_DENIED`.
3. **Cross-Tenant List**: `userB` attempts `list(/users/userA/students)` -> `PERMISSION_DENIED`.
4. **Cross-Tenant Create Spoof**: `userB` attempts to create `/users/userA/students/std_evil` with `ownerId: "userA"` -> `PERMISSION_DENIED`.
5. **OwnerId Spoofing Inside Own Path**: `userA` attempts to create `/users/userA/students/std_evil` with `ownerId: "userB"` -> `PERMISSION_DENIED`.
6. **Unverified Email Token**: Authenticated user with `email_verified: false` attempts write to `/users/userA/settings/school` -> `PERMISSION_DENIED`.
7. **Ghost / Shadow Field Injection**: `userA` creates `/users/userA/students/std_ghost` including `{ isAdmin: true, role: "superadmin" }` -> `PERMISSION_DENIED`.
8. **ID Poisoning (Invalid Characters / Length > 128)**: `userA` writes `/users/userA/students/bad.id$with..dots` -> `PERMISSION_DENIED`.
9. **Client Timestamp Forgery**: `userA` sets `createdAt: "2020-01-01T00:00:00Z"` instead of `request.time` -> `PERMISSION_DENIED`.
10. **Immutable Owner / CreatedAt Tampering on Update**: `userA` updates `/users/userA/students/std_1` changing `ownerId` or `createdAt` -> `PERMISSION_DENIED`.
11. **Type / Boundary Poisoning**: `userA` updates student `name` to a boolean or a 10KB string (`> 140` chars) -> `PERMISSION_DENIED`.
12. **Blanket Collection / Catch-All Probe**: Client attempts to read/write an arbitrary path `/global_students/doc1` or `/admins/userA` -> `PERMISSION_DENIED`.
