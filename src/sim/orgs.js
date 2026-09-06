// Three organisations. Each asset names the product line it runs; `match` ties it to the
// day's Shadowserver rows by vendor/product, so whether an asset is threatened today is
// data, not authorship. Positions are grid cells (top-left of a 2x2 footprint).
//
// Zones by column: internet edge x=0, perimeter/DMZ 3..11, internal 14..21, core 24..28.
// `exposed` systems are reachable from the internet. Internal systems can only be reached
// by lateral movement from something already compromised.

// `trusted`: a system every other system takes instructions from (updates, builds, hypervisor);
// compromised, it reaches everything three times as fast.
const A = (o) => ({ exposed: false, shadow: false, appliance: false, canEdr: true, crit: 2, revenue: 0, trusted: false, match: [], ...o });

export const ORGS = {
  startup: {
    id: 'startup', name: 'Nordlicht Labs', tagline: 'AI startup, 40 people, everything in the cloud',
    people: 40, budget: 110, income: 16, waveBase: 13, difficultyLabel: 'Easy', difficulty: 1, scoreMultiplier: 1.0,
    blurb: 'A twelve-system stack and one engineer who is also the CISO. Little money, few systems, and the day\'s most-scanned new vulnerability is in your product.',
    assets: [
      A({ id: 'web', name: 'Product web app', product: 'Next.js / React Server Components', kind: 'web', x: 5, y: 3, exposed: true, crit: 3, revenue: 9, match: [{ vendor: /^Meta$/, product: /React Server Components/ }] }),
      A({ id: 'mlflow', name: 'MLflow tracking', product: 'MLflow', kind: 'ai', x: 5, y: 8, exposed: true, crit: 2, revenue: 3, match: [{ vendor: /^MLflow$/ }] }),
      A({ id: 'langflow', name: 'Langflow builder', product: 'Langflow', kind: 'ai', x: 9, y: 6, exposed: true, crit: 2, revenue: 2, match: [{ vendor: /^Langflow$/ }] }),
      A({ id: 'litellm', name: 'LLM gateway', product: 'LiteLLM', kind: 'api', x: 9, y: 11, exposed: true, crit: 2, revenue: 3, match: [{ vendor: /^LiteLLM$/ }] }),
      A({ id: 'router', name: 'Office router', product: 'ASUS GT-AC2900', kind: 'router', x: 5, y: 15, exposed: true, crit: 1, revenue: 0, appliance: true, canEdr: false, match: [{ vendor: /^ASUS$/ }] }),
      A({ id: 'marketing', name: 'Marketing site', product: 'WordPress + plugins', kind: 'web', x: 9, y: 16, exposed: true, crit: 1, revenue: 2, match: [{ vendor: /^Wordpress$/i }] }),
      A({ id: 'metabase', name: 'Metabase (data team)', product: 'Metabase', kind: 'app', x: 5, y: 11, exposed: true, shadow: true, crit: 2, revenue: 1, match: [{ vendor: /^Metabase$/ }] }),
      A({ id: 'n8n', name: 'n8n automations', product: 'n8n', kind: 'app', x: 13, y: 2, exposed: true, shadow: true, crit: 1, revenue: 1, match: [{ vendor: /^n8n$/ }] }),
      A({ id: 'ci', name: 'CI server', product: 'JetBrains TeamCity', kind: 'ci', x: 16, y: 4, exposed: true, crit: 2, revenue: 2, trusted: true, match: [{ vendor: /^JetBrains$/ }] }),
      A({ id: 'es', name: 'Log cluster', product: 'Elasticsearch', kind: 'db', x: 16, y: 13, crit: 2, revenue: 1, match: [{ vendor: /^Elastic$/ }] }),
      A({ id: 'laptops', name: 'Laptop fleet', product: 'macOS / Linux', kind: 'endpoint', x: 20, y: 8, crit: 1, revenue: 2 }),
      A({ id: 'db', name: 'Customer database', product: 'PostgreSQL', kind: 'db', x: 25, y: 8, crit: 3, revenue: 3 }),
    ],
  },
  midcap: {
    id: 'midcap', name: 'Halden Logistics', tagline: 'Mid-cap logistics group, 2,000 people, hybrid estate',
    people: 2000, budget: 300, income: 40, waveBase: 19, difficultyLabel: 'Medium', difficulty: 1, scoreMultiplier: 1.3,
    blurb: 'Nineteen systems across a perimeter of appliances, an on-prem Exchange, and a warehouse that runs on a PLC nobody has rebooted since 2019.',
    assets: [
      A({ id: 'fw', name: 'Perimeter firewall', product: 'Fortinet FortiGate', kind: 'firewall', x: 4, y: 2, exposed: true, crit: 3, revenue: 5, appliance: true, canEdr: false, match: [{ vendor: /^Fortinet$/ }] }),
      A({ id: 'vpn', name: 'Remote access VPN', product: 'Pulse Secure / Ivanti Connect', kind: 'vpn', x: 4, y: 7, exposed: true, crit: 3, revenue: 4, appliance: true, canEdr: false, match: [{ vendor: /^Pulse Secure$/ }, { vendor: /^Ivanti$/, product: /Connect|Secure|Policy/ }] }),
      A({ id: 'mail', name: 'Mail server', product: 'Microsoft Exchange', kind: 'mail', x: 8, y: 4, exposed: true, crit: 3, revenue: 6, match: [{ vendor: /^Microsoft$/, product: /Exchange/ }] }),
      A({ id: 'portal', name: 'Customer portal', product: 'Apache HTTP + Struts', kind: 'web', x: 8, y: 9, exposed: true, crit: 3, revenue: 12, match: [{ vendor: /^Apache$/, product: /HTTP Server|Struts|Tomcat/ }] }),
      A({ id: 'wiki', name: 'Wiki', product: 'Atlassian Confluence', kind: 'collab', x: 4, y: 12, exposed: true, crit: 2, revenue: 3, match: [{ vendor: /^Atlassian$/, product: /Confluence/ }] }),
      A({ id: 'site', name: 'Corporate site', product: 'WordPress', kind: 'web', x: 8, y: 14, exposed: true, crit: 1, revenue: 4, match: [{ vendor: /^Wordpress$/i }] }),
      A({ id: 'remote', name: 'IT remote support', product: 'ConnectWise ScreenConnect', kind: 'remote', x: 4, y: 16, exposed: true, crit: 2, revenue: 2, match: [{ vendor: /^ConnectWise$/ }] }),
      A({ id: 'cams', name: 'Warehouse cameras', product: 'Dahua NVR', kind: 'camera', x: 11, y: 1, exposed: true, crit: 1, revenue: 0, appliance: true, canEdr: false, match: [{ vendor: /^Dahua$/ }, { vendor: /^Hikvision$/ }] }),
      A({ id: 'branch', name: 'Branch router', product: 'Cisco RV340', kind: 'router', x: 11, y: 17, exposed: true, crit: 1, revenue: 1, appliance: true, canEdr: false, match: [{ vendor: /^Cisco$/, product: /RV3/ }] }),
      A({ id: 'dvr', name: 'Lobby DVR', product: 'MVPower DVR', kind: 'camera', x: 12, y: 8, exposed: true, shadow: true, crit: 1, revenue: 0, appliance: true, canEdr: false, match: [{ vendor: /^MVPower$/ }] }),
      A({ id: 'micro', name: 'Old campaign site', product: 'Drupal 7', kind: 'web', x: 12, y: 12, exposed: true, shadow: true, crit: 1, revenue: 0, match: [{ vendor: /^Drupal$/ }] }),
      A({ id: 'ad', name: 'Active Directory', product: 'Windows Server', kind: 'ad', x: 16, y: 3, crit: 3, revenue: 6 }),
      A({ id: 'wsus', name: 'Update server', product: 'WSUS', kind: 'app', x: 20, y: 3, crit: 2, revenue: 0, trusted: true, match: [{ vendor: /^Microsoft$/, product: /WSUS|Update Service/ }] }),
      A({ id: 'files', name: 'File server', product: 'Windows Server', kind: 'file', x: 16, y: 8, crit: 2, revenue: 3 }),
      A({ id: 'nas', name: 'Backup NAS', product: 'QNAP QTS', kind: 'nas', x: 20, y: 8, crit: 2, revenue: 1, appliance: true, canEdr: false, match: [{ vendor: /^QNAP$/ }] }),
      A({ id: 'ws', name: 'Workstations', product: 'Windows 11 fleet', kind: 'endpoint', x: 16, y: 13, crit: 1, revenue: 4 }),
      A({ id: 'monitor', name: 'Network monitoring', product: 'Cacti', kind: 'monitor', x: 20, y: 13, crit: 2, revenue: 0, match: [{ vendor: /^Cacti$/ }, { vendor: /^Progress$/, product: /WhatsUp/ }] }),
      A({ id: 'erp', name: 'ERP', product: 'SAP', kind: 'erp', x: 25, y: 5, crit: 3, revenue: 14 }),
      A({ id: 'ot', name: 'Warehouse automation', product: 'Schneider PLC + HMI', kind: 'ot', x: 25, y: 12, crit: 3, revenue: 8, appliance: true, canEdr: false, match: [{ vendor: /^Schneider Electric$/ }] }),
    ],
  },
  enterprise: {
    id: 'enterprise', name: 'Meridian Financial Group', tagline: 'Enterprise bank, 30,000 people, regulated',
    people: 30000, budget: 480, income: 40, waveBase: 22, difficultyLabel: 'Hard', difficulty: 1, scoreMultiplier: 1.6,
    blurb: 'Twenty-six systems, a large budget, and a perimeter made of exactly the appliances that today\'s attackers are looking for. Every hour of downtime on the banking portal is a headline.',
    assets: [
      A({ id: 'adc', name: 'ADC / gateway', product: 'Citrix NetScaler', kind: 'firewall', x: 4, y: 1, exposed: true, crit: 3, revenue: 12, appliance: true, canEdr: false, match: [{ vendor: /^Citrix$/, product: /NetScaler|ADC|Gateway/ }] }),
      A({ id: 'edge', name: 'Edge routers', product: 'Cisco IOS XE', kind: 'router', x: 4, y: 5, exposed: true, crit: 2, revenue: 8, appliance: true, canEdr: false, match: [{ vendor: /^Cisco$/, product: /IOS XE/ }] }),
      A({ id: 'fw', name: 'Regional firewall', product: 'Fortinet FortiGate', kind: 'firewall', x: 4, y: 9, exposed: true, crit: 2, revenue: 5, appliance: true, canEdr: false, match: [{ vendor: /^Fortinet$/ }] }),
      A({ id: 'gp', name: 'Remote access', product: 'Palo Alto GlobalProtect', kind: 'vpn', x: 4, y: 13, exposed: true, crit: 3, revenue: 8, appliance: true, canEdr: false, match: [{ vendor: /^Palo Alto Networks$/ }] }),
      A({ id: 'lb', name: 'Load balancer', product: 'F5 BIG-IP', kind: 'firewall', x: 4, y: 17, exposed: true, crit: 2, revenue: 8, appliance: true, canEdr: false, match: [{ vendor: /^F5$/ }] }),
      A({ id: 'bank', name: 'Online banking', product: 'Oracle WebLogic', kind: 'web', x: 8, y: 2, exposed: true, crit: 3, revenue: 38, match: [{ vendor: /^Oracle$/, product: /Weblogic/i }] }),
      A({ id: 'mail', name: 'Mail (hybrid)', product: 'Microsoft Exchange', kind: 'mail', x: 8, y: 7, exposed: true, crit: 2, revenue: 10, match: [{ vendor: /^Microsoft$/, product: /Exchange/ }] }),
      A({ id: 'atl', name: 'Confluence + Jira', product: 'Atlassian DC', kind: 'collab', x: 8, y: 12, exposed: true, crit: 2, revenue: 5, match: [{ vendor: /^Atlassian$/ }] }),
      A({ id: 'moveit', name: 'File transfer', product: 'Progress MOVEit', kind: 'file', x: 8, y: 16, exposed: true, crit: 2, revenue: 4, match: [{ vendor: /^Progress$/, product: /MOVEit/ }, { vendor: /^CrushFTP$/ }] }),
      A({ id: 'epmm', name: 'Mobile device mgmt', product: 'Ivanti EPMM', kind: 'mdm', x: 12, y: 4, exposed: true, crit: 2, revenue: 2, match: [{ vendor: /^Ivanti$/, product: /EPMM|Endpoint Manager Mobile|Sentry/ }] }),
      A({ id: 'sp', name: 'Extranet', product: 'Microsoft SharePoint', kind: 'web', x: 12, y: 9, exposed: true, crit: 2, revenue: 4, match: [{ vendor: /^Microsoft$/, product: /SharePoint/ }] }),
      A({ id: 'sspr', name: 'Password self-service', product: 'ManageEngine ADSelfService', kind: 'app', x: 12, y: 14, exposed: true, crit: 2, revenue: 1, match: [{ vendor: /^Zoho$/ }] }),
      A({ id: 'access', name: 'Building access', product: 'Linear eMerge E3', kind: 'ot', x: 1, y: 19, exposed: true, crit: 2, revenue: 0, appliance: true, canEdr: false, match: [{ vendor: /^Linear$/ }] }),
      A({ id: 'gis', name: 'GIS server (risk team)', product: 'GeoServer', kind: 'app', x: 12, y: 0, exposed: true, shadow: true, crit: 2, revenue: 0, match: [{ vendor: /^Geoserver$/i }] }),
      A({ id: 'print', name: 'Print management', product: 'PaperCut', kind: 'app', x: 12, y: 18, exposed: true, shadow: true, crit: 1, revenue: 0, match: [{ vendor: /^PaperCut$/ }] }),
      A({ id: 'ad', name: 'Active Directory', product: 'Windows Server', kind: 'ad', x: 15, y: 2, crit: 3, revenue: 15 }),
      A({ id: 'vc', name: 'Virtualisation', product: 'VMware vCenter', kind: 'app', x: 19, y: 2, crit: 2, trusted: true, revenue: 8, match: [{ vendor: /^VMware$/, product: /vCenter/ }] }),
      A({ id: 'siem', name: 'SIEM', product: 'Splunk', kind: 'monitor', x: 15, y: 7, crit: 2, revenue: 1, match: [{ vendor: /^Splunk$/ }] }),
      A({ id: 'files', name: 'File servers', product: 'Windows Server', kind: 'file', x: 19, y: 7, crit: 2, revenue: 5 }),
      A({ id: 'ws', name: 'Workstations', product: 'Windows 11 fleet', kind: 'endpoint', x: 15, y: 12, crit: 1, revenue: 8 }),
      A({ id: 'nas', name: 'Backup appliance', product: 'TerraMaster TOS', kind: 'nas', x: 19, y: 12, crit: 2, revenue: 1, appliance: true, canEdr: false, match: [{ vendor: /^TerraMaster$/ }] }),
      A({ id: 'bms', name: 'Data-centre BMS', product: 'Schneider EcoStruxure', kind: 'ot', x: 15, y: 17, crit: 2, revenue: 0, appliance: true, canEdr: false, match: [{ vendor: /^Schneider Electric$/ }] }),
      A({ id: 'trading', name: 'Trading platform', product: 'In-house Java', kind: 'app', x: 19, y: 17, crit: 2, revenue: 20, match: [{ vendor: /^Spring$/ }] }),
      A({ id: 'core', name: 'Core banking', product: 'Oracle DB', kind: 'db', x: 24, y: 3, crit: 3, revenue: 40 }),
      A({ id: 'swift', name: 'Payments gateway', product: 'SWIFT Alliance', kind: 'db', x: 24, y: 9, crit: 3, revenue: 15 }),
      A({ id: 'sap', name: 'ERP', product: 'SAP S/4', kind: 'erp', x: 24, y: 15, crit: 3, revenue: 20 }),
    ],
  },
};

export const ORG_LIST = [ORGS.startup, ORGS.midcap, ORGS.enterprise];
