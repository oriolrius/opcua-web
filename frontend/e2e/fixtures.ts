export const MOCK_ROOT_NODES = [
  { node_id: "ns=0;i=85", browse_name: "0:Objects", display_name: "Objects", node_class: 1, has_children: true },
];

export const MOCK_PLANT_CHILDREN = [
  { node_id: "ns=2;i=1", browse_name: "2:Plant", display_name: "Plant", node_class: 1, has_children: true },
];

export const MOCK_PLANT_SUBTREE = [
  { node_id: "ns=2;i=10", browse_name: "2:Machine", display_name: "Machine", node_class: 1, has_children: true },
  { node_id: "ns=2;i=20", browse_name: "2:Tank", display_name: "Tank", node_class: 1, has_children: true },
  { node_id: "ns=2;i=30", browse_name: "2:Bearing", display_name: "Bearing", node_class: 1, has_children: true },
];

export const MOCK_MACHINE_CHILDREN = [
  { node_id: "ns=2;i=2001", browse_name: "0:State", display_name: "State", node_class: 2, has_children: false },
];

export const MOCK_TANK_CHILDREN = [
  { node_id: "ns=2;i=2006", browse_name: "0:Level", display_name: "Level", node_class: 2, has_children: false },
  { node_id: "ns=2;i=2004", browse_name: "0:InletFlow", display_name: "InletFlow", node_class: 2, has_children: false },
  { node_id: "ns=2;i=2005", browse_name: "0:OutletFlow", display_name: "OutletFlow", node_class: 2, has_children: false },
];

export const MOCK_BEARING_CHILDREN = [
  { node_id: "ns=2;i=2008", browse_name: "0:Temperature", display_name: "Temperature", node_class: 2, has_children: false },
  { node_id: "ns=2;i=2009", browse_name: "0:VibrationRMS", display_name: "VibrationRMS", node_class: 2, has_children: false },
];

export const MOCK_LEVEL_ATTRS = {
  node_id: "ns=2;i=2006",
  browse_name: "0:Level",
  display_name: "Level",
  node_class: "Variable",
  value: 50.5,
  data_type: "Double",
  description: "Level",
  writable: true,
  historizing: false,
  access_level: 1,
  minimum_sampling_interval: 0,
};

export const MOCK_STATE_ATTRS = {
  node_id: "ns=2;i=2001",
  browse_name: "0:State",
  display_name: "State",
  node_class: "Variable",
  value: "RUNNING",
  data_type: "String",
  description: "State",
  writable: true,
  historizing: false,
  access_level: 1,
  minimum_sampling_interval: 0,
};

export const MOCK_TEMPERATURE_ATTRS = {
  node_id: "ns=2;i=2008",
  browse_name: "0:Temperature",
  display_name: "Temperature",
  node_class: "Variable",
  value: 54.3586,
  data_type: "Double",
  description: "Temperature",
  writable: true,
  historizing: false,
  access_level: 1,
  minimum_sampling_interval: 0,
};

export const MOCK_PLANT_ATTRS = {
  node_id: "ns=2;i=1",
  browse_name: "2:Plant",
  display_name: "Plant",
  node_class: "Object",
  value: null,
  data_type: null,
  description: "Plant",
  writable: false,
  historizing: false,
  access_level: null,
  minimum_sampling_interval: null,
};
