# Exclusions Logic

Exclusions define what is NOT included in the estimate. They protect Bullet Energy from scope creep and set clear expectations with the client. Exclusions are auto-selected based on project scope and then can be manually adjusted.

---

## Exclusion Selection Algorithm

```
1. Start with STANDARD exclusions (always included)
2. Add PROJECT TYPE exclusions based on project.projectType
3. Add RESPONSIBILITY exclusions based on responsibilities.* fields
4. Add SITE-SPECIFIC exclusions based on site conditions
5. Add ELECTRICAL exclusions based on electrical scope
6. Add CIVIL exclusions based on civil scope
7. Remove any exclusion that contradicts the included scope
8. Allow manual additions/removals by reviewer
```

---

## 1. Standard Exclusions (Always Included)

These appear on EVERY estimate regardless of scope.

| ID | Exclusion Text | Rationale |
|----|---------------|-----------|
| STD-01 | Permitting delays beyond Bullet Energy's control | Protects against AHJ delays |
| STD-02 | Utility company work, upgrades, or fees beyond the electrical meter | Utility-side work is never in scope |
| STD-03 | Environmental remediation, hazardous material abatement, or soil contamination cleanup | Liability protection |
| STD-04 | Work in areas containing asbestos, lead paint, or other hazardous materials | Safety/liability |
| STD-05 | Structural modifications to the building unless explicitly stated in scope | Prevents scope creep |
| STD-06 | Landscaping, irrigation repair, or tree removal | Outside core competency |
| STD-07 | Damage to unmarked underground utilities | Liability protection (call 811) |
| STD-08 | Premium time labor (overtime, weekends, holidays) unless specified in scope | Cost control |
| STD-09 | Temporary power or generators during construction | Cost control |
| STD-10 | Extended warranty beyond manufacturer standard | Sets warranty expectations |
| STD-11 | Ongoing maintenance, monitoring, or network management fees | Separates one-time vs recurring costs |
| STD-12 | Price escalation for materials if project start is delayed beyond 90 days of estimate date | Protects against material cost increases |

---

## 2. Project Type Exclusions

### Full Turnkey (`full_turnkey`, `full_turnkey_connectivity`)

| ID | Exclusion Text | Condition |
|----|---------------|-----------|
| FT-01 | Utility service upgrade or new service installation | Always |
| FT-02 | Fiber optic installation or ISP coordination | Only if NOT `full_turnkey_connectivity` |

### Remove & Replace (`remove_replace`)

| ID | Exclusion Text | Condition |
|----|---------------|-----------|
| RR-01 | Disposal fees for removed charger equipment (unless included in line items) | When disposal not scoped |
| RR-02 | Repair or upgrade of existing electrical infrastructure discovered during removal | Always |
| RR-03 | Remediation of damage to surfaces from previous charger installation | Always |
| RR-04 | Compatibility verification between new chargers and existing wiring/conduit | Always (must be verified during site survey) |

### Install & Commission (`install_commission`)

| ID | Exclusion Text | Condition |
|----|---------------|-----------|
| IC-01 | Procurement or delivery of charger hardware | Always (client-furnished) |
| IC-02 | Warranty claims or defects in client-furnished equipment | Always |
| IC-03 | Storage of client-furnished equipment prior to installation | Always |

### Equipment Purchase (`equipment_purchase`)

| ID | Exclusion Text | Condition |
|----|---------------|-----------|
| EP-01 | All installation labor and materials | Always |
| EP-02 | Site preparation, electrical work, or civil work | Always |
| EP-03 | Permitting, design, or engineering services | Always |
| EP-04 | Delivery and unloading at site (unless specified) | When delivery not scoped |

### Equipment + Install & Commission (`equipment_install_commission`)

| ID | Exclusion Text | Condition |
|----|---------------|-----------|
| EIC-01 | Electrical make-ready (panel, conduit, wiring to charger location) | Always (make-ready is by client) |
| EIC-02 | Civil work (trenching, boring, concrete pads) | Always |

### Commission Only (`commission_only`)

| ID | Exclusion Text | Condition |
|----|---------------|-----------|
| CO-01 | All physical installation, electrical, and civil work | Always |
| CO-02 | Hardware procurement or replacement of defective units | Always |
| CO-03 | Network infrastructure (WiFi, cellular, ethernet) | Always |
| CO-04 | Troubleshooting of pre-existing electrical or network issues | Always |

### Service Work (`service_work`)

| ID | Exclusion Text | Condition |
|----|---------------|-----------|
| SW-01 | Replacement parts or new equipment (unless specified in line items) | Always |
| SW-02 | Warranty work covered by manufacturer warranty | Always |
| SW-03 | Upgrades or modifications beyond the described service scope | Always |

### Supercharger (`supercharger`)

