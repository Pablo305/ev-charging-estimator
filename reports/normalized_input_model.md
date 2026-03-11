# Normalized Input Model

This document defines the complete data model for the EV Charging Estimator. Each field includes its type, allowed values, source (Monday.com field, spreadsheet, or new), and whether it is required.

**Legend:**
- **Source: monday** = Maps to an existing Monday.com column
- **Source: spreadsheet** = Derived from an existing workbook
- **Source: new** = Must be collected via the new estimator frontend (does not exist anywhere today)
- **Required** = Must be provided for estimate generation
- **Conditional** = Required only when a parent condition is met
- **Optional** = Enhances estimate accuracy but has sensible defaults

---

## Section 1: `project`

General project identification and classification.

| Field | Type | Allowed Values | Required | Source | Monday Column ID | Notes |
|-------|------|---------------|----------|--------|-----------------|-------|
| `project.name` | string | free text | Required | monday | `name` | Project identifier |
| `project.salesRep` | string | free text | Required | monday | `multiple_person_mkrdtaay` | Monday people field, map to name string |
| `project.projectType` | enum | `full_turnkey`, `full_turnkey_connectivity`, `remove_replace`, `install_commission`, `equipment_purchase`, `equipment_install_commission`, `commission_only`, `service_work`, `supercharger` | Required | monday | `color_mkq1t9d` | Primary scope classifier |
| `project.isNewConstruction` | enum | `yes`, `no`, `other` | Required | monday | `color_mkq1fm6a` | Affects assumptions about infrastructure availability |
| `project.timeline` | string | free text (recommend: `30_days`, `60_days`, `90_days`, `120_plus_days`) | Optional | monday | `text_mkq1b6sk` | Free text today; should be standardized |
| `project.pricingTier` | enum | `bulk`, `msrp`, `negotiated` | Conditional (Supercharger) | new | -- | Determines Tesla package pricing tier |

---

## Section 2: `customer`

**Status: Entirely new. No Monday.com columns exist for customer data.**

| Field | Type | Allowed Values | Required | Source | Notes |
|-------|------|---------------|----------|--------|-------|
| `customer.companyName` | string | free text | Required | new | For estimate header |
| `customer.contactName` | string | free text | Required | new | Primary point of contact |
| `customer.email` | string | email format | Required | new | For estimate delivery |
| `customer.phone` | string | phone format | Optional | new | |
| `customer.billingAddress` | object | `{street, city, state, zip}` | Optional | new | If different from site address |
| `customer.poNumber` | string | free text | Optional | new | Client PO reference |

---

## Section 3: `site`

Physical site information.

| Field | Type | Allowed Values | Required | Source | Monday Column ID | Notes |
|-------|------|---------------|----------|--------|-----------------|-------|
| `site.address` | object | `{street, city, state, zip, lat, lng}` | Required | monday | `location_mkq17q59` | Structured location |
| `site.siteType` | enum | `airport`, `apartment`, `event_venue`, `fleet_dealer`, `hospital`, `hotel`, `industrial`, `mixed_use`, `fuel_station`, `municipal`, `office`, `parking_structure`, `police_gov`, `recreational`, `campground`, `restaurant`, `retail`, `school`, `other` | Required | monday | `single_select6785b7b` | 0% fill rate currently |
| `site.indoorOutdoor` | enum | `indoor`, `outdoor`, `both` | Required | new | -- | Affects weatherproofing scope |
| `site.accessRestrictions` | string | free text | Optional | new | -- | Gated, security, hours, crane access |
| `site.adaComplianceRequired` | boolean | true/false | Required | new | -- | Affects signage, path of travel |
| `site.numberOfUnits` | number | integer | Optional | monday | `numberaq2a9gzt` | Apartment/hotel unit count |

---

## Section 4: `parkingEnvironment`

Parking-specific details that drive civil and installation scope.

| Field | Type | Allowed Values | Required | Source | Monday Column ID | Notes |
|-------|------|---------------|----------|--------|-----------------|-------|
| `parkingEnvironment.type` | enum | `surface_lot`, `parking_garage`, `covered_parking`, `mixed`, `other` | Required | monday (broken) | `single_selectoo30hnc` | Poorly named "Single select", never filled |
| `parkingEnvironment.surfaceType` | enum | `asphalt`, `concrete`, `gravel`, `dirt`, `paver` | Conditional (surface_lot) | new | -- | Affects trenching method |
| `parkingEnvironment.floorLevel` | number | integer (0 = ground) | Conditional (garage) | new | -- | Sometimes in free text |
| `parkingEnvironment.ceilingHeight` | number | feet (decimal) | Conditional (garage + wall mount) | new | -- | Clearance for conduit |
| `parkingEnvironment.postTensioned` | enum | `yes`, `no`, `tbd` | Conditional (garage) | monday | `color_mkqzzcq3` | 0% fill rate |
| `parkingEnvironment.spacesAffected` | number | integer | Optional | new | -- | For traffic control and ADA |
| `parkingEnvironment.installationLocationDescription` | string | free text | Optional | monday | `text_mkq13wmf` | Supplementary detail |

