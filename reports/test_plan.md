# Test Plan

Test scenarios for the EV Charging Estimator application.

---

## Test Categories

1. **Unit Tests** -- Individual functions and utilities
2. **Integration Tests** -- API routes, data transformations, Monday.com integration
3. **E2E Tests** -- Complete user workflows
4. **Edge Case Tests** -- Boundary conditions and error scenarios

---

## 1. Unit Tests

### 1.1 Input Validation

| Test ID | Description | Input | Expected Result |
|---------|-------------|-------|-----------------|
| UV-01 | Valid charger count | `{ count: 10 }` | Passes validation |
| UV-02 | Zero charger count | `{ count: 0 }` | Validation error: "Charger count must be at least 1" |
| UV-03 | Negative charger count | `{ count: -5 }` | Validation error |
| UV-04 | Non-integer charger count | `{ count: 3.5 }` | Validation error or round to 4 |
| UV-05 | Valid email format | `"user@example.com"` | Passes |
| UV-06 | Invalid email format | `"not-an-email"` | Validation error |
| UV-07 | Valid zip code | `"78701"` | Passes |
| UV-08 | Invalid zip code | `"ABCDE"` | Validation error |
| UV-09 | Markup percent = 0 | `{ markupPercent: 0 }` | Passes (valid edge case) |
| UV-10 | Markup percent > 100 | `{ markupPercent: 150 }` | Validation error |
| UV-11 | Tax rate negative | `{ taxRate: -5 }` | Validation error |
| UV-12 | Contingency = 20 (max) | `{ contingencyPercent: 20 }` | Passes |
| UV-13 | Contingency > 20 | `{ contingencyPercent: 25 }` | Validation error |

### 1.2 Enum Mapping (Monday.com -> Normalized)

| Test ID | Description | Monday Value | Expected Normalized |
|---------|-------------|-------------|-------------------|
| EM-01 | Project type mapping | `"Full Turnkey"` | `"full_turnkey"` |
| EM-02 | Project type with special chars | `"Remove & Replace"` | `"remove_replace"` |
| EM-03 | Project type with plus | `"Full Turnkey + Connectivity"` | `"full_turnkey_connectivity"` |
| EM-04 | Site type with slash | `"Fleet/Dealer"` | `"fleet_dealer"` |
| EM-05 | Site type with slash | `"Police/Gov"` | `"police_gov"` |
| EM-06 | Boolean status Yes | `"Yes"` | `"yes"` (string enum) |
| EM-07 | Null status | `null` | `null` (preserve null, flag as missing) |
| EM-08 | Unknown status value | `"Something Unexpected"` | Flag as unmapped, log warning |

### 1.3 Pricing Calculation

| Test ID | Description | Inputs | Expected Total |
|---------|-------------|--------|---------------|
| PC-01 | Simple hardware only | 10 chargers @ $500/ea, 20% markup, 8.25% tax, 10% contingency | Hardware: $5,000 + Markup: $1,000 + Tax: $495.00 + Contingency: $600 = $7,095.00 |
| PC-02 | Zero markup | $10,000 subtotal, 0% markup, 0% tax, 0% contingency | $10,000.00 |
| PC-03 | Client-furnished hardware | 10 chargers, purchasing = client | Hardware line = $0, only labor/materials in total |
| PC-04 | Tesla Supercharger bulk 4-stall | Package price $178,000 | $178,000 before markup/tax/contingency |
| PC-05 | Tesla Supercharger bulk 28-stall | Package price $672,500 | $672,500 before markup/tax/contingency |
| PC-06 | Tax on materials only | Materials $5,000, Labor $10,000, tax 8% | Tax = $400 (only on materials) |
| PC-07 | Override price takes precedence | Catalog $500, Override $600 | Use $600 |

### 1.4 Exclusion Selection

