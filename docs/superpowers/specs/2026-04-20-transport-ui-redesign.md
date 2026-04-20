# Transport & Accommodation UI Redesign

**Branch:** `transport-ui-redesign`
**Goal:** Make transport legs and accommodation first-class visual elements in the day planner — distinct card types rendered at the correct position in the day's timeline, not nested inside stops.

---

## Visual Language

Three card types, each with a distinct color:

| Type | Left border | Background tint | Notes |
|------|------------|-----------------|-------|
| Stop | `#3880ff` blue | `#f8f9ff` | No icon inside card |
| Transport | `#9b59b6` purple | `rgba(155,89,182,0.08)` | Method emoji, route, times, status dot |
| Accommodation | `#16a085` teal | `rgba(22,160,133,0.08)` | Hotel icon, name, dates, status dot |

---

## Day Card Layout (top → bottom)

```
[In-transit card]          ← if overnight leg arrives this day (read-only)
[Stop 1]
  [Transport card]         ← if leg departs from stop 1
  [＋ add leg after Stop 1] ← if no leg departs from stop 1
[Stop 2]
  [Transport card]         ← if leg departs from stop 2
  [＋ add leg after Stop 2]
...
[Accommodation card]       ← always at bottom; dashed empty state if none added
```

---

## Card Specs

### Stop card
- Blue left border, no icon
- Shows: place name, stop number

### Transport card
- Purple left border
- Shows: method emoji · "City A → City B" · "HH:MM → HH:MM"
- Overnight: adds purple `overnight` badge, time line reads "HH:MM → HH:MM next day"
- Status dot (red = not booked, orange = booked, green = paid)
- Edit + delete buttons

### "Add leg" button
- Appears below each stop that has no outgoing leg
- Style: grey dashed border, subtle text "＋ add leg after [stop name]"
- Opens transport form with departure stop pre-filled
- If destination typed doesn't match an existing stop → new stop auto-created at end of day

### In-transit card (arrival day)
- Same purple style as transport card
- Appears at top of day, before any stops
- Shows: method emoji · "In transit · City A → City B" · "arrives HH:MM"
- Read-only: no edit or delete buttons (leg is managed from departure day)

### Accommodation card (filled)
- Teal left border
- Shows: 🏨 · hotel name · "DD MMM → DD MMM"
- Status dot + edit + delete buttons

### Accommodation card (empty)
- Same position (bottom of day), dashed teal border
- Shows: faded 🏨 · "＋ Add accommodation" in teal
- Tappable — opens accommodation form

---

## Changes Required

### Components to update
- **`DayCard.tsx`** — new rendering order: in-transit → stops interleaved with transport/add-leg → accommodation
- **`StopItem.tsx`** — remove transport leg section and "Add transport" button entirely

### Components to create
- **`TransportCard.tsx`** — purple card (replaces inline `TransportLegItem` usage in day context)
- **`AccommodationDayCard.tsx`** — teal card for bottom of day (filled + empty states)

### Components to keep unchanged
- `TransportLegItem.tsx` — still used elsewhere (e.g. summary), keep as-is
- `AccommodationFormModal.tsx` — no changes needed
- `TransportLegFormModal.tsx` — accept optional `defaultFromStopId` prop to pre-fill departure

---

## Constraints
- One transport leg per stop-gap: if a leg already exists from stop N, no "add leg" button shown for that gap
- In-transit card is read-only on the arrival day — editing/deleting only from the departure day
- Accommodation card always visible at bottom of every day card
