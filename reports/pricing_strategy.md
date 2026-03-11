# Pricing Strategy

How the estimator resolves pricing for each line item category. Addresses catalog pricing, manual overrides, missing data, and the critical L2 pricing gap.

---

## Pricing Resolution Hierarchy

For every line item, the estimator resolves pricing in this order:

```
1. Manual Override (user-entered price)     -- highest priority
2. Catalog Price (from pricing sheet)        -- Tesla Supercharger only
3. Rate Table (configurable unit rates)      -- labor, materials, accessories
4. System Default (placeholder with flag)    -- last resort
```

If no price is resolved at any level, the line item displays "TBD" and triggers a manual review flag.

---

## 1. Catalog Pricing (Tesla Supercharger)

### What exists

The Tesla Supercharger Pricing Sheet contains package pricing for 9 configurations at 2 pricing tiers (Bulk and MSRP). This is the ONLY catalog pricing that exists.

### How it works

1. User selects `charger.new.brand = "tesla_supercharger"`
2. User selects `charger.new.superchargerPackage` (e.g., "8_stall")
3. User selects `project.pricingTier` ("bulk" or "msrp")
4. System looks up price from catalog: `catalog[package][tier]`
5. Line item generated: "Tesla Supercharger 8-Stall Package" at catalog price

### Edge cases

| Scenario | Handling |
|----------|----------|
| Stall count doesn't match package | Flag: suggest nearest packages above and below |
| Pricing tier not selected | Flag: "Select Bulk or MSRP" |
| Price in catalog is $0 or null | Flag: "Catalog price missing. Contact Tesla rep." |
| Custom/negotiated pricing | User enters override price; flag for manager approval |

### Catalog maintenance

- The Tesla pricing sheet should be re-imported whenever Tesla updates pricing
- Admin UI should allow uploading new pricing sheet
- Version history should be maintained (date-stamped snapshots)
- When catalog updates, existing draft estimates are NOT retroactively changed

---

## 2. L2 Charger Pricing -- THE CRITICAL GAP

### Current state

**No L2 charger pricing exists in any Bullet Energy workbook or system.** This includes:

- Tesla Universal Wall Connector (UWC)
- All ChargePoint models (CT4000 series, CPF50, CP6000 series)
- Xeal
- SWTCH
- Ford
- EV Connect
- EV Passport / EV Passport L3
- Blink

### Interim handling (Phase 1)

Until a pricing catalog is built:

1. **All L2 charger line items require manual price entry**
2. The estimator shows: "[Brand] [Model] - Qty [count] -- ENTER UNIT PRICE"
3. The field is highlighted and cannot be left blank to finalize
4. Once entered, the price is saved to a "price memory" for that model
5. Next time the same model is used, the last-entered price is suggested (with date)

### Building the L2 catalog (Phase 2)

**Recommended approach:**

1. Create a `charger_catalog` table in the database:

```
charger_catalog:
  id: auto
  brand: string
  model: string
  charger_level: L2 | L3
  port_type: single | dual
  amperage: number
  voltage: string
  mounting: pedestal | wall
  unit_cost: number (Bullet's cost)
  unit_msrp: number (list price)
  last_updated: date
  updated_by: string
  status: active | discontinued | pending
```

2. Admin UI page to manage catalog entries
3. Seed with first batch of prices from sales team's knowledge
4. Track price history (every update creates a new version row)

### Price sources for L2 catalog population

| Brand | Price Source | Status |
|-------|-------------|--------|
| Tesla UWC | Tesla partner portal / distributor quotes | Not yet collected |
| ChargePoint CT4000 | ChargePoint dealer portal | Not yet collected |
| ChargePoint CPF50 | ChargePoint dealer portal | Not yet collected |
| ChargePoint CP6000 | ChargePoint dealer portal | Not yet collected |
| Xeal | Direct manufacturer quotes | Not yet collected |
| SWTCH | Direct manufacturer quotes | Not yet collected |
| Ford | Ford Pro dealer network | Not yet collected |
| EV Connect | Direct manufacturer quotes | Not yet collected |
| EV Passport | Direct manufacturer quotes | Not yet collected |
| Blink | Blink partner portal | Not yet collected |

---

## 3. Rate Tables (Labor and Materials)

### Structure

Rate tables provide per-unit pricing for labor, materials, and services. They are configurable by the admin and can vary by region.

**Recommended rate table structure:**

```
rate_tables:
  id: auto
  category: string (e.g., "electrical_labor", "civil_materials", "accessories")
  item_code: string (e.g., "TRENCH-ASPHALT-LF")
  description: string
  unit: string (e.g., "LF", "EA", "HR", "SF")
  base_rate: number (USD)
  prevailing_wage_rate: number (USD, null if N/A)
  union_rate: number (USD, null if N/A)
  region: string (null = national default)
  effective_date: date
  expiration_date: date (null = no expiration)
```

### Rate categories needed

