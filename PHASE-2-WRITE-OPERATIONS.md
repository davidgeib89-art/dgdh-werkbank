# Sprint 3b Phase 2: Write Operations & Mutations (Planung)

**Ziel:** Operator-gesteuerte Schreibvorgänge mit klarer Governance – keine Vollautonomie.

**Principles:**

1. **User approves every write:** Keine stillen Auto-Promotionen
2. **Optimistic updates:** UI aktualisiert sofort, Fehler werden gerollt back
3. **Error clarity:** Validierungsfehler und Permission-Denials werden deutlich gezeigt
4. **Audit trail:** Alle Schreibvorgänge können nachvollzogen werden (via approvedBy, archivedBy, etc.)

---

## 1. API-Client-Erweiterung (Phase 2A)

Alle neuen Methoden zu `ui/src/api/memory.ts` hinzufügen:

### Write Operations

```typescript
// Promote Reflection Candidate → Create new Memory
async promoteReflection(
  companyId: string,
  input: PromoteReflectionInput
): Promise<MemoryItemGoverned> {
  return api.post<MemoryItemGoverned>(
    `${BASE_URL}/${companyId}/memory/reflect/promote`,
    input,
  );
}

// Correct/Update existing Memory
async correctMemory(
  companyId: string,
  memoryId: string,
  patch: MemoryCorrection
): Promise<MemoryItemGoverned> {
  return api.patch<MemoryItemGoverned>(
    `${BASE_URL}/${companyId}/memory/${memoryId}`,
    patch,
  );
}

// Reinforce Memory (increase importance/confidence)
async reinforceMemory(
  companyId: string,
  memoryId: string,
  input: ReinforceInput
): Promise<MemoryItemGoverned> {
  return api.post<MemoryItemGoverned>(
    `${BASE_URL}/${companyId}/memory/${memoryId}/reinforce`,
    input,
  );
}

// Governance: Approve Memory
async approveMemory(
  companyId: string,
  memoryId: string,
  input: ApproveMermoryInput
): Promise<MemoryItemGoverned> {
  return api.post<MemoryItemGoverned>(
    `${BASE_URL}/${companyId}/memory/${memoryId}/approve`,
    input,
  );
}

// Governance: Reject Memory
async rejectMemory(
  companyId: string,
  memoryId: string,
  input: RejectMemoryInput
): Promise<void> {
  return api.post<void>(
    `${BASE_URL}/${companyId}/memory/${memoryId}/reject`,
    input,
  );
}

// Governance: Archive Memory
async archiveMemory(
  companyId: string,
  memoryId: string,
  input: ArchiveMemoryInput
): Promise<MemoryItemGoverned> {
  return api.post<MemoryItemGoverned>(
    `${BASE_URL}/${companyId}/memory/${memoryId}/archive`,
    input,
  );
}
```

### Query Key Updates

```typescript
// ui/src/lib/queryKeys.ts
export const queryKeys = {
  memory: {
    all: ["memory"],

    // Invalidation keys for mutations
    viewerList: (companyId: string, filter?: MemoryViewerFilter) => [
      "memory",
      "viewer-list",
      companyId,
      filter ?? {},
    ],
    viewerStats: (companyId: string) => ["memory", "viewer-stats", companyId],
    reflectionReport: (companyId: string, agentId: string) => [
      "memory",
      "reflection",
      companyId,
      agentId,
    ],
  },
};
```

---

## 2. UI-Patterns & Components (Phase 2B)

### Pattern 1: Modal Dialog for Promoting Candidates

**Component:** `PromoteReflectionModal.tsx`

```tsx
interface PromoteReflectionModalProps {
  isOpen: boolean;
  candidate: ReflectionCandidate;
  onConfirm: (input: PromoteReflectionInput) => Promise<void>;
  onCancel: () => void;
  isLoading: boolean;
}

export function PromoteReflectionModal({
  isOpen,
  candidate,
  onConfirm,
  onCancel,
  isLoading,
}: PromoteReflectionModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onCancel}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Promote Reflection Candidate</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Preview of candidate */}
          <div className="bg-muted p-3 rounded">
            <p className="font-semibold text-sm">{candidate.suggestedSummary}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {candidate.suggestedDetail}
            </p>
           </div>

          {/* Editable fields */}
          <div>
            <Label>Scope</Label>
            <Select defaultValue={candidate.derivedScope}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="company">Company</SelectItem>
                <SelectItem value="project">Project</SelectItem>
                <SelectItem value="personal">Personal</SelectItem>
                <SelectItem value="social">Social</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Importance (1-10)</Label>
            <Input
              type="number"
              min="1"
              max="10"
              defaultValue={candidate.suggestedImportance}
            />
          </div>

          <div>
            <Label>Confidence (0-1)</Label>
            <Input
              type="number"
              step="0.1"
              min="0"
              max="1"
              defaultValue={candidate.suggestedConfidence}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            onClick={() => onConfirm({...})}
            disabled={isLoading}
          >
            {isLoading ? "Promoting..." : "Promote"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

---

### Pattern 2: Inline Edit for Correcting Memory

**Component:** `MemoryCorrectForm.tsx`

```tsx
interface MemoryCorrectFormProps {
  memory: MemoryItemGoverned;
  onSave: (patch: MemoryCorrection) => Promise<void>;
  onCancel: () => void;
  isLoading: boolean;
}

