/* ====================================================================
   AJAX PROPLAN MES - LINE PRODUCTIVITY MATRIX
   Maps 10 Production Lines to 22 Model Groups
   ==================================================================== */

const LINE_CONFIG = [
  { id: '1A', name: '1A - Thanh', leader: 'Lê Duy', startDate: '18.10.2026' },
  { id: '2A', name: '2A - Hoà', leader: 'Lê Duy', startDate: '' },
  { id: '1B', name: '1B - Hiền', leader: 'Lịch', startDate: '' },
  { id: '2B', name: '2B - Luyến', leader: 'Lịch', startDate: '01.07.2026' },
  { id: '1C', name: '1C - Vũ Minh', leader: 'Phương', startDate: '' },
  { id: '2C', name: '2C - Thảo', leader: 'Phương', startDate: '' },
  { id: '1D', name: '1D - Phương', leader: 'Tiến', startDate: '4.2026' },
  { id: '2D', name: '2D - Ngoan', leader: 'Tiến', startDate: 'July.2026' },
  { id: '3A', name: '3A - Chính', leader: 'Lê Duy', startDate: 'Aug.2026' },
  { id: '3C', name: '3C - New LD (Kíp C)', leader: 'Phương', startDate: '10.09.2026' },
  { id: '3D', name: '3D - Hành Chính (T2-T6)', leader: 'Hành Chính', startDate: 'T2 - T6' },
  { id: 'Support 1', name: 'Line Support 1', leader: 'Hỗ trợ 1', startDate: '' },
  { id: 'Support 2', name: 'Line Support 2', leader: 'Hỗ trợ 2', startDate: '' },
  { id: 'Support 3', name: 'Line Support 3', leader: 'Hỗ trợ 3', startDate: '' },
  { id: 'Support', name: 'Line Support', leader: 'Hỗ trợ', startDate: '' }
];

// Base Productivity Matrix (% capability)
const PRODUCTIVITY_MATRIX = {
  'CombiProtect': { '1A': 45, '1B': 45, '1C': 100, '1D': 100, '2D': 45, '3C': 85, '3D': 85 },
  'CombiProtect U': { '1A': 45, '1B': 45, '1C': 100, '1D': 100, '2D': 45, '3C': 85, '3D': 85 },
  'DoorProtect': { '2A': 100, '1B': 100, '2B': 100, '1C': 100, '2C': 100, '1D': 100, '2D': 100, '3A': 100, '3B': 100, '3C': 100, '3D': 100, 'Support': 45, 'Support 1': 45, 'Support 2': 45, 'Support 3': 45 },
  'DoorProtect U': { '2A': 100, '1B': 100, '2B': 100, '1C': 100, '2C': 100, '1D': 100, '2D': 100, '3A': 100, '3B': 100, '3C': 100, '3D': 100, 'Support': 45, 'Support 1': 45, 'Support 2': 45, 'Support 3': 45 },
  'DoorProtect Plus': { '1A': 85, '2A': 100, '1B': 100, '2B': 100, '1C': 100, '2C': 100, '1D': 100, '2D': 100, '3A': 100, '3C': 100, '3D': 100, 'Support': 45, 'Support 1': 45, 'Support 2': 45, 'Support 3': 45 },
  'DoorProtect Plus U': { '1A': 85, '2A': 100, '1B': 100, '2B': 100, '1C': 100, '2C': 100, '1D': 100, '2D': 100, '3A': 100, '3C': 100, '3D': 100, 'Support': 45, 'Support 1': 45, 'Support 2': 45, 'Support 3': 45 },
  'Hub 2 4G': { '2A': 65, '1B': 85, '2B': 45, '1C': 100, '2C': 100, '1D': 100, '2D': 85, '3C': 85, '3D': 85 },
  'Hub 2 Plus': { '2A': 45, '1B': 85, '2B': 85, '1C': 100, '2C': 100, '1D': 100, '2D': 100, '3C': 85, '3D': 85 },
  'Hub 4G': { '2A': 45, '1B': 85, '2B': 85, '1C': 100, '2C': 100, '1D': 100, '2D': 100, '3C': 85, '3D': 85 },
  'Hub 2': { '2A': 45, '1B': 85, '2B': 85, '1C': 100, '2C': 100, '1D': 100, '2D': 85, '3C': 85, '3D': 85 },
  'Hub 2 4G Prosegur': { '2A': 65, '1B': 85, '2B': 45, '1C': 100, '2C': 100, '1D': 100, '2D': 85, '3C': 85, '3D': 85 },
  'MotionCam HDR': { '2A': 95, '2B': 100, '1C': 100, '2C': 100, '1D': 65, '2D': 65, '3C': 85, '3D': 85 },
  'MotionCam HDR (PhOD)': { '2A': 95, '2B': 100, '1C': 100, '2C': 100, '1D': 65, '2D': 65, '3C': 85, '3D': 85 },
  'MotionCam Outdoor': { '2A': 100, '1B': 65, '1C': 45, '2C': 70, '1D': 100, '2D': 65, '3C': 70, '3D': 70 },
  'MotionCam Outdoor (PhOD)': { '2A': 100, '1B': 65, '1C': 45, '2C': 70, '1D': 100, '2D': 65, '3C': 70, '3D': 70 },
  'MotionProtect': { '2A': 100, '1B': 100, '2B': 100, '1C': 100, '2C': 100, '1D': 100, '2D': 100, '3A': 45, '3B': 85, '3C': 85, '3D': 85 },
  'MotionProtect Outdoor': { '2A': 95, '1B': 100, '2B': 45, '1C': 100, '2C': 100, '2D': 100, '3A': 45, '3C': 85, '3D': 85 },
  'MotionProtect Plus': { '2A': 100, '1B': 100, '2B': 100, '1C': 100, '2C': 100, '1D': 100, '2D': 100, '3A': 45, '3B': 85, '3C': 85, '3D': 85 },
  'DualCurtain Outdoor': { '1B': 100, '1C': 80, '2C': 45, '1D': 45, '2D': 100, '3A': 85, '3C': 85, '3D': 85 },
  'HomeSiren': { '2A': 95, '2B': 100, '1C': 45, '2C': 100, '1D': 80, '2D': 80, '3B': 65, '3C': 65, '3D': 65 },
  'Keypad': { '2B': 100, '1C': 100, '2C': 100, '1D': 100, '3A': 100, '3C': 100, '3D': 100 },
  'KeyPad TouchScreen': { '1B': 45, '1C': 45, '2C': 100, '3A': 100, '3C': 85, '3D': 85 },
  'LeaksProtect': { '1B': 100, '1C': 100, '2C': 85, '3C': 85, '3D': 85 },
  'NVR': { '1B': 100, '2B': 85, '1C': 100, '2C': 45, '1D': 100, '2D': 100, '3C': 85, '3D': 85 },
  'StreetSiren': { '2A': 100, '1B': 100, '2B': 100, '1C': 100, '1D': 100, '2D': 85, '3B': 100, '3C': 100, '3D': 100 },
  'WaterStop': { '2C': 85, '1D': 100, '3C': 85, '3D': 85 },
  'SpaceControl': { '1B': 100, '1C': 100, '2C': 100, '1D': 100, '3C': 100, '3D': 100 }
};

