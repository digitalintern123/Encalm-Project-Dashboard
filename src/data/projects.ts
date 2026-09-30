import { formatDayMonth } from '@/lib/date';

export type Location = 'Delhi' | 'Hyderabad' | 'Goa' | 'Bhogapuram' | 'Vizag';
export type Category = 'Hotel' | 'Lounge' | 'Kitchen' | 'Encalm Eats' | 'Other';
export type Health = 'On track' | 'At risk' | 'Delayed' | 'Not started';
export type ProjectStatus = 'Yet to start' | 'In Design' | 'In Tendering' | 'Under Construction' | 'Operational';
export type StageStatus = 'complete' | 'active' | 'upcoming' | 'blocked';
export type IssueCategory = 'Design' | 'Procurement' | 'Billing' | 'Construction' | 'Approval' | 'Other';
export type IssueStatus = 'Open' | 'Under review' | 'Action in progress' | 'Resolved' | 'Closed';
export type ProjectTemplateId = 'lounge' | 'hotel' | 'kitchen' | 'encalm-eats' | 'custom';

export const projectStatuses: ProjectStatus[] = [
  'Yet to start',
  'In Design',
  'In Tendering',
  'Under Construction',
  'Operational',
];

export const issueCategories: IssueCategory[] = [
  'Design',
  'Procurement',
  'Billing',
  'Construction',
  'Approval',
  'Other',
];

export type Phase = {
  id?: string;
  name: string;
  status: StageStatus;
  progress: number;
  weight?: number;
  owner: string;
  plannedStart?: string;
  plannedFinish?: string;
  actualFinish?: string;
  workCompleted?: string;
  nextAction?: string;
  decisionRequired?: string;
  updatedAt?: string;
};

export type Milestone = {
  title: string;
  date: string;
  status: 'complete' | 'upcoming' | 'late';
  stage?: string;
  owner?: string;
  approvalRequired?: boolean;
  approvalStatus?: 'Not required' | 'Pending' | 'Approved' | 'Rejected';
  completedDate?: string;
};

export type ProjectIssue = {
  id?: string;
  title: string;
  detail: string;
  severity: 'High' | 'Medium' | 'Low';
  owner: string;
  category?: IssueCategory;
  status?: IssueStatus;
  stage?: string;
  dateRaised?: string;
  dueDate?: string;
  issueAriseDate?: string;
  targetClosureDate?: string;
  impactCost?: string;
  impactSchedule?: string;
  impactScope?: string;
  action?: string;
  resolution?: string;
};

export type ProjectUpdate = {
  date: string;
  author: string;
  role: string;
  text: string;
  stage?: string;
  kind?: 'Progress' | 'Decision' | 'Risk' | 'General';
};

export type FOHAreaItem = {
  sNo: number;
  floor: string;
  description: string;
  areaSqm: number;
  areaSqft: number;
  capacityPax?: number | string;
  remarks?: string;
};

export type FloorBuaItem = {
  sNo: number;
  floor: string;
  areaSqm: number;
  areaSqft: number;
  remarks?: string;
};

export type RoomConfigItem = {
  sNo: number;
  floor: string;
  keys: number;
  bays: number;
  remarks?: string;
};

export type ArchitecturalAreaProgram = {
  summary: {
    plotAreaSqm: number;
    plotAreaSqft: number;
    plotAreaAcres: number;
    builtUpAreaSqm: number;
    builtUpAreaSqft: number;
    numberOfFloorsDescription: string;
    totalRoomKeys: number;
    totalBays: number;
    standardRoomSizeSqm: number;
    numberOfElevators: number;
    elevatorRemarks: string;
    generalRemarks?: string;
  };
  fohAreas: {
    groundFloor: FOHAreaItem[];
    groundFloorSubtotal: { areaSqm: number; areaSqft: number };
    secondFloor: FOHAreaItem[];
    secondFloorSubtotal: { areaSqm: number; areaSqft: number };
    grandSubtotal: { areaSqm: number; areaSqft: number };
  };
  floorWiseBua: {
    items: FloorBuaItem[];
    subtotal: { areaSqm: number; areaSqft: number };
  };
  roomConfiguration: {
    items: RoomConfigItem[];
    totalKeys: number;
    totalBays: number;
  };
};

