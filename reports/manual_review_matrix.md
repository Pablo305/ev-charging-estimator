# Manual Review Matrix

Every condition below forces the estimate into "Draft - Pending Review" status. The estimate cannot be finalized or sent to the client until all flagged items are resolved.

---

## Review Priority Levels

- **CRITICAL** -- Estimate cannot be generated at all without this data. Blocks estimate creation.
- **HIGH** -- Estimate can be generated but contains placeholder pricing or assumptions. Must be reviewed before sending.
- **MEDIUM** -- Estimate is usable but may have inaccurate defaults. Should be reviewed.
- **LOW** -- Informational flag. Review recommended but not required.

---

## Missing Data Triggers

| Condition | Priority | Section Affected | Default Behavior | Reviewer Action Required |
|-----------|----------|-----------------|-------------------|------------------------|
| `charger.new.count` is null or 0 | CRITICAL | Hardware | Cannot generate estimate | Enter charger count |
| `charger.new.brand` is null | CRITICAL | Hardware | Cannot generate estimate | Select charger brand |
| `site.address` is null | CRITICAL | Header | Cannot generate estimate | Enter site address |
| `project.projectType` is null | CRITICAL | Scope | Cannot generate estimate | Select project type |
| `site.siteType` is null | HIGH | Site | Omit site-specific assumptions | Select site type (0% fill rate in Monday) |
| `parkingEnvironment.type` is null | HIGH | Civil | Omit all civil scope | Select parking environment (0% fill rate) |
| `electrical.conduitDistanceFeet` is null or 0 | HIGH | Electrical | Omit conduit/wire line items | Enter conduit distance (0% fill rate) |
| `charger.new.amperage` is null | HIGH | Electrical | Cannot size wire or breakers | Enter amperage per charger |
| `charger.new.voltage` is null | HIGH | Electrical | Cannot determine panel requirements | Select voltage |
| `electrical.serviceVoltage` is null | HIGH | Electrical | Cannot verify compatibility | Enter service voltage |
| `electrical.serviceAmperage` is null | HIGH | Electrical | Cannot verify capacity | Enter service amperage |
| `electrical.availablePanelCapacity` is null | MEDIUM | Electrical | Assume sufficient capacity | Verify panel capacity |
| `electrical.availableBreakerSpaces` is null | MEDIUM | Electrical | Assume sufficient spaces | Verify breaker spaces |
| `customer.companyName` is null | MEDIUM | Header | Use project name | Enter customer company name |
| `customer.contactName` is null | MEDIUM | Header | Leave blank | Enter contact name |
| `customer.email` is null | MEDIUM | Header | Cannot send estimate digitally | Enter email address |
| `civil.trenchingRequired` is null | MEDIUM | Civil | Omit trenching scope | Confirm trenching requirement |
| `civil.trenchLengthFeet` is null (when trenching=yes) | HIGH | Civil | Cannot price trenching | Enter trench length |
| `network.connectionType` is null | MEDIUM | Network | Omit network scope | Select connection type |
| `estimateControls.markupPercent` is null | MEDIUM | Pricing | Use company default | Verify markup percentage |
| `estimateControls.taxRate` is null | MEDIUM | Pricing | Use 0% (incorrect) | Enter tax rate for jurisdiction |

---

## Ambiguous Data Triggers

| Condition | Priority | Section Affected | Default Behavior | Reviewer Action Required |
|-----------|----------|-----------------|-------------------|------------------------|
| `charger.new.models` contains "Other" | HIGH | Hardware | Cannot look up specs or pricing | Specify exact charger model and pricing |
| `charger.new.mountingType` == "tbd" | MEDIUM | Hardware + Civil | Assume pedestal with concrete pad | Confirm mounting type |
| `charger.new.mountingType` == "mix" | HIGH | Hardware + Civil | Cannot determine per-charger scope | Specify count per mounting type |
| `charger.new.portType` == "mix" | MEDIUM | Hardware | Cannot calculate pedestal count | Specify count per port type |
| `parkingEnvironment.postTensioned` == "tbd" | HIGH | Civil | Assume not post-tensioned (risky) | Verify post-tensioned status before estimate |
| `electrical.transformerUpgradeNeeded` == "unknown" | HIGH | Electrical | Omit transformer from estimate | Site survey required |
| `electrical.panelUpgradeNeeded` == "tbd" | MEDIUM | Electrical | Omit panel upgrade | Verify panel capacity |
| `civil.boringRequired` == "tbd" | MEDIUM | Civil | Omit boring scope | Confirm boring requirement |
| `civil.coreDrillingRequired` == "tbd" | MEDIUM | Civil | Omit core drilling scope | Confirm core drilling requirement |
| Any responsibility field == "tbd" | MEDIUM | Scope | Include in Bullet scope (conservative) | Confirm responsibility assignment |