| Category | Example Items | Unit | Notes |
|----------|--------------|------|-------|
| Electrical Labor | Electrician (journeyman) | HR | Varies by prevailing wage / union |
| Electrical Labor | Electrician (apprentice) | HR | |
| Electrical Materials | EMT Conduit (3/4") | LF | By size |
| Electrical Materials | EMT Conduit (1") | LF | |
| Electrical Materials | EMT Conduit (1-1/4") | LF | |
| Electrical Materials | EMT Conduit (2") | LF | |
| Electrical Materials | PVC Conduit (schedule 40, 2") | LF | Underground |
| Electrical Materials | THHN Wire (#8) | LF | By gauge |
| Electrical Materials | THHN Wire (#6) | LF | |
| Electrical Materials | THHN Wire (#4) | LF | |
| Electrical Materials | THHN Wire (#2) | LF | |
| Electrical Materials | THHN Wire (#1/0) | LF | |
| Electrical Materials | Circuit Breaker (40A, 2-pole) | EA | By amperage |
| Electrical Materials | Circuit Breaker (50A, 2-pole) | EA | |
| Electrical Materials | Circuit Breaker (60A, 2-pole) | EA | |
| Electrical Materials | Circuit Breaker (100A, 2-pole) | EA | |
| Electrical Materials | Electrical Panel (200A) | EA | |
| Electrical Materials | Electrical Panel (400A) | EA | |
| Electrical Materials | Transformer (75kVA) | EA | |
| Electrical Materials | Transformer (150kVA) | EA | |
| Electrical Materials | Transformer (300kVA) | EA | |
| Electrical Materials | Transformer (500kVA) | EA | |
| Civil Labor | General laborer | HR | |
| Civil Materials | Trenching (asphalt) | LF | |
| Civil Materials | Trenching (concrete) | LF | |
| Civil Materials | Trenching (dirt/gravel) | LF | |
| Civil Materials | Directional boring | LF | |
| Civil Materials | Core drilling | EA | |
| Civil Materials | Concrete pad (standard 3x3x6") | EA | |
| Civil Materials | Asphalt patching | LF | |
| Civil Materials | Concrete patching | LF | |
| Accessories | Steel pipe bollard (installed) | EA | |
| Accessories | Concrete-filled bollard (installed) | EA | |
| Accessories | Flexible bollard (installed) | EA | |
| Accessories | EV charging sign | EA | |
| Accessories | ADA sign | EA | |
| Accessories | Wayfinding sign | EA | |
| Accessories | Wheel stop (installed) | EA | |
| Accessories | Stall striping (per stall) | EA | |
| Network | Cellular modem | EA | |
| Network | WiFi access point | EA | |
| Network | Ethernet cable (Cat6) | LF | |
| Network | Network switch | EA | |
| Services | Permit application | EA | Flat fee |
| Services | Electrical design (simple) | EA | |
| Services | Electrical design (complex) | EA | |
| Services | Full construction document set | EA | |
| Services | Structural engineering | EA | |
| Services | Load calculation | EA | |
| Services | GPR scanning | EA | |
| Services | Traffic control (per day) | DAY | |

### Rate table population strategy

1. **Phase 1 (MVP):** Use industry-average rates as defaults, flagged for review
2. **Phase 2:** Bullet Energy team inputs their actual rates
3. **Phase 3:** Regional rate variations (Texas vs California, etc.)
4. **Ongoing:** Annual rate review and update cycle

---

## 4. Manual Override Pricing

### When to use

- Client has a negotiated price different from catalog/rate table
- One-off line item not in any rate table
- Correcting an obviously wrong catalog/rate price
- Competitive pricing adjustments

### Implementation

1. Every line item has an "Override" toggle
2. When enabled, user enters custom unit price
3. Original price (catalog/rate) is preserved and shown as strikethrough
4. Override flag appears in review panel
5. If override is >30% different from catalog/rate, flag for manager review
6. All overrides are logged with user, timestamp, and reason

### Override approval workflow

| Deviation from Standard | Approval Required |
|------------------------|-------------------|
| Within 10% | None (auto-approved) |
| 10-30% | Estimator reviewer |
| 30-50% | Manager approval |
| >50% | VP/Owner approval |
| $0 (zero price) | Manager approval (ensures intentional) |

---

## 5. Markup, Tax, and Contingency

### Markup

- Applied to: all cost line items (materials + labor)
- NOT applied to: client-furnished items, tax, contingency
- Default: company-configurable (suggest 15-25% starting point)
- Can be overridden per estimate
- Display on estimate: typically hidden (show only final price), configurable

### Tax

- Applied to: materials only (labor is typically tax-exempt, varies by state)
- Rate source: `estimateControls.taxRate` (user-entered per project)
- Future enhancement: auto-lookup by zip code
- Some states (e.g., Texas) tax labor on lump-sum contracts -- flag for review

### Contingency

- Applied to: subtotal after markup
- Default: 10%
- Purpose: unforeseen conditions discovered during installation
- Display: separate line item or included in pricing (configurable)
- Typical range: 5% (simple projects) to 15% (complex/unknown conditions)

---

## 6. Estimate Total Calculation

```
Hardware Subtotal     = SUM(charger line items including pedestals/mounting)
Labor Subtotal        = SUM(installation labor line items)
Materials Subtotal    = SUM(electrical materials + civil materials + accessories)
Services Subtotal     = SUM(permits + design + engineering + network)

Cost Subtotal         = Hardware + Labor + Materials + Services
Markup                = Cost Subtotal * markupPercent
Subtotal After Markup = Cost Subtotal + Markup
Tax                   = (Materials Subtotal + Hardware Subtotal) * taxRate  [varies by jurisdiction]
Contingency           = Subtotal After Markup * contingencyPercent
-------------------------------------------------------
ESTIMATE TOTAL        = Subtotal After Markup + Tax + Contingency
```

---

## 7. Price Display Options

The estimator should support multiple display formats for client-facing estimates:

| Format | Description | Use Case |
|--------|-------------|----------|
| Detailed | All line items with quantities, unit prices, extensions | Sophisticated clients, government |
| Summary | Section totals only (Hardware, Installation, Services) | Most commercial clients |
| Lump Sum | Single total price with scope description | Simple projects, repeat clients |
| Cost Plus | Shows cost + markup separately | Transparent pricing arrangements |

The internal view always shows full detail regardless of client-facing format.
