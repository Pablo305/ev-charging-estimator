# Missing Front-End Questions

**Source:** Analysis of Monday.com SOW board (8940346166) columns vs. fields required for automated estimate generation.

**Legend:**
- **[MISSING]** = No column exists on the board at all
- **[BROKEN]** = Column exists but is never filled or is poorly structured
- **[INFERRED]** = Can sometimes be inferred from free-text fields but unreliably

---

## 1. Customer / Billing

**Status: NO customer contact fields exist on the board at all.**

The SOW board has zero customer-facing fields. Project names sometimes include the client name, but there is no structured data for customer contact, billing, or company information.

| Field | Type | Options/Format | Priority | Notes |
|-------|------|---------------|----------|-------|
| Customer company name | text | -- | REQUIRED | For estimate header |
| Customer contact name | text | -- | REQUIRED | Primary point of contact |
| Customer email | email | -- | REQUIRED | For estimate delivery |
| Customer phone | phone | -- | RECOMMENDED | For follow-up |
| Billing address | location | -- | REQUIRED | May differ from site address |
| Purchase order number | text | -- | OPTIONAL | If client requires PO reference |
| Payment terms | dropdown | Net 30, Net 45, Net 60, 50/50, Progress billing | RECOMMENDED | Affects estimate terms section |

---

## 2. Site Classification

**Status: Site Type exists but is NEVER filled (0/10 samples). Parking environment is split across two poorly-defined fields.**

| Field | Type | Options/Format | Priority | Notes |
|-------|------|---------------|----------|-------|
| Site Type | status | **[BROKEN]** -- exists as `single_select6785b7b` with 19 options but 0% fill rate | REQUIRED | Must be made mandatory |
| Parking environment | dropdown | Parking Lot, Parking Garage, Covered Parking, Mixed | REQUIRED | **[BROKEN]** -- `single_selectoo30hnc` exists but is poorly named "Single select" and never filled |
| Indoor vs outdoor | dropdown | Indoor, Outdoor, Both | REQUIRED | **[MISSING]** -- critical for weatherproofing and ventilation |
| Number of parking spaces affected | number | integer | RECOMMENDED | **[MISSING]** -- needed for traffic control and ADA |
| ADA compliance required | boolean | Yes/No | REQUIRED | **[MISSING]** -- affects signage, path of travel, charger placement |
| Site access restrictions | text | -- | RECOMMENDED | **[MISSING]** -- gated, security, hours, crane access |

---

## 3. Charger Hardware

**Status: Brand and model are captured. Amperage, voltage, and power level are entirely missing.**

| Field | Type | Options/Format | Priority | Notes |
|-------|------|---------------|----------|-------|
| Charger level | dropdown | L2, L3 (DCFC) | REQUIRED | **[MISSING]** -- can be inferred from brand/model but should be explicit |
| Amperage per charger | number | amps (integer) | REQUIRED | **[MISSING]** -- critical for electrical sizing. Only exists for R&R as free text. |
| Voltage | dropdown | 208V, 240V, 277V, 480V | REQUIRED | **[MISSING]** -- determines panel requirements |
| Power output per charger (kW) | number | kW | RECOMMENDED | **[MISSING]** -- useful for load calculations |
| Connector type | dropdown | J1772, CCS, NACS, CHAdeMO | RECOMMENDED | **[MISSING]** -- can be inferred from model but useful for verification |
| Charger unit cost override | currency | $ | OPTIONAL | **[MISSING]** -- for when pricing differs from catalog |
| Cable management needed | boolean | Yes/No | RECOMMENDED | **[MISSING]** -- retractors, cable trays |

---

## 4. Parking Environment

**Status: Almost entirely missing. These fields are critical for civil/construction scope and pricing.**

| Field | Type | Options/Format | Priority | Notes |
|-------|------|---------------|----------|-------|
| Surface type | dropdown | Asphalt, Concrete, Gravel, Dirt, Paver | REQUIRED | **[MISSING]** -- affects trenching method and cost |
| Trenching required | boolean | Yes/No/TBD | REQUIRED | **[MISSING]** -- major cost driver |
| Estimated trench length | number | feet | REQUIRED if trenching | **[MISSING]** |
| Trench surface restoration | dropdown | Asphalt patch, Concrete patch, Full repave, None | REQUIRED if trenching | **[MISSING]** |
| Boring required | boolean | Yes/No/TBD | REQUIRED | **[MISSING]** -- for crossing roads, landscaping, utilities |
| Boring distance | number | feet | REQUIRED if boring | **[MISSING]** |
| Core drilling required | boolean | Yes/No/TBD | REQUIRED for garages | **[MISSING]** -- for penetrating garage decks |
| Number of cores | number | integer | REQUIRED if coring | **[MISSING]** |
| Traffic control needed | boolean | Yes/No/TBD | REQUIRED | **[MISSING]** -- flaggers, cones, lane closures |
| Striping/restriping needed | boolean | Yes/No | RECOMMENDED | **[MISSING]** |
| Concrete pad required | boolean | Yes/No | REQUIRED for pedestal mount | **[MISSING]** -- pedestal chargers need concrete pads |
| Pad dimensions | text | L x W x D | REQUIRED if pad needed | **[MISSING]** |
| Bollard quantity | number | integer | REQUIRED | **[MISSING]** -- Signage & Bollards field exists but has no quantity |
| Wheel stop quantity | number | integer | RECOMMENDED | **[MISSING]** |

