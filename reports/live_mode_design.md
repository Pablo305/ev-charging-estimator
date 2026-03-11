# Live Mode Design: Monday.com API Integration

Optional feature to pull SOW data directly from Monday.com into the estimator, eliminating manual re-entry.

---

## Architecture Overview

```
Monday.com Board (8940346166)
         |
         | Monday.com GraphQL API (api.monday.com/v2)
         |
    [API Gateway / Serverless Function]
         |
         | Transform Monday data -> Normalized Input Model
         |
    [EV Charging Estimator Frontend]
         |
    [Estimate Generation Engine]
```

---

## Integration Modes

### Mode 1: Manual Pull (MVP)

**User workflow:**
1. User opens estimator
2. Clicks "Import from Monday.com"
3. Sees list of board items (searchable, filterable)
4. Selects an item
5. Monday data is pulled and mapped to normalized input model
6. Missing fields are highlighted for manual entry
7. User completes missing data and generates estimate

**Advantages:** Simple, no webhooks, user controls when data flows
**Disadvantages:** Manual trigger required, data may be stale

### Mode 2: Webhook Push (Phase 2)

**Workflow:**
1. Monday.com webhook fires when item is created or updated
2. Webhook payload is received by serverless function
3. Data is transformed and stored in estimator database
4. Estimator dashboard shows "New/Updated SOW" notification
5. User opens item and generates estimate

**Advantages:** Real-time data flow, no manual trigger
**Disadvantages:** Requires webhook setup, more complex error handling

### Mode 3: Bidirectional Sync (Phase 3)

**Workflow:**
1. All of Mode 2, plus:
2. When estimate is finalized, write estimate total back to Monday.com
3. Update Monday item status to "Estimate Sent"
4. Attach estimate PDF to Monday item

**Advantages:** Single source of truth, full visibility in Monday.com
**Disadvantages:** Most complex, requires write permissions

---

## Monday.com API Details

### Authentication

```
API URL: https://api.monday.com/v2
Method: POST (GraphQL)
Header: Authorization: <API_TOKEN>
Header: Content-Type: application/json
```

**Token management:**
- Store API token as environment variable (`MONDAY_API_TOKEN`)
- Token requires `boards:read` scope (Mode 1)
- Token requires `boards:write` scope (Mode 3)
- Admin UI to configure/rotate token
- Rate limit: 10,000,000 complexity points per minute

### Key GraphQL Queries

#### List board items (with pagination)

```graphql
query {
  boards(ids: [8940346166]) {
    items_page(limit: 50) {
      cursor
      items {
        id
        name
        group {
          title
        }
        column_values {
          id
          title
          type
          text
          value
        }
      }
    }
  }
}
```

#### Get single item by ID

```graphql
query {
  items(ids: [ITEM_ID]) {
    id
    name
    column_values {
      id
      title
      type
      text
      value
    }
  }
}
```

#### Search items by name

```graphql
query {
  boards(ids: [8940346166]) {
    items_page(
      limit: 20
      query_params: {
        rules: [{ column_id: "name", compare_value: ["search term"] }]
      }
    ) {
      items {
        id
        name
        column_values {
          id
          text
          value
        }
      }
    }
  }
}
```

### Column Value Parsing

Monday.com returns column values in a `value` JSON string that varies by column type. Parsing rules:

| Column Type | `value` Format | Parsing Logic |
|-------------|---------------|---------------|
| status | `{"index": N, "label": "Label"}` | Extract `label` |
| dropdown | `{"ids": [N]}` | Resolve IDs to labels via board settings |
| dropdown (multi) | `{"ids": [N1, N2]}` | Resolve each ID to label |
| numbers | `"42"` | Parse as number |
| text | `"some text"` | Direct string |
| long_text | `{"text": "content"}` | Extract `text` |
| location | `{"lat": N, "lng": N, "address": "..."}` | Extract all fields |
| people | `{"personsAndTeams": [{"id": N, "kind": "person"}]}` | Resolve user ID to name via API |
| file | `{"files": [{"url": "..."}]}` | Extract URLs |