window.MatrixService = {
  getLines() {
    return LINE_CONFIG;
  },

  getMatrix() {
    const saved = localStorage.getItem('AJAX_PROPLAN_MATRIX');
    if (saved) {
      try { return JSON.parse(saved); } catch(e) {}
    }
    return PRODUCTIVITY_MATRIX;
  },

  saveMatrix(matrix) {
    localStorage.setItem('AJAX_PROPLAN_MATRIX', JSON.stringify(matrix));
  },

  getProductivity(modelGroup, lineId) {
    if (!modelGroup || !lineId) return null;
    const matrix = this.getMatrix();
    // Normalize modelGroup name
    let cleanModel = modelGroup.trim();
    if (!matrix[cleanModel]) {
      // Find matching key
      const key = Object.keys(matrix).find(k => cleanModel.toLowerCase().includes(k.toLowerCase()) || k.toLowerCase().includes(cleanModel.toLowerCase()));
      if (key) cleanModel = key;
    }
    const lineMap = matrix[cleanModel];
    if (lineMap && lineMap[lineId] !== undefined) {
      return lineMap[lineId];
    }
    return null;
  },

  getBestLine(modelGroup) {
    const matrix = this.getMatrix();
    let cleanModel = modelGroup ? modelGroup.trim() : '';
    if (!matrix[cleanModel]) {
      const key = Object.keys(matrix).find(k => cleanModel.toLowerCase().includes(k.toLowerCase()) || k.toLowerCase().includes(cleanModel.toLowerCase()));
      if (key) cleanModel = key;
    }
    const lineMap = matrix[cleanModel];
    if (!lineMap) return null;

    // Pick line with highest productivity (e.g. 100%)
    let bestLine = null;
    let maxProd = -1;
    for (const [line, prod] of Object.entries(lineMap)) {
      if (prod > maxProd) {
        maxProd = prod;
        bestLine = line;
      }
    }
    return { line: bestLine, productivity: maxProd };
  }
};
