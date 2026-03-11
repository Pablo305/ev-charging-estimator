# Monday.com SOW Board Analysis

**Board:** SOW Link | Commercial EV (ID: 8940346166)
**Workspace:** Bullet Energy (ID: 7395896)
**Created by:** Tara Rezapour
**Item count:** 312 items
**Groups:** "SOW Forms - In Progress", "Bid Submitted"

---

## 1. Board / Form Summary

This board serves as the primary intake mechanism for commercial EV charging installation projects at Bullet Energy. Sales reps submit SOW (Statement of Work) forms that capture site details, charger specifications, and scope responsibilities. The board tracks projects from initial form submission through bid submission.

**Observed workflow:**
1. Sales rep fills out SOW form (creates item in "SOW Forms - In Progress")
2. Team reviews and develops bid
3. Item moves to "Bid Submitted" group

**Key observation:** The board functions as both a CRM pipeline tracker AND a technical scope definition tool, but lacks the granularity needed for automated estimate generation.

---

## 2. Complete Column Reference

| # | Column ID | Title | Type | Options / Notes |
|---|-----------|-------|------|-----------------|
| 1 | `name` | Name | text | Project name (e.g., "Hilton Garden Inn - Austin TX") |
| 2 | `multiple_person_mkrdtaay` | Sales Rep | people | Monday.com user reference |
| 3 | `location_mkq17q59` | Site Address | location | Structured location (lat/lng/address) |
| 4 | `color_mkq1fm6a` | New Construction? | status | No, Yes, Other |
| 5 | `text_mkq1b6sk` | Project Timeline | text | Free-form text (no date picker) |
| 6 | `color_mkq1t9d` | Project Type | status | Remove & Replace, Full Turnkey, Install & Commission, Equipment Purchase, Full Turnkey + Connectivity, Equipment + Install & Commission, Commission Only, Service Work, Supercharger |
| 7 | `single_select6785b7b` | Site Type | status | Airport, Apartment, Event Venue, Fleet/Dealer, Hospital, Hotel, Industrial, Mixed Use, Fuel Station, Municipal, Office, Parking Structure, Police/Gov, Recreational, Campground, Restaurant, Retail, School, Other |
| 8 | `dropdown_mkqswef4` | New Charger Brand | dropdown | Tesla, ChargePoint, Xeal, SWTCH, Ford, EV Connect, EV Passport, Blink, Tesla Supercharger, EV Passport L3 |
| 9 | `multi_selectwzq4zbsy` | Specific Charger Model | dropdown (multi) | UWC, Supercharger, ChargePoint CPF50, CT4011, CT4021, CT4025, CT4013, CT4023, CT4027, CP6613B-50A, CP6623B-50A, CP6611B-50A, CP6621B-50A, CP6613B-80A, CP6013B-80A, CP6623B-80A, CP6023B-80A, CP6611B-80A, CP6011B-80A, CP6621B-80A, CP6021B-80A, Other |
| 10 | `numeric_mkq1f1kg` | Number of Chargers | numbers | Integer |
| 11 | `numeric_mkqe2fj6` | Number of Pedestals | numbers | Integer |
| 12 | `color_mkq1bf8b` | Port type | status | Dual, Single, Other, Mix |
| 13 | `color_mkq17yas` | Mounting type | status | Pedestal, Wall, Other, TBD, Mix |
| 14 | `dropdown_mkq1ce91` | Make Ready | dropdown | Bullet, Client, TBD |
| 15 | `dropdown_mkq1ws3` | Permits | dropdown | Bullet, Client, TBD |
| 16 | `dropdown_mkq1nyx6` | Design & Engineering | dropdown | Bullet, Client, TBD |
| 17 | `dropdown_mkq1yysm` | Purchasing Chargers | dropdown | Bullet, Client, TBD |
| 18 | `dropdown_mkq12g4b` | Charger Install | dropdown | Bullet, Client, TBD |
| 19 | `multi_select01zypan0` | Wifi Install | dropdown (multi) | Bullet, Client, N/A, TBD |
| 20 | `dropdown_mkq15p5a` | Signage & Bollards | dropdown (multi) | Signage, Bollards, None, TBD |
| 21 | `color_mkqzzcq3` | Post-Tensioned | status | No, Yes, TBD |
| 22 | `text_mkq13wmf` | Installation location | text | Free-form (e.g., "Parking lot", "6th floor garage NW corner") |
| 23 | `text_mkq1qk6q` | Electrical room or main panel setup | text | Free-form |
| 24 | `text_mkq1yy5` | Approximate distance from electrical room/main panel to charger location | text | Free-form (should be numeric + unit) |
| 25 | `long_text_mkq1n1nf` | Additional notes & comments | long_text | Free-form |
| 26 | `long_text_mkq296dg` | Action Items & Next Steps | long_text | Free-form |
| 27 | `file_mksn7ncj` | Aerial View | file | Image/document upload |
| 28 | `file_mkqehy82` | Related Documents / Photos | file | Image/document upload |
| 29 | `numeric_mkq19jsg` | (R&R) Number of Chargers | numbers | For Remove & Replace projects |
| 30 | `color_mkq19jar` | (R&R) Port type | status | Dual, Single, TBD, Mix |
| 31 | `multi_selecttt4bf0xk` | (R&R) Charger Brand | dropdown (multi) | Blink, EV Connect, EV Passport, Ford, SWTCH, Tesla, Xeal, ChargePoint, Enviro Spark, Clipper Creek, Enphase |
| 32 | `color_mkq136xm` | (R&R) Mounting Style | status | Pedestal, Wall, TBD |
| 33 | `long_text_mkq1tm3d` | (R&R) Amps drawn to each charger | long_text | Free-form |
| 34 | `button_mksg5eyk` | Send Email | button | Automation trigger |
| 35 | `numberaq2a9gzt` | # Of Units | numbers | Apartment/hotel unit count |
| 36 | `single_selectoo30hnc` | Single select | status | Parking Lot, Parking Garage, Other |