export function MemoryCorrectForm({
  memory,
  onSave,
  onCancel,
  isLoading,
}: MemoryCorrectFormProps) {
  const [formData, setFormData] = useState({
    summary: memory.summary,
    detail: memory.detail,
    tags: memory.tags,
    importance: memory.importance,
    confidence: memory.confidence,
  });

  return (
    <div className="space-y-3">
      <div>
        <Label>Summary</Label>
        <Input
          value={formData.summary}
          onChange={(e) =>
            setFormData({ ...formData, summary: e.target.value })
          }
          placeholder="Edit summary..."
        />
      </div>

      <div>
        <Label>Detail</Label>
        <Textarea
          value={formData.detail}
          onChange={(e) => setFormData({ ...formData, detail: e.target.value })}
          placeholder="Edit detail..."
          rows={4}
        />
      </div>

      <div>
        <Label>Tags (comma-separated)</Label>
        <Input
          value={formData.tags.join(", ")}
          onChange={(e) =>
            setFormData({
              ...formData,
              tags: e.target.value.split(",").map((t) => t.trim()),
            })
          }
        />
      </div>

      <div className="flex gap-2">
        <Button onClick={() => onSave(formData)} disabled={isLoading}>
          {isLoading ? "Saving..." : "Save Changes"}
        </Button>
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
```

---

### Pattern 3: Mutation Hook with Optimistic Update

```typescript
// hooks/usePromoteReflection.ts
export function usePromoteReflection() {
  const { selectedCompanyId } = useCompanyContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: PromoteReflectionInput) =>
      memoryApi.promoteReflection(selectedCompanyId!, input),

    onSuccess: (newMemory) => {
      // Invalidate related queries
      queryClient.invalidateQueries({
        queryKey: queryKeys.memory.viewerList(selectedCompanyId!),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.memory.viewerStats(selectedCompanyId!),
      });

      toast.success(`Memory "${newMemory.summary}" promoted successfully`);
    },

    onError: (error) => {
      if (error instanceof ApiError) {
        if (error.status === 400) {
          toast.error("Invalid candidate data");
        } else if (error.status === 403) {
          toast.error("Permission denied: You cannot promote memories");
        } else {
          toast.error(`Promotion failed: ${error.message}`);
        }
      } else {
        toast.error("Unknown error during promotion");
      }
    },
  });
}
```

---

## 3. UI Flows for Phase 2 (Phase 2C)

### Flow 1: Promoting Reflection Candidate

```
┌─────────────────────────────────────────────────┐
│ Reflection Panel                                │
├─────────────────────────────────────────────────┤
│ Candidate: "Decision: API versioning"           │
│ [Rule: DecisionIdentified]                      │
│ Source Episodes: 3                              │
│                                                 │
│ [Promote] Button ← User clicks                  │
└─────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────┐
│ Modal: Promote Reflection Candidate             │
├─────────────────────────────────────────────────┤
│ Preview:                                        │
│ Summary: "Decision: API versioning"             │
│ Detail: "Versioning strategy for REST API"      │
│                                                 │
│ Editable Fields:                                │
│ Scope: [Company ▼]                              │
│ Importance: [7 _] (1-10)                        │
│ Confidence: [0.8 _] (0-1)                       │
│                                                 │
│ User modifies if needed                         │
│                                                 │
│ [Cancel] [Promote] ← User clicks Promote       │
└─────────────────────────────────────────────────┘
                        ↓
        API: POST /memory/reflect/promote

                        ↓ (on success)

