# Automation Rules

Detailed rules for generating estimate line items from normalized input data.

---

## 1. Estimate Header

**Rule:** Always auto-populate from project and customer data.

| Header Field | Source | Logic |
|-------------|--------|-------|
| Estimate title | `project.name` | Direct pass-through |
| Date | System date | Auto-generated |
| Customer name | `customer.companyName` | If missing, use project name |
| Customer contact | `customer.contactName` | If missing, flag for manual entry |
| Site address | `site.address` | Format as single-line string |
| Project type | `project.projectType` | Display as human-readable label |
| Sales rep | `project.salesRep` | Direct pass-through |
| Estimate number | Auto-generated | Sequential or configurable prefix + number |
| Payment terms | `estimateControls.paymentTerms` | Default: Net 30 |
| Validity period | System default | Default: 30 days from estimate date |

---

## 2. Charger Selection and Pricing

### Rule 2a: Tesla Supercharger Projects

**Trigger:** `charger.new.brand == "tesla_supercharger"`

1. Look up `charger.new.superchargerPackage` in Tesla Supercharger Pricing catalog
2. Select pricing tier based on `project.pricingTier` (bulk or msrp)
3. Generate single line item: "Tesla Supercharger [X]-Stall Package" at catalog price
4. If `charger.new.count` does not match a standard package size (4/6/8/10/12/16/20/24/28):
   - **Flag for manual review:** "Stall count [X] does not match standard Tesla package. Nearest packages: [lower] and [higher]."
5. If `project.pricingTier` is not set:
   - **Flag for manual review:** "Pricing tier (Bulk vs MSRP) not specified for Tesla Supercharger package."
6. Tesla Services fees are included in package price -- do NOT add separate line item

### Rule 2b: L2 Charger Projects (ChargePoint, Tesla UWC, etc.)

**Trigger:** `charger.new.brand != "tesla_supercharger"` AND `charger.new.chargerLevel == "l2"`

1. Check `charger.new.unitPriceOverride`:
   - If provided: use override price
   - If NOT provided: **flag for manual review** -- "No catalog price available for [brand] [model]. Enter unit price."
2. Generate line item: "[Brand] [Model] - Qty [count]" at unit price x count
3. If `charger.new.models` contains "Other":
   - **Flag for manual review:** "Charger model specified as 'Other'. Confirm model and pricing."
4. If `responsibilities.purchasingChargers == "client"`:
   - Show line item as "Charger Hardware (by client)" at $0 with note "Client-furnished equipment"
   - Do NOT include hardware cost in estimate total

### Rule 2c: Pedestal and Mounting Hardware

**Trigger:** `charger.new.mountingType == "pedestal"` AND `responsibilities.purchasingChargers == "bullet"`

1. If `charger.new.pedestalCount` is provided, use it
2. If not provided, calculate: `pedestalCount = charger.new.count / 2` (for dual port) or `charger.new.count` (for single port)
3. Generate line item: "Pedestal/Mounting Hardware - Qty [count]"
4. **Flag for pricing:** "Pedestal pricing varies by manufacturer. Enter unit price."

---

## 3. Parking Environment (Surface Lot vs Garage)

### Rule 3a: Surface Lot

**Trigger:** `parkingEnvironment.type == "surface_lot"`

1. **Trenching** (if `civil.trenchingRequired == "yes"`):
   - Line item: "Trenching - [trenchLengthFeet] LF"
   - Rate: per linear foot (configurable, default varies by surface type)
   - Surface restoration line item based on `civil.trenchSurfaceRestoration`:
     - `asphalt_patch`: "Asphalt Patching - [trenchLengthFeet] LF"
     - `concrete_patch`: "Concrete Patching - [trenchLengthFeet] LF"
     - `full_repave`: "Full Repaving" (flag for manual pricing)
2. **Concrete pads** (if `civil.concretePadRequired == "yes"` OR `charger.new.mountingType == "pedestal"`):
   - Line item: "Concrete Charger Pad - Qty [pedestalCount]"
   - If `civil.padDimensions` provided, include in description
   - Default pad size if not specified: 3' x 3' x 6" (flag for confirmation)
3. **Boring** (if `civil.boringRequired == "yes"`):
   - Line item: "Directional Boring - [boringDistanceFeet] LF"
4. **Traffic control** (if `civil.trafficControlNeeded == "yes"`):
   - Line item: "Traffic Control / Flagging" -- flat rate per day (configurable)