**Total columns:** 36

---

## 3. Inferred Form Questions

Based on column ordering and grouping, the SOW form likely presents these questions in order:

1. "Project Name" (name)
2. "Sales Rep" (auto-assigned or selected)
3. "Site Address" (location picker)
4. "Is this new construction?" (Yes/No/Other toggle)
5. "What is the project timeline?" (free text)
6. "What type of project is this?" (9-option selector)
7. "What type of site is this?" (19-option selector -- **rarely filled**)
8. "What charger brand?" (dropdown)
9. "Which specific charger model?" (multi-select dropdown)
10. "How many chargers?" (number input)
11. "How many pedestals?" (number input)
12. "Port type?" (Dual/Single/Other/Mix)
13. "Mounting type?" (Pedestal/Wall/Other/TBD/Mix)
14-19. Responsibility matrix: Make Ready, Permits, D&E, Purchasing, Install, Wifi (Bullet/Client/TBD each)
20. "Signage & Bollards needed?" (multi-select)
21. "Is the structure post-tensioned?" (Yes/No/TBD)
22. "Describe the installation location" (free text)
23. "Describe the electrical room/panel setup" (free text)
24. "Approximate distance from panel to charger location" (free text)
25. "Additional notes" (long text)
26. "Upload aerial view" (file)
27. "Upload related documents/photos" (file)

For Remove & Replace projects, additional questions appear:
28. "How many existing chargers to remove?" (number)
29. "Existing port type?" (Dual/Single/TBD/Mix)
30. "Existing charger brand?" (multi-select)
31. "Existing mounting style?" (Pedestal/Wall/TBD)
32. "Amps drawn to each existing charger?" (free text)

---

## 4. Required Structured-Field Gaps

**CRITICAL: These fields are free-text but MUST be structured for estimate automation:**

| Current Field | Problem | Recommended Fix |
|---------------|---------|-----------------|
| Project Timeline | Free text ("ASAP", "Q2 2026", "60 days") | Date picker or dropdown: 30/60/90/120+ days |
| Installation location | Free text | Structured: floor level + area description + indoor/outdoor |
| Electrical room/panel | Free text | Structured: panel type + amperage + voltage + location |
| Distance to chargers | Free text | Numeric field (feet) + dropdown for routing (direct/around building/through floors) |
| (R&R) Amps per charger | Free text in long_text | Numeric field |

---

## 5. Recommendations for Frontend Changes

### 5.1 Immediate Fixes (No new fields, just type changes)