---

## Section 5: `charger`

Charger hardware specification. Supports both new installation and R&R (Remove & Replace).

### 5a: New Chargers

| Field | Type | Allowed Values | Required | Source | Monday Column ID | Notes |
|-------|------|---------------|----------|--------|-----------------|-------|
| `charger.new.brand` | enum | `tesla`, `chargepoint`, `xeal`, `swtch`, `ford`, `ev_connect`, `ev_passport`, `blink`, `tesla_supercharger`, `ev_passport_l3` | Required | monday | `dropdown_mkqswef4` | |
| `charger.new.models` | array of enum | See Monday model list (22 options) | Required | monday | `multi_selectwzq4zbsy` | Multi-select |
| `charger.new.chargerLevel` | enum | `l2`, `l3` | Required | new | -- | Inferred from brand/model but should be explicit |
| `charger.new.count` | number | integer | Required | monday | `numeric_mkq1f1kg` | |
| `charger.new.pedestalCount` | number | integer | Conditional (pedestal mount) | monday | `numeric_mkqe2fj6` | |
| `charger.new.portType` | enum | `dual`, `single`, `other`, `mix` | Required | monday | `color_mkq1bf8b` | |
| `charger.new.mountingType` | enum | `pedestal`, `wall`, `other`, `tbd`, `mix` | Required | monday | `color_mkq17yas` | |
| `charger.new.amperage` | number | amps (integer) | Required | new | -- | Per charger |
| `charger.new.voltage` | enum | `208v`, `240v`, `277v`, `480v` | Required | new | -- | |
| `charger.new.powerOutputKw` | number | kW (decimal) | Optional | new | -- | Per charger |
| `charger.new.connectorType` | enum | `j1772`, `ccs`, `nacs`, `chademo` | Optional | new | -- | Inferred from model |
| `charger.new.unitPriceOverride` | number | USD (decimal) | Optional | new | -- | When price differs from catalog |
| `charger.new.cableManagement` | boolean | true/false | Optional | new | -- | Retractors, cable trays |
| `charger.new.superchargerPackage` | enum | `4_stall`, `6_stall`, `8_stall`, `10_stall`, `12_stall`, `16_stall`, `20_stall`, `24_stall`, `28_stall` | Conditional (Supercharger) | new | -- | Maps to Tesla pricing |

### 5b: Remove & Replace (existing chargers)

| Field | Type | Allowed Values | Required | Source | Monday Column ID | Notes |
|-------|------|---------------|----------|--------|-----------------|-------|
| `charger.existing.count` | number | integer | Conditional (R&R) | monday | `numeric_mkq19jsg` | |
| `charger.existing.portType` | enum | `dual`, `single`, `tbd`, `mix` | Conditional (R&R) | monday | `color_mkq19jar` | |
| `charger.existing.brands` | array of enum | 11 brands in R&R dropdown | Conditional (R&R) | monday | `multi_selecttt4bf0xk` | |
| `charger.existing.mountingStyle` | enum | `pedestal`, `wall`, `tbd` | Conditional (R&R) | monday | `color_mkq136xm` | |
| `charger.existing.ampsPerCharger` | number | amps | Conditional (R&R) | monday | `long_text_mkq1tm3d` | Free text today, should be numeric |

---

## Section 6: `electrical`

Electrical infrastructure details.

| Field | Type | Allowed Values | Required | Source | Notes |
|-------|------|---------------|----------|--------|-------|
| `electrical.serviceVoltage` | enum | `120_208v`, `120_240v`, `277_480v`, `other` | Required | new | |
| `electrical.serviceAmperage` | number | amps | Required | new | |
| `electrical.availablePanelCapacity` | number | amps | Required | new | |
| `electrical.availableBreakerSpaces` | number | integer | Required | new | |
| `electrical.panelUpgradeNeeded` | enum | `no`, `yes`, `tbd` | Required | new | |
| `electrical.newPanelRequired` | boolean | true/false | Conditional (panel upgrade) | new | |
| `electrical.transformerUpgradeNeeded` | enum | `no`, `yes`, `tbd`, `unknown` | Required | new | Major cost driver |
| `electrical.transformerSizeKva` | enum | `75`, `112.5`, `150`, `225`, `300`, `500`, `750`, `other` | Conditional (transformer yes) | new | |
| `electrical.utilityCoordinationNeeded` | boolean | true/false | Required | new | |
| `electrical.meterType` | enum | `existing`, `new_dedicated`, `sub_meter` | Optional | new | |
| `electrical.conduitRouting` | enum | `underground`, `surface_exposed`, `in_wall`, `overhead`, `mixed` | Required | new | |
| `electrical.conduitDistanceFeet` | number | feet | Required | monday (broken) | `text_mkq1yy5` is free text, 0% filled |
| `electrical.wirePullComplexity` | enum | `straight_run`, `multiple_bends`, `through_floors`, `long_pull_200ft_plus` | Optional | new | |
| `electrical.loadManagementEvems` | boolean | true/false | Optional | new | |
| `electrical.roomDescription` | string | free text | Optional | monday | `text_mkq1qk6q` |

