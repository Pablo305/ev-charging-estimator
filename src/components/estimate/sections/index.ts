export { ProjectSection, PROJECT_REQUIRED_FIELDS } from './ProjectSection';
export { CustomerSection, CUSTOMER_REQUIRED_FIELDS } from './CustomerSection';
export { SiteSection, SITE_REQUIRED_FIELDS } from './SiteSection';
export { ParkingSection, PARKING_REQUIRED_FIELDS } from './ParkingSection';
export { ChargerSection, CHARGER_REQUIRED_FIELDS } from './ChargerSection';
export { ElectricalSection, ELECTRICAL_REQUIRED_FIELDS } from './ElectricalSection';
export { CivilSection, CIVIL_REQUIRED_FIELDS } from './CivilSection';
export { PermitSection, PERMIT_REQUIRED_FIELDS } from './PermitSection';
export { NetworkSection, NETWORK_REQUIRED_FIELDS } from './NetworkSection';
export { AccessoriesSection, ACCESSORIES_REQUIRED_FIELDS } from './AccessoriesSection';
export { ResponsibilitiesSection, RESPONSIBILITIES_REQUIRED_FIELDS } from './ResponsibilitiesSection';
export { PricingSection, PRICING_REQUIRED_FIELDS } from './PricingSection';

import { PROJECT_REQUIRED_FIELDS } from './ProjectSection';
import { CUSTOMER_REQUIRED_FIELDS } from './CustomerSection';
import { SITE_REQUIRED_FIELDS } from './SiteSection';
import { PARKING_REQUIRED_FIELDS } from './ParkingSection';
import { CHARGER_REQUIRED_FIELDS } from './ChargerSection';
import { ELECTRICAL_REQUIRED_FIELDS } from './ElectricalSection';
import { CIVIL_REQUIRED_FIELDS } from './CivilSection';
import { PERMIT_REQUIRED_FIELDS } from './PermitSection';
import { NETWORK_REQUIRED_FIELDS } from './NetworkSection';
import { ACCESSORIES_REQUIRED_FIELDS } from './AccessoriesSection';
import { RESPONSIBILITIES_REQUIRED_FIELDS } from './ResponsibilitiesSection';
import { PRICING_REQUIRED_FIELDS } from './PricingSection';

export const SECTION_REQUIRED_FIELDS: Record<string, string[]> = {
  'Project': PROJECT_REQUIRED_FIELDS,
  'Customer': CUSTOMER_REQUIRED_FIELDS,
  'Site': SITE_REQUIRED_FIELDS,
  'Parking': PARKING_REQUIRED_FIELDS,
  'Charger': CHARGER_REQUIRED_FIELDS,
  'Electrical': ELECTRICAL_REQUIRED_FIELDS,
  'Civil': CIVIL_REQUIRED_FIELDS,
  'Permit/Design': PERMIT_REQUIRED_FIELDS,
  'Network': NETWORK_REQUIRED_FIELDS,
  'Accessories': ACCESSORIES_REQUIRED_FIELDS,
  'Responsibilities': RESPONSIBILITIES_REQUIRED_FIELDS,
  'Controls': PRICING_REQUIRED_FIELDS,
};