| ID | Exclusion Text | Condition |
|----|---------------|-----------|
| SC-01 | Tesla-mandated site modifications discovered during Tesla site review | Always |
| SC-02 | Tesla network activation fees (included in Tesla package pricing) | Clarification note |
| SC-03 | Future Supercharger expansion or pre-wiring for additional stalls | Unless specified |

---

## 3. Responsibility-Based Exclusions

These are auto-generated based on the `responsibilities.*` fields.

| Responsibility Field | When Value = "client" | Exclusion Text |
|---------------------|----------------------|---------------|
| `responsibilities.makeReady` | client | Electrical make-ready work including panel upgrades, conduit installation, and wiring from panel to charger locations |
| `responsibilities.permits` | client | Permit applications, fees, inspections, and AHJ coordination |
| `responsibilities.designEngineering` | client | Design documents, engineering calculations, and construction drawings |
| `responsibilities.purchasingChargers` | client | Charger hardware procurement, shipping, and receiving |
| `responsibilities.chargerInstall` | client | Physical charger mounting, connection, and testing |
| `responsibilities.concreteWork` | client | Concrete pads, footings, bollard bases, and related formwork |
| `responsibilities.trenching` | client | Trenching, backfill, and compaction |
| `responsibilities.surfaceRestoration` | client | Asphalt or concrete patching, restriping, and surface restoration |

When value = "tbd", include a conditional exclusion:
> "[Scope item] responsibility to be determined. This estimate assumes Bullet Energy scope. If transferred to client, pricing will be adjusted."

---

## 4. Site-Specific Exclusions

### Parking Garage

| ID | Exclusion Text | Condition |
|----|---------------|-----------|
| GAR-01 | Structural reinforcement or repair of parking deck | Always for garages |
| GAR-02 | Fire suppression system modifications | Always for garages |
| GAR-03 | Ventilation system upgrades for enclosed charging areas | Unless DCFC in enclosed space is in scope |
| GAR-04 | Elevator or stairwell modifications for conduit routing | Always |
| GAR-05 | Waterproofing membrane repair after core drilling | When post-tensioned or above-ground deck |

### New Construction

| ID | Exclusion Text | Condition |
|----|---------------|-----------|
| NC-01 | General contractor coordination fees or markups | Always for new construction |
| NC-02 | Temporary construction power connections | Always |
| NC-03 | Schedule delays caused by other trades | Always |
| NC-04 | Rough-in work by other trades (unless specified) | When Bullet is only doing finish work |

### Airport / Government / Hospital

| ID | Exclusion Text | Condition |
|----|---------------|-----------|
| SEC-01 | Security clearances, background checks, or badging fees for crew | When required by site |
| SEC-02 | Escort or supervision fees required by facility | When required by site |
| SEC-03 | Work outside of facility-mandated work hours | When restricted hours apply |

---

## 5. Electrical Exclusions

| ID | Exclusion Text | Condition |
|----|---------------|-----------|
| ELEC-01 | Utility company transformer installation or upgrade | When transformer upgrade identified but is utility-side |
| ELEC-02 | Power factor correction equipment | Always |
| ELEC-03 | Existing wiring or panel deficiencies discovered during installation | Always |
| ELEC-04 | Dedicated revenue-grade metering (CT cabinets) for utility rebate compliance | Unless specified |
| ELEC-05 | Load management / EVEMS hardware and software | When `electrical.loadManagementEvems == false` |
| ELEC-06 | Electrical work beyond [X] feet from the electrical panel | When conduit distance is estimated, not confirmed |

---

## 6. Civil Exclusions

| ID | Exclusion Text | Condition |
|----|---------------|-----------|
| CIV-01 | Repaving or resurfacing beyond the immediate trench area | Always when trenching |
| CIV-02 | Geotechnical investigation or soil testing | Always |
| CIV-03 | Stormwater management or drainage modifications | Always |
| CIV-04 | ADA path-of-travel upgrades beyond the immediate charging area | When ADA scope is limited |
| CIV-05 | Removal of existing underground obstructions (old utilities, foundations) | Always |
| CIV-06 | Dewatering if groundwater is encountered during trenching | Always |

---

## Exclusion Output Format

Exclusions appear at the bottom of the estimate PDF in a numbered list:

```
EXCLUSIONS

The following items are NOT included in this estimate:

1. [Exclusion text]
2. [Exclusion text]
...

Any work not specifically described in the scope of work above is excluded
from this estimate. Changes to the scope of work may result in additional costs.
```

The final catch-all statement (above) is ALWAYS appended regardless of selected exclusions.

---

## Exclusion Override Rules

1. **Cannot remove** standard exclusions STD-01 through STD-12 (liability protection)
2. **Can add** custom exclusions via free-text entry
3. **Can remove** project-type and site-specific exclusions if scope explicitly includes that work
4. **Responsibility exclusions** auto-update when responsibility assignments change
5. **All overrides** are logged with user and timestamp for audit trail