---

## Section 7: `civil`

Civil/construction work scope.

| Field | Type | Allowed Values | Required | Source | Notes |
|-------|------|---------------|----------|--------|-------|
| `civil.trenchingRequired` | enum | `yes`, `no`, `tbd` | Required | new | |
| `civil.trenchLengthFeet` | number | feet | Conditional (trenching yes) | new | |
| `civil.trenchSurfaceRestoration` | enum | `asphalt_patch`, `concrete_patch`, `full_repave`, `none` | Conditional (trenching yes) | new | |
| `civil.boringRequired` | enum | `yes`, `no`, `tbd` | Required | new | |
| `civil.boringDistanceFeet` | number | feet | Conditional (boring yes) | new | |
| `civil.coreDrillingRequired` | enum | `yes`, `no`, `tbd` | Conditional (garage) | new | |
| `civil.numberOfCores` | number | integer | Conditional (core drilling yes) | new | |
| `civil.trafficControlNeeded` | enum | `yes`, `no`, `tbd` | Required | new | |
| `civil.stripingNeeded` | boolean | true/false | Optional | new | |
| `civil.concretePadRequired` | enum | `yes`, `no` | Conditional (pedestal mount) | new | |
| `civil.padDimensions` | string | "L x W x D" format | Conditional (pad yes) | new | |

---

## Section 8: `permit`

Permitting scope.

| Field | Type | Allowed Values | Required | Source | Monday Column ID | Notes |
|-------|------|---------------|----------|--------|-----------------|-------|
| `permit.responsibility` | enum | `bullet`, `client`, `tbd` | Required | monday | `dropdown_mkq1ws3` | |
| `permit.feeAllowance` | number | USD | Optional | new | -- | |
| `permit.typesNeeded` | array of enum | `electrical`, `building`, `encroachment`, `fire`, `none` | Optional | new | -- | |
| `permit.ahj` | string | free text | Optional | new | -- | Authority Having Jurisdiction |
| `permit.estimatedTimeline` | enum | `1_2_weeks`, `2_4_weeks`, `4_8_weeks`, `8_plus_weeks` | Optional | new | -- | |

---

## Section 9: `designEngineering`

Design and engineering scope.

| Field | Type | Allowed Values | Required | Source | Monday Column ID | Notes |
|-------|------|---------------|----------|--------|-----------------|-------|
| `designEngineering.responsibility` | enum | `bullet`, `client`, `tbd` | Required | monday | `dropdown_mkq1nyx6` | |
| `designEngineering.planType` | enum | `electrical_only`, `full_construction_set`, `as_built_only`, `none` | Optional | new | -- | |
| `designEngineering.structuralEngineeringNeeded` | boolean | true/false | Conditional (garage) | new | -- | |
| `designEngineering.loadCalculationRequired` | boolean | true/false | Optional | new | -- | |

---

## Section 10: `network`

Network and software configuration.

| Field | Type | Allowed Values | Required | Source | Notes |
|-------|------|---------------|----------|--------|-------|
| `network.connectionType` | enum | `wifi`, `cellular`, `ethernet`, `none` | Required | new | |
| `network.managementPlatform` | enum | `chargepoint_cloud`, `tesla_fleet`, `swtch_platform`, `blink_network`, `open_charge`, `other`, `none` | Optional | new | |
| `network.wifiInstallResponsibility` | enum | `bullet`, `client`, `na`, `tbd` | Conditional (wifi) | monday | `multi_select01zypan0` |
| `network.cellularModemNeeded` | boolean | true/false | Conditional (cellular) | new | |
| `network.ethernetRunNeeded` | boolean | true/false | Conditional (ethernet) | new | |
| `network.ethernetDistanceFeet` | number | feet | Conditional (ethernet) | new | |
| `network.paymentSystemType` | enum | `rfid`, `app_based`, `credit_card`, `free_charging`, `mixed` | Optional | new | |
| `network.monthlyFeePerCharger` | number | USD | Optional | new | |

---

## Section 11: `accessories`

Site accessories (signage, bollards, etc.).