### Data Transformation Pipeline

```
Monday Column Value
       |
       v
  Parse value JSON (type-specific)
       |
       v
  Map column_id to normalized field path (from sow_to_estimate_field_map.csv)
       |
       v
  Apply transformation logic (enum mapping, type coercion, etc.)
       |
       v
  Validate against normalized_input_schema.json
       |
       v
  Flag missing required fields for manual entry
       |
       v
  Normalized Input Model (ready for estimate generation)
```

---

## API Serverless Function Design

### Endpoint: `/api/monday/items`

**Method:** GET
**Query params:** `?search=<term>&group=<group_title>&page=<cursor>`
**Response:**
```json
{
  "items": [
    {
      "id": "123456",
      "name": "Project Name",
      "group": "SOW Forms - In Progress",
      "projectType": "Full Turnkey",
      "chargerBrand": "ChargePoint",
      "chargerCount": 10,
      "lastUpdated": "2026-03-10T..."
    }
  ],
  "cursor": "next_page_cursor",
  "total": 312
}
```

### Endpoint: `/api/monday/items/[id]`

**Method:** GET
**Response:**
```json
{
  "mondayItem": { ... },
  "normalizedInput": { ... },
  "missingFields": [
    { "path": "site.siteType", "priority": "HIGH", "message": "Site Type is required" },
    { "path": "electrical.conduitDistanceFeet", "priority": "HIGH", "message": "Conduit distance is required" }
  ],
  "warnings": [
    { "path": "charger.new.models", "message": "Model 'Other' selected. Verify exact model." }
  ]
}
```

### Endpoint: `/api/monday/items/[id]/writeback` (Mode 3)

**Method:** POST
**Body:**
```json
{
  "estimateTotal": 125000,
  "estimateNumber": "BE-2026-0142",
  "status": "Estimate Sent",
  "pdfUrl": "https://..."
}
```

---

## Error Handling

| Error | Handling |
|-------|----------|
| API token invalid/expired | Display "Monday.com connection failed. Contact admin." |
| Rate limit exceeded | Queue requests, retry with exponential backoff |
| Board not found | Display "Board configuration error. Contact admin." |
| Item not found | Display "SOW item not found. It may have been deleted." |
| Column schema changed | Log warning, attempt best-effort mapping, flag unmapped columns |
| Network timeout | Retry once, then display "Monday.com unavailable. Try again later." |

---

## Security Considerations

1. **API token** must be stored server-side only (never exposed to browser)
2. All Monday.com API calls go through serverless functions (not client-side)
3. Implement request signing to prevent unauthorized API function calls
4. Log all API interactions for audit trail
5. Rate limit estimator-side requests (prevent abuse)
6. Sanitize all data from Monday.com before rendering (prevent XSS from free-text fields)

---

## Configuration

Admin settings page for Monday.com integration:

| Setting | Type | Description |
|---------|------|-------------|
| `monday_api_token` | secret | Monday.com API token |
| `monday_board_id` | string | Board ID (default: 8940346166) |
| `monday_workspace_id` | string | Workspace ID (default: 7395896) |
| `live_mode_enabled` | boolean | Enable/disable Monday.com integration |
| `auto_sync_enabled` | boolean | Enable webhook-based auto-sync (Mode 2+) |
| `writeback_enabled` | boolean | Enable writing back to Monday.com (Mode 3) |
| `sync_interval_minutes` | number | Polling interval if webhooks unavailable |
| `column_mapping_version` | string | Version of column-to-field mapping in use |

---

## Implementation Phases

| Phase | Scope | Effort | Dependencies |
|-------|-------|--------|-------------|
| Phase 1 | Manual pull: list items, select, import, map | 2-3 days | Monday API token, column mapping |
| Phase 2 | Webhook push: real-time notifications | 1-2 days | Phase 1, Monday webhook setup |
| Phase 3 | Bidirectional: write estimate back to Monday | 1-2 days | Phase 2, Monday write permissions |
| Phase 4 | Bulk operations: import multiple items, batch estimates | 1 day | Phase 1 |