export type ProjectSpecification = {
  projectType: string;
  area: string;
  capacity: string;
  units: string;
  terminal: string;
  floor: string;
  scope: string;
  customFields?: { label: string; value: string }[];
  areaProgram?: ArchitecturalAreaProgram;
};

export type PhotoCategory = 'Progress' | 'Snag / Issue' | 'Milestone' | 'Before / After' | 'Inspection' | 'General';
export const photoCategories: PhotoCategory[] = ['Progress', 'Snag / Issue', 'Milestone', 'Before / After', 'Inspection', 'General'];

export type SitePhoto = {
  id: string;
  projectId: string;
  url: string;
  caption: string;
  stage?: string;
  category?: PhotoCategory;
  takenDate?: string;
  uploadedAt?: string;
  uploadedBy: string;
  role?: string;
  fileSize?: number;
  createdAt?: string;
};

export type Project = {
  id: string;
  name: string;
  location: Location;
  category: Category;
  code: string;
  health: Health;
  status?: ProjectStatus;
  progress: number;
  targetDate: string;
  targetLabel: string;
  aop: number;
  awarded: number;
  spent: number;
  projectedCost?: number;
  area?: string;
  paxKeys?: string;
  nextMilestone: string;
  nextMilestoneDate: string;
  leadId: string;
  phases: Phase[];
  milestones: Milestone[];
  issues: ProjectIssue[];
  updates: ProjectUpdate[];
  photos?: SitePhoto[];
  startDate?: string;
  lastUpdated?: string;
  specification?: ProjectSpecification;
  templateId?: ProjectTemplateId;
};

export type ProjectTemplate = {
  id: ProjectTemplateId;
  label: string;
  description: string;
  fields: string[];
  stages: { name: string; owner: string }[];
};

export const projectTemplates: ProjectTemplate[] = [
  {
    id: 'lounge',
    label: 'Airport lounge',
    description: 'Airport coordination, guest journey, MEP, fit-out, and operational readiness.',
    fields: ['Terminal / airport', 'Seating capacity', 'Operating hours', 'Passenger flow', 'MEP / airport approvals'],
    stages: [
      { name: 'Brief & operational requirements', owner: 'PMO' },
      { name: 'Concept & guest journey', owner: 'Design' },
      { name: 'MEP & airport coordination', owner: 'Projects' },
      { name: 'Procurement & vendor award', owner: 'Sourcing' },
      { name: 'Execution', owner: 'Projects' },
      { name: 'Operational readiness', owner: 'Operations' },
      { name: 'Soft opening & handover', owner: 'Operations' },
    ],
  },
  {
    id: 'hotel',
    label: 'Hotel',
    description: 'Feasibility, approvals, room delivery, F&B, and opening readiness.',
    fields: ['Number of keys', 'Room types', 'F&B outlets', 'Operator requirements', 'Opening readiness requirements'],
    stages: [
      { name: 'Feasibility & brief', owner: 'PMO' },
      { name: 'Design development', owner: 'Design' },
      { name: 'Approvals & statutory clearances', owner: 'Projects' },
      { name: 'Procurement & contracts', owner: 'Sourcing' },
      { name: 'Civil & interior construction', owner: 'Projects' },
      { name: 'Rooms, F&B & back-of-house setup', owner: 'Operations' },
      { name: 'Opening & handover', owner: 'Operations' },
    ],
  },
  {
    id: 'kitchen',
    label: 'Kitchen',
    description: 'Capacity, equipment, utilities, installation, testing, and food-safety sign-off.',
    fields: ['Cuisine / service type', 'Daily meal capacity', 'Equipment package', 'Exhaust requirement', 'Utility load'],
    stages: [
      { name: 'Menu & capacity planning', owner: 'Operations' },
      { name: 'Kitchen design & equipment specification', owner: 'Design' },
      { name: 'Utility, exhaust & hygiene approvals', owner: 'Projects' },
      { name: 'Equipment procurement', owner: 'Sourcing' },
      { name: 'Installation & integration', owner: 'Projects' },
      { name: 'Testing & commissioning', owner: 'Projects' },
      { name: 'Food-safety sign-off & handover', owner: 'Operations' },
    ],
  },
  {
    id: 'encalm-eats',
    label: 'Encalm Eats',
    description: 'Food concept, menu, supply chain, service setup, and launch readiness.',
    fields: ['Concept / cuisine', 'Service model', 'Daily covers', 'Menu owner', 'Launch dependencies'],
    stages: [
      { name: 'Concept & commercial brief', owner: 'PMO' },
      { name: 'Menu & guest experience', owner: 'Operations' },
      { name: 'Kitchen and service design', owner: 'Design' },
      { name: 'Supplier & procurement setup', owner: 'Sourcing' },
      { name: 'Fit-out & equipment installation', owner: 'Projects' },
      { name: 'Trial service & team readiness', owner: 'Operations' },
      { name: 'Launch & handover', owner: 'Operations' },
    ],
  },
  {
    id: 'custom',
    label: 'Custom project',
    description: 'Start with a flexible control plan and tailor the stages to the project.',
    fields: ['Primary success measure', 'Key stakeholders', 'Special approvals', 'Critical dependencies'],
    stages: [
      { name: 'Brief & scope', owner: 'PMO' },
      { name: 'Design / planning', owner: 'Design' },
      { name: 'Procurement / setup', owner: 'Sourcing' },
      { name: 'Delivery / installation', owner: 'Projects' },
      { name: 'Readiness & handover', owner: 'Operations' },
    ],
  },
];

