# PartBank — Order Flows

All order flows are driven by a 14-status state machine in `lib/actions/orders.ts`.  
Every status transition creates a notification for the relevant party.

---

## The Two Order Paths

```
Customer places order
        │
        ├── Part has drawing_url? ──Yes──► Ready-to-Produce Flow
        │                                  (starts at finding_workshop)
        └── No ──────────────────────────► RE Flow
                                           (starts at pending_re_confirmation)
```

---

## 1. Main Flow — Full RE Path

For parts without a technical drawing. Goes through Reverse Engineering first.

```mermaid
flowchart TD
    START([Customer places order]) --> S1

    subgraph RE ["🔵 Reverse Engineering Phase"]
        S1[pending_re_confirmation\nInternal reviews] -->|Internal confirms RE fee| S2
        S2[pending_re_payment\nCustomer pays RE fee] -->|Customer uploads receipt| S3
        S3[pending_re_receipt\nInternal verifies receipt] -->|Internal confirms| S4
        S4[re_in_progress\nRE work begins] -->|Internal uploads drawing| S5
        S5[pending_price_estimation\nDrawing ready]
    end

    subgraph PRICE ["🟡 Pricing Phase"]
        S5 -->|Internal sets part price| S6
        S6[pending_part_payment\nCustomer pays part] -->|Customer uploads receipt| S7
        S7[pending_payment_confirmation\nInternal verifies] -->|Internal confirms| S8
    end

    subgraph WORKSHOP ["🟣 Workshop Phase"]
        S8[finding_workshop] -->|Internal assigns workshop| S9
        S9[in_production\nWorkshop manufactures] -->|Workshop marks complete| S10
    end

    subgraph QC ["🟠 QC & Delivery"]
        S10[pending_qc\nInternal reviews] -->|Pass + tracking number| S13
        S10 -->|Fail| S11
        S11[qc_failed_cancelled] -->|Internal processes refund| S12
        S12[cancelled_refunded\n🔴 Terminal]
        S13[in_delivery\nShipping] -->|Internal confirms delivery| S14
        S14[completed\n🟢 Terminal]
    end
```

---

## 2. Ready-to-Produce Flow

For parts that already have a technical drawing (`drawing_url` is set on the part).  
Skips the entire RE + pricing phase — starts directly at workshop assignment.

```mermaid
flowchart TD
    START([Customer selects part\nwith drawing_url]) --> S8

    subgraph WORKSHOP ["🟣 Workshop Phase"]
        S8[finding_workshop] -->|Internal assigns workshop + sets price| S9
        S9[in_production] -->|Workshop marks complete| S10
    end

    subgraph QC ["🟠 QC & Delivery"]
        S10[pending_qc] -->|Pass| S13
        S10 -->|Fail| S11
        S11[qc_failed_cancelled] -->|Refund processed| S12
        S12[cancelled_refunded\n🔴 Terminal]
        S13[in_delivery] -->|Delivered| S14
        S14[completed\n🟢 Terminal]
    end
```

**What changes on the customer side:**
- Part detail page shows "Ready to produce" badge (green)
- New order page shows 3-step flow (no RE step) + "3–7 business days" turnaround
- Order form hides the reference photo upload
- No RE fee, no drawing upload wait

---

## 3. Drawing Upload & Auto-Advance

When Internal uploads a technical drawing for an RE order, the system does three things atomically:

```mermaid
flowchart LR
    A[Internal uploads drawing\nfor Order A] --> B[Order A advances\nto pending_price_estimation]
    A --> C[parts.drawing_url set\nparts.status = ready_to_make]
    C --> D{Other orders\nfor same part\nin re_in_progress?}
    D -->|Yes| E[Auto-advance each\nto finding_workshop\nwith system note]
    D -->|No| F[Done]
```

This prevents duplicate RE work when two customers order the same unknown part simultaneously.

---

## 4. Payment Flows

Two separate payment loops exist — RE fee and part payment. Both follow the same receipt pattern.