---

## Structural / Safety Triggers

| Condition | Priority | Section Affected | Reviewer Action Required |
|-----------|----------|-----------------|------------------------|
| `parkingEnvironment.postTensioned` == "yes" | HIGH | Civil | Verify GPR scan requirement. Confirm core drilling method and pricing. Post-tensioned structures require specialized equipment. |
| `parkingEnvironment.type` == "parking_garage" AND `charger.new.chargerLevel` == "l3" | HIGH | Electrical + Civil | L3/DCFC in enclosed garage requires ventilation assessment and possibly fire suppression review. |
| `parkingEnvironment.floorLevel` > 3 | MEDIUM | Civil + Electrical | High-floor installations may require crane access, extended conduit runs, or freight elevator coordination. |
| `electrical.transformerUpgradeNeeded` == "yes" | HIGH | Electrical | Transformer installations require utility coordination, lead times (8-20 weeks), and potentially civil work for pad. |
| `estimateControls.prevailingWage` == true | HIGH | All labor | All labor line items must use prevailing wage rates. Verify correct wage determination for jurisdiction. |
| `estimateControls.unionLabor` == true | HIGH | All labor | All labor must use union rates and comply with union rules (break schedules, crew minimums, etc.). |

---

## Pricing Triggers

| Condition | Priority | Section Affected | Reviewer Action Required |
|-----------|----------|-----------------|------------------------|
| Brand is NOT Tesla Supercharger AND `charger.new.unitPriceOverride` is null | HIGH | Hardware | No catalog pricing exists for L2 chargers. Enter unit price. |
| Brand is Tesla Supercharger AND `project.pricingTier` is null | HIGH | Hardware | Select Bulk or MSRP pricing tier. |
| Supercharger stall count does not match standard package (4/6/8/10/12/16/20/24/28) | HIGH | Hardware | Non-standard stall count. Select nearest package or get custom Tesla quote. |
| Any line item has $0 or null pricing | MEDIUM | Various | Enter pricing for flagged line items. |
| Total estimate exceeds $500,000 | LOW | Overall | Large project review recommended. Verify all assumptions and pricing. |
| Markup is 0% or > 40% | MEDIUM | Pricing | Verify markup percentage is intentional. |

---

## Project Type Triggers

| Condition | Priority | Reviewer Action Required |
|-----------|----------|------------------------|
| `project.projectType` == "service_work" | HIGH | Service work has non-standard scoping. Manually define line items based on service description in notes. |
| `project.projectType` == "commission_only" | MEDIUM | Commission-only projects have minimal scope. Verify only commissioning activities are included. |
| `project.projectType` == "remove_replace" AND `charger.existing.count` is null | HIGH | R&R project but no existing charger count specified. Cannot scope removal work. |
| `project.projectType` == "remove_replace" AND `charger.existing.ampsPerCharger` is null | MEDIUM | Existing charger amperage unknown. May affect whether existing wiring can be reused. |
| `project.projectType` == "equipment_purchase" | MEDIUM | Equipment-only project. Verify no installation line items are included. |

---

## Site-Specific Triggers

| Condition | Priority | Reviewer Action Required |
|-----------|----------|------------------------|
| `site.siteType` == "airport" | HIGH | Airport projects may require TSA coordination, security clearances, and special scheduling. |
| `site.siteType` == "hospital" | HIGH | Hospital projects may require infection control measures and restricted work hours. |
| `site.siteType` == "police_gov" | MEDIUM | Government projects may require prevailing wage, bonding, and special procurement processes. |
| `site.siteType` == "fuel_station" | HIGH | Fuel station projects require fire safety review and potentially explosion-proof equipment. |
| `project.isNewConstruction` == "yes" | MEDIUM | New construction coordination with GC required. Verify rough-in vs finish scope. |
| `site.accessRestrictions` contains text | LOW | Review access restrictions for scheduling and equipment implications. |

---

## Aggregate Review Summary

When displaying the review summary, group flags by priority:

```
CRITICAL (blocks estimate): X items
HIGH (requires review before sending): X items
MEDIUM (review recommended): X items
LOW (informational): X items
```

The estimator UI should:
1. Display all flags in a review panel
2. Allow reviewer to resolve each flag (enter data, confirm assumption, or override)
3. Track who resolved each flag and when
4. Block "Finalize" button until all CRITICAL and HIGH flags are resolved
5. Allow "Finalize with warnings" for MEDIUM and LOW flags