### Garage-Specific (show when Parking Environment = Garage)

| Field | Type | Options/Format | Priority | Notes |
|-------|------|---------------|----------|-------|
| Floor level | number | integer (0 = ground) | REQUIRED | **[MISSING]** -- sometimes buried in free-text "Installation location" |
| Ceiling height | number | feet | REQUIRED for wall mount | **[MISSING]** -- clearance for conduit routing |
| Post-tensioned | status | **Exists** as `color_mkqzzcq3` but 0% fill rate | REQUIRED | **[BROKEN]** -- must be made conditional + mandatory for garages |
| Ventilation adequate | boolean | Yes/No/Unknown | RECOMMENDED | **[MISSING]** -- for DCFC in enclosed spaces |

---

## 5. Electrical Source

**Status: Only "electrical room description" (free text) and "distance" (free text, never filled) exist. All structured electrical data is missing.**

| Field | Type | Options/Format | Priority | Notes |
|-------|------|---------------|----------|-------|
| Service voltage | dropdown | 120/208V, 120/240V, 277/480V, Other | REQUIRED | **[MISSING]** |
| Service amperage | number | amps | REQUIRED | **[MISSING]** |
| Available panel capacity | number | amps | REQUIRED | **[MISSING]** -- determines if panel upgrade needed |
| Available breaker spaces | number | integer | REQUIRED | **[MISSING]** -- determines if panel upgrade needed |
| Panel upgrade needed | dropdown | No, Yes, TBD | REQUIRED | **[MISSING]** |
| New panel required | boolean | Yes/No/TBD | REQUIRED | **[MISSING]** |
| Transformer upgrade needed | dropdown | No, Yes, TBD, Unknown | REQUIRED | **[MISSING]** -- major cost driver |
| Transformer size (if new) | dropdown | 75kVA, 112.5kVA, 150kVA, 225kVA, 300kVA, 500kVA, 750kVA, Other | CONDITIONAL | **[MISSING]** |
| Utility coordination needed | boolean | Yes/No/TBD | REQUIRED | **[MISSING]** -- for service upgrades |
| Meter type | dropdown | Existing, New dedicated, Sub-meter | RECOMMENDED | **[MISSING]** |
| Conduit routing | dropdown | Underground, Surface/exposed, In-wall, Overhead, Mixed | REQUIRED | **[MISSING]** |
| Conduit distance (feet) | number | feet | REQUIRED | **[BROKEN]** -- `text_mkq1yy5` exists as free text, 0% fill rate |
| Wire pull complexity | dropdown | Straight run, Multiple bends, Through floors, Long pull (>200ft) | RECOMMENDED | **[MISSING]** |
| Load management / EVEMS | boolean | Yes/No/TBD | RECOMMENDED | **[MISSING]** -- energy management system |

---

## 6. Permit / Design

**Status: Responsibility assignment (Bullet/Client/TBD) is captured. No detail on permit scope, fees, or design requirements.**

| Field | Type | Options/Format | Priority | Notes |
|-------|------|---------------|----------|-------|
| Permit fee allowance | currency | $ | RECOMMENDED | **[MISSING]** -- varies wildly by jurisdiction |
| Permit type needed | multi-select | Electrical, Building, Encroachment, Fire, None | RECOMMENDED | **[MISSING]** |
| Plan type required | dropdown | Electrical only, Full construction set, As-built only, None | RECOMMENDED | **[MISSING]** |
| Structural engineering needed | boolean | Yes/No | REQUIRED for garages | **[MISSING]** -- for post-tensioned or roof installations |
| Load calculation required | boolean | Yes/No | REQUIRED | **[MISSING]** |
| AHJ (Authority Having Jurisdiction) | text | -- | RECOMMENDED | **[MISSING]** -- affects permit timeline and requirements |
| Estimated permit timeline | dropdown | 1-2 weeks, 2-4 weeks, 4-8 weeks, 8+ weeks | RECOMMENDED | **[MISSING]** |

---

## 7. Network / Software

**Status: Entirely missing. Only "Wifi Install" responsibility exists.**

