# Spreadsheet Analysis

**Critical finding: NO traditional line-item estimate template exists in any workbook.**

The business currently generates estimates through a combination of Tesla package pricing, an ROI calculator for client-facing financials, and site-specific manual scoping. There is no standardized line-item cost breakdown template.

---

## Workbook 1: Tesla Supercharger Pricing Sheet

**Purpose:** Hardware package pricing for Tesla Supercharger (L3 DCFC) installations.
**Relevance to estimator:** HIGH -- primary source of hardware pricing for Supercharger projects.

### Structure

The workbook contains pricing for 9 distinct Supercharger package configurations, each available at two pricing tiers (Bulk and MSRP).

**Package configurations observed:**

| Package | Stalls | Description | Bulk Price | MSRP Price |
|---------|--------|-------------|------------|------------|
| Config 1 | 4 stalls | Base package | ~$178,000 | Higher |
| Config 2 | 6 stalls | -- | -- | -- |
| Config 3 | 8 stalls | Mid-range | -- | -- |
| Config 4 | 10 stalls | -- | -- | -- |
| Config 5 | 12 stalls | -- | -- | -- |
| Config 6 | 16 stalls | -- | -- | -- |
| Config 7 | 20 stalls | -- | -- | -- |
| Config 8 | 24 stalls | Large | -- | -- |
| Config 9 | 28+ stalls | Maximum | ~$672,500 | Higher |

**Pricing components per package (four-bucket model):**
1. **Hardware** -- Supercharger cabinets, posts, cables
2. **Installation** -- Labor and materials (site-specific)
3. **Tesla Services** -- Network activation, software, commissioning
4. **Host Pricing** -- Revenue share or flat fee arrangement

**Key observations:**
- Bulk pricing requires volume commitment (exact threshold not documented)
- MSRP is standard single-project pricing
- Installation costs are described as "site-specific" with NO line-item breakdown
- Tesla Services fees are fixed per package configuration
- The sheet does NOT include L2 (UWC) pricing

### What this means for the estimator

- Tesla Supercharger hardware can be auto-priced from this catalog
- Installation labor/materials must be estimated separately (no template exists)
- The estimator needs a "pricing tier" field (Bulk vs MSRP)
- Stall count maps directly to package selection

---

## Workbook 2: ROI Calculator

**Purpose:** Client-facing financial model to demonstrate return on investment for EV charging installations.
**Relevance to estimator:** MEDIUM -- contains useful reference data (electricity rates, utilization assumptions) but is NOT an estimate template.

### Structure

The ROI calculator models financial outcomes using these inputs:

**Input parameters:**
- State (drives electricity rate lookup)
- Number of chargers
- Charger type (L2 vs L3)
- Installation cost scenario (Low / Medium / High)
- Utilization band (percentage of time chargers are in use)
- Electricity rate (auto-populated by state, can be overridden)
- Revenue per kWh (pricing to end users)
- Monthly network/software fees

**Output calculations:**
- Monthly electricity cost
- Monthly revenue (based on utilization)
- Monthly net operating income
- Payback period (months)
- 5-year ROI projection
- Break-even utilization rate

**Reference data included:**
- State-by-state average commercial electricity rates
- Installation cost ranges by scenario:
  - Low: minimal site work, short conduit runs
  - Medium: moderate trenching, standard panel work
  - High: major electrical upgrades, long runs, complex civil

**Key observations:**
- The "installation cost scenarios" use rough ranges, NOT line-item breakdowns
- Electricity rates are useful reference data for the estimator's operating cost section
- The utilization bands could inform a future "proposal" module
- This workbook confirms there is NO granular cost model for installation

### What this means for the estimator

- State-based electricity rates can be imported as reference data
- Installation cost ranges (Low/Medium/High) confirm the need for a proper line-item model
- ROI calculations could be a future add-on feature for client-facing proposals

---

## Workbook 3: Texas Pipeline Checklist

**Purpose:** Sales pursuit tracker for Texas-based opportunities.
**Relevance to estimator:** LOW -- this is a CRM/pipeline tool, not a cost estimation tool.

### Structure

The checklist tracks sales activities for prospective EV charging projects in Texas:

**Tracked fields:**
- Prospect name / company
- Location (city/region)
- Site type
- Estimated project size (charger count)
- Sales stage (Lead, Qualified, Proposal, Negotiation, Closed)
- Sales rep assigned
- Key dates (initial contact, site visit, proposal sent)
- Follow-up actions
- Notes

**Key observations:**
- Overlaps significantly with the Monday.com SOW board's CRM function
- Contains no pricing, cost, or estimate data
- Texas-specific (not a general template)
- Likely predates or supplements the Monday.com board

### What this means for the estimator

- No data from this workbook is needed for estimate generation
- Confirms that Bullet Energy's estimation process has been informal/manual
- The pipeline data could be useful for testing the estimator with real project scenarios

---

## Summary of Findings

| Workbook | Contains Pricing? | Contains Line Items? | Useful for Estimator? |
|----------|-------------------|---------------------|----------------------|
| Tesla Supercharger Pricing | YES (9 packages x 2 tiers) | NO (packages only) | YES -- hardware catalog |
| ROI Calculator | NO (uses cost ranges) | NO | PARTIAL -- reference data |
| Texas Pipeline Checklist | NO | NO | NO |

### Critical Gap

**There is no line-item estimate template anywhere in the existing toolset.** The estimator project must CREATE this from scratch, using:

1. Tesla package pricing (from Workbook 1) for Supercharger hardware
2. Industry-standard line items for electrical, civil, and installation labor
3. Manufacturer pricing for L2 chargers (currently NOT documented anywhere)
4. Regional labor rate databases or configurable rate tables
5. Material pricing databases or configurable material costs

This is the core value proposition of the EV charging estimator: it will be the FIRST structured line-item estimate tool for Bullet Energy.