| Field | Type | Allowed Values | Required | Source | Monday Column ID | Notes |
|-------|------|---------------|----------|--------|-----------------|-------|
| `accessories.signageNeeded` | boolean | true/false | Required | monday (partial) | `dropdown_mkq15p5a` | Currently just presence, no quantity |
| `accessories.signageTypes` | array of enum | `wayfinding`, `regulatory`, `reserved_parking`, `ada`, `custom` | Conditional (signage) | new | -- | |
| `accessories.signageQuantity` | number | integer | Conditional (signage) | new | -- | |
| `accessories.bollardsNeeded` | boolean | true/false | Required | monday (partial) | `dropdown_mkq15p5a` | |
| `accessories.bollardType` | enum | `steel_pipe`, `concrete_filled`, `flexible`, `removable` | Conditional (bollards) | new | -- | |
| `accessories.bollardQuantity` | number | integer | Conditional (bollards) | new | -- | |
| `accessories.wheelStopQuantity` | number | integer | Optional | new | -- | |
| `accessories.lightingNeeded` | boolean | true/false | Optional | new | -- | |

---

## Section 12: `estimateControls`

Financial parameters for estimate calculation.

| Field | Type | Allowed Values | Required | Source | Notes |
|-------|------|---------------|----------|--------|-------|
| `estimateControls.markupPercent` | number | percentage (0-100) | Required | new | Default: configurable per company |
| `estimateControls.taxRate` | number | percentage (0-15) | Required | new | Varies by jurisdiction |
| `estimateControls.contingencyPercent` | number | percentage (0-20) | Optional | new | Default: 10% |
| `estimateControls.prevailingWage` | boolean | true/false | Required | new | Dramatically affects labor cost |
| `estimateControls.unionLabor` | boolean | true/false | Required | new | Affects labor rates |
| `estimateControls.bondingRequired` | boolean | true/false | Optional | new | |
| `estimateControls.paymentTerms` | enum | `net_30`, `net_45`, `net_60`, `50_50`, `progress_billing` | Optional | new | |

---

## Section 13: `responsibilities`

Scope responsibility assignments (who does what).

| Field | Type | Allowed Values | Required | Source | Monday Column ID |
|-------|------|---------------|----------|--------|-----------------|
| `responsibilities.makeReady` | enum | `bullet`, `client`, `tbd` | Required | monday | `dropdown_mkq1ce91` |
| `responsibilities.permits` | enum | `bullet`, `client`, `tbd` | Required | monday | `dropdown_mkq1ws3` |
| `responsibilities.designEngineering` | enum | `bullet`, `client`, `tbd` | Required | monday | `dropdown_mkq1nyx6` |
| `responsibilities.purchasingChargers` | enum | `bullet`, `client`, `tbd` | Required | monday | `dropdown_mkq1yysm` |
| `responsibilities.chargerInstall` | enum | `bullet`, `client`, `tbd` | Required | monday | `dropdown_mkq12g4b` |
| `responsibilities.concreteWork` | enum | `bullet`, `client`, `tbd`, `na` | Optional | new | -- |
| `responsibilities.trenching` | enum | `bullet`, `client`, `tbd`, `na` | Optional | new | -- |
| `responsibilities.surfaceRestoration` | enum | `bullet`, `client`, `tbd`, `na` | Optional | new | -- |

---

## Section 14: `notes`

Free-form notes and documentation.

| Field | Type | Required | Source | Monday Column ID |
|-------|------|----------|--------|-----------------|
| `notes.additionalNotes` | string (long text) | Optional | monday | `long_text_mkq1n1nf` |
| `notes.actionItems` | string (long text) | Optional | monday | `long_text_mkq296dg` |
| `notes.aerialViewFiles` | array of file references | Optional | monday | `file_mksn7ncj` |
| `notes.relatedDocuments` | array of file references | Optional | monday | `file_mkqehy82` |

---

## Field Count Summary

| Section | Total Fields | From Monday | From Spreadsheet | New (estimator) |
|---------|-------------|-------------|-----------------|-----------------|
| project | 6 | 5 | 0 | 1 |
| customer | 6 | 0 | 0 | 6 |
| site | 6 | 3 | 0 | 3 |
| parkingEnvironment | 7 | 2 | 0 | 5 |
| charger (new) | 14 | 7 | 0 | 7 |
| charger (existing/R&R) | 5 | 5 | 0 | 0 |
| electrical | 15 | 2 | 0 | 13 |
| civil | 11 | 0 | 0 | 11 |
| permit | 5 | 1 | 0 | 4 |
| designEngineering | 4 | 1 | 0 | 3 |
| network | 8 | 1 | 0 | 7 |
| accessories | 8 | 1 | 0 | 7 |
| estimateControls | 7 | 0 | 0 | 7 |
| responsibilities | 8 | 5 | 0 | 3 |
| notes | 4 | 4 | 0 | 0 |
| **TOTAL** | **114** | **37** | **0** | **77** |