| Test ID | Description | Input Conditions | Expected Exclusions |
|---------|-------------|-----------------|-------------------|
| EX-01 | Standard exclusions always present | Any project | STD-01 through STD-12 |
| EX-02 | Full turnkey exclusions | `projectType: full_turnkey` | STD-* + FT-01 + FT-02 |
| EX-03 | Full turnkey + connectivity | `projectType: full_turnkey_connectivity` | STD-* + FT-01 (NO FT-02) |
| EX-04 | Remove & replace | `projectType: remove_replace` | STD-* + RR-01 through RR-04 |
| EX-05 | Client does make ready | `responsibilities.makeReady: client` | Includes make-ready exclusion text |
| EX-06 | Parking garage | `parkingEnvironment.type: parking_garage` | GAR-01 through GAR-05 |
| EX-07 | Equipment purchase only | `projectType: equipment_purchase` | EP-01 through EP-04 |

### 1.5 Manual Review Flag Detection

| Test ID | Description | Input | Expected Flags |
|---------|-------------|-------|---------------|
| MR-01 | Missing site type | `site.siteType: null` | HIGH flag: "Site Type is required" |
| MR-02 | Missing charger count | `charger.new.count: null` | CRITICAL flag |
| MR-03 | Model = Other | `charger.new.models: ["Other"]` | HIGH flag: "Verify exact model" |
| MR-04 | Post-tensioned = yes | `parkingEnvironment.postTensioned: "yes"` | HIGH flag: "GPR scan required" |
| MR-05 | Transformer needed | `electrical.transformerUpgradeNeeded: "yes"` | HIGH flag |
| MR-06 | Non-standard SC stalls | `charger.new.count: 7` (not 4/6/8/10/12/16/20/24/28) | HIGH flag: "Non-standard stall count" |
| MR-07 | All data provided, no issues | Complete valid input | No flags |
| MR-08 | Large project (>20 chargers) | `charger.new.count: 30` | LOW flag: "Large project review" |
| MR-09 | Airport site type | `site.siteType: "airport"` | HIGH flag: security clearance |

---

## 2. Integration Tests

### 2.1 Monday.com API Integration

| Test ID | Description | Setup | Expected |
|---------|-------------|-------|----------|
| MI-01 | Fetch board items | Valid API token, board ID 8940346166 | Returns array of items with column values |
| MI-02 | Fetch single item by ID | Valid item ID | Returns item with all column values |
| MI-03 | Search items by name | Search term matching known item | Returns matching items |
| MI-04 | Invalid API token | Expired/wrong token | Returns auth error, displays user-friendly message |
| MI-05 | Invalid board ID | Non-existent board ID | Returns "board not found" error |
| MI-06 | Rate limit handling | Rapid successive calls | Queues requests, retries after backoff |
| MI-07 | Parse status column | Monday status value JSON | Correctly extracts label |
| MI-08 | Parse dropdown column | Monday dropdown value JSON | Correctly resolves IDs to labels |
| MI-09 | Parse location column | Monday location value JSON | Extracts lat, lng, address |
| MI-10 | Parse null column | Column with null value | Returns null, does not throw |
| MI-11 | Handle missing column | Board schema changed, column removed | Logs warning, skips mapping |

### 2.2 Data Transformation Pipeline

| Test ID | Description | Input | Expected |
|---------|-------------|-------|----------|
| DT-01 | Complete Monday item -> normalized model | Full Monday item with all fields | Valid normalized input passing schema validation |
| DT-02 | Sparse Monday item -> normalized model | Item with only name and project type | Partial normalized input with missing fields flagged |
| DT-03 | Distance parsing: "150 feet" | `"150 feet"` | `conduitDistanceFeet: 150` |
| DT-04 | Distance parsing: "150ft" | `"150ft"` | `conduitDistanceFeet: 150` |
| DT-05 | Distance parsing: "about 150'" | `"about 150'"` | `conduitDistanceFeet: 150` with warning |
| DT-06 | Distance parsing: "unknown" | `"unknown"` | `conduitDistanceFeet: null`, flag for manual entry |
| DT-07 | Signage & Bollards multi-select | `["Signage", "Bollards"]` | `signageNeeded: true, bollardsNeeded: true` |
| DT-08 | Signage & Bollards = None | `["None"]` | `signageNeeded: false, bollardsNeeded: false` |