| Field | Type | Options/Format | Priority | Notes |
|-------|------|---------------|----------|-------|
| Network connection type | dropdown | WiFi, Cellular, Ethernet, None (non-networked) | REQUIRED | **[MISSING]** |
| Network management platform | dropdown | ChargePoint Cloud, Tesla Fleet, SWTCH Platform, Blink Network, Open Charge, Other, None | REQUIRED | **[MISSING]** |
| Cellular modem needed | boolean | Yes/No | CONDITIONAL | **[MISSING]** -- if cellular selected |
| Ethernet run needed | boolean | Yes/No | CONDITIONAL | **[MISSING]** -- if ethernet selected |
| Ethernet run distance | number | feet | CONDITIONAL | **[MISSING]** |
| WiFi access point needed | boolean | Yes/No | CONDITIONAL | **[MISSING]** |
| Payment system type | dropdown | RFID, App-based, Credit card reader, Free charging, Mixed | RECOMMENDED | **[MISSING]** |
| Monthly network fee (per charger) | currency | $/month | RECOMMENDED | **[MISSING]** |

---

## 8. Site Accessories

**Status: Signage & Bollards dropdown exists but captures only what (not how many). No quantity fields.**

| Field | Type | Options/Format | Priority | Notes |
|-------|------|---------------|----------|-------|
| Signage type | multi-select | Wayfinding, Regulatory, Reserved parking, ADA, Custom | RECOMMENDED | **[MISSING]** -- current field is just Yes/No for signage presence |
| Signage quantity | number | integer | REQUIRED if signage | **[MISSING]** |
| Bollard type | dropdown | Steel pipe, Concrete-filled, Flexible, Removable | RECOMMENDED | **[MISSING]** |
| Bollard quantity | number | integer | REQUIRED if bollards | **[MISSING]** |
| Wheel stop quantity | number | integer | RECOMMENDED | **[MISSING]** |
| Paint/striping | dropdown | EV-designated stall striping, ADA striping, Directional arrows, None | RECOMMENDED | **[MISSING]** |
| Curb painting | boolean | Yes/No | RECOMMENDED | **[MISSING]** |
| Lighting needed | boolean | Yes/No | RECOMMENDED | **[MISSING]** |

---

## 9. Construction Responsibility

**Status: Mostly covered by 6 Bullet/Client/TBD dropdowns. But some responsibilities are vague or missing.**

| Field | Type | Options/Format | Priority | Notes |
|-------|------|---------------|----------|-------|
| Concrete work | dropdown | Bullet, Client, TBD, N/A | RECOMMENDED | **[MISSING]** -- pads, footings, bollard bases |
| Trenching/boring | dropdown | Bullet, Client, TBD, N/A | RECOMMENDED | **[MISSING]** -- often part of "Make Ready" but should be explicit |
| Surface restoration | dropdown | Bullet, Client, TBD, N/A | RECOMMENDED | **[MISSING]** |
| Electrical panel work | dropdown | Bullet, Client, TBD, N/A | RECOMMENDED | **[MISSING]** -- often part of "Make Ready" but should be explicit |
| Demolition/removal (non-R&R) | dropdown | Bullet, Client, TBD, N/A | RECOMMENDED | **[MISSING]** |
| Site cleanup | dropdown | Bullet, Client, N/A | OPTIONAL | **[MISSING]** |

---

## 10. Estimate Controls

**Status: Entirely missing. No fields for financial parameters.**

| Field | Type | Options/Format | Priority | Notes |
|-------|------|---------------|----------|-------|
| Markup percentage | number | % | REQUIRED | **[MISSING]** -- for cost-plus estimates |
| Tax rate | number | % | REQUIRED | **[MISSING]** -- varies by state/jurisdiction |
| Contingency percentage | number | % | RECOMMENDED | **[MISSING]** -- typically 5-15% |
| Prevailing wage applies | boolean | Yes/No | REQUIRED | **[MISSING]** -- dramatically affects labor cost |
| Union labor required | boolean | Yes/No | REQUIRED | **[MISSING]** -- affects labor rates |
| Bonding required | boolean | Yes/No | RECOMMENDED | **[MISSING]** |
| Insurance requirements | text | -- | OPTIONAL | **[MISSING]** |
| Pricing tier | dropdown | Bulk, MSRP, Negotiated | REQUIRED for Tesla | **[MISSING]** -- Tesla packages have Bulk vs MSRP pricing |
| Discount percentage | number | % | OPTIONAL | **[MISSING]** |

---

## Summary

| Section | Existing Fields | Missing Fields | Coverage |
|---------|----------------|----------------|----------|
| Customer/Billing | 0 | 7 | 0% |
| Site Classification | 2 (both broken) | 4 | ~10% |
| Charger Hardware | 5 | 7 | ~40% |
| Parking Environment | 1 (broken) | 14 | ~5% |
| Electrical Source | 2 (free text) | 14 | ~10% |
| Permit/Design | 3 (responsibility only) | 7 | ~25% |
| Network/Software | 1 (responsibility only) | 8 | ~10% |
| Site Accessories | 1 (no quantities) | 8 | ~10% |
| Construction Responsibility | 6 | 6 | ~50% |
| Estimate Controls | 0 | 9 | 0% |
| **TOTAL** | **~21 usable** | **~84 missing** | **~20%** |

**Bottom line:** The Monday.com SOW form captures approximately 20% of the data needed for automated estimate generation. The remaining 80% must either be added to the form, collected separately, or defaulted with manual review flags.