```mermaid
flowchart LR
    subgraph RE_PAY ["RE Fee Payment"]
        A1[pending_re_payment] -->|Customer uploads receipt| A2
        A2[pending_re_receipt] -->|Internal verifies| A3
        A3[re_in_progress]
    end

    subgraph PART_PAY ["Part Payment"]
        B1[pending_part_payment] -->|Customer uploads receipt| B2
        B2[pending_payment_confirmation] -->|Internal verifies| B3
        B3[finding_workshop]
    end
```

**How receipts work:**
- Customer uses `UploadReceiptForm` → file goes to `receipts` storage bucket
- A record is created in the `files` table (`file_type: re_receipt | part_receipt`)
- Internal sees a "View Receipt" link in the order action panel
- Internal manually verifies the bank transfer and clicks confirm

---

## 5. Workshop Assignment Flow

```mermaid
flowchart TD
    S8[finding_workshop] -->|Internal picks workshop\nfrom verified dropdown| S9
    S9[in_production] -->|Workshop accepts| ACTIVE[Production begins]
    S9 -->|Workshop rejects| S8_AGAIN[finding_workshop\nback to reassign]
    ACTIVE -->|Workshop marks complete| S10[pending_qc]
```

**Details:**
- Only `is_verified = true` workshops appear in the assignment dropdown
- Workshop receives an in-app notification on assignment
- Workshop can accept or reject from their order detail page
- Rejection returns the order to `finding_workshop` for Internal to reassign
- Technical drawing becomes visible to the workshop from `finding_workshop` onwards

---

## 6. QC Flow

```mermaid
flowchart TD
    S10[pending_qc\nInternal reviews part] -->|QC pass| PASS
    S10 -->|QC fail| FAIL

    PASS -->|Enter tracking number| S13[in_delivery]
    S13 -->|Internal marks delivered| S14[completed ✅]

    FAIL -->|Enter failure notes| S11[qc_failed_cancelled ❌]
    S11 -->|Manual bank refund| S12[cancelled_refunded]
```

**QC failure is terminal** — no re-production loop in MVP.  
After `qc_failed_cancelled`, Internal manually refunds the customer outside the platform, then clicks "Refund Processed" to move to `cancelled_refunded`.

---

## 7. Workshop Registration & Approval

Separate from the order flow — governs whether a workshop can receive orders.

```mermaid
flowchart TD
    W1([Workshop registers\nvia /auth/register]) --> W2
    W2[Profile created\nis_verified = false] --> W3
    W3[Internal reviews\n/internal/workshops] -->|Approve| W4
    W3 -->|Reject with reason| W5
    W4[is_verified = true\nWorkshop notified ✅]
    W5[Workshop notified ❌\nCan re-register]
```

Only verified workshops appear in the order assignment dropdown.

---

## 8. Complete Status Reference

| Status | Who acts | Actor |
|---|---|---|
| `pending_re_confirmation` | Waiting for Internal to confirm RE | 🔵 Internal |
| `pending_re_payment` | Waiting for Customer to pay RE fee | 🟢 Customer |
| `pending_re_receipt` | Waiting for Internal to verify receipt | 🔵 Internal |
| `re_in_progress` | RE team working | 🔵 Internal |
| `pending_price_estimation` | Waiting for Internal to set price | 🔵 Internal |
| `pending_part_payment` | Waiting for Customer to pay | 🟢 Customer |
| `pending_payment_confirmation` | Waiting for Internal to verify | 🔵 Internal |
| `finding_workshop` | Waiting for Internal to assign | 🔵 Internal |
| `in_production` | Workshop manufacturing | 🟡 Workshop |
| `pending_qc` | Waiting for Internal QC | 🔵 Internal |
| `qc_failed_cancelled` | Waiting for Internal to process refund | 🔵 Internal |
| `cancelled_refunded` | **Terminal — cancelled** | — |
| `in_delivery` | Waiting for Internal to confirm delivery | 🔵 Internal |
| `completed` | **Terminal — success** | — |