export function getProjectTemplate(id?: ProjectTemplateId | string, category?: Category) {
  if (id) {
    const byId = projectTemplates.find((template) => template.id === id);
    if (byId) return byId;
  }
  if (category === 'Lounge') return projectTemplates[0];
  if (category === 'Hotel') return projectTemplates[1];
  if (category === 'Kitchen') return projectTemplates[2];
  if (category === 'Encalm Eats') return projectTemplates[3];
  return projectTemplates[4];
}

/** Default projects array starts empty so users enter data from scratch. */
export const defaultDemoProjects: Project[] = [];

export const projects: Project[] = [];

export const vizagHotelAreaProgram: ArchitecturalAreaProgram = {
  summary: {
    plotAreaSqm: 8160,
    plotAreaSqft: 87834,
    plotAreaAcres: 2,
    builtUpAreaSqm: 14970,
    builtUpAreaSqft: 161137,
    numberOfFloorsDescription: 'Basement, Ground, First, Service floor, 2nd to 6th Guest floor',
    totalRoomKeys: 156,
    totalBays: 168,
    standardRoomSizeSqm: 27,
    numberOfElevators: 5,
    elevatorRemarks: '3 Guest Lifts and 2 Service Lifts + 1 Fire tower',
    generalRemarks: '162 Standard Rooms and 4 Management Suites (Total 156 Keys, 168 Bays)',
  },
  fohAreas: {
    groundFloor: [
      { sNo: 7, floor: 'Ground Floor', description: 'Banquet', areaSqm: 360, areaSqft: 3875, capacityPax: 350, remarks: 'Pax capacity' },
      { sNo: 8, floor: 'Ground Floor', description: 'Pre-function + Banquet Lobby', areaSqm: 297, areaSqft: 3197, remarks: '—' },
      { sNo: 9, floor: 'Ground Floor', description: 'ADD (All Day Dining)', areaSqm: 330, areaSqft: 3552, capacityPax: 150, remarks: '100 Pax + 50 Alfresco seating' },
      { sNo: 10, floor: 'Ground Floor', description: 'Lounge BAR', areaSqm: 114, areaSqft: 1227, capacityPax: 37, remarks: 'Pax + Alfresco seating' },
      { sNo: 11, floor: 'Ground Floor', description: 'Kitchen', areaSqm: 335, areaSqft: 3606, remarks: 'Commercial production kitchen' },
      { sNo: 12, floor: 'Ground Floor', description: 'Reception Lobby', areaSqm: 350, areaSqft: 3767, remarks: 'Main guest arrival' },
      { sNo: 13, floor: 'Ground Floor', description: 'Public area toilets', areaSqm: 130, areaSqft: 1399, remarks: 'Key FOH facilities' },
      { sNo: 14, floor: 'Ground Floor', description: 'Courtyard', areaSqm: 52, areaSqft: 560, remarks: 'Open landscape zone' },
      { sNo: 15, floor: 'Ground Floor', description: 'Guest Lift Lobby', areaSqm: 44, areaSqft: 474, remarks: 'Primary lift core' },
      { sNo: 16, floor: 'Ground Floor', description: 'Meeting Rooms', areaSqm: 80, areaSqft: 861, remarks: 'Executive meeting spaces' },
    ],
    groundFloorSubtotal: { areaSqm: 2092, areaSqft: 22518 },
    secondFloor: [
      { sNo: 16, floor: '2nd Floor', description: 'Gym and Changing Rooms', areaSqm: 155, areaSqft: 1668, remarks: 'Fitness center' },
      { sNo: 17, floor: '2nd Floor', description: 'Pool Deck', areaSqm: 150, areaSqft: 1615, remarks: 'Outdoor deck' },
      { sNo: 18, floor: '2nd Floor', description: 'Swimming Pool', areaSqm: 160, areaSqft: 1722, remarks: 'Recreational pool' },
    ],
    secondFloorSubtotal: { areaSqm: 465, areaSqft: 5005 },
    grandSubtotal: { areaSqm: 2557, areaSqft: 27523 },
  },
  floorWiseBua: {
    items: [
      { sNo: 19, floor: 'Basement Floor', areaSqm: 1337, areaSqft: 14391, remarks: 'Parking, plant & services' },
      { sNo: 20, floor: 'Ground floor', areaSqm: 3145, areaSqft: 33853, remarks: 'Lobby, Banquet, ADD, Kitchen' },
      { sNo: 21, floor: 'First Floor', areaSqm: 1008, areaSqft: 10850, remarks: 'BOH, Administration & MEP' },
      { sNo: 22, floor: 'Service floor', areaSqm: 1333, areaSqft: 14348, remarks: 'MEP plant & transfer slab' },
      { sNo: 23, floor: '2nd floor', areaSqm: 1860, areaSqft: 20021, remarks: '41 Guest keys + Gym & Pool' },
      { sNo: 24, floor: '3rd floor', areaSqm: 1860, areaSqft: 20021, remarks: '37 Guest keys' },
      { sNo: 25, floor: '4th floor', areaSqm: 1860, areaSqft: 20021, remarks: '37 Guest keys' },
      { sNo: 26, floor: '5th Floor', areaSqm: 1783, areaSqft: 19192, remarks: '37 Guest keys' },
      { sNo: 27, floor: '6th Floor', areaSqm: 1270, areaSqft: 13670, remarks: 'Presidential Suites (16 bays)' },
      { sNo: 28, floor: 'Terrace / Services', areaSqm: 68, areaSqft: 732, remarks: 'Lift machine room & overhead tank' },
    ],
    subtotal: { areaSqm: 14970, areaSqft: 161137 },
  },
  roomConfiguration: {
    items: [
      { sNo: 1, floor: '2nd Guest Floor', keys: 41, bays: 41, remarks: 'Standard guest rooms' },
      { sNo: 2, floor: '3rd Guest Floor', keys: 37, bays: 37, remarks: 'Standard guest rooms' },
      { sNo: 3, floor: '4th Guest Floor', keys: 37, bays: 37, remarks: 'Standard guest rooms' },
      { sNo: 4, floor: '5th Guest Floor', keys: 37, bays: 37, remarks: 'Standard guest rooms' },
      { sNo: 5, floor: '6th Guest Floor', keys: 4, bays: 16, remarks: 'Presidential suites' },
    ],
    totalKeys: 156,
    totalBays: 168,
  },
};

export const locations: Location[] = ['Delhi', 'Hyderabad', 'Goa', 'Bhogapuram', 'Vizag'];
export const categories: Category[] = ['Hotel', 'Lounge', 'Kitchen', 'Encalm Eats', 'Other'];
export const healthOptions: Health[] = ['On track', 'At risk', 'Delayed', 'Not started'];

/** One crore = 10,000,000. Non-finite input renders as `—` rather than `₹NaN Cr`. */
export const CRORE = 10000000;

export const formatCrore = (value: number) =>
  Number.isFinite(value) ? `₹${(value / CRORE).toFixed(1)} Cr` : '₹—';

/** Safe re-export so call sites keep working; see `@/lib/date`. */
export const formatShortDate = formatDayMonth;