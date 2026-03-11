// ============================================================
// monday.com Board Configuration
// ============================================================
// Column IDs and label mappings discovered via MCP.
// These represent the current SOW board structure.

export const BOARD_CONFIG = {
  boardId: '0000000000', // Placeholder - set via env
  columnMappings: {
    // ── Project ──
    projectName: 'name', // item name
    salesRep: 'person', // People column
    projectType: 'status_1', // Status column
    timeline: 'timeline', // Timeline column
    isNewConstruction: 'checkbox_1',

    // ── Customer ──
    companyName: 'text_1',
    contactName: 'text_2',
    contactEmail: 'email',
    contactPhone: 'phone',
    billingAddress: 'long_text_1',

    // ── Site ──
    siteAddress: 'location',
    siteType: 'dropdown_1',
    state: 'dropdown_2',

    // ── Parking Environment ──
    parkingType: 'dropdown_3',
    hasPTSlab: 'checkbox_2',
    surfaceType: 'dropdown_4',
    trenchingRequired: 'checkbox_3',
    boringRequired: 'checkbox_4',
    indoorOutdoor: 'dropdown_5',

    // ── Charger ──
    chargerBrand: 'dropdown_6',
    chargerModel: 'text_3',
    chargerCount: 'numbers',
    pedestalCount: 'numbers_1',
    portType: 'dropdown_7',
    mountType: 'dropdown_8',
    customerSupplied: 'checkbox_5',
    chargingLevel: 'dropdown_9',
    ampsPerCharger: 'numbers_2',
    volts: 'numbers_3',

    // ── Electrical ──
    serviceType: 'dropdown_10',
    distanceToPanel: 'numbers_4',
    panelUpgrade: 'checkbox_6',
    transformerRequired: 'checkbox_7',

    // ── Responsibilities ──
    permitResponsibility: 'dropdown_11',
    designResponsibility: 'dropdown_12',
    makeReadyResponsibility: 'dropdown_13',
    installResponsibility: 'dropdown_14',
    purchasingResponsibility: 'dropdown_15',

    // ── Network ──
    networkType: 'dropdown_16',

    // ── Notes ──
    notes: 'long_text_2',
  },
  labelMaps: {
    projectType: {
      'Full Turnkey': 'full_turnkey',
      'Full Turnkey + Connectivity': 'full_turnkey_connectivity',
      'Equipment + Install + Commission': 'equipment_install_commission',
      'Install + Commission': 'install_commission',
      'Equipment Purchase Only': 'equipment_purchase',
      'Remove & Replace': 'remove_replace',
      'Commission Only': 'commission_only',
      'Service Work': 'service_work',
      'Supercharger': 'supercharger',
    } as Record<string, string>,
    siteType: {
      'Airport': 'airport',
      'Apartment': 'apartment',
      'Event Venue': 'event_venue',
      'Fleet/Dealer': 'fleet_dealer',
      'Hospital': 'hospital',
      'Hotel': 'hotel',
      'Industrial': 'industrial',
      'Mixed Use': 'mixed_use',
      'Fuel Station': 'fuel_station',
      'Municipal': 'municipal',
      'Office': 'office',
      'Parking Structure': 'parking_structure',
      'Police/Gov': 'police_gov',
      'Recreational': 'recreational',
      'Campground': 'campground',
      'Restaurant': 'restaurant',
      'Retail': 'retail',
      'School': 'school',
      'Other': 'other',
    } as Record<string, string>,
    parkingType: {
      'Surface Lot': 'surface_lot',
      'Parking Garage': 'parking_garage',
      'Mixed': 'mixed',
    } as Record<string, string>,
    surfaceType: {
      'Asphalt': 'asphalt',
      'Concrete': 'concrete',
      'Gravel': 'gravel',
      'Other': 'other',
    } as Record<string, string>,
    serviceType: {
      '120V': '120v',
      '208V': '208v',
      '240V': '240v',
      '480V 3-Phase': '480v_3phase',
      'Unknown': 'unknown',
    } as Record<string, string>,
    networkType: {
      'None': 'none',
      'Customer LAN': 'customer_lan',
      'WiFi Bridge': 'wifi_bridge',
      'Cellular Router': 'cellular_router',
      'Included in Package': 'included_in_package',
    } as Record<string, string>,
    responsibility: {
      'Bullet': 'bullet',
      'Client': 'client',
      'TBD': 'tbd',
    } as Record<string, string>,
  },
} as const;