### Rule 3b: Parking Garage

**Trigger:** `parkingEnvironment.type == "parking_garage"`

1. **Post-tensioned check:**
   - If `parkingEnvironment.postTensioned == "yes"`:
     - **Flag for manual review:** "Post-tensioned structure requires GPR scan before core drilling"
     - Add line item: "GPR Scanning" (flag for pricing)
   - If `parkingEnvironment.postTensioned == "tbd"`:
     - **Flag for manual review:** "Post-tensioned status unknown. Verify before estimate finalization."
2. **Core drilling** (if `civil.coreDrillingRequired == "yes"`):
   - Line item: "Core Drilling - Qty [numberOfCores] cores"
   - If post-tensioned: add premium (flag for pricing)
3. **No trenching** in garage -- conduit is surface-mounted or overhead
   - Line item: "Surface Conduit / Wireway" instead of trenching
4. **Floor level considerations:**
   - If `parkingEnvironment.floorLevel > 0`:
     - Add line item: "Vertical Conduit Run - [floor level] floors"
     - Increase conduit distance estimate if not explicitly provided

### Rule 3c: Mixed/Other

**Trigger:** `parkingEnvironment.type == "mixed"` OR `parkingEnvironment.type == "other"`

- **Flag for manual review:** "Mixed or unspecified parking environment. Review site details before generating civil scope."
- Include both surface lot and garage sections with TBD pricing

---

## 4. Electrical Source

### Rule 4a: Panel Work

1. If `electrical.panelUpgradeNeeded == "yes"`:
   - Line item: "Electrical Panel Upgrade"
   - If `electrical.newPanelRequired == true`: "New Electrical Panel - [amperage]A"
   - Flag for pricing based on amperage
2. If `electrical.availableBreakerSpaces < charger.new.count`:
   - **Flag:** "Insufficient breaker spaces. [available] spaces available, [needed] needed."
   - Add line item: "Sub-panel Installation" or "Panel Replacement"

### Rule 4b: Transformer

1. If `electrical.transformerUpgradeNeeded == "yes"`:
   - Line item: "Transformer - [transformerSizeKva] kVA"
   - This is a MAJOR cost driver -- **always flag for manual pricing review**
   - Add line item: "Utility Coordination" if not already present
2. If `electrical.transformerUpgradeNeeded == "unknown"`:
   - **Flag for manual review:** "Transformer requirements unknown. Site survey required."

### Rule 4c: Conduit and Wire

1. Calculate total conduit distance:
   - Primary: `electrical.conduitDistanceFeet`
   - If not provided: **flag for manual entry**
2. Line item: "Conduit - [distance] LF" with material type based on routing:
   - `underground`: EMT or PVC (depends on jurisdiction)
   - `surface_exposed`: EMT or rigid
   - `in_wall`: EMT
   - `overhead`: Cable tray or conduit
3. Line item: "Wire / Cable Pull" based on:
   - Distance x number of conductors per charger
   - Wire gauge determined by amperage and distance (voltage drop calculation)
4. If `electrical.wirePullComplexity == "long_pull_200ft_plus"`:
   - Add line item: "Wire Pull Assist / Intermediate Pull Points"

### Rule 4d: Metering

1. If `electrical.meterType == "new_dedicated"`:
   - Line item: "New Electrical Meter / CT Cabinet"
2. If `electrical.meterType == "sub_meter"`:
   - Line item: "Sub-Metering System - Qty [charger count]"

---

## 5. Network

### Rule 5a: Network line items by connection type

| Connection Type | Line Items |
|----------------|------------|
| `wifi` | "WiFi Configuration / Testing" + optional "WiFi Access Point" if `network.wifiInstallResponsibility == "bullet"` |
| `cellular` | "Cellular Modem - Qty [charger count]" + "Cellular Activation" |
| `ethernet` | "Ethernet Cable Run - [distance] LF" + "Network Switch" (if multiple chargers) |
| `none` | No network line items |

### Rule 5b: Network management platform

- If brand is ChargePoint AND `network.managementPlatform != "chargepoint_cloud"`:
  - **Warning:** "ChargePoint chargers typically require ChargePoint Cloud. Verify network platform."
- Monthly fees: if `network.monthlyFeePerCharger > 0`, include as note (not line item): "Recurring: $[fee]/month/charger for network management"

---

## 6. Permit / Design / Engineering

### Rule 6a: Permits