┌─────────────────────────────────────────────────┐
│ Toast: ✓ "Memory 'Decision: API...' promoted"  │
├─────────────────────────────────────────────────┤
│ - Candidate removed from Reflection Panel       │
│ - New Memory appears in Viewer List             │
│ - Stats updated (total count +1)                │
└─────────────────────────────────────────────────┘
```

### Flow 2: Correcting Existing Memory

```
┌─────────────────────────────────────────────────┐
│ Memory Detail Panel                             │
├─────────────────────────────────────────────────┤
│ Summary: "Decision: API versioning"             │
│ Detail: "Versioning strategy..."                │
│ Scope: Company                                  │
│ Importance: 7 | Confidence: 0.8                 │
│ Status: pending_review                          │
│                                                 │
│ [Edit] Button ← User clicks                     │
└─────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────┐
│ Memory Detail Panel (Edit Mode)                 │
├─────────────────────────────────────────────────┤
│ Summary: [_____ Edit field _____]               │
│ Detail: [_____ Multiline Edit _____]            │
│ Tags: [decision, api, versioning]               │
│                                                 │
│ [Save Changes] [Cancel]                         │
└─────────────────────────────────────────────────┘
                        ↓ (on Save)

        API: PATCH /memory/:memoryId
        Body: { summary, detail, tags, ... }

                        ↓ (on success)

┌─────────────────────────────────────────────────┐
│ Toast: ✓ "Memory updated successfully"          │
├─────────────────────────────────────────────────┤
│ - Detail Panel shows new values                 │
│ - Edit mode closes                              │
│ - Query cache invalidated                       │
└─────────────────────────────────────────────────┘
```

### Flow 3: Reinforcing Memory (Score Increase)

```
┌─────────────────────────────────────────────────┐
│ Memory Detail Panel                             │
├─────────────────────────────────────────────────┤
│ Summary: "Decision: API versioning"             │
│ Importance: 7  [Reinforce ↑] Button             │
│ Confidence: 0.8 [Reinforce ↑] Button            │
│                                                 │
│ User clicks "Importance [Reinforce ↑]"          │
└─────────────────────────────────────────────────┘
                        ↓
        API: POST /memory/:memoryId/reinforce
        Body: { deltaImportance: +1, deltaConfidence: 0 }

                        ↓ (on success)

┌─────────────────────────────────────────────────┐
│ Detail Panel (auto-updated)                     │
├─────────────────────────────────────────────────┤
│ Summary: "Decision: API versioning"             │
│ Importance: 8  [Reinforce ↑] Button ← updated! │
│ Confidence: 0.8 [Reinforce ↑] Button            │
│                                                 │
│ Toast: ✓ "Importance reinforced"                │
└─────────────────────────────────────────────────┘
```

### Flow 4: Governance Actions (Approve/Reject/Archive)

```
┌─────────────────────────────────────────────────┐
│ Memory Detail Panel                             │
├─────────────────────────────────────────────────┤
│ Status: pending_review                          │
│                                                 │
│ Governance Actions:                             │
│ [Approve] [Reject] [Archive]                    │
│                                                 │
│ User clicks [Approve]                           │
└─────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────┐
│ Approval Confirmation Dialog                    │
├─────────────────────────────────────────────────┤
│ "Approve this memory?"                          │
│                                                 │
│ Summary: "Decision: API versioning"             │
│ You approve as: [current-user@company.com]      │
│                                                 │
│ [Cancel] [Confirm Approval]                     │
└─────────────────────────────────────────────────┘
                        ↓ (on Confirm)

        API: POST /memory/:memoryId/approve
        Body: { approvedBy: "current-user" }

                        ↓ (on success)