1. **Project Timeline** -- Change from text to date-range or dropdown
2. **Distance to chargers** -- Change from text to number (feet)
3. **Site Type** -- Make required (currently null in all samples)
4. **Post-Tensioned** -- Surface only when Site Type = Parking Structure or Installation location mentions "garage"

### 5.2 New Required Fields (see `monday_missing_questions.md` for full list)

- Customer contact information (name, email, phone, company)
- Electrical service details (voltage, amperage, panel capacity)
- Parking environment details (surface type, ADA requirements)
- Network/connectivity requirements
- Estimate control parameters (markup, tax rate, contingency)

### 5.3 UX Improvements

- Group form into collapsible sections matching estimate sections
- Add conditional visibility (show R&R fields only for Remove & Replace projects)
- Add photo upload prompts for: electrical panel, proposed charger location, existing conduit paths
- Add a "parking environment" section that auto-shows for garage vs lot

---

## 6. Recommended Conditional Question Branches

### Branch: Project Type

| Project Type | Show Sections | Hide Sections |
|--------------|---------------|---------------|
| Full Turnkey | All sections | None |
| Full Turnkey + Connectivity | All sections + Network section | None |
| Remove & Replace | All + R&R section | None |
| Install & Commission | Charger + Install + Electrical | Purchasing |
| Equipment Purchase | Charger hardware only | Install, Electrical, Civil |
| Equipment + Install & Commission | Charger + Install + Electrical | Make Ready |
| Commission Only | Charger model + Network | Install, Electrical, Civil |
| Service Work | Notes + R&R section | Most standard fields |
| Supercharger | Tesla-specific package selector | Brand/model dropdowns |

### Branch: Parking Environment

| Condition | Additional Questions |
|-----------|---------------------|
| Parking Garage selected | Post-tensioned? Floor level? Ceiling height? Ventilation? Core drilling needed? |
| Parking Lot selected | Surface type (asphalt/concrete)? Trenching distance? Boring needed? Traffic control? |
| Mixed / Other | Both sets of questions |

### Branch: Charger Brand = Tesla Supercharger

| Condition | Action |
|-----------|--------|
| Brand = Tesla Supercharger | Show Tesla package selector (9 configs), hide individual model select |
| Brand = ChargePoint | Show ChargePoint model multi-select, show amperage per charger |
| Any other brand | Show model text field (fewer known models) |

---

## 7. Parking Garage vs Lot Notes

**Observed:** The board has two overlapping fields for parking classification:
1. `single_selectoo30hnc` ("Single select") -- Parking Lot / Parking Garage / Other -- **poorly named, rarely used**
2. `text_mkq13wmf` ("Installation location") -- free text that often describes parking context

**Problem:** Neither field reliably captures the parking environment. Sample data shows:
- "Parking lot" (simple)
- "behind the gate on the 6th floor of the parking garage, northwest corner" (complex, buried in text)
- "Surface parking lot - all next to each other - 5 spots" (includes layout info)

**Recommendation:**
1. Rename `single_selectoo30hnc` to "Parking Environment" and make it required
2. Add conditional sub-questions:
   - **Garage:** Floor level, post-tensioned (already exists), ceiling height, core drilling needed, ventilation adequate
   - **Lot:** Surface material (asphalt/concrete/gravel), curb cuts needed, ADA path compliance
3. Keep "Installation location" as a supplementary text field for details the structured fields don't capture

---

## 8. Data Quality Observations (from 10-item sample)

| Field | Fill Rate | Quality |
|-------|-----------|---------|
| Name | 10/10 | Good -- descriptive project names |
| Site Address | ~8/10 | Good when present |
| Project Type | ~7/10 | Good |
| New Charger Brand | ~6/10 | Good |
| Number of Chargers | ~6/10 | Good |
| **Site Type** | **0/10** | **CRITICAL -- never filled** |
| **Post-Tensioned** | **0/10** | **Never filled** |
| **Electrical distance** | **0/10** | **Never filled** |
| **Parking type (single_select)** | **0/10** | **Never filled** |
| Installation location | ~4/10 | Variable quality (free text) |
| Electrical room | ~3/10 | Variable quality (free text) |
| Additional notes | ~3/10 | When present, often critical info |