### 2.3 Estimate Generation

| Test ID | Description | Input | Expected |
|---------|-------------|-------|----------|
| EG-01 | Full turnkey, surface lot, ChargePoint | Complete input, all Bullet responsibility | Full estimate with all sections |
| EG-02 | Supercharger 8-stall, bulk pricing | Tesla SC, 8 stalls, bulk tier | Single hardware line at catalog price + installation sections |
| EG-03 | Equipment purchase only | Equipment only project type | Only hardware line items, no installation |
| EG-04 | Commission only | Commission project type | Only commissioning line items |
| EG-05 | Remove & replace | R&R project with existing chargers | Removal + new installation sections |
| EG-06 | Client does everything except install | All responsibilities = client except chargerInstall | Only install labor + related items |

---

## 3. E2E Tests (User Workflows)

### 3.1 Manual Entry Workflow

| Test ID | Description | Steps | Expected |
|---------|-------------|-------|----------|
| E2E-01 | Create estimate from scratch | 1. Open new estimate 2. Fill all required fields 3. Generate estimate 4. Review line items 5. Finalize | Estimate PDF generated with correct totals |
| E2E-02 | Create estimate with minimal data | 1. Open new estimate 2. Fill only project name, type, brand, count 3. Generate | Estimate generated with many manual review flags |
| E2E-03 | Resolve manual review flags | 1. Generate estimate with flags 2. Click each flag 3. Enter missing data 4. Re-generate | Flags clear as data is entered |
| E2E-04 | Override pricing | 1. Generate estimate 2. Click line item 3. Toggle override 4. Enter new price 5. Save | Total recalculates with override price |
| E2E-05 | Change project type | 1. Start as Full Turnkey 2. Change to Equipment Purchase | Line items update to remove installation scope; exclusions update |
| E2E-06 | Toggle responsibility | 1. Set Make Ready = Bullet 2. Generate 3. Change to Client | Make-ready line items removed; exclusion added |

### 3.2 Monday.com Import Workflow (Live Mode)

| Test ID | Description | Steps | Expected |
|---------|-------------|-------|----------|
| E2E-10 | Import item from Monday.com | 1. Click "Import from Monday" 2. Search for item 3. Select 4. Review mapped data | Fields pre-populated, missing fields highlighted |
| E2E-11 | Import and complete missing data | 1. Import item 2. Fill in missing electrical data 3. Fill in missing civil data 4. Generate | Complete estimate generated |
| E2E-12 | Re-import after Monday update | 1. Import item 2. Item updated in Monday.com 3. Re-import | Fields updated with latest Monday data; user edits preserved for non-Monday fields |

### 3.3 PDF Generation

| Test ID | Description | Steps | Expected |
|---------|-------------|-------|----------|
| E2E-20 | Generate detailed PDF | Select "Detailed" format | PDF with all line items, quantities, unit prices, extensions |
| E2E-21 | Generate summary PDF | Select "Summary" format | PDF with section totals only |
| E2E-22 | Generate lump sum PDF | Select "Lump Sum" format | PDF with single total and scope description |
| E2E-23 | PDF includes exclusions | Generate any format | Exclusions section appears at bottom |
| E2E-24 | PDF includes company header | Generate any format | Bullet Energy logo, address, contact info |

---

## 4. Edge Case Tests

### 4.1 Boundary Conditions