┌─────────────────────────────────────────────────┐
│ Memory Detail Panel (updated)                   │
├─────────────────────────────────────────────────┤
│ Status: approved ← changed!                     │
│ ApprovedBy: current-user@company.com            │
│ ApprovedAt: 2026-03-16 14:23:45                 │
│                                                 │
│ Toast: ✓ "Memory approved"                      │
│ Governance Actions hidden (no more editing)     │
└─────────────────────────────────────────────────┘
```

---

## 4. Implementation Checklist (Phase 2D)

### 4.1 API Client Additions

- [ ] `promoteReflection()` method
- [ ] `correctMemory()` method
- [ ] `reinforceMemory()` method
- [ ] `approveMemory()`, `rejectMemory()`, `archiveMemory()` methods
- [ ] All methods properly typed with backend input/output types

### 4.2 Mutation Hooks

- [ ] `usePromoteReflection()` hook with error handling
- [ ] `useCorrectMemory()` hook with optional fields
- [ ] `useReinforceMemory()` hook
- [ ] `useApproveMemory()` hook
- [ ] `useRejectMemory()` hook
- [ ] `useArchiveMemory()` hook

### 4.3 UI Components

- [ ] `PromoteReflectionModal.tsx`
- [ ] `MemoryCorrectForm.tsx`
- [ ] `ReinforceButtons.tsx` (for +1 UI)
- [ ] `GovernanceActionButtons.tsx` (Approve/Reject/Archive)
- [ ] `ConfirmationDialog.tsx` (reusable)

### 4.4 MemoryViewer.tsx Updates

- [ ] Wire promote mutation to "Promote" buttons
- [ ] Add "Edit" mode in detail panel
- [ ] Wire correct mutation
- [ ] Add reinforce +1 buttons
- [ ] Add governance action buttons
- [ ] Error toasts for failed mutations
- [ ] Optimistic UI updates where appropriate

### 4.5 Query Invalidation

- [ ] After promote: invalidate viewerList, viewerStats
- [ ] After correct: invalidate viewerList
- [ ] After reinforce: invalidate viewerList (maybe local update only)
- [ ] After governance action: invalidate viewerList, viewerStats

### 4.6 Testing

- [ ] Unit tests for mutation hooks
- [ ] Component tests for modals/forms
- [ ] Integration test: promote flow end-to-end
- [ ] Error case: 403 Permission denied
- [ ] Error case: 400 Validation error

---

## 5. Governance & Safety Guards (Phase 2E)

### Must-Have Checks Before Write

#### Promotion

- ✅ Candidate must belong to selected agent/project
- ✅ User must have permission (derived from Backend auth check)
- ✅ Suggested scope must be valid (company/project/personal/social)
- ✅ Importance/Confidence must be in valid range (1-10, 0-1)

#### Correction

- ✅ Memory must exist
- ✅ Memory must not be archived (or allow correction of archived)
- ✅ User must be the owner or have override permission
- ✅ At least one field must be changed (no empty patches)

#### Reinforce

- ✅ Memory must exist
- ✅ New scores must stay in range (importance ≤ 10, confidence ≤ 1)

#### Approve/Reject/Archive

- ✅ Memory must have correct status (only pending → approved, etc.)
- ✅ User must have governance role (optional backend check)
- ✅ Rejection must include optional reason

### Toast Messages (User Feedback)

| Scenario              | Message                              | Type    |
| --------------------- | ------------------------------------ | ------- |
| Success: Promote      | ✓ Memory "Decision: ..." promoted    | success |
| Success: Correct      | ✓ Memory updated                     | success |
| Success: Reinforce    | ✓ Importance reinforced (+1)         | success |
| Success: Approve      | ✓ Memory approved                    | success |
| Error: 403 Permission | ✗ You don't have permission to edit  | error   |
| Error: 400 Validation | ✗ Importance must be 1-10            | error   |
| Error: 404 Not found  | ✗ Memory was deleted by another user | error   |
| Error: Network        | ✗ Connection error, please try again | error   |

---

## 6. Out of Scope for Phase 2

- Bulk promote / bulk correct (only single-item operations)
- Undo/Rollback of writes
- Conflict resolution (if memory was edited by another user)
- Advanced retention policies
- Automated cleanup of archived items

---

## Timeline Estimate

| Task                         | LOC      | Hours    | Effort      |
| ---------------------------- | -------- | -------- | ----------- |
| API Client additions         | 60       | 1        | 🟢 Low      |
| Mutation hooks               | 150      | 2        | 🟡 Medium   |
| UI Components                | 250      | 3        | 🟡 Medium   |
| MemoryViewer.tsx integration | 200      | 3        | 🟡 Medium   |
| Error handling + Toasts      | 80       | 1        | 🟢 Low      |
| Testing (unit + integration) | 200      | 3        | 🟡 Medium   |
| **Total**                    | **~940** | **~13h** | 🟡 1-2 Days |

---

## Success Criteria (Phase 2)

1. ✅ User can promote reflection candidates → new Memory created
2. ✅ User can correct existing Memory fields → Backend saved
3. ✅ User can reinforce Memory → scores increase
4. ✅ User can approve/reject/archive memories → Status updated
5. ✅ All mutations show clear error messages on failure
6. ✅ Typecheck passes (all types correct)
7. ✅ E2E smoke test: promote → correct → reinforce → approve flow works
8. ✅ No silent failures (all users see feedback)