**Trigger:** `responsibilities.permits == "bullet"`

1. Line item: "Permit Application & Filing"
2. If `permit.feeAllowance > 0`: Line item: "Permit Fees (allowance)" at specified amount
3. If `permit.feeAllowance == 0` or not set: Line item: "Permit Fees (allowance)" -- **flag for manual pricing**
4. If `responsibilities.permits == "client"`: No permit line items; add note "Permits by client"

### Rule 6b: Design & Engineering

**Trigger:** `responsibilities.designEngineering == "bullet"`

1. Base line item based on `designEngineering.planType`:
   - `electrical_only`: "Electrical Design / Single-Line Diagram"
   - `full_construction_set`: "Full Construction Document Set"
   - `as_built_only`: "As-Built Documentation"
   - `none` or not set: **Flag:** "Design scope not specified. Confirm requirements."
2. If `designEngineering.structuralEngineeringNeeded == true`:
   - Add: "Structural Engineering Analysis" (flag for pricing)
3. If `designEngineering.loadCalculationRequired == true`:
   - Add: "Electrical Load Calculation"

---

## 7. Site Accessories

### Rule 7a: Bollards

**Trigger:** `accessories.bollardsNeeded == true`

1. If `accessories.bollardQuantity > 0`:
   - Line item: "[bollardType] Bollards - Qty [quantity]"
2. If quantity not specified:
   - Default: 2 bollards per charger/pedestal
   - **Flag:** "Bollard quantity defaulted to [calculated]. Verify."
3. Include concrete footing for each bollard (unless post-tensioned garage)

### Rule 7b: Signage

**Trigger:** `accessories.signageNeeded == true`

1. If `accessories.signageQuantity > 0`:
   - Line item: "EV Charging Signage - Qty [quantity]"
2. If quantity not specified:
   - Default: 1 sign per charger + 1 directional sign
   - **Flag:** "Signage quantity defaulted. Verify."
3. If `site.adaComplianceRequired == true`:
   - Add: "ADA Signage - Qty [count]" (1 per ADA-designated space)

### Rule 7c: Wheel Stops and Striping

1. If `accessories.wheelStopQuantity > 0`: Line item: "Wheel Stops - Qty [quantity]"
2. If `civil.stripingNeeded == true`: Line item: "EV Stall Striping"

---

## 8. Pricing Source Priority

For each line item, pricing is resolved in this order:

1. **Manual override** -- User-entered price in estimator UI (highest priority)
2. **Catalog price** -- From Tesla Supercharger Pricing Sheet (for Supercharger packages only)
3. **Rate table** -- Configurable per-unit or per-LF rates (for labor, conduit, wire, etc.)
4. **Default estimate** -- System defaults with "TBD" flag for manual review
5. **Flag for manual entry** -- When no pricing source exists

**Current pricing availability:**
- Tesla Supercharger packages: CATALOG AVAILABLE (9 configs x 2 tiers)
- L2 charger hardware: NO PRICING -- always requires manual entry or override
- Installation labor: NO PRICING -- requires rate table setup
- Materials (conduit, wire, concrete): NO PRICING -- requires rate table setup
- Permits/design: NO PRICING -- typically estimated per project
- Accessories: NO PRICING -- requires rate table setup

---

## 9. Manual Review Triggers

The following conditions ALWAYS flag the estimate for manual review (see `manual_review_matrix.md` for the complete list):

1. **Missing critical fields:** Site Type, charger count, conduit distance, parking environment
2. **Ambiguous data:** "Other" or "TBD" selected for any key field
3. **Post-tensioned structure:** Any garage with post-tensioned = Yes or TBD
4. **Transformer required:** Any project requiring transformer upgrade
5. **Non-standard package:** Supercharger stall count not matching standard packages
6. **Missing pricing:** Any L2 charger without unit price override
7. **Complex routing:** Wire pull complexity = through_floors or long_pull_200ft_plus
8. **Large project:** More than 20 chargers (increased coordination complexity)
9. **Service work or commission only:** These project types have non-standard scoping

---

## 10. Scope Exclusion Logic

See `exclusions_logic.md` for the complete exclusion library. Exclusions are auto-selected based on:

1. **Project type** determines base exclusion set
2. **Responsibility assignments** (Bullet/Client/TBD) determine scope boundaries
3. **Site conditions** determine site-specific exclusions
4. All estimates include standard exclusions (permitting delays, utility work beyond meter, etc.)