| Test ID | Description | Input | Expected |
|---------|-------------|-------|----------|
| EC-01 | Maximum charger count | `count: 999` | Accepts, flags "Large project review" |
| EC-02 | Single charger | `count: 1` | Accepts, generates valid estimate |
| EC-03 | Very long project name | 500+ character name | Truncates in PDF header, preserves in data |
| EC-04 | Special characters in notes | HTML, quotes, emoji in notes | Properly escaped in PDF, no XSS |
| EC-05 | Unicode in address | International characters | Properly rendered |
| EC-06 | All fields null except required | Minimal valid input | Generates estimate with maximum flags |
| EC-07 | Duplicate charger models selected | `models: ["CT4021", "CT4021"]` | De-duplicate, treat as single selection |
| EC-08 | Conflicting data: wall mount + pedestal count | `mountingType: wall`, `pedestalCount: 5` | Warning: "Pedestal count specified but mounting is wall" |

### 4.2 Error Recovery

| Test ID | Description | Scenario | Expected |
|---------|-------------|----------|----------|
| ER-01 | Network failure during Monday import | API call fails mid-request | Error message, retry option, no partial data |
| ER-02 | PDF generation fails | PDF library error | Error message with details, save estimate data (don't lose work) |
| ER-03 | Browser refresh during estimate | User refreshes mid-form | Form data preserved (localStorage or draft save) |
| ER-04 | Session timeout | User idle for extended period | Warn before timeout, save draft |
| ER-05 | Concurrent edits | Two users edit same estimate | Last save wins with conflict warning |

### 4.3 Data Integrity

| Test ID | Description | Test |
|---------|-------------|------|
| DI-01 | Estimate total matches line item sum | Generate estimate, verify total = sum of all line items + markup + tax + contingency |
| DI-02 | Tax applied only to taxable items | Verify tax not applied to labor (where applicable) |
| DI-03 | Client-furnished items not in total | Set purchasing = client, verify $0 hardware in total |
| DI-04 | Contingency applied after markup | Verify contingency base = subtotal + markup |
| DI-05 | Override doesn't affect other line items | Override one item, verify others unchanged |

---

## 5. Test Data Sets

### 5.1 Standard Test Scenarios

| Scenario | Project Type | Brand | Count | Parking | Complexity |
|----------|-------------|-------|-------|---------|-----------|
| Simple Hotel L2 | Full Turnkey | ChargePoint | 10 | Surface lot | Low |
| Large Garage L2 | Full Turnkey + Connectivity | Tesla (UWC) | 40 | Parking garage | High |
| Supercharger Basic | Supercharger | Tesla Supercharger | 8 | Surface lot | Medium |
| Remove & Replace | Remove & Replace | ChargePoint | 6 (new), 6 (existing) | Surface lot | Medium |
| Equipment Only | Equipment Purchase | SWTCH | 12 | N/A | Low |
| Commission Only | Commission Only | EV Connect | 8 | N/A | Low |
| Service Call | Service Work | N/A | N/A | N/A | Low |
| New Construction | Full Turnkey | ChargePoint | 20 | Parking garage | High |
| Mixed Mounting | Full Turnkey | ChargePoint | 15 | Mixed | High |
| Post-Tensioned Garage | Full Turnkey | Tesla (UWC) | 10 | Parking garage (PT) | Very High |

### 5.2 Regression Test Triggers

Run the full test suite when:
- Any pricing logic changes
- Any field added/removed from input model
- Monday.com column mapping changes
- Exclusion logic changes
- PDF template changes
- New charger brand/model added to catalog

---

## Test Coverage Targets

| Category | Target | Rationale |
|----------|--------|-----------|
| Unit tests | 90%+ | Core business logic must be thoroughly tested |
| Integration tests | 80%+ | API and data pipeline reliability |
| E2E tests | Key workflows | Cover the 10 standard scenarios above |
| Edge cases | All documented | Prevent regressions on known edge cases |

---

## Testing Tools (Recommended)

| Tool | Purpose |
|------|---------|
| Vitest | Unit and integration tests (fast, Vite-native) |
| React Testing Library | Component tests |
| Playwright | E2E browser tests |
| MSW (Mock Service Worker) | Mock Monday.com API responses |
| Zod | Schema validation (doubles as runtime validation + test assertions) |
