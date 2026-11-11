/* ====================================================================
   AJAX PROPLAN MES - DATA STORE & BASELINE DATASET
   Pre-loaded with verified Google Sheets records & reactive store
   ==================================================================== */

const SEED_AS_DATA = [
  { id: 'AS-1', productName1C: 'DoorProtect Plus - DoorProtect Plus_ v.9_[868]_DIP2', normingGroup: 'DoorProtect Plus', modelName: 'Ajax DoorProtect Plus white EU (напівфабрикат)', planQty: 7385, factQty: 3755, gapQty: -3630, ctNorm: 5.0, hoursPlan: 5.04, assignedLine: '1C', productivity: 100.0, hoursActual: 5.04, totalPlan: 3630 },
  { id: 'AS-2', productName1C: 'HomeSiren - HS.001.MBR.001_v4_[8XX]', normingGroup: 'HomeSiren', modelName: 'Ajax HomeSiren white EU (напівфабрикат)', planQty: 4865, factQty: 1596, gapQty: -3269, ctNorm: 15.0, hoursPlan: 13.62, assignedLine: '2B', productivity: 100.0, hoursActual: 13.62, totalPlan: 3269 },
  { id: 'AS-3', productName1C: 'MotionCam HDR (PhOD) - CAM.008.MBR.001v2', normingGroup: 'MotionCam HDR (PhOD)', modelName: 'Ajax MotionCam HDR (8EU) white (напівфабрикат)', planQty: 4171, factQty: 1020, gapQty: -3151, ctNorm: 17.0, hoursPlan: 14.88, assignedLine: '1C', productivity: 100.0, hoursActual: 14.88, totalPlan: 3151 },
  { id: 'AS-4', productName1C: 'DualCurtain Outdoor - DCO.001.MBR.001v5', normingGroup: 'DualCurtain Outdoor', modelName: 'Ajax DualCurtain Outdoor (8EU) white (напівфабрикат)', planQty: 2260, factQty: 892, gapQty: -1368, ctNorm: 31.0, hoursPlan: 11.78, assignedLine: '2C', productivity: 45.0, hoursActual: 26.18, totalPlan: 1368 },
  { id: 'AS-5', productName1C: 'DoorProtect - DP.011.MBR.001v3', normingGroup: 'DoorProtect', modelName: 'Ajax DoorProtect white EU (напівфабрикат)', planQty: 2774, factQty: 2092, gapQty: -682, ctNorm: 5.0, hoursPlan: 0.95, assignedLine: '1D', productivity: 100.0, hoursActual: 0.95, totalPlan: 682 },
  { id: 'AS-6', productName1C: 'MotionProtect - MP.002.MBR.001v0_(9XX)_DIP2', normingGroup: 'MotionProtect', modelName: 'Ajax MotionProtect (9SA) white (напівфабрикат)', planQty: 682, factQty: 0, gapQty: -682, ctNorm: 11.0, hoursPlan: 2.08, assignedLine: '3C', productivity: 85.0, hoursActual: 2.45, totalPlan: 682 },
  { id: 'AS-7', productName1C: 'MotionProtect - MP.002.MBR.001v0_(9XX)_DIP2', normingGroup: 'MotionProtect', modelName: 'Ajax MotionProtect (9NA) black (напівфабрикат)', planQty: 642, factQty: 0, gapQty: -642, ctNorm: 11.0, hoursPlan: 1.96, assignedLine: '2A', productivity: 100.0, hoursActual: 1.96, totalPlan: 642 },
  { id: 'AS-8', productName1C: 'DoorProtect - DP.011.MBR.001v3', normingGroup: 'DoorProtect', modelName: 'Ajax DoorProtect black EU (напівфабрикат)', planQty: 2111, factQty: 1581, gapQty: -530, ctNorm: 5.0, hoursPlan: 0.74, assignedLine: '1B', productivity: 100.0, hoursActual: 0.74, totalPlan: 530 },
  { id: 'AS-9', productName1C: 'MotionProtect - MP.002.MBR.001v0_[8XX]_DIP2', normingGroup: 'MotionProtect', modelName: 'Ajax MotionProtect white EU (напівфабрикат)', planQty: 1318, factQty: 807, gapQty: -511, ctNorm: 11.0, hoursPlan: 1.56, assignedLine: '1D', productivity: 100.0, hoursActual: 1.56, totalPlan: 511 },
  { id: 'AS-10', productName1C: 'DoorProtect - DP.001.MBR.001v9_[9XX]', normingGroup: 'DoorProtect', modelName: 'Ajax DoorProtect Plus (9AU) white (напівфабрикат)', planQty: 1668, factQty: 1216, gapQty: -452, ctNorm: 5.0, hoursPlan: 0.63, assignedLine: '2D', productivity: 100.0, hoursActual: 0.63, totalPlan: 452 },
  { id: 'AS-11', productName1C: 'Hub 2 Plus - HB2.008.MBR.001v1_[9XX]', normingGroup: 'Hub 2 Plus', modelName: 'Ajax Hub 2 Plus (9NA/AFA) UPC black (напівфабрикат)', planQty: 357, factQty: 0, gapQty: -357, ctNorm: 15.0, hoursPlan: 1.49, assignedLine: '1C', productivity: 100.0, hoursActual: 1.49, totalPlan: 357 },
  { id: 'AS-12', productName1C: 'HomeSiren - HS.001.MBR.001v5_[9XX]', normingGroup: 'HomeSiren', modelName: 'Ajax HomeSiren (9AU) white (напівфабрикат)', planQty: 312, factQty: 0, gapQty: -312, ctNorm: 15.0, hoursPlan: 1.30, assignedLine: '2C', productivity: 100.0, hoursActual: 1.30, totalPlan: 312 },
  { id: 'AS-13', productName1C: 'Hub 2 Plus - HB2.008.MBR.001v1_[9XX]', normingGroup: 'Hub 2 Plus', modelName: 'Ajax Hub 2 Plus (9NA/AFA) UPC white (напівфабрикат)', planQty: 302, factQty: 0, gapQty: -302, ctNorm: 15.0, hoursPlan: 1.26, assignedLine: '1D', productivity: 100.0, hoursActual: 1.26, totalPlan: 302 },
  { id: 'AS-14', productName1C: 'MotionCam Outdoor (PhOD) - MCO.002.MBR.001v1', normingGroup: 'MotionCam Outdoor (PhOD)', modelName: 'Ajax MotionCam Outdoor (PhOD) Jeweller (8EU) white', planQty: 861, factQty: 598, gapQty: -263, ctNorm: 31.0, hoursPlan: 2.26, assignedLine: '2A', productivity: 100.0, hoursActual: 2.26, totalPlan: 263 },
  { id: 'AS-15', productName1C: 'MotionProtect Outdoor - MPO.001.MBR.001v5_[9XX]', normingGroup: 'MotionProtect Outdoor', modelName: 'Ajax MotionProtect Outdoor (9AU) white (напівфабрикат)', planQty: 244, factQty: 0, gapQty: -244, ctNorm: 21.0, hoursPlan: 1.42, assignedLine: '1C', productivity: 100.0, hoursActual: 1.42, totalPlan: 244 },
  { id: 'AS-16', productName1C: 'Keypad - Keypad_V12_[8XX]', normingGroup: 'Keypad', modelName: 'Ajax Keypad white EU (напівфабрикат)', planQty: 184, factQty: 0, gapQty: -184, ctNorm: 45.3, hoursPlan: 2.31, assignedLine: '2B', productivity: 100.0, hoursActual: 2.31, totalPlan: 184 },
  { id: 'AS-17', productName1C: 'DoorProtect Plus - DoorProtect Plus_ v.9_[868]_DIP2', normingGroup: 'DoorProtect Plus', modelName: 'Ajax DoorProtect Plus black EU (напівфабрикат)', planQty: 177, factQty: 0, gapQty: -177, ctNorm: 5.0, hoursPlan: 0.25, assignedLine: '1A', productivity: 85.0, hoursActual: 0.29, totalPlan: 177 },
  { id: 'AS-18', productName1C: 'MotionProtect Outdoor - MPO.001.MBR.001v5_[9XX]', normingGroup: 'MotionProtect Outdoor', modelName: 'Ajax MotionProtect Outdoor (9NA) UPC white', planQty: 170, factQty: 0, gapQty: -170, ctNorm: 21.0, hoursPlan: 0.99, assignedLine: '2D', productivity: 100.0, hoursActual: 0.99, totalPlan: 170 },
  { id: 'AS-19', productName1C: 'MotionProtect Outdoor - MPO.001.MBR.001v5_[8XX]', normingGroup: 'MotionProtect Outdoor', modelName: 'Ajax MotionProtect Outdoor white EU (напівфабрикат)', planQty: 148, factQty: 3, gapQty: -145, ctNorm: 21.0, hoursPlan: 0.85, assignedLine: '1B', productivity: 100.0, hoursActual: 0.85, totalPlan: 145 },
  { id: 'AS-20', productName1C: 'Hub 2 Plus - HB2.008.MBR.001v1_[8XX]', normingGroup: 'Hub 2 Plus', modelName: 'Ajax Hub 2 Plus white EU (напівфабрикат)', planQty: 635, factQty: 497, gapQty: -138, ctNorm: 15.0, hoursPlan: 0.58, assignedLine: '2D', productivity: 100.0, hoursActual: 0.58, totalPlan: 138 }
];

const SEED_HT_DATA = [
  { id: 'HT-1', productName1C: 'MotionCam HDR - CAM.008.PIR.001v3', board: 'CAM.008.PIR.001v3', modelName: 'Ajax, CAM.008.PIR.001v3_white_HRD', planQty: 5760, factQty: 1904, gapQty: -3856, ctNorm: 132.0, hoursPlan: 28.3, ctActual: 160.3, hoursActual: 34.3, peopleRequired: 3.2, testBlocks: 5, targetOutputDay: 1216, targetOutputNight: 0 },
  { id: 'HT-2', productName1C: 'MotionCam HDR (PhOD) - CAM.008.MBR.001v2', board: 'CAM.008.MBR.001v2', modelName: 'Ajax, CAM.008.MBR.001v2_HRD', planQty: 5740, factQty: 2195, gapQty: -3545, ctNorm: 132.4, hoursPlan: 26.1, ctActual: 160.8, hoursActual: 31.7, peopleRequired: 3.0, testBlocks: 5, targetOutputDay: 1212, targetOutputNight: 0 },
  { id: 'HT-3', productName1C: 'HomeSiren - HS.001.MBR.001_v4_[8XX]', board: 'HS.001.MBR.001_v4_[8XX]', modelName: 'Ajax, HS.001.MBR.001_v4_868 Mhz_HSJ_8EU_white_HRD', planQty: 5120, factQty: 2053, gapQty: -3067, ctNorm: 113.0, hoursPlan: 19.3, ctActual: 121.9, hoursActual: 20.8, peopleRequired: 1.9, testBlocks: 4, targetOutputDay: 1280, targetOutputNight: 625 },
  { id: 'HT-4', productName1C: 'MotionProtect Plus - CP_M_v4C_[8XX]_DIP2', board: 'CP_M_v4C_[8XX]_DIP2', modelName: 'Ajax, CP_M_v4c_Combi_Motion Plus_MPPJ_EU_white_HRD', planQty: 4560, factQty: 1649, gapQty: -2911, ctNorm: 100.0, hoursPlan: 16.2, ctActual: 108.9, hoursActual: 17.6, peopleRequired: 1.6, testBlocks: 3, targetOutputDay: 1074, targetOutputNight: 700 },
  { id: 'HT-5', productName1C: 'DoorProtect Plus - DoorProtect Plus_ v.9_[868]_DIP2', board: 'DoorProtect Plus_ v.9_[868]_DIP2', modelName: 'Ajax, DoorProtect Plus_ v.9_868 Mhz_DPPJ_8EU_white_HRD', planQty: 3567, factQty: 992, gapQty: -2575, ctNorm: 102.8, hoursPlan: 14.7, ctActual: 109.7, hoursActual: 15.7, peopleRequired: 1.5, testBlocks: 5, targetOutputDay: 1422, targetOutputNight: 347 }
];

const SEED_FTT_DATA = [
  { productName: 'Ajax DoorProtect', mappedModel: 'DoorProtect', allDevices: 89533, ftt: 86773, fttPct: '96.92%', allTest: 93995, finOK: 89436, finNOK: 161, retest: 4462, retestPct: '4.75%' },
  { productName: 'Ajax DoorProtect Plus', mappedModel: 'DoorProtect Plus', allDevices: 37553, ftt: 35974, fttPct: '95.80%', allTest: 39798, finOK: 37489, finNOK: 73, retest: 2245, retestPct: '5.64%' },
  { productName: 'Ajax StreetSiren', mappedModel: 'StreetSiren', allDevices: 31370, ftt: 29922, fttPct: '95.38%', allTest: 34294, finOK: 31220, finNOK: 141, retest: 2924, retestPct: '8.53%' },
  { productName: 'Ajax SpaceControl', mappedModel: 'SpaceControl', allDevices: 29898, ftt: 28199, fttPct: '94.32%', allTest: 32059, finOK: 29163, finNOK: 720, retest: 2161, retestPct: '6.74%' },
  { productName: 'Ajax MotionProtect', mappedModel: 'MotionProtect', allDevices: 27943, ftt: 26741, fttPct: '95.70%', allTest: 30172, finOK: 27934, finNOK: 57, retest: 2229, retestPct: '7.39%' },
  { productName: 'Ajax Keypad', mappedModel: 'Keypad', allDevices: 26070, ftt: 24945, fttPct: '95.68%', allTest: 27985, finOK: 26005, finNOK: 39, retest: 1915, retestPct: '6.84%' },
  { productName: 'Ajax HomeSiren', mappedModel: 'HomeSiren', allDevices: 19966, ftt: 18900, fttPct: '94.66%', allTest: 21606, finOK: 19938, finNOK: 37, retest: 1640, retestPct: '7.59%' },
  { productName: 'CAM.008.OSB.001v5', mappedModel: 'MotionCam HDR', allDevices: 13545, ftt: 10975, fttPct: '81.03%', allTest: 19127, finOK: 13281, finNOK: 49, retest: 5582, retestPct: '29.18%' },
  { productName: 'Ajax FireProtect 2 RB (Heat/Smoke)', mappedModel: 'FireProtect 2', allDevices: 12633, ftt: 10791, fttPct: '85.42%', allTest: 16325, finOK: 12411, finNOK: 165, retest: 3692, retestPct: '22.62%' },
  { productName: 'MCO.001.PIR.001v5', mappedModel: 'MotionCam HDR', allDevices: 8234, ftt: 8119, fttPct: '98.60%', allTest: 8465, finOK: 8210, finNOK: 17, retest: 231, retestPct: '2.73%' },
  { productName: 'CAM.008.MBR.001v2', mappedModel: 'MotionCam HDR', allDevices: 6059, ftt: 4604, fttPct: '75.99%', allTest: 8743, finOK: 6031, finNOK: 8, retest: 2684, retestPct: '30.70%' },
  { productName: 'Ajax Hub 2 4G ECG', mappedModel: 'Hub 2 4G', allDevices: 5843, ftt: 5525, fttPct: '94.56%', allTest: 6384, fttOK: 5807, finOK: 5807, finNOK: 25, retest: 541, retestPct: '8.47%' },
  { productName: 'Ajax Hub 2 Plus ECG', mappedModel: 'Hub 2 Plus', allDevices: 5059, ftt: 4845, fttPct: '95.77%', allTest: 5515, finOK: 5053, finNOK: 7, retest: 456, retestPct: '8.27%' }
];

const OFFICIAL_MODELS_1022 = [
  {
    "process": "HARD TEST",
    "model": "Ajax, MP.002.MBR.001v0_MPJ_9NA_black_HRD",
    "planQty": 764.0,
    "factQty": 0.0,
    "gapQty": -764.0,
    "planTime": 8.0,
    "factTime": 0.0,
    "completionRate": 0.0,
    "norm": 37.7,
    "status": "ZERO",
    "statusText": "⏳ Chưa chạy"
  },
  {
    "process": "HARD TEST",
    "model": "Ajax, MP.002.MBR.001v0_MPJ_9SA_white_HRD",
    "planQty": 682.0,
    "factQty": 0.0,
    "gapQty": -682.0,
    "planTime": 7.0,
    "factTime": 0.0,
    "completionRate": 0.0,
    "norm": 37.0,
    "status": "ZERO",
    "statusText": "⏳ Chưa chạy"
  },
  {
    "process": "HARD TEST",
    "model": "Ajax, CAM.008.PIR.001v3_white_HRD",
    "planQty": 2168.0,
    "factQty": 1904.0,
    "gapQty": -264.0,
    "planTime": 40.0,
    "factTime": 35.0,
    "completionRate": 87.8,
    "norm": 66.4,
    "status": "UNDER",
    "statusText": "⚠️ Hụt KH"
  },
  {
    "process": "HARD TEST",
    "model": "Ajax, DPP.001.MBR.001v9_DPPJ_9AU_white_HRD",
    "planQty": 1668.0,
    "factQty": 1411.0,
    "gapQty": -257.0,
    "planTime": 16.0,
    "factTime": 14.0,
    "completionRate": 84.6,
    "norm": 34.5,
    "status": "UNDER",
    "statusText": "⚠️ Hụt KH"
  },
  {
    "process": "HARD TEST",
    "model": "Ajax, MP.002.MBR.001v0_868 Mhz_MPJ_EU_white_HRD",
    "planQty": 1200.0,
    "factQty": 957.0,
    "gapQty": -243.0,
    "planTime": 13.0,
    "factTime": 10.0,
    "completionRate": 79.8,
    "norm": 39.0,
    "status": "UNDER",
    "statusText": "⚠️ Hụt KH"
  },
  {
    "process": "HARD TEST",
    "model": "Ajax, MTR.001.MBR.000v1b_MTRJ_EU_2/3ЕОL_white_HRD",
    "planQty": 428.0,
    "factQty": 195.0,
    "gapQty": -233.0,
    "planTime": 21.0,
    "factTime": 10.0,
    "completionRate": 45.6,
    "norm": 176.6,
    "status": "UNDER",
    "statusText": "⚠️ Hụt KH"
  },
  {
    "process": "HARD TEST",
    "model": "Ajax, HB2.001.PWB.001v4_HRD",
    "planQty": 742.0,
    "factQty": 565.0,
    "gapQty": -177.0,
    "planTime": 5.0,
    "factTime": 4.0,
    "completionRate": 76.1,
    "norm": 24.3,
    "status": "UNDER",
    "statusText": "⚠️ Hụt KH"
  },
  {
    "process": "HARD TEST",
    "model": "Ajax, MCO.002.MBR.001v1_MCOJ(PhOD)_8EU_white_HRD",
    "planQty": 845.0,
    "factQty": 685.0,
    "gapQty": -160.0,
    "planTime": 17.0,
    "factTime": 14.0,
    "completionRate": 81.1,
    "norm": 72.4,
    "status": "UNDER",
    "statusText": "⚠️ Hụt KH"
  },
  {
    "process": "HARD TEST",
    "model": "Ajax, CP_M_v4c_Combi_Motion Plus_MPPJ_EU_white_HRD",
    "planQty": 1734.0,
    "factQty": 1649.0,
    "gapQty": -85.0,
    "planTime": 24.0,
    "factTime": 23.0,
    "completionRate": 95.1,
    "norm": 49.8,
    "status": "UNDER",
    "statusText": "⚠️ Hụt KH"
  },
  {
    "process": "HARD TEST",
    "model": "Ajax, HS.001.MBR.001_v4_868 Mhz_HSJ_8EU_white_HRD",
    "planQty": 2099.0,
    "factQty": 2053.0,
    "gapQty": -46.0,
    "planTime": 22.0,
    "factTime": 21.0,
    "completionRate": 97.8,
    "norm": 37.7,
    "status": "UNDER",
    "statusText": "⚠️ Hụt KH"
  },
  {
    "process": "HARD TEST",
    "model": "Ajax, KPG.001.PRX.000v4_KPTJ_HRD",
    "planQty": 44.0,
    "factQty": 0.0,
    "gapQty": -44.0,
    "planTime": 0.0,
    "factTime": 0.0,
    "completionRate": 0.0,
    "norm": 0.0,
    "status": "ZERO",
    "statusText": "⏳ Chưa chạy"
  },
  {
    "process": "HARD TEST",
    "model": "Ajax, MP.002.MBR.001v0_MPJ_9AU_white_HRD",
    "planQty": 42.0,
    "factQty": 0.0,
    "gapQty": -42.0,
    "planTime": 0.0,
    "factTime": 0.0,
    "completionRate": 0.0,
    "norm": 0.0,
    "status": "ZERO",
    "statusText": "⏳ Chưa chạy"
  },
  {
    "process": "HARD TEST",
    "model": "Ajax, Keypad V12_868 Mhz_KPJ_8EU_white_HRD",
    "planQty": 41.0,
    "factQty": 0.0,
    "gapQty": -41.0,
    "planTime": 1.0,
    "factTime": 0.0,
    "completionRate": 0.0,
    "norm": 87.8,
    "status": "ZERO",
    "statusText": "⏳ Chưa chạy"
  },
  {
    "process": "HARD TEST",
    "model": "Ajax, MTR.001.MBR.000v1b_MTRJ_EU_2/3ЕОL_Incert_white_HRD",
    "planQty": 19.0,
    "factQty": 0.0,
    "gapQty": -19.0,
    "planTime": 1.0,
    "factTime": 0.0,
    "completionRate": 0.0,
    "norm": 189.5,
    "status": "ZERO",
    "statusText": "⏳ Chưa chạy"
  },
  {
    "process": "HARD TEST",
    "model": "Ajax, NVR.003.MBR.001v5_[MASS_R7-04Q]_NVR_8сh_8EU_black_HRD",
    "planQty": 15.0,
    "factQty": 0.0,
    "gapQty": -15.0,
    "planTime": 1.0,
    "factTime": 0.0,
    "completionRate": 0.0,
    "norm": 240.0,
    "status": "ZERO",
    "statusText": "⏳ Chưa chạy"
  },
  {
    "process": "HARD TEST",
    "model": "Ajax, KPG.001.MBU.001v1_KPTJ_9AU_white_HRD",
    "planQty": 8.0,
    "factQty": 0.0,
    "gapQty": -8.0,
    "planTime": 0.0,
    "factTime": 0.0,
    "completionRate": 0.0,
    "norm": 0.0,
    "status": "ZERO",
    "statusText": "⏳ Chưa chạy"
  },
  {
    "process": "HARD TEST",
    "model": "Ajax, KPG.001.MBU.001v1_KPTJ_8EU_black_HRD",
    "planQty": 6.0,
    "factQty": 0.0,
    "gapQty": -6.0,
    "planTime": 0.0,
    "factTime": 0.0,
    "completionRate": 0.0,
    "norm": 0.0,
    "status": "ZERO",
    "statusText": "⏳ Chưa chạy"
  },
  {
    "process": "HARD TEST",
    "model": "Ajax, NVR.003.MBR.001v5_[MASS_R7-04Q]_NVR_8сh_8EU_white_HRD",
    "planQty": 18.0,
    "factQty": 13.0,
    "gapQty": -5.0,
    "planTime": 1.0,
    "factTime": 1.0,
    "completionRate": 72.2,
    "norm": 200.0,
    "status": "UNDER",
    "statusText": "⚠️ Hụt KH"
  },
  {
    "process": "HARD TEST",
    "model": "Ajax, LeaksProtect_v8_868 Mhz_LPJ_8MA_black_HRD",
    "planQty": 3.0,
    "factQty": 0.0,
    "gapQty": -3.0,
    "planTime": 0.0,
    "factTime": 0.0,
    "completionRate": 0.0,
    "norm": 0.0,
    "status": "ZERO",
    "statusText": "⏳ Chưa chạy"
  },
  {
    "process": "HARD TEST",
    "model": "Ajax, HB3.002.MBR.001v5_[HB1-9xx-66W-ULA]_black_HRD",
    "planQty": 1.0,
    "factQty": 0.0,
    "gapQty": -1.0,
    "planTime": 0.0,
    "factTime": 0.0,
    "completionRate": 0.0,
    "norm": 0.0,
    "status": "ZERO",
    "statusText": "⏳ Chưa chạy"
  },
  {
    "process": "HARD TEST",
    "model": "Ajax, HB2.008.MBR.001v1_H2P_AUX_9AU_white_HRD",
    "planQty": 1.0,
    "factQty": 0.0,
    "gapQty": -1.0,
    "planTime": 0.0,
    "factTime": 0.0,
    "completionRate": 0.0,
    "norm": 0.0,
    "status": "ZERO",
    "statusText": "⏳ Chưa chạy"
  },
  {
    "process": "HARD TEST",
    "model": "Ajax, DP.011.MBR.001v3_DPJ_8EU_black_HRD",
    "planQty": 721.0,
    "factQty": 721.0,
    "gapQty": 0.0,
    "planTime": 6.0,
    "factTime": 6.0,
    "completionRate": 100.0,
    "norm": 30.0,
    "status": "MET",
    "statusText": "🎯 Đạt 100%"
  },
  {
    "process": "HARD TEST",
    "model": "Ajax, DoorProtect Plus_ v.9_868 Mhz_DPPJ_8EU_white_HRD",
    "planQty": 992.0,
    "factQty": 992.0,
    "gapQty": 0.0,
    "planTime": 9.44,
    "factTime": 9.44,
    "completionRate": 100.0,
    "norm": 34.3,
    "status": "MET",
    "statusText": "🎯 Đạt 100%"
  },
  {
    "process": "HARD TEST",
    "model": "Ajax, MPO.001.MBR.001v5_MPOJ_9NA_white_HRD",
    "planQty": 128.0,
    "factQty": 128.0,
    "gapQty": 0.0,
    "planTime": 2.26,
    "factTime": 2.26,
    "completionRate": 100.0,
    "norm": 63.6,
    "status": "MET",
    "statusText": "🎯 Đạt 100%"
  },
  {
    "process": "HARD TEST",
    "model": "Ajax, MPO.001.MBR.001v5_MPOJ_9NA_UPC_white_HRD",
    "planQty": 381.0,
    "factQty": 381.0,
    "gapQty": 0.0,
    "planTime": 6.74,
    "factTime": 6.74,
    "completionRate": 100.0,
    "norm": 63.7,
    "status": "MET",
    "statusText": "🎯 Đạt 100%"
  },
  {
    "process": "HARD TEST",
    "model": "Ajax, DCO.001.MBR.001v5_DCOJ_8EU_white_HRD",
    "planQty": 906.0,
    "factQty": 906.0,
    "gapQty": 0.0,
    "planTime": 16.95,
    "factTime": 16.95,
    "completionRate": 100.0,
    "norm": 67.4,
    "status": "MET",
    "statusText": "🎯 Đạt 100%"
  },
  {
    "process": "HARD TEST",
    "model": "Ajax, HB2.006.MBR.001v0_HB2_66A_AUX_9AU_white_HRD",
    "planQty": 0.0,
    "factQty": 2.0,
    "gapQty": 2.0,
    "planTime": 0.0,
    "factTime": 0.04,
    "completionRate": 100.0,
    "norm": 72.0,
    "status": "OVER",
    "statusText": "🚀 Vượt KH"
  },
  {
    "process": "HARD TEST",
    "model": "Ajax, CP_M_v4c_Combi_Motion Plus_MPPJ_9AU_white_HRD",
    "planQty": 0.0,
    "factQty": 9.0,
    "gapQty": 9.0,
    "planTime": 0.0,
    "factTime": 0.13,
    "completionRate": 100.0,
    "norm": 52.0,
    "status": "OVER",
    "statusText": "🚀 Vượt KH"
  },
  {
    "process": "HARD TEST",
    "model": "Ajax, CAM.008.OSB.001v5_HRD",
    "planQty": 1478.0,
    "factQty": 1492.0,
    "gapQty": 14.0,
    "planTime": 0.0,
    "factTime": 0.0,
    "completionRate": 100.9,
    "norm": 0.0,
    "status": "OVER",
    "statusText": "🚀 Vượt KH"
  },
  {
    "process": "HARD TEST",
    "model": "Ajax, CAM.008.MBR.001v2_HRD",
    "planQty": 2174.0,
    "factQty": 2195.0,
    "gapQty": 21.0,
    "planTime": 79.95,
    "factTime": 80.73,
    "completionRate": 101.0,
    "norm": 132.4,
    "status": "OVER",
    "statusText": "🚀 Vượt KH"
  },
  {
    "process": "HARD TEST",
    "model": "Ajax, HB2.008.MBR.001v1_H2P_ECG_8EU_white_HRD",
    "planQty": 225.0,
    "factQty": 304.0,
    "gapQty": 79.0,
    "planTime": 8.02,
    "factTime": 10.83,
    "completionRate": 135.1,
    "norm": 128.3,
    "status": "OVER",
    "statusText": "🚀 Vượt KH"
  },
  {
    "process": "HARD TEST",
    "model": "Ajax, DP.011.MBR.001v3_DPJ_8EU_white_HRD",
    "planQty": 1716.0,
    "factQty": 1814.0,
    "gapQty": 98.0,
    "planTime": 13.3,
    "factTime": 14.06,
    "completionRate": 105.7,
    "norm": 27.9,
    "status": "OVER",
    "statusText": "🚀 Vượt KH"
  },
  {
    "process": "ASSEMBLY",
    "model": "Ajax HomeSiren (9AU) white (напівфабрикат)",
    "planQty": 92.0,
    "factQty": 0.0,
    "gapQty": -92.0,
    "planTime": 6.0,
    "factTime": 0.0,
    "completionRate": 0.0,
    "norm": 234.8,
    "status": "ZERO",
    "statusText": "⏳ Chưa chạy"
  },
  {
    "process": "ASSEMBLY",
    "model": "Ajax MotionProtect Plus black EU (напівфабрикат)",
    "planQty": 988.0,
    "factQty": 898.0,
    "gapQty": -90.0,
    "planTime": 42.0,
    "factTime": 38.0,
    "completionRate": 90.9,
    "norm": 153.0,
    "status": "UNDER",
    "statusText": "⚠️ Hụt KH"
  },
  {
    "process": "ASSEMBLY",
    "model": "Ajax Hub 2 Plus (9NA/AFA) UPC black (напівфабрикат)",
    "planQty": 57.0,
    "factQty": 0.0,
    "gapQty": -57.0,
    "planTime": 3.0,
    "factTime": 0.0,
    "completionRate": 0.0,
    "norm": 189.5,
    "status": "ZERO",
    "statusText": "⏳ Chưa chạy"
  },
  {
    "process": "ASSEMBLY",
    "model": "Ajax MotionCam Outdoor (8EU) white (напівфабрикат)",
    "planQty": 399.0,
    "factQty": 346.0,
    "gapQty": -53.0,
    "planTime": 48.0,
    "factTime": 42.0,
    "completionRate": 86.7,
    "norm": 433.1,
    "status": "UNDER",
    "statusText": "⚠️ Hụt KH"
  },
  {
    "process": "ASSEMBLY",
    "model": "Ajax KeyPad TouchScreen (8EU) black (напівфабрикат)",
    "planQty": 46.0,
    "factQty": 0.0,
    "gapQty": -46.0,
    "planTime": 5.0,
    "factTime": 0.0,
    "completionRate": 0.0,
    "norm": 391.3,
    "status": "ZERO",
    "statusText": "⏳ Chưa chạy"
  },
  {
    "process": "ASSEMBLY",
    "model": "Ajax Hub 4G (9SA/UEU) white (напівфабрикат)",
    "planQty": 40.0,
    "factQty": 0.0,
    "gapQty": -40.0,
    "planTime": 2.0,
    "factTime": 0.0,
    "completionRate": 0.0,
    "norm": 180.0,
    "status": "ZERO",
    "statusText": "⏳ Chưa chạy"
  },
  {
    "process": "ASSEMBLY",
    "model": "Ajax HomeSiren (9NA) white (напівфабрикат)",
    "planQty": 36.0,
    "factQty": 0.0,
    "gapQty": -36.0,
    "planTime": 3.0,
    "factTime": 0.0,
    "completionRate": 0.0,
    "norm": 300.0,
    "status": "ZERO",
    "statusText": "⏳ Chưa chạy"
  },
  {
    "process": "ASSEMBLY",
    "model": "Ajax NVR (8ch) (8EU) white (напівфабрикат)",
    "planQty": 33.0,
    "factQty": 0.0,
    "gapQty": -33.0,
    "planTime": 2.0,
    "factTime": 0.0,
    "completionRate": 0.0,
    "norm": 218.2,
    "status": "ZERO",
    "statusText": "⏳ Chưa chạy"
  },
  {
    "process": "ASSEMBLY",
    "model": "Ajax DoorProtect (9NA) UPC white (напівфабрикат)",
    "planQty": 30.0,
    "factQty": 0.0,
    "gapQty": -30.0,
    "planTime": 1.0,
    "factTime": 0.0,
    "completionRate": 0.0,
    "norm": 120.0,
    "status": "ZERO",
    "statusText": "⏳ Chưa chạy"
  },
  {
    "process": "ASSEMBLY",
    "model": "Ajax LeaksProtect (8MA) black (напівфабрикат)",
    "planQty": 29.0,
    "factQty": 0.0,
    "gapQty": -29.0,
    "planTime": 2.0,
    "factTime": 0.0,
    "completionRate": 0.0,
    "norm": 248.3,
    "status": "ZERO",
    "statusText": "⏳ Chưa chạy"
  },
  {
    "process": "ASSEMBLY",
    "model": "Ajax Hub 4G (9NA/ULA) black (напівфабрикат)",
    "planQty": 20.0,
    "factQty": 0.0,
    "gapQty": -20.0,
    "planTime": 1.0,
    "factTime": 0.0,
    "completionRate": 0.0,
    "norm": 180.0,
    "status": "ZERO",
    "statusText": "⏳ Chưa chạy"
  },
  {
    "process": "ASSEMBLY",
    "model": "Ajax MotionCam Outdoor (8IN) white (напівфабрикат)",
    "planQty": 15.0,
    "factQty": 0.0,
    "gapQty": -15.0,
    "planTime": 2.0,
    "factTime": 0.0,
    "completionRate": 0.0,
    "norm": 480.0,
    "status": "ZERO",
    "statusText": "⏳ Chưa chạy"
  },
  {
    "process": "ASSEMBLY",
    "model": "Ajax NVR (8ch) (8EU) black (напівфабрикат)",
    "planQty": 505.0,
    "factQty": 490.0,
    "gapQty": -15.0,
    "planTime": 27.0,
    "factTime": 27.0,
    "completionRate": 97.0,
    "norm": 192.5,
    "status": "UNDER",
    "statusText": "⚠️ Hụt KH"
  },
  {
    "process": "ASSEMBLY",
    "model": "Ajax LeaksProtect white EU (напівфабрикат)",
    "planQty": 15.0,
    "factQty": 0.0,
    "gapQty": -15.0,
    "planTime": 1.0,
    "factTime": 0.0,
    "completionRate": 0.0,
    "norm": 240.0,
    "status": "ZERO",
    "statusText": "⏳ Chưa chạy"
  },
  {
    "process": "ASSEMBLY",
    "model": "Ajax Hub 2 Plus white EU (напівфабрикат)",
    "planQty": 507.0,
    "factQty": 497.0,
    "gapQty": -10.0,
    "planTime": 30.0,
    "factTime": 29.0,
    "completionRate": 98.0,
    "norm": 213.0,
    "status": "UNDER",
    "statusText": "⚠️ Hụt KH"
  },
  {
    "process": "ASSEMBLY",
    "model": "Ajax Hub 2 4G (8EU/ECG) black (напівфабрикат)",
    "planQty": 7.0,
    "factQty": 0.0,
    "gapQty": -7.0,
    "planTime": 0.0,
    "factTime": 0.0,
    "completionRate": 0.0,
    "norm": 0.0,
    "status": "ZERO",
    "statusText": "⏳ Chưa chạy"
  },
  {
    "process": "ASSEMBLY",
    "model": "Ajax LeaksProtect (8MA) white (напівфабрикат)",
    "planQty": 7.0,
    "factQty": 0.0,
    "gapQty": -7.0,
    "planTime": 1.0,
    "factTime": 0.0,
    "completionRate": 0.0,
    "norm": 514.3,
    "status": "ZERO",
    "statusText": "⏳ Chưa chạy"
  },
  {
    "process": "ASSEMBLY",
    "model": "Ajax StreetSiren white EU (напівфабрикат)",
    "planQty": 7.0,
    "factQty": 0.0,
    "gapQty": -7.0,
    "planTime": 1.0,
    "factTime": 0.0,
    "completionRate": 0.0,
    "norm": 514.3,
    "status": "ZERO",
    "statusText": "⏳ Chưa chạy"
  },
  {
    "process": "ASSEMBLY",
    "model": "Ajax Hub 2 Plus (9AU/AUX) white (напівфабрикат)",
    "planQty": 6.0,
    "factQty": 0.0,
    "gapQty": -6.0,
    "planTime": 0.0,
    "factTime": 0.0,
    "completionRate": 0.0,
    "norm": 0.0,
    "status": "ZERO",
    "statusText": "⏳ Chưa chạy"
  },
  {
    "process": "ASSEMBLY",
    "model": "Ajax NVR (8ch) (9AU) white (напівфабрикат)",
    "planQty": 6.0,
    "factQty": 0.0,
    "gapQty": -6.0,
    "planTime": 0.0,
    "factTime": 0.0,
    "completionRate": 0.0,
    "norm": 0.0,
    "status": "ZERO",
    "statusText": "⏳ Chưa chạy"
  },
  {
    "process": "ASSEMBLY",
    "model": "Ajax Keypad (9NA) UPC black (напівфабрикат)",
    "planQty": 5.0,
    "factQty": 0.0,
    "gapQty": -5.0,
    "planTime": 1.0,
    "factTime": 0.0,
    "completionRate": 0.0,
    "norm": 720.0,
    "status": "ZERO",
    "statusText": "⏳ Chưa chạy"
  },
  {
    "process": "ASSEMBLY",
    "model": "Ajax WaterStop (8EU) white (напівфабрикат)",
    "planQty": 4.0,
    "factQty": 0.0,
    "gapQty": -4.0,
    "planTime": 0.0,
    "factTime": 0.0,
    "completionRate": 0.0,
    "norm": 0.0,
    "status": "ZERO",
    "statusText": "⏳ Chưa chạy"
  },
  {
    "process": "ASSEMBLY",
    "model": "Ajax StreetSiren black EU (напівфабрикат)",
    "planQty": 4.0,
    "factQty": 0.0,
    "gapQty": -4.0,
    "planTime": 0.53,
    "factTime": 0.0,
    "completionRate": 0.0,
    "norm": 477.0,
    "status": "ZERO",
    "statusText": "⏳ Chưa chạy"
  },
  {
    "process": "ASSEMBLY",
    "model": "Ajax DualCurtain Outdoor (9NA) UPC white (напівфабрикат)",
    "planQty": 4.0,
    "factQty": 0.0,
    "gapQty": -4.0,
    "planTime": 0.48,
    "factTime": 0.0,
    "completionRate": 0.0,
    "norm": 432.0,
    "status": "ZERO",
    "statusText": "⏳ Chưa chạy"
  },
  {
    "process": "ASSEMBLY",
    "model": "Ajax WaterStop (9NA) white (напівфабрикат)",
    "planQty": 3.0,
    "factQty": 0.0,
    "gapQty": -3.0,
    "planTime": 0.27,
    "factTime": 0.0,
    "completionRate": 0.0,
    "norm": 324.0,
    "status": "ZERO",
    "statusText": "⏳ Chưa chạy"
  },
  {
    "process": "ASSEMBLY",
    "model": "Ajax WaterStop (9NA) black (напівфабрикат)",
    "planQty": 3.0,
    "factQty": 0.0,
    "gapQty": -3.0,
    "planTime": 0.27,
    "factTime": 0.0,
    "completionRate": 0.0,
    "norm": 324.0,
    "status": "ZERO",
    "statusText": "⏳ Chưa chạy"
  },
  {
    "process": "ASSEMBLY",
    "model": "Ajax WaterStop Tap [3/4] black (напівфабрикат)",
    "planQty": 3.0,
    "factQty": 0.0,
    "gapQty": -3.0,
    "planTime": 0.27,
    "factTime": 0.0,
    "completionRate": 0.0,
    "norm": 324.0,
    "status": "ZERO",
    "statusText": "⏳ Chưa chạy"
  },
  {
    "process": "ASSEMBLY",
    "model": "Ajax StreetSiren (9AU) white (напівфабрикат)",
    "planQty": 3.0,
    "factQty": 0.0,
    "gapQty": -3.0,
    "planTime": 0.4,
    "factTime": 0.0,
    "completionRate": 0.0,
    "norm": 480.0,
    "status": "ZERO",
    "statusText": "⏳ Chưa chạy"
  },
  {
    "process": "ASSEMBLY",
    "model": "Ajax DoorProtect (8IN) white (напівфабрикат)",
    "planQty": 2.0,
    "factQty": 0.0,
    "gapQty": -2.0,
    "planTime": 0.04,
    "factTime": 0.0,
    "completionRate": 0.0,
    "norm": 72.0,
    "status": "ZERO",
    "statusText": "⏳ Chưa chạy"
  },
  {
    "process": "ASSEMBLY",
    "model": "Ajax Hub 2 Plus (9NA/AFA) UPC white (напівфабрикат)",
    "planQty": 2.0,
    "factQty": 0.0,
    "gapQty": -2.0,
    "planTime": 0.12,
    "factTime": 0.0,
    "completionRate": 0.0,
    "norm": 216.0,
    "status": "ZERO",
    "statusText": "⏳ Chưa chạy"
  },
  {
    "process": "ASSEMBLY",
    "model": "Ajax LeaksProtect black EU (напівфабрикат)",
    "planQty": 2.0,
    "factQty": 0.0,
    "gapQty": -2.0,
    "planTime": 0.15,
    "factTime": 0.0,
    "completionRate": 0.0,
    "norm": 270.0,
    "status": "ZERO",
    "statusText": "⏳ Chưa chạy"
  },
  {
    "process": "ASSEMBLY",
    "model": "Ajax LeaksProtect (8EU) WL Standard white (напівфабрикат)",
    "planQty": 2.0,
    "factQty": 0.0,
    "gapQty": -2.0,
    "planTime": 0.15,
    "factTime": 0.0,
    "completionRate": 0.0,
    "norm": 270.0,
    "status": "ZERO",
    "statusText": "⏳ Chưa chạy"
  },
  {
    "process": "ASSEMBLY",
    "model": "Ajax HomeSiren (9NA) UPC black (напівфабрикат)",
    "planQty": 8.0,
    "factQty": 6.0,
    "gapQty": -2.0,
    "planTime": 0.56,
    "factTime": 0.42,
    "completionRate": 75.0,
    "norm": 252.0,
    "status": "UNDER",
    "statusText": "⚠️ Hụt KH"
  },
  {
    "process": "ASSEMBLY",
    "model": "Ajax DoorProtect (9AU) white (напівфабрикат)",
    "planQty": 1.0,
    "factQty": 0.0,
    "gapQty": -1.0,
    "planTime": 0.02,
    "factTime": 0.0,
    "completionRate": 0.0,
    "norm": 72.0,
    "status": "ZERO",
    "statusText": "⏳ Chưa chạy"
  },
  {
    "process": "ASSEMBLY",
    "model": "Ajax DoorProtect U Jeweller (8EU) white (напівфабрикат)",
    "planQty": 1.0,
    "factQty": 0.0,
    "gapQty": -1.0,
    "planTime": 0.02,
    "factTime": 0.0,
    "completionRate": 0.0,
    "norm": 72.0,
    "status": "ZERO",
    "statusText": "⏳ Chưa chạy"
  },
  {
    "process": "ASSEMBLY",
    "model": "Ajax Hub 2 4G (8EU/ECG) white (напівфабрикат)",
    "planQty": 1.0,
    "factQty": 0.0,
    "gapQty": -1.0,
    "planTime": 0.06,
    "factTime": 0.0,
    "completionRate": 0.0,
    "norm": 216.0,
    "status": "ZERO",
    "statusText": "⏳ Chưa chạy"
  },
  {
    "process": "ASSEMBLY",
    "model": "Ajax Hub 2 4G (9NA/AUX) white (напівфабрикат)",
    "planQty": 1.0,
    "factQty": 0.0,
    "gapQty": -1.0,
    "planTime": 0.06,
    "factTime": 0.0,
    "completionRate": 0.0,
    "norm": 216.0,
    "status": "ZERO",
    "statusText": "⏳ Chưa chạy"
  },
  {
    "process": "ASSEMBLY",
    "model": "Ajax Hub 2 Plus (9AU/AUX) black (напівфабрикат)",
    "planQty": 1.0,
    "factQty": 0.0,
    "gapQty": -1.0,
    "planTime": 0.06,
    "factTime": 0.0,
    "completionRate": 0.0,
    "norm": 216.0,
    "status": "ZERO",
    "statusText": "⏳ Chưa chạy"
  },
  {
    "process": "ASSEMBLY",
    "model": "Ajax Keypad (9NA) UPC white (напівфабрикат)",
    "planQty": 1.0,
    "factQty": 0.0,
    "gapQty": -1.0,
    "planTime": 0.1,
    "factTime": 0.0,
    "completionRate": 0.0,
    "norm": 360.0,
    "status": "ZERO",
    "statusText": "⏳ Chưa chạy"
  },
  {
    "process": "ASSEMBLY",
    "model": "Ajax KeyPad TouchScreen (8EU) white (напівфабрикат)",
    "planQty": 1.0,
    "factQty": 0.0,
    "gapQty": -1.0,
    "planTime": 0.11,
    "factTime": 0.0,
    "completionRate": 0.0,
    "norm": 396.0,
    "status": "ZERO",
    "statusText": "⏳ Chưa chạy"
  },
  {
    "process": "ASSEMBLY",
    "model": "Ajax DoorProtect black EU (напівфабрикат)",
    "planQty": 1581.0,
    "factQty": 1581.0,
    "gapQty": 0.0,
    "planTime": 28.55,
    "factTime": 28.55,
    "completionRate": 100.0,
    "norm": 65.0,
    "status": "MET",
    "statusText": "🎯 Đạt 100%"
  },
  {
    "process": "ASSEMBLY",
    "model": "Ajax DoorProtect Plus (9AU) white (напівфабрикат)",
    "planQty": 1216.0,
    "factQty": 1216.0,
    "gapQty": 0.0,
    "planTime": 21.96,
    "factTime": 21.96,
    "completionRate": 100.0,
    "norm": 65.0,
    "status": "MET",
    "statusText": "🎯 Đạt 100%"
  },
  {
    "process": "ASSEMBLY",
    "model": "Ajax MotionProtect Outdoor white EU (напівфабрикат)",
    "planQty": 3.0,
    "factQty": 3.0,
    "gapQty": 0.0,
    "planTime": 0.25,
    "factTime": 0.25,
    "completionRate": 100.0,
    "norm": 300.0,
    "status": "MET",
    "statusText": "🎯 Đạt 100%"
  },
  {
    "process": "ASSEMBLY",
    "model": "Ajax MotionProtect Outdoor (9NA) white (напівфабрикат)",
    "planQty": 273.0,
    "factQty": 273.0,
    "gapQty": 0.0,
    "planTime": 22.3,
    "factTime": 22.3,
    "completionRate": 100.0,
    "norm": 294.1,
    "status": "MET",
    "statusText": "🎯 Đạt 100%"
  },
  {
    "process": "ASSEMBLY",
    "model": "Ajax DualCurtain Outdoor (8EU) white (напівфабрикат)",
    "planQty": 892.0,
    "factQty": 892.0,
    "gapQty": 0.0,
    "planTime": 107.54,
    "factTime": 107.54,
    "completionRate": 100.0,
    "norm": 434.0,
    "status": "MET",
    "statusText": "🎯 Đạt 100%"
  },
  {
    "process": "ASSEMBLY",
    "model": "Ajax MotionCam HDR (8EU) black (напівфабрикат)",
    "planQty": 0.0,
    "factQty": 1.0,
    "gapQty": 1.0,
    "planTime": 0.0,
    "factTime": 0.07,
    "completionRate": 100.0,
    "norm": 252.0,
    "status": "OVER",
    "statusText": "🚀 Vượt KH"
  },
  {
    "process": "ASSEMBLY",
    "model": "Ajax HomeSiren white EU (напівфабрикат)",
    "planQty": 1572.0,
    "factQty": 1596.0,
    "gapQty": 24.0,
    "planTime": 91.7,
    "factTime": 93.1,
    "completionRate": 101.5,
    "norm": 210.0,
    "status": "OVER",
    "statusText": "🚀 Vượt KH"
  },
  {
    "process": "ASSEMBLY",
    "model": "Ajax MotionCam Outdoor (PhOD) Jeweller (8EU) white (напівфабрикат)",
    "planQty": 450.0,
    "factQty": 598.0,
    "gapQty": 148.0,
    "planTime": 54.25,
    "factTime": 72.09,
    "completionRate": 132.9,
    "norm": 434.0,
    "status": "OVER",
    "statusText": "🚀 Vượt KH"
  },
  {
    "process": "ASSEMBLY",
    "model": "Ajax MotionCam HDR (PhOD) Jeweller (8EU) white (напівфабрикат)",
    "planQty": 522.0,
    "factQty": 851.0,
    "gapQty": 329.0,
    "planTime": 34.51,
    "factTime": 56.26,
    "completionRate": 163.0,
    "norm": 238.0,
    "status": "OVER",
    "statusText": "🚀 Vượt KH"
  },
  {
    "process": "ASSEMBLY",
    "model": "Ajax MotionCam HDR (8EU) white (напівфабрикат)",
    "planQty": 623.0,
    "factQty": 1020.0,
    "gapQty": 397.0,
    "planTime": 41.19,
    "factTime": 67.43,
    "completionRate": 163.7,
    "norm": 238.0,
    "status": "OVER",
    "statusText": "🚀 Vượt KH"
  },
  {
    "process": "ASSEMBLY",
    "model": "Ajax MotionProtect white EU (напівфабрикат)",
    "planQty": 0.0,
    "factQty": 807.0,
    "gapQty": 807.0,
    "planTime": 0.0,
    "factTime": 32.06,
    "completionRate": 100.0,
    "norm": 143.0,
    "status": "OVER",
    "statusText": "🚀 Vượt KH"
  },
  {
    "process": "ASSEMBLY",
    "model": "Ajax DoorProtect white EU (напівфабрикат)",
    "planQty": 1274.0,
    "factQty": 2092.0,
    "gapQty": 818.0,
    "planTime": 23.0,
    "factTime": 37.77,
    "completionRate": 164.2,
    "norm": 65.0,
    "status": "OVER",
    "statusText": "🚀 Vượt KH"
  },
  {
    "process": "ASSEMBLY",
    "model": "Ajax DoorProtect Plus white EU (напівфабрикат)",
    "planQty": 1915.0,
    "factQty": 3755.0,
    "gapQty": 1840.0,
    "planTime": 34.58,
    "factTime": 67.8,
    "completionRate": 196.1,
    "norm": 65.0,
    "status": "OVER",
    "statusText": "🚀 Vượt KH"
  }
];

// Global Master Data & Shift Rotation Logic
window.MANPOWER_MASTER_DATA = window.MANPOWER_MASTER_DATA || {
  'A': { shift: 'A', name: 'Shift A', assyDirect: 43, assyTotal: 58, htDirect: 21, htTotal: 23, assyLinesDirect: { '1A': 15, '2A': 14, '3A': 14 }, assyLinesTotal: { '1A': 20, '2A': 19, '3A': 19 }, htBreakdown: { cleanroom: 3, operator: 18, feeder: 1, leader: 1 } },
  'B': { shift: 'B', name: 'Shift B', assyDirect: 29, assyTotal: 39, htDirect: 23, htTotal: 25, assyLinesDirect: { '1B': 14, '2B': 15 }, assyLinesTotal: { '1B': 19, '2B': 20 }, htBreakdown: { cleanroom: 4, operator: 19, feeder: 1, leader: 1 } },
  'C': { shift: 'C', name: 'Shift C', assyDirect: 41, assyTotal: 56, htDirect: 23, htTotal: 25, assyLinesDirect: { '1C': 14, '2C': 14, '3C': 13 }, assyLinesTotal: { '1C': 19, '2C': 19, '3C': 18 }, htBreakdown: { cleanroom: 2, operator: 21, feeder: 1, leader: 1 } },
  'D': { shift: 'D', name: 'Shift D', assyDirect: 27, assyTotal: 37, htDirect: 23, htTotal: 25, assyLinesDirect: { '1D': 14, '2D': 13 }, assyLinesTotal: { '1D': 19, '2D': 18 }, htBreakdown: { cleanroom: 4, operator: 19, feeder: 1, leader: 1 } },
  'HC': { shift: 'HC', name: 'Hành Chính', lines: ['3D'], assyDirect: 11, assyTotal: 16, htDirect: 0, htTotal: 0, assyLinesDirect: { '3D': 11 }, assyLinesTotal: { '3D': 16 }, htBreakdown: { cleanroom: 0, operator: 0, feeder: 0, leader: 0 }, workShift: 'Day', workingDays: 'Mon-Fri' }
};

// Nạp cấu hình Kíp Line tuỳ chỉnh đã lưu từ localStorage nếu có
try {
  const savedKipConfig = localStorage.getItem('ajax_kip_line_config');
  if (savedKipConfig) {
    const parsed = JSON.parse(savedKipConfig);
    if (parsed && typeof parsed === 'object') {
      window.MANPOWER_MASTER_DATA = Object.assign({}, window.MANPOWER_MASTER_DATA, parsed);
    }
  }
} catch (e) {
  console.warn('Lỗi khi nạp cấu hình Kíp Line từ localStorage:', e);
}

window.getShiftRotation = function(dateStr) {
  if (!dateStr) return { day: 'A', night: 'B', off: ['C', 'D'], label: 'Kíp A / Kíp B' };
  let targetDate;
  if (typeof window.AppStore !== 'undefined' && window.AppStore && typeof window.AppStore.parseDate === 'function') {
    targetDate = window.AppStore.parseDate(dateStr);
  } else {
    const trimmed = String(dateStr).trim();
    if (trimmed.includes('-')) {
      const parts = trimmed.split('-');
      if (parts[0].length === 4) {
        targetDate = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      } else {
        targetDate = new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
      }
    } else if (trimmed.includes('/')) {
      const parts = trimmed.split('/');
      const y = parseInt(parts[2], 10);
      const p0 = parseInt(parts[0], 10);
      const p1 = parseInt(parts[1], 10);
      let d, m;
      if (p0 > 12 && p1 <= 12) {
        d = p0; m = p1;
      } else if (p1 > 12 && p0 <= 12) {
        m = p0; d = p1;
      } else {
        if (p0 === 10) { m = 10; d = p1; }
        else if (p1 === 10) { m = 10; d = p0; }
        else { d = p0; m = p1; }
      }
      targetDate = new Date(y, m - 1, d);
    } else {
      targetDate = new Date(dateStr);
    }
  }
  if (!targetDate || isNaN(targetDate.getTime())) {
    return { day: 'A', night: 'B', off: ['C', 'D'], label: 'Kíp A / Kíp B' };
  }
  targetDate.setHours(0, 0, 0, 0);

  // Chu kỳ chuẩn: Bắt đầu 18/10/2026: Shift A làm ngày, Shift B làm đêm, Shift C/D nghỉ
  const baseDate = new Date(2026, 9, 18, 0, 0, 0, 0);

  const diffMs = targetDate.getTime() - baseDate.getTime();
  const diffDays = Math.round(diffMs / (86400 * 1000));
  let cycleIndex = ((Math.floor(diffDays / 3) % 4) + 4) % 4;

  const rotations = [
    { day: 'A', night: 'B', off: ['C', 'D'], label: 'Kíp A / Kíp B' }, // 18 - 20/10
    { day: 'C', night: 'D', off: ['A', 'B'], label: 'Kíp C / Kíp D' }, // 21 - 23/10
    { day: 'B', night: 'A', off: ['C', 'D'], label: 'Kíp B / Kíp A' }, // 24 - 26/10
    { day: 'D', night: 'C', off: ['A', 'B'], label: 'Kíp D / Kíp C' }  // 27 - 29/10
  ];

  return rotations[cycleIndex];
};


class Store {
  constructor() {
    this.asPlan = [];
    this.htPlan = [];
    this.fttStats = [];
    this.dataMass = window.DEFAULT_DATAMASS_DATA || { weeks: [], manpower: [], items: [] };
    this.selectedWeekIndex = 0;
    this.selectedStageFilter = 'HARDTEST_AND_ASSEMBLY';
    this.selectedModelFilter = 'ALL';
    this.selectedPlanStatusFilter = 'GAP_NEGATIVE'; // Mặc định sau khi F5: 'GAP_NEGATIVE' (Đang thiếu hụt < 0)
    this.table2ViewMode = 'CUMULATIVE'; // Mặc định sau khi F5: 'CUMULATIVE' (Chỉ xem tổng lũy kế)
    this.dataMassViewMode = 'PLAN_FACT'; // 'PLAN_FACT' | 'MANPOWER' | 'SUMMARY'

    // Tính toán chu kỳ tuần nhà máy chuẩn: Thứ 5 đến hết Thứ 4 tuần tiếp theo (trọn vẹn 7 ngày)
    // Cài đặt mặc định ban đầu: Từ Thứ 5 đến Ngày Hiện Tại (today)
    const _factoryWeek = this.getFactoryWeekRange();
    this.fromDate = _factoryWeek.fromDate || '2026-11-05';
    this.toDate = _factoryWeek.toDate || '2026-11-05';
    this.simFromDate = this.fromDate;
    this.simToDate = this.toDate;
    this.hardtestSimFromDate = this.fromDate;
    this.hardtestSimToDate = this.toDate;
    this.currentShiftFilter = 'ALL'; // Mặc định sau khi F5: chọn '🌟 Cả 2 Ca' (ALL)
    this.activeSelectedDates = null; // Set of dates currently selected for cumulative sum
    this.datamassPageIndex = 0;
    this.datamassPageSize = 50;
    this.listeners = [];
    this.actualAttendance = {};
    this.actualSupplement = {};
    this.attendanceLog = [];
    this.sfpdProduction = {};
    this.officialModels1022 = OFFICIAL_MODELS_1022;

    // Factory shift standard working hours / Quy chuẩn OT: 1 người bổ sung = 12h OT
    this.SHIFT_HOURS = {
      DAY: 12.0,
      NIGHT: 12.0,
      AVG: 12.0
    };

    // Capacity & Line Performance State
    this.assemblyCapacity = window.ASSEMBLY_CAPACITY_DATA || null;
    this.selectedCapacityStage = 'ASSEMBLY';
    this.selectedCapacityGroup = 'ALL';
    this.selectedCapacityLine = 'ALL';
    this.capacityShiftHours = 21.41;
    this.capacityViewMode = 'MATRIX'; // 'MATRIX' | 'LINE_FOCUS' | 'SIMULATOR'
    this.simManualNotes = {};

    this.loadFromStorage();
  }

  /**
   * Tính toán chu kỳ tuần chuẩn của nhà máy:
   * - Chu kỳ tuần 1 tuần chuẩn: Bắt đầu từ Thứ 5 và kết thúc vào hết Thứ 4 tuần tiếp theo (7 ngày).
   * - Cài đặt mặc định tra cứu theo quãng thời gian: từ Thứ 5 (đầu tuần hiện tại) đến Ngày Hiện Tại (today).
   * @param {string|Date|null} refDate Mốc ngày tham chiếu (mặc định hôm nay)
   * @param {boolean} isFullWeek Nếu true, trả về trọn vẹn 1 tuần từ Thứ 5 đến hết Thứ 4 tuần tiếp theo
   * @returns {{ fromDate: string, toDate: string, weekEndDate: string, from: string, to: string, startThu: Date, endWed: Date, today: string }}
   */
  getFactoryWeekRange(refDate = null, isFullWeek = false) {
    let d;
    if (!refDate) {
      d = new Date();
    } else if (typeof refDate === 'string') {
      const parts = refDate.trim().split('-');
      if (parts.length === 3) {
        d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      } else {
        d = new Date(refDate);
      }
    } else {
      d = new Date(refDate);
    }
    if (isNaN(d.getTime())) d = new Date();

    const day = d.getDay(); // 0: CN, 1: T2, ..., 4: T5, 5: T6, 6: T7
    const diffToThu = (day - 4 + 7) % 7;
    const startThu = new Date(d.getFullYear(), d.getMonth(), d.getDate() - diffToThu);
    const endWed = new Date(startThu.getFullYear(), startThu.getMonth(), startThu.getDate() + 6); // Hết Thứ 4 tuần tiếp theo (chu kỳ 1 tuần)

    const pad = n => String(n).padStart(2, '0');
    const fmt = dt => `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;

    const fromDate = fmt(startThu);                       // Thứ 5
    const toDate = isFullWeek ? fmt(endWed) : fmt(d);     // Mặc định: đến Ngày Hiện Tại (today)
    const weekEndDate = fmt(endWed);                     // Hết Thứ 4 tuần tiếp theo

    return {
      fromDate,
      toDate,
      weekEndDate,
      from: fromDate,
      to: toDate,
      startThu,
      endWed,
      today: fmt(d)
    };
  }

  loadFromStorage() {
    try {
      const storedAs = localStorage.getItem('AJAX_PROPLAN_AS_PLAN');
      const storedHt = localStorage.getItem('AJAX_PROPLAN_HT_PLAN');
      const storedFtt = localStorage.getItem('AJAX_PROPLAN_FTT');
      const storedDataMass = localStorage.getItem('AJAX_PROPLAN_DATAMASS');

      this.asPlan = storedAs ? JSON.parse(storedAs) : SEED_AS_DATA;
      this.htPlan = storedHt ? JSON.parse(storedHt) : SEED_HT_DATA;
      this.fttStats = storedFtt ? JSON.parse(storedFtt) : SEED_FTT_DATA;
      
      if (window.DEFAULT_DATAMASS_DATA && window.DEFAULT_DATAMASS_DATA.items && window.DEFAULT_DATAMASS_DATA.items.length > 0) {
        // Authoritative live data from Google Sheets auto-sync
        this.dataMass = window.DEFAULT_DATAMASS_DATA;
        try {
          localStorage.setItem('AJAX_PROPLAN_DATAMASS', JSON.stringify({ _v: window.DEFAULT_DATAMASS_DATA._v || 202610251041 }));
        } catch(e) {}
      } else if (storedDataMass) {
        try {
          const parsed = JSON.parse(storedDataMass);
          if (parsed && parsed.items && parsed.items.length > 0) {
            this.dataMass = parsed;
          }
        } catch(e) {
          if (window.DEFAULT_DATAMASS_DATA) this.dataMass = window.DEFAULT_DATAMASS_DATA;
        }
      } else if (window.DEFAULT_DATAMASS_DATA) {
        this.dataMass = window.DEFAULT_DATAMASS_DATA;
      }
    } catch(e) {
      this.asPlan = SEED_AS_DATA;
      this.htPlan = SEED_HT_DATA;
      this.fttStats = SEED_FTT_DATA;
      this.dataMass = window.DEFAULT_DATAMASS_DATA || { weeks: [], manpower: [], items: [] };
    }

    // Load actual attendance data (Actual headcount for SFPD report & Master Plan)
    try {
      const ATTENDANCE_VERSION = '20261025_MANPOWER_v2';
      const storedVer = localStorage.getItem('AJAX_PROPLAN_ATTENDANCE_VER');
      if (storedVer !== ATTENDANCE_VERSION) {
        localStorage.removeItem('AJAX_PROPLAN_ACTUAL_ATTENDANCE');
        localStorage.setItem('AJAX_PROPLAN_ATTENDANCE_VER', ATTENDANCE_VERSION);
        this.actualAttendance = {};
      } else {
        const storedActual = localStorage.getItem('AJAX_PROPLAN_ACTUAL_ATTENDANCE');
        this.actualAttendance = storedActual ? JSON.parse(storedActual) : {};
      }
    } catch(e) {
      this.actualAttendance = {};
    }

    // Load attendance audit log history
    try {
      const storedLog = localStorage.getItem('AJAX_PROPLAN_ATTENDANCE_LOG');
      if (storedLog) {
        this.attendanceLog = JSON.parse(storedLog);
      } else {
        this.attendanceLog = [
          {
            id: 'log_seed_4',
            timestamp: '2026-10-23 07:30:15',
            date: '10/23/2026',
            shift: 'Day',
            stage: 'HARD TEST',
            oldValue: 15.0,
            newValue: 17.0,
            planValue: 16.5,
            balance: 0.5,
            shortage: 0,
            shiftHour: 12.0,
            otHours: 0,
            note: 'Bổ sung thêm 2 nhân sự kiểm thử, đảm bảo vượt tiến độ'
          },
          {
            id: 'log_seed_3',
            timestamp: '2026-10-22 19:45:20',
            date: '10/22/2026',
            shift: 'Night',
            stage: 'OPTICS ASM',
            oldValue: 4.0,
            newValue: 4.4,
            planValue: 4.8,
            balance: -0.4,
            shortage: 0.4,
            shiftHour: 12.0,
            otHours: 4.8,
            note: 'Ca Đêm thiếu 0.4 người -> Cần bố trí 4.8h OT (quy chuẩn 12h OT/người)'
          },
          {
            id: 'log_seed_2',
            timestamp: '2026-10-22 07:15:00',
            date: '10/22/2026',
            shift: 'Day',
            stage: 'HARD TEST',
            oldValue: 0.0,
            newValue: 15.0,
            planValue: 16.5,
            balance: -1.5,
            shortage: 1.5,
            shiftHour: 12.0,
            otHours: 18.0,
            note: 'Điểm danh đầu ca Ngày 10/22: Thiếu 1.5 người -> Cần 18.0h OT (quy chuẩn 12h OT/người)'
          },
          {
            id: 'log_seed_1',
            timestamp: '2026-10-22 07:05:00',
            date: '10/22/2026',
            shift: 'Day',
            stage: 'ASSEMBLY',
            oldValue: 0.0,
            newValue: 42.0,
            planValue: 42.0,
            balance: 0.0,
            shortage: 0,
            shiftHour: 12.0,
            otHours: 0,
            note: 'Điểm danh đầu ca Ngày 10/22: Đủ 100% định biên kế hoạch'
          }
        ];
      }
    } catch(e) {
      this.attendanceLog = [];
    }

    // Load actual supplement data (Actual additional staff mobilized)
    try {
      const storedSupp = localStorage.getItem('AJAX_PROPLAN_ACTUAL_SUPPLEMENT');
      this.actualSupplement = storedSupp ? JSON.parse(storedSupp) : {};
    } catch(e) {
      this.actualSupplement = {};
    }

    // Authoritative SFPD Production Plan & Fact numbers from official reports
    this.sfpdProduction = {
      '10/22/2026': {
        'HARD TEST': { planDay: 11639, planNight: 9610, factDay: 11734, factNight: 6642 },
        'OPTICS ASM': { planDay: 964, planNight: 1028, factDay: 1000, factNight: 993 },
        'FOCUS': { planDay: 964, planNight: 964, factDay: 1016, factNight: 590 },
        'ASSEMBLY': { planDay: 7383, planNight: 5835, factDay: 10907, factNight: 6015 }
      },
      '10/23/2026': {
        'HARD TEST': { planDay: 10724, planNight: 9594, factDay: 11738, factNight: 11585 },
        'OPTICS ASM': { planDay: 776, planNight: 0, factDay: 900, factNight: 0 },
        'FOCUS': { planDay: 578, planNight: 964, factDay: 484, factNight: 1052 },
        'ASSEMBLY': { planDay: 9714, planNight: 5691, factDay: 5496, factNight: 4844 }
      },
      '10/24/2026': {
        'HARD TEST': { planDay: 9775, planNight: 14122, factDay: 10433, factNight: 11720 },
        'OPTICS ASM': { planDay: 964, planNight: 964, factDay: 964, factNight: 971 },
        'FOCUS': { planDay: 776, planNight: 0, factDay: 688, factNight: 72 },
        'ASSEMBLY': { planDay: 9098, planNight: 7343, factDay: 10726, factNight: 4559 }
      },
      '10/25/2026': {
        'HARD TEST': { planDay: 12911, planNight: 15784, factDay: 0, factNight: 0 },
        'OPTICS ASM': { planDay: 964, planNight: 600, factDay: 0, factNight: 0 },
        'FOCUS': { planDay: 964, planNight: 964, factDay: 0, factNight: 0 },
        'ASSEMBLY': { planDay: 11458, planNight: 13743, factDay: 0, factNight: 0 }
      },
      '10/26/2026': {
        'HARD TEST': { planDay: 15916, planNight: 11693, factDay: 0, factNight: 0 },
        'OPTICS ASM': { planDay: 600, planNight: 600, factDay: 0, factNight: 0 },
        'FOCUS': { planDay: 964, planNight: 600, factDay: 0, factNight: 0 },
        'ASSEMBLY': { planDay: 12558, planNight: 11380, factDay: 0, factNight: 0 }
      },
      '10/27/2026': {
        'HARD TEST': { planDay: 12908, planNight: 12245, factDay: 0, factNight: 0 },
        'OPTICS ASM': { planDay: 40, planNight: 0, factDay: 0, factNight: 0 },
        'FOCUS': { planDay: 0, planNight: 0, factDay: 0, factNight: 0 },
        'ASSEMBLY': { planDay: 10653, planNight: 9786, factDay: 0, factNight: 0 }
      },
      '10/28/2026': {
        'HARD TEST': { planDay: 11259, planNight: 10229, factDay: 0, factNight: 0 },
        'OPTICS ASM': { planDay: 0, planNight: 600, factDay: 0, factNight: 0 },
        'FOCUS': { planDay: 0, planNight: 0, factDay: 0, factNight: 0 },
        'ASSEMBLY': { planDay: 10112, planNight: 11853, factDay: 0, factNight: 0 }
      }
    };
  }

  save() {
    try {
      localStorage.setItem('AJAX_PROPLAN_AS_PLAN', JSON.stringify(this.asPlan));
      localStorage.setItem('AJAX_PROPLAN_HT_PLAN', JSON.stringify(this.htPlan));
      localStorage.setItem('AJAX_PROPLAN_FTT', JSON.stringify(this.fttStats));
      if (this.dataMass && !this.dataMass._v) this.dataMass._v = 2026102501;
      try {
        localStorage.setItem('AJAX_PROPLAN_DATAMASS', JSON.stringify(this.dataMass));
      } catch (dmErr) {
        if (this.dataMass && this.dataMass._v) {
          localStorage.setItem('AJAX_PROPLAN_DATAMASS', JSON.stringify({ _v: this.dataMass._v }));
        }
      }
    } catch(e) {
      console.error('Save store error:', e);
    }
    this.notify();
  }

  updateLiveCloudData({ asPlan, htPlan, fttStats, dataMass }) {
    if (asPlan && asPlan.length > 0) this.asPlan = asPlan;
    if (htPlan && htPlan.length > 0) this.htPlan = htPlan;
    if (fttStats && fttStats.length > 0) this.fttStats = fttStats;
    if (dataMass && dataMass.weeks && dataMass.weeks.length > 0) {
      if (!dataMass._v) dataMass._v = 2026102501;
      const baseRef = (this.dataMass && Array.isArray(this.dataMass.items) && this.dataMass.items.length > 0)
        ? this.dataMass
        : window.DEFAULT_DATAMASS_DATA;
      const isDirectCsv = !!dataMass._fromBrowserCsv;

      if (baseRef && baseRef !== dataMass) {
        // Giữ nguyên các trường mở rộng (manpowerSheet, capacity, massHistory, clipsAlls) nếu bản mới từ CSV trình duyệt chưa có
        ['manpowerSheet', 'assemblyCapacity', 'hardtestCapacity', 'massHistory', 'clipsAlls'].forEach(k => {
          if (!dataMass[k] && baseRef[k]) dataMass[k] = baseRef[k];
        });

        const incomingDateSet = new Set(dataMass.dates || []);
        const dateSet = new Set(dataMass.dates || []);
        (baseRef.dates || []).forEach(d => dateSet.add(d));
        dataMass.dates = Array.from(dateSet);

        // Merge manpower People (chỉ bổ sung ngày chưa có trong payload mới)
        if (baseRef.manpower) {
          if (!dataMass.manpower) dataMass.manpower = [];
          baseRef.manpower.forEach(defMp => {
            let m = dataMass.manpower.find(x => x.stage === defMp.stage && x.metric === defMp.metric);
            if (!m) {
              dataMass.manpower.push(JSON.parse(JSON.stringify(defMp)));
            } else {
              if (!m.daily) m.daily = {};
              Object.keys(defMp.daily || {}).forEach(k => {
                const baseDate = k.replace(/_(Day|Night)$/, '');
                if (isDirectCsv && incomingDateSet.has(baseDate)) return;
                if (m.daily[k] === undefined || m.daily[k] === 0) {
                  m.daily[k] = defMp.daily[k];
                }
              });
            }
          });
        }

        // Merge items plan & fact + giữ nguyên tồn kho 1C / normKey / lastStep
        if (baseRef.items) {
          if (!dataMass.items || dataMass.items.length === 0) {
            dataMass.items = baseRef.items;
          } else {
            const baseItemMap = new Map();
            baseRef.items.forEach(bIt => {
              const bPname = bIt.productName1C || bIt.productName || '';
              baseItemMap.set(`${bIt.stage}|||${bIt.model || ''}|||${bPname}`, bIt);
              baseItemMap.set(`${bIt.stage}|||${bPname}`, bIt);
            });
            dataMass.items.forEach(it => {
              const pName = it.productName1C || it.productName || '';
              const matched = baseItemMap.get(`${it.stage}|||${it.model || ''}|||${pName}`) || baseItemMap.get(`${it.stage}|||${pName}`);
              if (matched) {
                ['stock1C', 'stock1CWarehouses', 'normKey', 'normKeyShort', 'lastStep', 'productNameEnglish', 'specCode', 'fpArticule'].forEach(f => {
                  if ((it[f] === undefined || it[f] === '' || it[f] === null) && matched[f] !== undefined) {
                    it[f] = matched[f];
                  }
                });
                if ((!it.norm || it.norm === 0) && matched.norm) it.norm = matched.norm;
                if (!it.normName && matched.normName) it.normName = matched.normName;
                ['plan', 'fact', 'planDay', 'planNight', 'factDay', 'factNight'].forEach(dictKey => {
                  if (!it[dictKey]) it[dictKey] = {};
                  Object.keys(matched[dictKey] || {}).forEach(d => {
                    if (isDirectCsv && incomingDateSet.has(d)) return;
                    if (it[dictKey][d] === undefined || it[dictKey][d] === 0) {
                      it[dictKey][d] = matched[dictKey][d];
                    }
                  });
                });
              }
            });
          }
        }
      }
      this.dataMass = dataMass;
      this._normalizedWeeks = null;
    }
    this.save();
  }

  updateDataMassData(dataMass) {
    if (dataMass && dataMass.weeks && dataMass.weeks.length > 0) {
      this.dataMass = dataMass;
      this._normalizedWeeks = null;
      this.save();
    }
  }

  parseDate(str) {
    if (!str) return new Date();
    if (str instanceof Date) return str;
    if (typeof str === 'string') {
      const trimmed = str.trim();
      if (trimmed.includes('-')) {
        const parts = trimmed.split('-');
        if (parts.length === 3) {
          if (parts[0].length === 4) {
            // YYYY-MM-DD
            return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10), 0, 0, 0, 0);
          } else if (parts[2].length === 4) {
            // DD-MM-YYYY
            return new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10), 0, 0, 0, 0);
          }
        }
      }
      if (trimmed.includes('/')) {
        const parts = trimmed.split('/');
        if (parts.length === 3) {
          if (parts[2].length === 4) {
            const y = parseInt(parts[2], 10);
            const p0 = parseInt(parts[0], 10);
            const p1 = parseInt(parts[1], 10);
            let m, d;
            if (p0 > 12 && p1 <= 12) {
              // DD/MM/YYYY (e.g. 22/10/2026, 15/10/2026)
              d = p0;
              m = p1;
            } else if (p1 > 12 && p0 <= 12) {
              // MM/DD/YYYY (e.g. 10/22/2026, 10/15/2026)
              m = p0;
              d = p1;
            } else {
              // Both <= 12 (e.g. 10/8/2026 or 08/10/2026)
              // If p0 has leading zero (08/10/2026) and p1 is 10, in VN locale it's DD/MM.
              // Otherwise default to M/D/YYYY which matches DEFAULT_DATAMASS_DATA keys.
              m = p0;
              d = p1;
            }
            return new Date(y, m - 1, d, 0, 0, 0, 0);
          } else if (parts[0].length === 4) {
            // YYYY/MM/DD
            return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10), 0, 0, 0, 0);
          }
        }
      }
    }
    return new Date(str);
  }

  toISODate(str) {
    if (!str) return '';
    const d = this.parseDate(str);
    if (isNaN(d.getTime())) return str;
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  fromISODate(iso) {
    if (!iso) return '';
    const d = this.parseDate(iso);
    if (isNaN(d.getTime())) return iso;
    return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
  }

  getDataMassWeeks() {
    if (this._normalizedWeeks) return this._normalizedWeeks;
    const rawWeeks = (this.dataMass && this.dataMass.weeks) ? this.dataMass.weeks : [];
    if (!rawWeeks.length) return [];

    const weeks = [];
    rawWeeks.forEach(w => {
      if (w.label === 'W_End' && Array.isArray(w.days)) {
        const dateMap = {};
        const order = [];
        w.days.forEach(d => {
          if (!dateMap[d.date]) {
            dateMap[d.date] = [];
            order.push(d.date);
          }
          dateMap[d.date].push(d);
        });
        for (let i = 0; i < order.length; i += 7) {
          const sliceDates = order.slice(i, i + 7);
          const firstDate = sliceDates[0];
          const lastDate = sliceDates[sliceDates.length - 1];
          const p1 = firstDate.split('/');
          const p2 = lastDate.split('/');
          const label1 = (p1[1].length < 2 ? '0' + p1[1] : p1[1]) + '/' + (p1[0].length < 2 ? '0' + p1[0] : p1[0]);
          const label2 = (p2[1].length < 2 ? '0' + p2[1] : p2[1]) + '/' + (p2[0].length < 2 ? '0' + p2[0] : p2[0]);
          let chunkDays = [];
          sliceDates.forEach(d => { chunkDays = chunkDays.concat(dateMap[d]); });
          weeks.push({
            label: `${label1}-${label2}`,
            summaryCol: chunkDays[chunkDays.length - 1] ? chunkDays[chunkDays.length - 1].col : w.summaryCol,
            days: chunkDays
          });
        }
      } else {
        weeks.push(w);
      }
    });

    this._normalizedWeeks = weeks;
    return weeks;
  }

  getDataMassStages() {
    const stageSet = new Set();
    if (this.dataMass) {
      if (this.dataMass.manpower) {
        this.dataMass.manpower.forEach(m => { if (m.stage && m.stage !== 'ALL') stageSet.add(m.stage); });
      }
      if (this.dataMass.items) {
        this.dataMass.items.forEach(i => { if (i.stage && i.stage !== 'ALL') stageSet.add(i.stage); });
      }
    }
    return Array.from(stageSet).filter(st => st !== 'ALL');
  }

  getAllDates() {
    const set = new Set();
    if (this.dataMass && this.dataMass.dates && Array.isArray(this.dataMass.dates)) {
      this.dataMass.dates.forEach(d => set.add(d));
    }
    if (window.DEFAULT_DATAMASS_DATA && window.DEFAULT_DATAMASS_DATA.dates && Array.isArray(window.DEFAULT_DATAMASS_DATA.dates)) {
      window.DEFAULT_DATAMASS_DATA.dates.forEach(d => set.add(d));
    }
    if (this.dataMass && this.dataMass.items) {
      this.dataMass.items.forEach(it => {
        if (it.plan) Object.keys(it.plan).forEach(d => set.add(d));
        if (it.fact) Object.keys(it.fact).forEach(d => set.add(d));
      });
    }
    return Array.from(set).sort((a, b) => this.parseDate(a) - this.parseDate(b));
  }

  getDatesInRange(fromStr, toStr) {
    let fromTime = this.parseDate(fromStr).getTime();
    let toTime = this.parseDate(toStr).getTime();
    if (isNaN(fromTime) || isNaN(toTime)) return [];
    if (fromTime > toTime) {
      const temp = fromTime;
      fromTime = toTime;
      toTime = temp;
    }
    const all = this.getAllDates();

    return all.filter(d => {
      const t = this.parseDate(d).getTime();
      return t >= fromTime && t <= toTime;
    });
  }

  getSelectedDays(weekIdx = 0) {
    if (!this.selectedDaysMap) this.selectedDaysMap = {};
    const weeks = this.getDataMassWeeks();
    const safeIdx = Math.max(0, Math.min(weekIdx, weeks.length - 1));
    const targetWeek = weeks[safeIdx];
    if (!targetWeek || !targetWeek.days) return [];

    if (!this.selectedDaysMap[safeIdx]) {
      this.selectedDaysMap[safeIdx] = targetWeek.days.map(d => d.date);
    }
    return this.selectedDaysMap[safeIdx];
  }

  toggleSelectedDay(weekIdx, dateStr, isSelected) {
    if (!this.selectedDaysMap) this.selectedDaysMap = {};
    const current = new Set(this.getSelectedDays(weekIdx));
    if (isSelected) {
      current.add(dateStr);
    } else {
      current.delete(dateStr);
    }
    this.selectedDaysMap[weekIdx] = Array.from(current);
    this.notify();
  }

  selectPresetDays(weekIdx, count) {
    if (!this.selectedDaysMap) this.selectedDaysMap = {};
    const weeks = this.getDataMassWeeks();
    const safeIdx = Math.max(0, Math.min(weekIdx, weeks.length - 1));
    const targetWeek = weeks[safeIdx];
    if (!targetWeek || !targetWeek.days) return;

    if (count <= 0) {
      this.selectedDaysMap[safeIdx] = [];
    } else {
      const takeCount = Math.min(count, targetWeek.days.length);
      this.selectedDaysMap[safeIdx] = targetWeek.days.slice(0, takeCount).map(d => d.date);
    }
    this.notify();
  }

  getActiveSelectedDates(fromDate = null, toDate = null) {
    const from = fromDate || this.fromDate;
    const to = toDate || this.toDate;
    const rangeDates = this.getDatesInRange(from, to);
    const rangeSet = new Set(rangeDates);

    if (this.activeSelectedDates && Array.isArray(this.activeSelectedDates)) {
      const validSelected = this.activeSelectedDates.filter(d => rangeSet.has(d));
      if (validSelected.length > 0) {
        return validSelected;
      }
    }
    return rangeDates;
  }

  toggleActiveDate(dateStr, isSelected) {
    const current = new Set(this.getActiveSelectedDates());
    if (isSelected) {
      current.add(dateStr);
    } else {
      current.delete(dateStr);
    }
    this.activeSelectedDates = Array.from(current);
    this.notify();
  }

  selectAllActiveDates() {
    const dates = this.getDatesInRange(this.fromDate, this.toDate);
    this.activeSelectedDates = [...dates];
    this.notify();
  }

  deselectAllActiveDates() {
    this.activeSelectedDates = [];
    this.notify();
  }

  updateDailyItemValue(stage, model, productName1C, type, date, shift = 'ALL', newValue = 0) {
    if (!this.dataMass || !this.dataMass.items) return;
    const num = parseFloat(newValue) || 0;
    
    let item = this.dataMass.items.find(i => 
      i.stage === stage && (i.productName1C === productName1C || i.productName === productName1C)
    );

    if (!item) {
      item = { 
        stage, 
        model, 
        productName1C, 
        norm: 0, 
        plan: {}, 
        fact: {}, 
        planDay: {}, 
        planNight: {}, 
        factDay: {}, 
        factNight: {} 
      };
      this.dataMass.items.push(item);
    }

    if (!item[type]) item[type] = {};
    if (!item[`${type}Day`]) item[`${type}Day`] = {};
    if (!item[`${type}Night`]) item[`${type}Night`] = {};

    if (shift === 'DAY') {
      item[`${type}Day`][date] = num;
      item[type][date] = num + (item[`${type}Night`][date] || 0);
    } else if (shift === 'NIGHT') {
      item[`${type}Night`][date] = num;
      item[type][date] = (item[`${type}Day`][date] || 0) + num;
    } else {
      item[type][date] = num;
      item[`${type}Day`][date] = Math.round(num * 0.6);
      item[`${type}Night`][date] = num - Math.round(num * 0.6);
    }

    this.save();
    return num;
  }

  updateDailyManpowerValue(stage, metric, date, newValue) {
    if (!this.dataMass || !this.dataMass.manpower) return;
    const num = parseFloat(newValue) || 0;

    let mp = this.dataMass.manpower.find(m => m.stage === stage && m.metric === metric);
    if (!mp) {
      mp = { stage, metric, daily: {} };
      this.dataMass.manpower.push(mp);
    }

    if (!mp.daily) mp.daily = {};
    mp.daily[date] = Math.round(num * 10) / 10;

    // Synchronize base date with _Day and _Night
    if (date.includes('_Day')) {
      const base = date.replace('_Day', '');
      const night = mp.daily[`${base}_Night`] || 0;
      mp.daily[base] = Math.round((num + night) * 10) / 10;
    } else if (date.includes('_Night')) {
      const base = date.replace('_Night', '');
      const day = mp.daily[`${base}_Day`] || 0;
      mp.daily[base] = Math.round((day + num) * 10) / 10;
    } else {
      mp.daily[`${date}_Day`] = Math.round(num * 0.6 * 10) / 10;
      mp.daily[`${date}_Night`] = Math.round((num - mp.daily[`${date}_Day`]) * 10) / 10;
    }

    this.save();
    return mp.daily[date];
  }

  _normalizeStageKey(stage) {
    if (!stage) return 'total';
    const s = String(stage).toUpperCase().trim();
    if (s.includes('2 CỤM') || s.includes('MAJOR') || s === 'MAJOR_COMPOSITE' || s === 'ALL' || s.includes('TOÀN NHÀ MÁY') || s.includes('TRỌNG ĐIỂM') || (s.includes('HARDTEST') && s.includes('ASSEMBLY'))) return 'major_composite';
    if (s === 'HARDTEST_TOTAL' || s === 'SUM HARDTEST' || s.includes('HARDTEST TỔNG') || s.includes('PLAN HT TOTAL') || s === 'HARD TEST' || s === 'HARD_TEST' || s === 'HT' || s === 'HARDTEST' || s.includes('TỔNG HARD TEST')) return 'hardtest_total';
    if (s.includes('OPTICS')) return 'optics_asm';
    if (s.includes('A IMP')) return 'a_imp_asm';
    if (s.includes('FOCUS')) return 'focus';
    if (s.includes('ASSEMBLY') || s === 'ASSY') return 'assembly';
    return s.toLowerCase().replace(/[^a-z0-9]/g, '_');
  }

  getManpowerForDate(dateStr, shift, stage, mode = 'direct') {
    const rot = (typeof window.getShiftRotation === 'function') 
      ? window.getShiftRotation(dateStr) 
      : { day: 'A', night: 'B', off: ['C', 'D'] };

    const defaultMp = {
      'A': { assyDirect: 43, assyTotal: 58, htDirect: 21, htTotal: 23, assyLinesDirect: { '1A': 15, '2A': 14, '3A': 14 }, htBreakdown: { cleanroom: 3, operator: 18, feeder: 1, leader: 1 } },
      'B': { assyDirect: 29, assyTotal: 39, htDirect: 23, htTotal: 25, assyLinesDirect: { '1B': 14, '2B': 15 }, htBreakdown: { cleanroom: 4, operator: 19, feeder: 1, leader: 1 } },
      'C': { assyDirect: 41, assyTotal: 56, htDirect: 23, htTotal: 25, assyLinesDirect: { '1C': 14, '2C': 14, '3C': 13 }, htBreakdown: { cleanroom: 2, operator: 21, feeder: 1, leader: 1 } },
      'D': { assyDirect: 27, assyTotal: 37, htDirect: 23, htTotal: 25, assyLinesDirect: { '1D': 14, '2D': 13 }, htBreakdown: { cleanroom: 4, operator: 19, feeder: 1, leader: 1 } },
      'HC': { assyDirect: 11, assyTotal: 16, htDirect: 0, htTotal: 0, assyLinesDirect: { '3D': 11 }, assyLinesTotal: { '3D': 16 }, lines: ['3D'], workShift: 'Day', workingDays: 'Mon-Fri' }
    };

    const hasLiveMp = window.MANPOWER_MASTER_DATA && Object.keys(window.MANPOWER_MASTER_DATA).length > 0 && window.MANPOWER_MASTER_DATA['A'];
    const mpData = hasLiveMp ? window.MANPOWER_MASTER_DATA : defaultMp;

    const stageKey = this._normalizeStageKey(stage);

    // Xác định ngày trong tuần: Thứ 2 đến Thứ 6 (Day 1 - 5) là ngày làm việc của Hành chính
    let targetDate = null;
    if (typeof window.AppStore !== 'undefined' && window.AppStore && typeof window.AppStore.parseDate === 'function') {
      targetDate = window.AppStore.parseDate(dateStr);
    } else if (dateStr) {
      targetDate = new Date(dateStr);
    }
    const isWeekday = targetDate && !isNaN(targetDate.getTime()) && (targetDate.getDay() >= 1 && targetDate.getDay() <= 5);

    // Nhóm Hành Chính: Line 3D (Trực tiếp: 11, Gross: 16) - Chỉ làm Ca Ngày từ Thứ 2 đến Thứ 6
    const hcShift = mpData['HC'] || defaultMp['HC'];
    const hcDirectVal = (hcShift && typeof hcShift.assyDirect === 'number') ? hcShift.assyDirect : 11;
    const hcTotalVal = (hcShift && typeof hcShift.assyTotal === 'number') ? hcShift.assyTotal : 16;
    const hcVal = mode === 'total' ? hcTotalVal : hcDirectVal;

    const getShiftVal = (shiftLetter, isDayShift = false) => {
      const s = mpData[shiftLetter] || defaultMp[shiftLetter];
      if (!s) return 0;
      if (stageKey === 'assembly') {
        const base = mode === 'total' ? (s.assyTotal || 0) : (s.assyDirect || 0);
        // Ca Ngày các ngày Thứ 2 đến Thứ 6: cộng thêm Line 3D Hành chính
        return (isDayShift && isWeekday) ? (base + hcVal) : base;
      }
      // Nhân lực Hard Test: Đưa toàn bộ vào Tổng Hard Test (Shift A: 21, Shift B: 23, Shift C: 23, Shift D: 23)
      if (stageKey === 'hardtest_total') {
        return mode === 'total' ? (s.htTotal || 0) : (s.htDirect || 0);
      }
      // Không có nhân lực cho Focus, OPTICS...
      if (stageKey === 'optics_asm' || stageKey === 'focus' || stageKey === 'a_imp_asm') {
        return 0;
      }
      if (stageKey === 'major_composite' || stageKey === 'all' || stageKey === 'tong_toan_nha_may__all_' || stageKey.includes('tong') || stageKey.includes('composite')) {
        let aVal = mode === 'total' ? (s.assyTotal || 0) : (s.assyDirect || 0);
        if (isDayShift && isWeekday) {
          aVal += hcVal;
        }
        const hVal = mode === 'total' ? (s.htTotal || 0) : (s.htDirect || 0);
        return aVal + hVal;
      }
      return 0;
    };

    if (shift === 'Day') {
      return getShiftVal(rot.day, true);
    } else if (shift === 'Night') {
      return getShiftVal(rot.night, false);
    } else {
      return Math.round((getShiftVal(rot.day, true) + getShiftVal(rot.night, false)) * 10) / 10;
    }
  }

  // Chuẩn công thức Tổng Hard Test: SUM HARDTEST + OPTICS ASM + A IMP ASM (Đã bỏ FOCUS theo yêu cầu)
  getHardtestTotalPlanForDate(dateStr, shift = 'ALL') {
    const rawManpower = (this.dataMass && this.dataMass.manpower) ? this.dataMass.manpower : [];
    const getVal = (st, s) => {
      const item = rawManpower.find(m => m.stage === st && m.metric === 'People');
      if (!item || !item.daily) return 0;
      const key = `${dateStr}_${s}`;
      if (item.daily[key] !== undefined) return item.daily[key];
      const oppShift = (s === 'Day') ? 'Night' : 'Day';
      if (item.daily[`${dateStr}_${oppShift}`] !== undefined) return 0;
      const tot = item.daily[dateStr] || 0;
      return s === 'Day' ? Math.round(tot * 0.6 * 10) / 10 : Math.round(tot * 0.4 * 10) / 10;
    };

    const sumHtDay = getVal('SUM HARDTEST', 'Day');
    const sumHtNight = getVal('SUM HARDTEST', 'Night');
    const optDay = getVal('OPTICS ASM', 'Day');
    const optNight = getVal('OPTICS ASM', 'Night');
    const aimDay = getVal('A IMP ASM', 'Day');
    const aimNight = getVal('A IMP ASM', 'Night');

    const totDay = Math.round((sumHtDay + optDay + aimDay) * 10) / 10;
    const totNight = Math.round((sumHtNight + optNight + aimNight) * 10) / 10;
    const totAll = Math.round((totDay + totNight) * 10) / 10;

    const sNorm = String(shift || 'ALL').toUpperCase();
    if (sNorm.includes('DAY')) return totDay;
    if (sNorm.includes('NIGHT')) return totNight;
    return totAll;
  }

  getManpowerDetailText(dateStr, shift, stage) {
    const rot = (typeof window.getShiftRotation === 'function') 
      ? window.getShiftRotation(dateStr) 
      : { day: 'A', night: 'B', off: ['C', 'D'] };
    const shiftLetter = (shift === 'Day') ? rot.day : (shift === 'Night' ? rot.night : `${rot.day}+${rot.night}`);
    const mpData = window.MANPOWER_MASTER_DATA || {};
    const s = mpData[shiftLetter];
    const stageKey = this._normalizeStageKey(stage);

    let targetDate = null;
    if (typeof window.AppStore !== 'undefined' && window.AppStore && typeof window.AppStore.parseDate === 'function') {
      targetDate = window.AppStore.parseDate(dateStr);
    } else if (dateStr) {
      targetDate = new Date(dateStr);
    }
    const isWeekday = targetDate && !isNaN(targetDate.getTime()) && (targetDate.getDay() >= 1 && targetDate.getDay() <= 5);

    const hcShift = mpData['HC'] || { assyDirect: 11, assyTotal: 16 };
    const hcDirect = hcShift.assyDirect || 11;
    const hcTotal = hcShift.assyTotal || 16;

    if (!s) {
      if (stageKey === 'assembly' && isWeekday && (shift === 'Day' || shift === 'ALL')) {
        return `Kíp ${shiftLetter} + Line 3D Hành Chính (${hcDirect} ng)`;
      }
      return `Kíp ${shiftLetter}`;
    }

    if (stageKey === 'assembly') {
      const lineDetails = s.assyLinesDirect ? Object.entries(s.assyLinesDirect).map(([k, v]) => `Line ${k}: ${v} ng`).join(', ') : '';
      if (shift === 'Day') {
        if (isWeekday) {
          return `Ca Ngày [Kíp ${shiftLetter} trực]: ${lineDetails} (${s.assyDirect} ng) + [Hành Chính]: Line 3D (${hcDirect} ng) ➜ Tổng trực tiếp = ${s.assyDirect + hcDirect} ng (Gross: ${s.assyTotal + hcTotal} ng)`;
        } else {
          return `Ca Ngày [Kíp ${shiftLetter} trực]: ${lineDetails} (Tổng trực tiếp = ${s.assyDirect} ng | Gross = ${s.assyTotal} ng) • [Hành Chính nghỉ T7-CN]`;
        }
      } else if (shift === 'Night') {
        return `Ca Đêm [Kíp ${shiftLetter} trực]: ${lineDetails} (Tổng trực tiếp = ${s.assyDirect} ng | Gross = ${s.assyTotal} ng)`;
      } else {
        if (isWeekday) {
          return `Cả Ngày [Ngày Kíp ${rot.day} + Line 3D Hành Chính (${hcDirect} ng) | Đêm Kíp ${rot.night}]: Tổng trực tiếp = ${(s.assyDirect || 0) + hcDirect} ng`;
        } else {
          return `Cả Ngày [Ngày Kíp ${rot.day} | Đêm Kíp ${rot.night}]: Tổng trực tiếp = ${s.assyDirect || 0} ng • [Hành Chính nghỉ T7-CN]`;
        }
      }
    }

    if (stageKey === 'hardtest_total') {
      return `Ca ${shift === 'Day' ? 'Ngày' : 'Đêm'} [Kíp ${shiftLetter} trực]: Tổng Hard Test = ${s.htDirect} ng trực tiếp (Cleanroom + Operator) (Gross: ${s.htTotal} ng)`;
    }

    if (stageKey === 'optics_asm' || stageKey === 'focus' || stageKey === 'a_imp_asm') {
      return `(Không bố trí nhân lực riêng cho ${stage} - Đã tính trọn gói trong Tổng Hard Test)`;
    }

    return `Ca ${shift === 'Day' ? 'Ngày' : 'Đêm'} [Kíp ${shiftLetter} trực]`;
  }

  getActualAttendance(dateStr, shift, stage) {
    const stageKey = this._normalizeStageKey(stage);

    // 1. HARDTEST_TOTAL / TỔNG HARD TEST: Cập nhật trực tiếp vào Tổng Hard Test theo Sheet Manpower
    if (stageKey === 'hardtest_total') {
      const key = (shift === 'ALL' || !shift) ? `${dateStr}_ALL` : `${dateStr}_${shift}`;
      const rec = this.actualAttendance ? this.actualAttendance[key] : null;
      if (rec && rec.hardtest_total !== undefined && rec.hardtest_total !== null) {
        return rec.hardtest_total;
      }
      if (rec && rec.hardtest !== undefined && rec.hardtest !== null) {
        return rec.hardtest;
      }
      return this.getManpowerForDate(dateStr, shift, 'hardtest_total');
    }

    // 2. MAJOR_COMPOSITE / TỔNG TOÀN NHÀ MÁY: Tự động sum HARDTEST_TOTAL + ASSEMBLY
    if (stageKey === 'major_composite' || stageKey === 'all' || stageKey === 'tong_toan_nha_may__all_' || stageKey.includes('tong') || stageKey.includes('composite')) {
      const htTot = this.getActualAttendance(dateStr, shift, 'HARDTEST_TOTAL');
      const assy = this.getActualAttendance(dateStr, shift, 'ASSEMBLY');
      return Math.round((htTot + assy) * 10) / 10;
    }

    // 3. Không có nhân lực cho Focus, OPTICS...
    if (stageKey === 'optics_asm' || stageKey === 'focus' || stageKey === 'a_imp_asm') {
      const key = (shift === 'ALL' || !shift) ? `${dateStr}_ALL` : `${dateStr}_${shift}`;
      const rec = this.actualAttendance ? this.actualAttendance[key] : null;
      if (rec && rec[stageKey] !== undefined && rec[stageKey] !== null) {
        return rec[stageKey];
      }
      return 0;
    }

    // 4. Cho từng công đoạn con cụ thể (ASSEMBLY, ...)
    if (shift === 'ALL' || !shift) {
      const recAll = this.actualAttendance ? this.actualAttendance[`${dateStr}_ALL`] : null;
      if (recAll && recAll[stageKey] !== undefined && recAll[stageKey] > 0) {
        return recAll[stageKey];
      }
      const recDay = this.actualAttendance ? this.actualAttendance[`${dateStr}_Day`] : null;
      const recNight = this.actualAttendance ? this.actualAttendance[`${dateStr}_Night`] : null;
      const dVal = (recDay && recDay[stageKey] !== undefined) ? recDay[stageKey] : null;
      const nVal = (recNight && recNight[stageKey] !== undefined) ? recNight[stageKey] : null;
      if (dVal !== null || nVal !== null) {
        return Math.round(((dVal || 0) + (nVal || 0)) * 10) / 10;
      }
      return this.getManpowerForDate(dateStr, 'ALL', stage);
    }

    const key = `${dateStr}_${shift}`;
    const rec = this.actualAttendance ? this.actualAttendance[key] : null;
    if (rec && rec[stageKey] !== undefined && rec[stageKey] !== null) {
      return rec[stageKey];
    }
    return this.getManpowerForDate(dateStr, shift, stage);
  }

  getActualSupplement(dateStr, shift, stage) {
    if (!this.actualSupplement) return null;
    const stageKey = this._normalizeStageKey(stage);

    // 1. HARDTEST_TOTAL: Quản lý trực tiếp tại Tổng Hard Test (Không có nhân lực cho Focus, OPTICS...)
    if (stageKey === 'hardtest_total') {
      const key = (shift === 'ALL' || !shift) ? `${dateStr}_ALL` : `${dateStr}_${shift}`;
      const rec = this.actualSupplement[key];
      if (rec && rec.hardtest_total !== undefined && rec.hardtest_total !== null) {
        return rec.hardtest_total;
      }
      if (rec && rec.hardtest !== undefined && rec.hardtest !== null) {
        return rec.hardtest;
      }
      return null;
    }

    // 2. MAJOR_COMPOSITE: Auto-sum HARDTEST_TOTAL + ASSEMBLY
    if (stageKey === 'major_composite') {
      const htTot = this.getActualSupplement(dateStr, shift, 'HARDTEST_TOTAL');
      const assy = this.getActualSupplement(dateStr, shift, 'ASSEMBLY');
      if (htTot !== null || assy !== null) {
        return Math.round(((htTot || 0) + (assy || 0)) * 10) / 10;
      }
      return null;
    }

    // 3. Không có nhân lực cho Focus, OPTICS...
    if (stageKey === 'optics_asm' || stageKey === 'focus' || stageKey === 'a_imp_asm') {
      return 0;
    }

    // 3. For specific sub-stages
    if (shift === 'ALL' || !shift) {
      const recAll = this.actualSupplement[`${dateStr}_ALL`];
      if (recAll && recAll[stageKey] !== undefined && recAll[stageKey] !== null) {
        return recAll[stageKey];
      }
      const recDay = this.actualSupplement[`${dateStr}_Day`];
      const recNight = this.actualSupplement[`${dateStr}_Night`];
      const dVal = (recDay && recDay[stageKey] !== undefined && recDay[stageKey] !== null) ? recDay[stageKey] : null;
      const nVal = (recNight && recNight[stageKey] !== undefined && recNight[stageKey] !== null) ? recNight[stageKey] : null;
      if (dVal !== null || nVal !== null) {
        return Math.round(((dVal || 0) + (nVal || 0)) * 10) / 10;
      }
      return null;
    }

    const key = `${dateStr}_${shift}`;
    const rec = this.actualSupplement[key];
    if (rec && rec[stageKey] !== undefined && rec[stageKey] !== null) {
      return rec[stageKey];
    }
    return null;
  }

  _formatNow() {
    const d = new Date();
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  }

  saveActualAttendance(dateStr, shift, stage, value, note = '') {
    if (!this.actualAttendance) this.actualAttendance = {};
    const stageKey = this._normalizeStageKey(stage);
    const num = Math.round((parseFloat(value) || 0) * 10) / 10;
    const oldVal = this.getActualAttendance(dateStr, shift, stage);

    if (shift === 'ALL') {
      if (!this.actualAttendance[`${dateStr}_ALL`]) this.actualAttendance[`${dateStr}_ALL`] = {};
      this.actualAttendance[`${dateStr}_ALL`][stageKey] = num;

      // Keep Day (60%) and Night (40%) synchronized in background
      const dayVal = Math.round(num * 0.6 * 10) / 10;
      const nightVal = Math.round((num - dayVal) * 10) / 10;
      if (!this.actualAttendance[`${dateStr}_Day`]) this.actualAttendance[`${dateStr}_Day`] = {};
      if (!this.actualAttendance[`${dateStr}_Night`]) this.actualAttendance[`${dateStr}_Night`] = {};
      this.actualAttendance[`${dateStr}_Day`][stageKey] = dayVal;
      this.actualAttendance[`${dateStr}_Night`][stageKey] = nightVal;
    } else {
      const key = `${dateStr}_${shift}`;
      if (!this.actualAttendance[key]) this.actualAttendance[key] = {};
      this.actualAttendance[key][stageKey] = num;

      // Update ALL total
      const oppShift = (shift === 'Day' || shift === 'DAY') ? 'Night' : 'Day';
      const oppKey = `${dateStr}_${oppShift}`;
      const oppVal = (this.actualAttendance[oppKey] && this.actualAttendance[oppKey][stageKey] !== undefined) ? this.actualAttendance[oppKey][stageKey] : 0;
      if (!this.actualAttendance[`${dateStr}_ALL`]) this.actualAttendance[`${dateStr}_ALL`] = {};
      this.actualAttendance[`${dateStr}_ALL`][stageKey] = Math.round((num + oppVal) * 10) / 10;
    }

    try {
      localStorage.setItem('AJAX_PROPLAN_ACTUAL_ATTENDANCE', JSON.stringify(this.actualAttendance));
    } catch(e) {}

    // Calculate plan and OT metrics for this audit log entry using factory shift standard hours
    const shiftNorm = String(shift || 'ALL').toUpperCase();
    const shiftHour = 12.0; // Quy chuẩn: 1 người bổ sung/thiếu hụt = 12h OT

    let planVal = 0;
    if (stageKey === 'hardtest_total' || stage === 'HARD TEST' || stage === 'SUM HARDTEST' || stage === 'HARDTEST') {
      planVal = this.getHardtestTotalPlanForDate(dateStr, shiftNorm);
    } else {
      const rawMp = (this.dataMass && this.dataMass.manpower) ? this.dataMass.manpower : [];
      const mpItem = rawMp.find(m => m.stage === stage && m.metric === 'People');
      if (mpItem && mpItem.daily) {
        if (shiftNorm.includes('DAY')) {
          planVal = mpItem.daily[`${dateStr}_Day`] !== undefined ? mpItem.daily[`${dateStr}_Day`] : Math.round((mpItem.daily[dateStr] || 0) * 0.6 * 10) / 10;
        } else if (shiftNorm.includes('NIGHT')) {
          const dVal = mpItem.daily[`${dateStr}_Day`] !== undefined ? mpItem.daily[`${dateStr}_Day`] : Math.round((mpItem.daily[dateStr] || 0) * 0.6 * 10) / 10;
          planVal = mpItem.daily[`${dateStr}_Night`] !== undefined ? mpItem.daily[`${dateStr}_Night`] : Math.round(((mpItem.daily[dateStr] || 0) - dVal) * 10) / 10;
        } else {
          planVal = mpItem.daily[dateStr] || 0;
        }
      }
    }

    const balance = Math.round((num - planVal) * 10) / 10;
    const shortage = balance < 0 ? Math.abs(balance) : 0;
    const otHours = Math.round(shortage * shiftHour * 10) / 10;

    // Record entry into attendance history log
    if (!this.attendanceLog) this.attendanceLog = [];
    const logEntry = {
      id: 'att_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      timestamp: this._formatNow(),
      date: dateStr,
      shift: shift,
      stage: stage,
      stageKey: stageKey,
      oldValue: oldVal,
      newValue: num,
      planValue: planVal,
      balance: balance,
      shortage: shortage,
      shiftHour: shiftHour,
      otHours: otHours,
      note: note || (shortage > 0 
        ? `Thiếu ${shortage.toFixed(1)} người -> Cần ${otHours.toFixed(1)}h OT (12h OT/người)` 
        : `Cân đối đủ nhân lực (${balance > 0 ? '+' : ''}${balance.toFixed(1)} ng)`)
    };

    this.attendanceLog.unshift(logEntry);
    if (this.attendanceLog.length > 500) this.attendanceLog = this.attendanceLog.slice(0, 500);

    try {
      localStorage.setItem('AJAX_PROPLAN_ATTENDANCE_LOG', JSON.stringify(this.attendanceLog));
    } catch(e) {}

    this.notify();
    return logEntry;
  }

  saveActualSupplement(dateStr, shift, stage, value, note = '') {
    if (!this.actualSupplement) this.actualSupplement = {};
    const stageKey = this._normalizeStageKey(stage);
    const num = (value === '' || value === null || value === undefined) ? null : Math.round((parseFloat(value) || 0) * 10) / 10;

    if (shift === 'ALL') {
      if (!this.actualSupplement[`${dateStr}_ALL`]) this.actualSupplement[`${dateStr}_ALL`] = {};
      this.actualSupplement[`${dateStr}_ALL`][stageKey] = num;

      if (num !== null) {
        const dayVal = Math.round(num * 0.6 * 10) / 10;
        const nightVal = Math.round((num - dayVal) * 10) / 10;
        if (!this.actualSupplement[`${dateStr}_Day`]) this.actualSupplement[`${dateStr}_Day`] = {};
        if (!this.actualSupplement[`${dateStr}_Night`]) this.actualSupplement[`${dateStr}_Night`] = {};
        this.actualSupplement[`${dateStr}_Day`][stageKey] = dayVal;
        this.actualSupplement[`${dateStr}_Night`][stageKey] = nightVal;
      }
    } else {
      const key = `${dateStr}_${shift}`;
      if (!this.actualSupplement[key]) this.actualSupplement[key] = {};
      this.actualSupplement[key][stageKey] = num;

      const oppShift = (shift === 'Day' || shift === 'DAY') ? 'Night' : 'Day';
      const oppKey = `${dateStr}_${oppShift}`;
      const oppVal = (this.actualSupplement[oppKey] && this.actualSupplement[oppKey][stageKey] !== undefined && this.actualSupplement[oppKey][stageKey] !== null)
        ? this.actualSupplement[oppKey][stageKey] : 0;
      if (!this.actualSupplement[`${dateStr}_ALL`]) this.actualSupplement[`${dateStr}_ALL`] = {};
      this.actualSupplement[`${dateStr}_ALL`][stageKey] = num !== null ? Math.round(((num || 0) + oppVal) * 10) / 10 : null;
    }

    try {
      localStorage.setItem('AJAX_PROPLAN_ACTUAL_SUPPLEMENT', JSON.stringify(this.actualSupplement));
    } catch(e) {}

    const shiftNorm = String(shift || 'ALL').toUpperCase();
    const shiftHour = 12.0; // Quy chuẩn: 1 người bổ sung = 12h OT
    const otHours = num !== null ? Math.round(num * shiftHour * 10) / 10 : 0;

    // Log to audit log
    if (!this.attendanceLog) this.attendanceLog = [];
    const logEntry = {
      id: 'supp_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      timestamp: this._formatNow(),
      date: dateStr,
      shift: shift,
      stage: stage,
      stageKey: stageKey,
      actionType: 'SUPPLEMENT',
      newValue: num,
      shiftHour: shiftHour,
      otHours: otHours,
      note: note || (num !== null ? `Thực tế bổ sung: ${num} người -> Tương ứng ${otHours}h OT (12h OT/người)` : 'Đặt lại mặc định thiếu hụt')
    };
    this.attendanceLog.unshift(logEntry);
    if (this.attendanceLog.length > 500) this.attendanceLog = this.attendanceLog.slice(0, 500);

    try {
      localStorage.setItem('AJAX_PROPLAN_ATTENDANCE_LOG', JSON.stringify(this.attendanceLog));
    } catch(e) {}

    this.notify();
    return logEntry;
  }

  getAttendanceHistory({ filterDate = 'ALL', filterStage = 'ALL', filterShift = 'ALL', search = '' } = {}) {
    if (!this.attendanceLog) this.attendanceLog = [];
    return this.attendanceLog.filter(item => {
      if (filterDate && filterDate !== 'ALL' && item.date !== filterDate) return false;
      if (filterStage && filterStage !== 'ALL') {
        const itemNorm = this._normalizeStageKey(item.stage);
        const filterNorm = this._normalizeStageKey(filterStage);
        if (itemNorm !== filterNorm) return false;
      }
      if (filterShift && filterShift !== 'ALL') {
        const itemShift = String(item.shift || '').toUpperCase();
        const filterS = String(filterShift).toUpperCase();
        if (itemShift !== filterS) return false;
      }
      if (search) {
        const q = search.toLowerCase();
        const match = (item.stage && item.stage.toLowerCase().includes(q)) ||
                      (item.date && item.date.includes(q)) ||
                      (item.shift && item.shift.toLowerCase().includes(q)) ||
                      (item.note && item.note.toLowerCase().includes(q)) ||
                      (item.timestamp && item.timestamp.includes(q));
        if (!match) return false;
      }
      return true;
    });
  }

  restoreAttendanceHistoryItem(logId) {
    if (!this.attendanceLog) return false;
    const entry = this.attendanceLog.find(e => e.id === logId);
    if (!entry) return false;
    this.saveActualAttendance(entry.date, entry.shift, entry.stage, entry.oldValue, `Khôi phục về giá trị cũ (${entry.oldValue} ng) từ bản ghi ${entry.timestamp}`);
    return true;
  }

  clearAttendanceHistory() {
    this.attendanceLog = [];
    try {
      localStorage.setItem('AJAX_PROPLAN_ATTENDANCE_LOG', JSON.stringify([]));
    } catch(e) {}
    this.notify();
  }

  getSfpdReportData({ fromDate, toDate, selectedDates = null }) {
    let dates = [];
    if (fromDate && toDate) {
      dates = this.getDatesInRange(fromDate, toDate);
    } else {
      dates = this.getDatesInRange('10/22/2026', '10/23/2026');
    }
    if (dates.length === 0) dates = ['10/22/2026'];

    const rawManpower = (this.dataMass && this.dataMass.manpower) ? this.dataMass.manpower : [];
    const rawItems = (this.dataMass && this.dataMass.items) ? this.dataMass.items : [];

    const getMpVal = (st, d, shift) => {
      const item = rawManpower.find(m => m.stage === st && m.metric === 'People');
      if (!item || !item.daily) return 0;
      const key = `${d}_${shift}`;
      if (item.daily[key] !== undefined) return item.daily[key];
      const oppShift = (shift === 'Day') ? 'Night' : 'Day';
      if (item.daily[`${d}_${oppShift}`] !== undefined) return 0;
      const tot = item.daily[d] || 0;
      return shift === 'Day' ? Math.round(tot * 0.6 * 10) / 10 : Math.round(tot * 0.4 * 10) / 10;
    };

    const manpowerDaily = {};
    dates.forEach(d => {
      const sumHtDay = getMpVal('SUM HARDTEST', d, 'Day');
      const sumHtNight = getMpVal('SUM HARDTEST', d, 'Night');

      const optDay = getMpVal('OPTICS ASM', d, 'Day');
      const optNight = getMpVal('OPTICS ASM', d, 'Night');

      const aimDay = getMpVal('A IMP ASM', d, 'Day');
      const aimNight = getMpVal('A IMP ASM', d, 'Night');

      const focDay = getMpVal('FOCUS', d, 'Day');
      const focNight = getMpVal('FOCUS', d, 'Night');

      // Row 16: Plan HT Total = SUM HARDTEST + OPTICS ASM + A IMP ASM (Đã bỏ FOCUS theo yêu cầu)
      const planHtDay = Math.round((sumHtDay + optDay + aimDay) * 10) / 10;
      const planHtNight = Math.round((sumHtNight + optNight + aimNight) * 10) / 10;

      // Row 21: Actual Total Hard Test
      const actHtDay = this.getActualAttendance(d, 'Day', 'HARDTEST');
      const actHtNight = this.getActualAttendance(d, 'Night', 'HARDTEST');

      // Row 22: Balance HT = Actual - Plan
      const balHtDay = actHtDay > 0 ? Math.round((actHtDay - planHtDay) * 10) / 10 : Math.round((-planHtDay) * 10) / 10;
      const balHtNight = actHtNight > 0 ? Math.round((actHtNight - planHtNight) * 10) / 10 : Math.round((-planHtNight) * 10) / 10;

      // Assembly
      const assyDay = getMpVal('ASSEMBLY', d, 'Day');
      const assyNight = getMpVal('ASSEMBLY', d, 'Night');

      const actAssyDay = this.getActualAttendance(d, 'Day', 'ASSEMBLY');
      const actAssyNight = this.getActualAttendance(d, 'Night', 'ASSEMBLY');

      const balAssyDay = actAssyDay > 0 ? Math.round((actAssyDay - assyDay) * 10) / 10 : Math.round((-assyDay) * 10) / 10;
      const balAssyNight = actAssyNight > 0 ? Math.round((actAssyNight - assyNight) * 10) / 10 : Math.round((-assyNight) * 10) / 10;

      manpowerDaily[d] = {
        sumHt: { day: sumHtDay, night: sumHtNight },
        optics: { day: optDay, night: optNight },
        aimp: { day: aimDay, night: aimNight },
        focus: { day: focDay, night: focNight },
        planHt: { day: planHtDay, night: planHtNight },
        actHt: { day: actHtDay, night: actHtNight },
        balHt: { day: balHtDay, night: balHtNight },
        actAssy: { day: actAssyDay, night: actAssyNight },
        planAssy: { day: assyDay, night: assyNight },
        balAssy: { day: balAssyDay, night: balAssyNight }
      };
    });

    const stages = ['HARD TEST', 'OPTICS ASM', 'FOCUS', 'ASSEMBLY'];
    const outputDaily = {};

    stages.forEach(st => {
      outputDaily[st] = {};
      const stItems = rawItems.filter(it => it.stage === st);

      dates.forEach(d => {
        let pDay = 0, pNight = 0, fDay = 0, fNight = 0;
        stItems.forEach(it => {
          const pTot = it.plan ? (it.plan[d] || 0) : 0;
          const fTot = it.fact ? (it.fact[d] || 0) : 0;
          const hasPlanSplit = (it.planDay && it.planDay[d] !== undefined) || (it.planNight && it.planNight[d] !== undefined);
          const effPd = hasPlanSplit ? (it.planDay ? (it.planDay[d] || 0) : 0) : Math.round(pTot * 0.6);
          const effPn = hasPlanSplit ? (it.planNight ? (it.planNight[d] || 0) : 0) : (pTot - effPd);

          const hasFactSplit = (it.factDay && it.factDay[d] !== undefined) || (it.factNight && it.factNight[d] !== undefined);
          const effFd = hasFactSplit ? (it.factDay ? (it.factDay[d] || 0) : 0) : Math.round(fTot * 0.6);
          const effFn = hasFactSplit ? (it.factNight ? (it.factNight[d] || 0) : 0) : (fTot - effFd);

          pDay += effPd;
          pNight += effPn;
          fDay += effFd;
          fNight += effFn;
        });

        // If stItems had no data for this date but sfpdProduction has official record, fallback to it
        if (pDay === 0 && pNight === 0 && fDay === 0 && fNight === 0 && this.sfpdProduction && this.sfpdProduction[d] && this.sfpdProduction[d][st]) {
          const rec = this.sfpdProduction[d][st];
          pDay = rec.planDay;
          pNight = rec.planNight;
          fDay = rec.factDay;
          fNight = rec.factNight;
        }

        outputDaily[st][d] = {
          planDay: pDay,
          planNight: pNight,
          factDay: fDay,
          factNight: fNight,
          gapDay: fDay - pDay,
          gapNight: fNight - pNight
        };
      });
    });

    return {
      dates,
      manpowerDaily,
      outputDaily
    };
  }

  getOfficialModels1022({ stage = 'ALL', filterStatus = 'ALL', searchQuery = '', sortBy = 'GAP', sortDir = 'ASC' } = {}) {
    let list = [...(this.officialModels1022 || [])];

    if (stage === 'HARD TEST' || stage === 'HARDTEST' || stage === 'HARDTEST_TOTAL' || stage === 'SUM HARDTEST') {
      list = list.filter(m => m.process === 'HARD TEST');
    } else if (stage === 'ASSEMBLY') {
      list = list.filter(m => m.process === 'ASSEMBLY');
    }

    if (searchQuery && searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(m => m.model.toLowerCase().includes(q) || m.process.toLowerCase().includes(q));
    }

    if (filterStatus === 'OVER') {
      list = list.filter(m => m.gapQty > 0);
    } else if (filterStatus === 'MET') {
      list = list.filter(m => m.gapQty === 0 && m.planQty > 0);
    } else if (filterStatus === 'UNDER') {
      list = list.filter(m => m.gapQty < 0 && m.factQty > 0);
    } else if (filterStatus === 'ZERO') {
      list = list.filter(m => m.factQty === 0);
    }

    list.sort((a, b) => {
      let diff = 0;
      if (sortBy === 'GAP') diff = a.gapQty - b.gapQty;
      else if (sortBy === 'PLAN') diff = b.planQty - a.planQty;
      else if (sortBy === 'FACT') diff = b.factQty - a.factQty;
      else if (sortBy === 'RATE') diff = b.completionRate - a.completionRate;
      else if (sortBy === 'MODEL') diff = a.model.localeCompare(b.model);
      else if (sortBy === 'TIME_PLAN') diff = b.planTime - a.planTime;
      else if (sortBy === 'TIME_FACT') diff = b.factTime - a.factTime;
      return sortDir === 'DESC' ? -diff : diff;
    });

    const totalPlanQty = list.reduce((acc, m) => acc + m.planQty, 0);
    const totalFactQty = list.reduce((acc, m) => acc + m.factQty, 0);
    const totalGapQty = list.reduce((acc, m) => acc + m.gapQty, 0);
    const totalPlanTime = Math.round(list.reduce((acc, m) => acc + m.planTime, 0) * 100) / 100;
    const totalFactTime = Math.round(list.reduce((acc, m) => acc + m.factTime, 0) * 100) / 100;
    const avgRate = totalPlanQty > 0 ? Math.round((totalFactQty / totalPlanQty) * 1000) / 10 : (totalFactQty > 0 ? 100 : 0);

    const overCount = list.filter(m => m.gapQty > 0).length;
    const metCount = list.filter(m => m.gapQty === 0 && m.planQty > 0).length;
    const underCount = list.filter(m => m.gapQty < 0 && m.factQty > 0).length;
    const zeroCount = list.filter(m => m.factQty === 0).length;

    return {
      items: list,
      kpis: {
        totalModels: list.length,
        totalPlanQty,
        totalFactQty,
        totalGapQty,
        totalPlanTime,
        totalFactTime,
        avgRate,
        overCount,
        metCount,
        underCount,
        zeroCount
      }
    };
  }


  resolveActiveStageSet(stageFilter) {
    const set = new Set();
    if (!stageFilter || stageFilter === 'ALL') {
      set.add('ALL');
      return set;
    }

    const HARDTEST_SUB = ['HARD TEST', 'OPTICS ASM', 'A IMP ASM', 'FOCUS', 'SUM HARDTEST'];
    const SFPD_SUB = ['ASSEMBLY', 'HARD TEST', 'OPTICS ASM', 'A IMP ASM', 'FOCUS', 'SUM HARDTEST'];
    const FPD_SUB = ['LONG TEST', 'TEST ROOM', 'QC', 'PKG'];
    const MB_SUB = ['COM PKG', 'COM PKG AUTO', 'MB'];

    let list = [];
    if (Array.isArray(stageFilter)) {
      list = stageFilter;
    } else if (typeof stageFilter === 'string' && stageFilter.includes(',')) {
      list = stageFilter.split(',').map(s => s.trim()).filter(Boolean);
    } else {
      list = [stageFilter];
    }

    list.forEach(st => {
      if (st === 'ALL') {
        set.add('ALL');
      } else if (st === 'HARDTEST_TOTAL' || st === 'SUM HARDTEST' || st === 'TOTAL_HARDTEST') {
        HARDTEST_SUB.forEach(s => set.add(s));
      } else if (st === 'HARDTEST_AND_ASSEMBLY') {
        SFPD_SUB.forEach(s => set.add(s));
      } else if (st === 'FPD_TOTAL' || st === 'SUM_FPD') {
        FPD_SUB.forEach(s => set.add(s));
      } else if (st === 'MASTERBOX_TOTAL' || st === 'SUM_MB') {
        MB_SUB.forEach(s => set.add(s));
      } else {
        set.add(st);
      }
    });

    return set;
  }

  getDistinctModels(stage = 'ALL') {
    const activeSet = this.resolveActiveStageSet(stage);
    const set = new Set();
    if (this.dataMass && this.dataMass.items) {
      this.dataMass.items.forEach(it => {
        if (activeSet.has('ALL') || activeSet.has(it.stage)) {
          if (it.model) set.add(it.model);
        }
      });
    }
    return Array.from(set).sort();
  }

  getTableStages(mainStage = 'HARDTEST_TOTAL') {
    if (!mainStage || mainStage === 'ALL') {
      return this.getDataMassStages().filter(st => st !== 'ALL' && st !== 'SUM HARDTEST' && st !== 'HARDTEST_TOTAL' && st !== 'HARDTEST_AND_ASSEMBLY' && st !== 'FPD_TOTAL' && st !== 'MASTERBOX_TOTAL');
    }
    if (mainStage === 'HARDTEST_TOTAL' || mainStage === 'SUM HARDTEST' || mainStage === 'TOTAL_HARDTEST') {
      return ['HARD TEST', 'OPTICS ASM', 'A IMP ASM', 'FOCUS'];
    }
    if (mainStage === 'ASSEMBLY') {
      return ['ASSEMBLY'];
    }
    if (mainStage === 'HARDTEST_AND_ASSEMBLY') {
      return ['HARD TEST', 'ASSEMBLY', 'OPTICS ASM', 'A IMP ASM', 'FOCUS'];
    }
    if (mainStage === 'FPD_TOTAL' || mainStage === 'SUM_FPD') {
      return ['LONG TEST', 'TEST ROOM', 'QC', 'PKG'];
    }
    if (mainStage === 'MASTERBOX_TOTAL' || mainStage === 'SUM_MB') {
      return ['COM PKG', 'COM PKG AUTO', 'MB'];
    }
    if (Array.isArray(mainStage)) {
      const res = [];
      mainStage.forEach(st => {
        this.getTableStages(st).forEach(s => { if (!res.includes(s)) res.push(s); });
      });
      return res;
    }
    if (typeof mainStage === 'string' && mainStage.includes(',')) {
      return this.getTableStages(mainStage.split(',').map(s => s.trim()).filter(Boolean));
    }
    return [mainStage];
  }

  getDistinctProducts1C(stage = 'ALL', model = 'ALL') {
    const activeSet = this.resolveActiveStageSet(stage);
    const set = new Set();
    if (this.dataMass && this.dataMass.items) {
      this.dataMass.items.forEach(it => {
        if (!activeSet.has('ALL') && !activeSet.has(it.stage)) return;
        if (model && model !== 'ALL' && it.model !== model) return;

        const p1c = it.productName1C || it.productName;
        if (p1c) set.add(p1c);
      });
    }
    return Array.from(set).sort();
  }

  getStageDailySummaries({ fromDate, toDate, shiftFilter = 'ALL', stageFilter = 'ALL', selectedDates = null }) {
    let dates = [];
    if (fromDate && toDate) {
      dates = this.getDatesInRange(fromDate, toDate);
    } else {
      dates = this.getDatesInRange('10/9/2025', '10/15/2025');
    }
    if (dates.length === 0) dates = this.getAllDates().slice(0, 7);

    let selectedDateSet;
    if (selectedDates && Array.isArray(selectedDates)) {
      const validInCurrentRange = selectedDates.filter(d => dates.includes(d));
      selectedDateSet = validInCurrentRange.length > 0 ? new Set(validInCurrentRange) : new Set(dates);
    } else {
      selectedDateSet = new Set(dates);
    }
    const rawItems = (this.dataMass && this.dataMass.items) ? this.dataMass.items : [];
    const rawManpower = (this.dataMass && this.dataMass.manpower) ? this.dataMass.manpower : [];

    const allStages = this.getDataMassStages();
    const activeSet = this.resolveActiveStageSet(stageFilter);
    const isHardtestGroup = stageFilter === 'HARDTEST_TOTAL' || stageFilter === 'SUM HARDTEST';
    const isBoth = stageFilter === 'HARDTEST_AND_ASSEMBLY';
    const isFpdGroup = stageFilter === 'FPD_TOTAL' || stageFilter === 'SUM_FPD';
    const isMasterboxGroup = stageFilter === 'MASTERBOX_TOTAL' || stageFilter === 'SUM_MB';

    let activeStages = [];
    if (activeSet.has('ALL')) {
      activeStages = allStages.filter(st => st !== 'ALL');
    } else {
      const STAGE_ORDER = [
        'ASSEMBLY', 'HARD TEST', 'OPTICS ASM', 'A IMP ASM', 'FOCUS',
        'LONG TEST', 'TEST ROOM', 'QC', 'PKG', 'COM PKG', 'COM PKG AUTO', 'MB'
      ];
      STAGE_ORDER.forEach(st => {
        if (activeSet.has(st) && (allStages.includes(st) || rawManpower.some(m => m.stage === st) || rawItems.some(i => i.stage === st))) {
          activeStages.push(st);
        }
      });
      activeSet.forEach(st => {
        if (!STAGE_ORDER.includes(st) && st !== 'SUM HARDTEST') {
          if (allStages.includes(st) || rawManpower.some(m => m.stage === st) || rawItems.some(i => i.stage === st)) {
            activeStages.push(st);
          }
        }
      });
    }

    const summaries = [];

    activeStages.forEach(stage => {
      const mpPeople = rawManpower.find(m => (m.stage === stage || (stage === 'HARD TEST' && m.stage === 'SUM HARDTEST')) && m.metric === 'People');
      const mpHours = rawManpower.find(m => (m.stage === stage || (stage === 'HARD TEST' && m.stage === 'SUM HARDTEST')) && m.metric === 'Hours');
      const stageItems = rawItems.filter(it => {
        if (stage === 'HARD TEST' || stage === 'SUM HARDTEST') return it.stage === 'HARD TEST' || it.stage === 'SUM HARDTEST';
        return it.stage === stage;
      });

      const dailyData = [];
      let cumPlan = 0;
      let cumFact = 0;
      let cumStdHours = 0;
      let cumPeople = 0;
      let selectedDaysCount = 0;

      dates.forEach(d => {
        const isSelected = selectedDateSet.has(d);
        let dayPlan = 0, dayFact = 0, dayStdHours = 0;
        let dayPlanDay = 0, dayPlanNight = 0;
        let dayFactDay = 0, dayFactNight = 0;
        let dayStdHoursDay = 0, dayStdHoursNight = 0;

        stageItems.forEach(it => {
          const norm = typeof it.norm === 'number' ? it.norm : (parseFloat(it.norm) || 0);

          const planDay = it.planDay ? (it.planDay[d] || 0) : 0;
          const planNight = it.planNight ? (it.planNight[d] || 0) : 0;
          const factDay = it.factDay ? (it.factDay[d] || 0) : 0;
          const factNight = it.factNight ? (it.factNight[d] || 0) : 0;

          const pTot = it.plan ? (it.plan[d] || 0) : 0;
          const fTot = it.fact ? (it.fact[d] || 0) : 0;

          const hasPlanSplit = (it.planDay && it.planDay[d] !== undefined) || (it.planNight && it.planNight[d] !== undefined);
          const effPlanDay = hasPlanSplit ? planDay : Math.round(pTot * 0.6);
          const effPlanNight = hasPlanSplit ? planNight : (pTot - effPlanDay);

          const hasFactSplit = (it.factDay && it.factDay[d] !== undefined) || (it.factNight && it.factNight[d] !== undefined);
          const effFactDay = hasFactSplit ? factDay : Math.round(fTot * 0.6);
          const effFactNight = hasFactSplit ? factNight : (fTot - effFactDay);

          dayPlanDay += effPlanDay;
          dayPlanNight += effPlanNight;
          dayFactDay += effFactDay;
          dayFactNight += effFactNight;

          if (norm > 0) {
            dayStdHoursDay += (effFactDay * norm / 3600);
            dayStdHoursNight += (effFactNight * norm / 3600);
          }

          let p = 0, f = 0;
          if (shiftFilter === 'DAY') {
            p = effPlanDay;
            f = effFactDay;
          } else if (shiftFilter === 'NIGHT') {
            p = effPlanNight;
            f = effFactNight;
          } else {
            p = (pTot > 0) ? pTot : (effPlanDay + effPlanNight);
            f = (fTot > 0) ? fTot : (effFactDay + effFactNight);
          }

          dayPlan += p;
          dayFact += f;
          if (norm > 0) {
            dayStdHours += (f * norm / 3600);
          }
        });

        // Determine manpower (People)
        let peopleVal = 0, peopleDay = 0, peopleNight = 0;
        if (mpPeople && mpPeople.daily) {
          peopleDay = mpPeople.daily[`${d}_Day`] || Math.round((mpPeople.daily[d] || 0) * 0.6 * 10) / 10;
          peopleNight = mpPeople.daily[`${d}_Night`] || Math.round((mpPeople.daily[d] || 0) * 0.4 * 10) / 10;
          if (shiftFilter === 'DAY') {
            peopleVal = peopleDay;
          } else if (shiftFilter === 'NIGHT') {
            peopleVal = peopleNight;
          } else {
            peopleVal = mpPeople.daily[d] || (peopleDay + peopleNight);
          }
        }
        if (peopleVal === 0 && dayStdHours > 0) {
          peopleVal = Math.round((dayStdHours / 8.0) * 10) / 10;
        }

        const dayGap = dayFact - dayPlan;
        dayStdHours = Math.round(dayStdHours * 10) / 10;

        if (isSelected) {
          cumPlan += dayPlan;
          cumFact += dayFact;
          cumStdHours += dayStdHours;
          cumPeople += peopleVal;
          selectedDaysCount++;
        }

        dailyData.push({
          date: d,
          plan: dayPlan,
          fact: dayFact,
          gap: dayGap,
          planDay: dayPlanDay,
          planNight: dayPlanNight,
          factDay: dayFactDay,
          factNight: dayFactNight,
          gapDay: dayFactDay - dayPlanDay,
          gapNight: dayFactNight - dayPlanNight,
          stdHours: dayStdHours,
          stdHoursDay: Math.round(dayStdHoursDay * 10) / 10,
          stdHoursNight: Math.round(dayStdHoursNight * 10) / 10,
          people: peopleVal,
          peopleDay,
          peopleNight,
          isSelected
        });
      });

      const avgPeople = selectedDaysCount > 0 ? Math.round((cumPeople / selectedDaysCount) * 10) / 10 : 0;
      const avgPlan = selectedDaysCount > 0 ? Math.round(cumPlan / selectedDaysCount) : 0;
      const avgFact = selectedDaysCount > 0 ? Math.round(cumFact / selectedDaysCount) : 0;
      const rate = cumPlan > 0 ? Math.round((cumFact / cumPlan) * 100) : (cumFact > 0 ? 100 : 0);

      summaries.push({
        stage,
        daily: dailyData,
        cumPlan,
        cumFact,
        cumGap: cumFact - cumPlan,
        cumStdHours: Math.round(cumStdHours * 10) / 10,
        avgPeople,
        avgPlan,
        avgFact,
        rate
      });
    });

    let totalSummary = null, hardtestGroupSummary = null;
    if (isBoth && summaries.length > 0) {
      const mpSumHardtest = rawManpower.find(m => m.stage === 'SUM HARDTEST' && m.metric === 'People');

      const dailyTotals = dates.map(d => {
        const isSelected = selectedDateSet.has(d);
        let plan = 0, fact = 0, stdHours = 0, totalPeople = 0;
        let planDay = 0, planNight = 0, factDay = 0, factNight = 0;
        let stdHoursDay = 0, stdHoursNight = 0;
        let sumSubHtPeopleDay = 0, sumSubHtPeopleNight = 0;
        let totalPeopleDay = 0, totalPeopleNight = 0;

        summaries.forEach(s => {
          const day = s.daily.find(x => x.date === d);
          if (day) {
            plan += day.plan;
            fact += day.fact;
            stdHours += day.stdHours;
            planDay += (day.planDay || 0);
            planNight += (day.planNight || 0);
            factDay += (day.factDay || 0);
            factNight += (day.factNight || 0);
            stdHoursDay += (day.stdHoursDay || 0);
            stdHoursNight += (day.stdHoursNight || 0);

            if (s.stage === 'ASSEMBLY') {
              totalPeopleDay += (day.peopleDay || 0);
              totalPeopleNight += (day.peopleNight || 0);
            } else {
              sumSubHtPeopleDay += (day.peopleDay || 0);
              sumSubHtPeopleNight += (day.peopleNight || 0);
            }
          }
        });

        // Định mức nhân lực cần (Plan People) Cụm Hardtest trong Tổng Hợp 2 Cụm: SUM HARDTEST + OPTICS ASM + A IMP ASM (Đã bỏ FOCUS)
        const groupHtPeopleDay = this.getHardtestTotalPlanForDate(d, 'Day');
        const groupHtPeopleNight = this.getHardtestTotalPlanForDate(d, 'Night');

        totalPeopleDay += groupHtPeopleDay;
        totalPeopleNight += groupHtPeopleNight;

        if (shiftFilter === 'DAY') {
          totalPeople = totalPeopleDay;
        } else if (shiftFilter === 'NIGHT') {
          totalPeople = totalPeopleNight;
        } else {
          totalPeople = totalPeopleDay + totalPeopleNight;
        }

        const actDay = this.getActualAttendance ? this.getActualAttendance(d, 'Day', 'major_composite') : 0;
        const actNight = this.getActualAttendance ? this.getActualAttendance(d, 'Night', 'major_composite') : 0;

        return {
          date: d,
          plan,
          fact,
          gap: fact - plan,
          planDay,
          planNight,
          factDay,
          factNight,
          gapDay: factDay - planDay,
          gapNight: factNight - planNight,
          stdHours: Math.round(stdHours * 10) / 10,
          stdHoursDay: Math.round(stdHoursDay * 10) / 10,
          stdHoursNight: Math.round(stdHoursNight * 10) / 10,
          people: Math.round(totalPeople * 10) / 10,
          peopleDay: Math.round(totalPeopleDay * 10) / 10,
          peopleNight: Math.round(totalPeopleNight * 10) / 10,
          actualDay: actDay,
          actualNight: actNight,
          isSelected
        };
      });

      let cumPlan = 0, cumFact = 0, cumStdHours = 0, cumPeople = 0, selCount = 0;
      dailyTotals.forEach(d => {
        if (d.isSelected) {
          cumPlan += d.plan;
          cumFact += d.fact;
          cumStdHours += d.stdHours;
          cumPeople += d.people;
          selCount++;
        }
      });
      const avgPeople = selCount > 0 ? Math.round((cumPeople / selCount) * 10) / 10 : 0;
      const avgPlan = selCount > 0 ? Math.round(cumPlan / selCount) : 0;
      const avgFact = selCount > 0 ? Math.round(cumFact / selCount) : 0;
      const rate = cumPlan > 0 ? Math.round((cumFact / cumPlan) * 100) : (cumFact > 0 ? 100 : 0);

      totalSummary = {
        stage: 'Tổng SFPD',
        isGrandTotal: true,
        isMajorComposite: true,
        saveStage: null,
        daily: dailyTotals,
        cumPlan,
        cumFact,
        cumGap: cumFact - cumPlan,
        cumStdHours: Math.round(cumStdHours * 10) / 10,
        avgPeople,
        avgPlan,
        avgFact,
        rate
      };

      // Cụm Tổng Hard Test riêng lẻ để hiển thị trong khối nhân lực
      const htSubStages = ['HARD TEST', 'OPTICS ASM', 'A IMP ASM', 'FOCUS'];
      const htDailyTotals = dates.map(d => {
        const isSelected = selectedDateSet.has(d);
        let plan = 0, fact = 0, stdHours = 0;
        let planDay = 0, planNight = 0, factDay = 0, factNight = 0;
        let stdHoursDay = 0, stdHoursNight = 0;
        let sumSubPeopleDay = 0, sumSubPeopleNight = 0;

        summaries.forEach(s => {
          if (htSubStages.includes(s.stage)) {
            const day = s.daily.find(x => x.date === d);
            if (day) {
              plan += day.plan;
              fact += day.fact;
              stdHours += day.stdHours;
              planDay += (day.planDay || 0);
              planNight += (day.planNight || 0);
              factDay += (day.factDay || 0);
              factNight += (day.factNight || 0);
              stdHoursDay += (day.stdHoursDay || 0);
              stdHoursNight += (day.stdHoursNight || 0);
              sumSubPeopleDay += (day.peopleDay || 0);
              sumSubPeopleNight += (day.peopleNight || 0);
            }
          }
        });

        // Định mức nhân lực cần (Plan People) Tổng Hard Test: SUM HARDTEST + OPTICS ASM + A IMP ASM (Đã bỏ FOCUS)
        const groupPeopleDay = this.getHardtestTotalPlanForDate(d, 'Day');
        const groupPeopleNight = this.getHardtestTotalPlanForDate(d, 'Night');
        const totalPeople = (shiftFilter === 'DAY') ? groupPeopleDay : (shiftFilter === 'NIGHT' ? groupPeopleNight : Math.round((groupPeopleDay + groupPeopleNight) * 10) / 10);

        const actHtDay = this.getActualAttendance ? this.getActualAttendance(d, 'Day', 'HARDTEST_TOTAL') : 0;
        const actHtNight = this.getActualAttendance ? this.getActualAttendance(d, 'Night', 'HARDTEST_TOTAL') : 0;

        return {
          date: d,
          plan,
          fact,
          gap: fact - plan,
          planDay,
          planNight,
          factDay,
          factNight,
          gapDay: factDay - planDay,
          gapNight: factNight - planNight,
          stdHours: Math.round(stdHours * 10) / 10,
          stdHoursDay: Math.round(stdHoursDay * 10) / 10,
          stdHoursNight: Math.round(stdHoursNight * 10) / 10,
          people: totalPeople,
          peopleDay: groupPeopleDay,
          peopleNight: groupPeopleNight,
          actualDay: actHtDay,
          actualNight: actHtNight,
          isSelected
        };
      });

      let htCumPlan = 0, htCumFact = 0, htCumStdHours = 0, htCumPeople = 0, htSelCount = 0;
      htDailyTotals.forEach(d => {
        if (d.isSelected) {
          htCumPlan += d.plan;
          htCumFact += d.fact;
          htCumStdHours += d.stdHours;
          htCumPeople += d.people;
          htSelCount++;
        }
      });

      hardtestGroupSummary = {
        stage: 'TỔNG HARD TEST',
        isGrandTotal: false,
        isHardtestGroup: true,
        saveStage: 'HARDTEST_TOTAL',
        daily: htDailyTotals,
        cumPlan: htCumPlan,
        cumFact: htCumFact,
        cumGap: htCumFact - htCumPlan,
        cumStdHours: Math.round(htCumStdHours * 10) / 10,
        avgPeople: htSelCount > 0 ? Math.round((htCumPeople / htSelCount) * 10) / 10 : 0,
        avgPlan: htSelCount > 0 ? Math.round(htCumPlan / htSelCount) : 0,
        avgFact: htSelCount > 0 ? Math.round(htCumFact / htSelCount) : 0,
        rate: htCumPlan > 0 ? Math.round((htCumFact / htCumPlan) * 100) : 0
      };
    } else if (isHardtestGroup && summaries.length > 0) {
      const mpSumHardtest = rawManpower.find(m => m.stage === 'SUM HARDTEST' && m.metric === 'People') || rawManpower.find(m => m.stage === 'HARD TEST' && m.metric === 'People');
      const dailyTotals = dates.map(d => {
        const isSelected = selectedDateSet.has(d);
        let plan = 0, fact = 0, stdHours = 0;
        let planDay = 0, planNight = 0, factDay = 0, factNight = 0;
        let stdHoursDay = 0, stdHoursNight = 0;
        let sumSubPeopleDay = 0, sumSubPeopleNight = 0;

        summaries.forEach(s => {
          const day = s.daily.find(x => x.date === d);
          if (day) {
            plan += day.plan;
            fact += day.fact;
            stdHours += day.stdHours;
            planDay += (day.planDay || 0);
            planNight += (day.planNight || 0);
            factDay += (day.factDay || 0);
            factNight += (day.factNight || 0);
            stdHoursDay += (day.stdHoursDay || 0);
            stdHoursNight += (day.stdHoursNight || 0);
            sumSubPeopleDay += (day.peopleDay || 0);
            sumSubPeopleNight += (day.peopleNight || 0);
          }
        });

        // Định mức nhân lực cần (Plan People) Tổng Hard Test: SUM HARDTEST + OPTICS ASM + A IMP ASM (Đã bỏ FOCUS)
        const groupPeopleDay = this.getHardtestTotalPlanForDate(d, 'Day');
        const groupPeopleNight = this.getHardtestTotalPlanForDate(d, 'Night');
        const totalPeople = (shiftFilter === 'DAY') ? groupPeopleDay : (shiftFilter === 'NIGHT' ? groupPeopleNight : Math.round((groupPeopleDay + groupPeopleNight) * 10) / 10);

        const actHtDay = this.getActualAttendance ? this.getActualAttendance(d, 'Day', 'HARDTEST_TOTAL') : 0;
        const actHtNight = this.getActualAttendance ? this.getActualAttendance(d, 'Night', 'HARDTEST_TOTAL') : 0;
        const balHtDay = actHtDay > 0 ? Math.round((actHtDay - groupPeopleDay) * 10) / 10 : Math.round((-groupPeopleDay) * 10) / 10;
        const balHtNight = actHtNight > 0 ? Math.round((actHtNight - groupPeopleNight) * 10) / 10 : Math.round((-groupPeopleNight) * 10) / 10;

        return {
          date: d,
          plan,
          fact,
          gap: fact - plan,
          planDay,
          planNight,
          factDay,
          factNight,
          gapDay: factDay - planDay,
          gapNight: factNight - planNight,
          stdHours: Math.round(stdHours * 10) / 10,
          stdHoursDay: Math.round(stdHoursDay * 10) / 10,
          stdHoursNight: Math.round(stdHoursNight * 10) / 10,
          people: totalPeople,
          peopleDay: groupPeopleDay,
          peopleNight: groupPeopleNight,
          actualDay: actHtDay,
          actualNight: actHtNight,
          balanceDay: balHtDay,
          balanceNight: balHtNight,
          isSelected
        };
      });

      let cumPlan = 0, cumFact = 0, cumStdHours = 0, cumPeople = 0, selCount = 0;
      dailyTotals.forEach(d => {
        if (d.isSelected) {
          cumPlan += d.plan;
          cumFact += d.fact;
          cumStdHours += d.stdHours;
          cumPeople += d.people;
          selCount++;
        }
      });
      const avgPeople = selCount > 0 ? Math.round((cumPeople / selCount) * 10) / 10 : 0;
      const avgPlan = selCount > 0 ? Math.round(cumPlan / selCount) : 0;
      const avgFact = selCount > 0 ? Math.round(cumFact / selCount) : 0;
      const rate = cumPlan > 0 ? Math.round((cumFact / cumPlan) * 100) : (cumFact > 0 ? 100 : 0);

      totalSummary = {
        stage: 'TỔNG HARD TEST',
        isGrandTotal: false,
        isHardtestGroup: true,
        saveStage: 'HARDTEST_TOTAL',
        daily: dailyTotals,
        cumPlan,
        cumFact,
        cumGap: cumFact - cumPlan,
        cumStdHours: Math.round(cumStdHours * 10) / 10,
        avgPeople,
        avgPlan,
        avgFact,
        rate
      };
      hardtestGroupSummary = totalSummary;
    } else if (summaries.length > 1) {
      let grandStageName = 'TỔNG TOÀN NHÀ MÁY (ALL)';
      let saveStageKey = 'ALL';
      if (isFpdGroup) {
        grandStageName = '📦 TỔNG FPD (LONG TEST + TEST ROOM + QC + PKG)';
        saveStageKey = 'FPD_TOTAL';
      } else if (isMasterboxGroup) {
        grandStageName = '💻 TỔNG MASTERBOX (COM PKG + COM PKG AUTO + MB)';
        saveStageKey = 'MASTERBOX_TOTAL';
      } else if (stageFilter !== 'ALL') {
        grandStageName = `🎯 TỔNG HỢP (${summaries.length} CÔNG ĐOẠN ĐÃ CHỌN)`;
        saveStageKey = 'custom_composite';
      }

      const dailyTotals = dates.map(d => {
        const isSelected = selectedDateSet.has(d);
        let plan = 0, fact = 0, stdHours = 0;
        let planDay = 0, planNight = 0, factDay = 0, factNight = 0;
        let stdHoursDay = 0, stdHoursNight = 0;
        let people = 0, peopleDay = 0, peopleNight = 0;

        summaries.forEach(s => {
          const day = s.daily.find(x => x.date === d);
          if (day) {
            plan += day.plan;
            fact += day.fact;
            stdHours += day.stdHours;
            planDay += (day.planDay || 0);
            planNight += (day.planNight || 0);
            factDay += (day.factDay || 0);
            factNight += (day.factNight || 0);
            stdHoursDay += (day.stdHoursDay || 0);
            stdHoursNight += (day.stdHoursNight || 0);
            peopleDay += (day.peopleDay || 0);
            peopleNight += (day.peopleNight || 0);
            people += (day.people || 0);
          }
        });

        const actDay = this.getActualAttendance ? this.getActualAttendance(d, 'Day', saveStageKey) : 0;
        const actNight = this.getActualAttendance ? this.getActualAttendance(d, 'Night', saveStageKey) : 0;

        return {
          date: d,
          plan,
          fact,
          gap: fact - plan,
          planDay,
          planNight,
          factDay,
          factNight,
          gapDay: factDay - planDay,
          gapNight: factNight - planNight,
          stdHours: Math.round(stdHours * 10) / 10,
          stdHoursDay: Math.round(stdHoursDay * 10) / 10,
          stdHoursNight: Math.round(stdHoursNight * 10) / 10,
          people: Math.round(people * 10) / 10,
          peopleDay: Math.round(peopleDay * 10) / 10,
          peopleNight: Math.round(peopleNight * 10) / 10,
          actualDay: actDay,
          actualNight: actNight,
          isSelected
        };
      });

      let cumPlan = 0, cumFact = 0, cumStdHours = 0, cumPeople = 0, selCount = 0;
      dailyTotals.forEach(d => {
        if (d.isSelected) {
          cumPlan += d.plan;
          cumFact += d.fact;
          cumStdHours += d.stdHours;
          cumPeople += d.people;
          selCount++;
        }
      });
      const avgPeople = selCount > 0 ? Math.round((cumPeople / selCount) * 10) / 10 : 0;
      const avgPlan = selCount > 0 ? Math.round(cumPlan / selCount) : 0;
      const avgFact = selCount > 0 ? Math.round(cumFact / selCount) : 0;
      const rate = cumPlan > 0 ? Math.round((cumFact / cumPlan) * 100) : (cumFact > 0 ? 100 : 0);

      totalSummary = {
        stage: grandStageName,
        isGrandTotal: true,
        isMajorComposite: (isFpdGroup || isMasterboxGroup || isBoth || stageFilter === 'ALL'),
        saveStage: saveStageKey,
        daily: dailyTotals,
        cumPlan,
        cumFact,
        cumGap: cumFact - cumPlan,
        cumStdHours: Math.round(cumStdHours * 10) / 10,
        avgPeople,
        avgPlan,
        avgFact,
        rate
      };
    }

    // Luôn đảm bảo có hardtestGroupSummary để hiển thị đầy đủ nhân lực Hard Test trong Khối 1
    if (!hardtestGroupSummary) {
      const mpSumHardtest = rawManpower.find(m => m.stage === 'SUM HARDTEST' && m.metric === 'People') || rawManpower.find(m => m.stage === 'HARD TEST' && m.metric === 'People');
      const htSubStages = ['HARD TEST', 'OPTICS ASM', 'A IMP ASM', 'FOCUS', 'SUM HARDTEST'];
      const htDailyTotals = dates.map(d => {
        const isSelected = selectedDateSet.has(d);
        let plan = 0, fact = 0, stdHours = 0;
        let planDay = 0, planNight = 0, factDay = 0, factNight = 0;
        let stdHoursDay = 0, stdHoursNight = 0;
        let sumSubPeopleDay = 0, sumSubPeopleNight = 0;

        summaries.forEach(s => {
          if (htSubStages.includes(s.stage)) {
            const day = s.daily.find(x => x.date === d);
            if (day) {
              plan += day.plan;
              fact += day.fact;
              stdHours += day.stdHours;
              planDay += (day.planDay || 0);
              planNight += (day.planNight || 0);
              factDay += (day.factDay || 0);
              factNight += (day.factNight || 0);
              stdHoursDay += (day.stdHoursDay || 0);
              stdHoursNight += (day.stdHoursNight || 0);
              sumSubPeopleDay += (day.peopleDay || 0);
              sumSubPeopleNight += (day.peopleNight || 0);
            }
          }
        });

        // Định mức nhân lực cần (Plan People) Tổng Hard Test: SUM HARDTEST + OPTICS ASM + A IMP ASM (Đã bỏ FOCUS)
        const groupPeopleDay = this.getHardtestTotalPlanForDate(d, 'Day');
        const groupPeopleNight = this.getHardtestTotalPlanForDate(d, 'Night');
        const totalPeople = (shiftFilter === 'DAY') ? groupPeopleDay : (shiftFilter === 'NIGHT' ? groupPeopleNight : Math.round((groupPeopleDay + groupPeopleNight) * 10) / 10);
        const actHtDay = this.getActualAttendance ? this.getActualAttendance(d, 'Day', 'HARDTEST_TOTAL') : 0;
        const actHtNight = this.getActualAttendance ? this.getActualAttendance(d, 'Night', 'HARDTEST_TOTAL') : 0;
        const balHtDay = actHtDay > 0 ? Math.round((actHtDay - groupPeopleDay) * 10) / 10 : Math.round((-groupPeopleDay) * 10) / 10;
        const balHtNight = actHtNight > 0 ? Math.round((actHtNight - groupPeopleNight) * 10) / 10 : Math.round((-groupPeopleNight) * 10) / 10;

        return {
          date: d,
          plan, fact, gap: fact - plan,
          planDay, planNight, factDay, factNight,
          gapDay: factDay - planDay, gapNight: factNight - planNight,
          stdHours: Math.round(stdHours * 10) / 10,
          stdHoursDay: Math.round(stdHoursDay * 10) / 10,
          stdHoursNight: Math.round(stdHoursNight * 10) / 10,
          people: totalPeople,
          peopleDay: groupPeopleDay,
          peopleNight: groupPeopleNight,
          actualDay: actHtDay,
          actualNight: actHtNight,
          balanceDay: balHtDay,
          balanceNight: balHtNight,
          isSelected
        };
      });

      let htCumPlan = 0, htCumFact = 0, htCumStdHours = 0, htCumPeople = 0, htSelCount = 0;
      htDailyTotals.forEach(d => {
        if (d.isSelected) {
          htCumPlan += d.plan;
          htCumFact += d.fact;
          htCumStdHours += d.stdHours;
          htCumPeople += d.people;
          htSelCount++;
        }
      });
      const avgPeople = htSelCount > 0 ? Math.round((htCumPeople / htSelCount) * 10) / 10 : 0;
      const avgPlan = htSelCount > 0 ? Math.round(htCumPlan / htSelCount) : 0;
      const avgFact = htSelCount > 0 ? Math.round(htCumFact / htSelCount) : 0;
      const rate = htCumPlan > 0 ? Math.round((htCumFact / htCumPlan) * 100) : 0;

      hardtestGroupSummary = {
        stage: 'TỔNG HARD TEST',
        isGrandTotal: false,
        isHardtestGroup: true,
        saveStage: 'HARDTEST_TOTAL',
        daily: htDailyTotals,
        cumPlan: htCumPlan,
        cumFact: htCumFact,
        cumGap: htCumFact - htCumPlan,
        cumStdHours: Math.round(htCumStdHours * 10) / 10,
        avgPeople,
        avgPlan,
        avgFact,
        rate
      };
    }

    return {
      dates,
      selectedDates: Array.from(selectedDateSet),
      summaries,
      totalSummary,
      hardtestGroupSummary
    };
  }

  // Master Query: Filter by Date Range, Day/Night Shift, Stage, Table Stage, Model, Product 1C, Plan Status, and Norm
  getDetailedSchedule({ fromDate, toDate, shiftFilter = 'ALL', stageFilter = 'ALL', tableStageFilter = 'ALL', modelFilter = 'ALL', product1CFilter = 'ALL', planStatusFilter = 'ALL', search1C = '', selectedDates = null }) {
    // 1. Determine active dates
    let dates = [];
    if (fromDate && toDate) {
      dates = this.getDatesInRange(fromDate, toDate);
    } else {
      dates = this.getDatesInRange('10/9/2025', '10/15/2025');
    }

    if (dates.length === 0) {
      const all = this.getAllDates();
      dates = all.slice(0, 7);
    }

    let selectedDateSet;
    if (selectedDates && Array.isArray(selectedDates)) {
      const validInCurrentRange = selectedDates.filter(d => dates.includes(d));
      selectedDateSet = validInCurrentRange.length > 0 ? new Set(validInCurrentRange) : new Set(dates);
    } else {
      selectedDateSet = new Set(dates);
    }
    const search = (search1C || '').toLowerCase().trim();

    // 2. Stage Daily Summaries (Total Plan / Day and Required Manpower / Day)
    const stageSummaryResult = this.getStageDailySummaries({
      fromDate,
      toDate,
      shiftFilter,
      stageFilter,
      selectedDates: Array.from(selectedDateSet)
    });

    // 3. Filter and compute Model Items with 1C and Norm
    const rawItems = (this.dataMass && this.dataMass.items) ? this.dataMass.items : [];
    const items = [];
    const effectiveItemStage = (tableStageFilter && tableStageFilter !== 'ALL') ? tableStageFilter : stageFilter;
    const activeItemSet = this.resolveActiveStageSet(effectiveItemStage);

    rawItems.forEach(it => {
      let matchStage = false;
      if (activeItemSet.has('ALL') || activeItemSet.has(it.stage)) {
        matchStage = true;
      }
      if (!matchStage) return;

      const matchModel = modelFilter === 'ALL' || it.model === modelFilter;
      const p1c = it.productName1C || it.productName || '';
      const match1C = product1CFilter === 'ALL' || p1c === product1CFilter;
      const matchSearch = !search || p1c.toLowerCase().includes(search) || (it.model && it.model.toLowerCase().includes(search)) || (it.normName && it.normName.toLowerCase().includes(search));
      if (!matchStage || !matchModel || !match1C || !matchSearch) return;

      const norm = typeof it.norm === 'number' ? it.norm : (parseFloat(it.norm) || 0);
      const dailyData = [];
      let cumPlanQty = 0;
      let cumFactQty = 0;
      let totalPlanQty = 0;
      let totalFactQty = 0;

      dates.forEach(d => {
        const isSelected = selectedDateSet.has(d);
        let plan = 0;
        let fact = 0;
        let planDay = it.planDay ? (it.planDay[d] || 0) : 0;
        let planNight = it.planNight ? (it.planNight[d] || 0) : 0;
        let factDay = it.factDay ? (it.factDay[d] || 0) : 0;
        let factNight = it.factNight ? (it.factNight[d] || 0) : 0;

        const pTot = it.plan ? (it.plan[d] || 0) : 0;
        const fTot = it.fact ? (it.fact[d] || 0) : 0;

        const hasPlanSplit = (it.planDay && it.planDay[d] !== undefined) || (it.planNight && it.planNight[d] !== undefined);
        const effPlanDay = hasPlanSplit ? planDay : Math.round(pTot * 0.6);
        const effPlanNight = hasPlanSplit ? planNight : (pTot - effPlanDay);

        const hasFactSplit = (it.factDay && it.factDay[d] !== undefined) || (it.factNight && it.factNight[d] !== undefined);
        const effFactDay = hasFactSplit ? factDay : Math.round(fTot * 0.6);
        const effFactNight = hasFactSplit ? factNight : (fTot - effFactDay);

        if (shiftFilter === 'DAY') {
          plan = effPlanDay;
          fact = effFactDay;
        } else if (shiftFilter === 'NIGHT') {
          plan = effPlanNight;
          fact = effFactNight;
        } else {
          // ALL or SPLIT
          const pVal = it.plan ? it.plan[d] : undefined;
          plan = (pVal !== undefined && pVal !== null) ? pVal : (effPlanDay + effPlanNight);
          const fVal = it.fact ? it.fact[d] : undefined;
          fact = (fVal !== undefined && fVal !== null) ? fVal : (effFactDay + effFactNight);
        }

        const gap = fact - plan;
        // Standard Hours: (Qty * Norm) / 3600
        const planHours = norm > 0 ? Math.round((plan * norm / 3600) * 100) / 100 : 0;
        const factHours = norm > 0 ? Math.round((fact * norm / 3600) * 100) / 100 : 0;
        const gapHours = Math.round((factHours - planHours) * 100) / 100;

        totalPlanQty += plan;
        totalFactQty += fact;

        if (isSelected) {
          cumPlanQty += plan;
          cumFactQty += fact;
        }

        dailyData.push({
          date: d,
          plan,
          fact,
          gap,
          planDay: effPlanDay,
          planNight: effPlanNight,
          factDay: effFactDay,
          factNight: effFactNight,
          planHours,
          factHours,
          gapHours,
          isSelected
        });
      });

      const cumGapQty = cumFactQty - cumPlanQty;
      const cumPlanHours = norm > 0 ? Math.round((cumPlanQty * norm / 3600) * 10) / 10 : 0;
      const cumFactHours = norm > 0 ? Math.round((cumFactQty * norm / 3600) * 10) / 10 : 0;
      const cumGapHours = Math.round((cumFactHours - cumPlanHours) * 10) / 10;
      const cumRate = cumPlanQty > 0 ? Math.round((cumFactQty / cumPlanQty) * 100) : (cumFactQty > 0 ? 100 : 0);

      // Check planStatusFilter
      let matchPlan = true;
      if (planStatusFilter === 'HAS_PLAN') {
        matchPlan = (cumPlanQty > 0 || totalPlanQty > 0);
      } else if (planStatusFilter === 'GAP_NEGATIVE') {
        matchPlan = (cumGapQty < 0);
      } else if (planStatusFilter === 'COMPLETED') {
        matchPlan = (cumRate >= 100 && cumPlanQty > 0);
      } else if (planStatusFilter === 'NO_PLAN') {
        matchPlan = (cumPlanQty === 0 && totalPlanQty === 0);
      }
      if (!matchPlan) return;

      const shortageReasons = this.getShortageReasons({
        stage: it.stage,
        model: it.model,
        productName1C: p1c,
        specCode: it.specCode || '',
        dates: Array.from(selectedDateSet),
        shift: shiftFilter
      });

      items.push({
        stage: it.stage,
        model: it.model,
        productName1C: p1c,
        specCode: it.specCode || '',
        normKey: it.normKey || '',
        normKeyShort: it.normKeyShort || '',
        norm,
        normName: it.normName || '',
        daily: dailyData,
        cumPlanQty,
        cumFactQty,
        cumGapQty,
        cumPlanHours,
        cumFactHours,
        cumGapHours,
        cumRate,
        totalPlanQty,
        totalFactQty,
        shortageReasons
      });
    });

    // Deduplicate items by stage + productName1C to prevent duplicate planning rows for same physical product
    const dedupMap = new Map();
    items.forEach(it => {
      const p1cKey = (it.productName1C || it.model || '').trim().toLowerCase();
      const stageKey = (it.stage || '').trim().toUpperCase();
      const key = `${stageKey}___${p1cKey}`;
      if (!dedupMap.has(key)) {
        dedupMap.set(key, it);
      } else {
        const existing = dedupMap.get(key);
        if (existing.cumPlanQty === it.cumPlanQty && existing.cumFactQty === it.cumFactQty) {
          if ((it.model || '').length > (existing.model || '').length) {
            existing.model = it.model;
          }
        } else if (it.cumPlanQty > 0 || it.cumFactQty > 0) {
          if (existing.cumPlanQty === 0 && existing.cumFactQty === 0) {
            dedupMap.set(key, it);
          } else {
            existing.cumPlanQty += it.cumPlanQty;
            existing.cumFactQty += it.cumFactQty;
            existing.cumGapQty = existing.cumFactQty - existing.cumPlanQty;
            existing.cumPlanHours = Math.round((existing.cumPlanHours + it.cumPlanHours) * 10) / 10;
            existing.cumFactHours = Math.round((existing.cumFactHours + it.cumFactHours) * 10) / 10;
            existing.cumGapHours = Math.round((existing.cumFactHours - existing.cumPlanHours) * 10) / 10;
            if ((it.model || '').length > (existing.model || '').length) {
              existing.model = it.model;
            }
          }
        }
      }
    });
    items.splice(0, items.length, ...Array.from(dedupMap.values()));

    // Sắp xếp Model: Các Model có Gap < 0 (thiếu hụt so với kế hoạch) đưa lên đầu, sắp xếp âm nhiều nhất lên trước nhất.
    // Các Model không âm (Gap >= 0) xếp phía sau, ưu tiên sản lượng kế hoạch lớn nhất.
    items.sort((a, b) => {
      const aNeg = a.cumGapQty < 0;
      const bNeg = b.cumGapQty < 0;

      // 1. Model âm lên đầu
      if (aNeg && !bNeg) return -1;
      if (!aNeg && bNeg) return 1;

      // 2. Cùng là model âm: Model âm nhiều nhất lên đầu (tăng dần: e.g. -1000 < -500 < -10)
      if (aNeg && bNeg) {
        return a.cumGapQty - b.cumGapQty;
      }

      // 3. Cùng là model không âm (Gap >= 0): Ưu tiên kế hoạch lớn nhất (descending)
      if (b.cumPlanQty !== a.cumPlanQty) {
        return b.cumPlanQty - a.cumPlanQty;
      }

      // 4. Nếu cùng kế hoạch: Ưu tiên thực tế lớn nhất
      if (b.cumFactQty !== a.cumFactQty) {
        return b.cumFactQty - a.cumFactQty;
      }

      // 5. Theo tên Model
      return (a.model || '').localeCompare(b.model || '');
    });

    // 4. Filter and compute Manpower
    const rawManpower = (this.dataMass && this.dataMass.manpower) ? this.dataMass.manpower : [];
    const manpower = [];
    const activeMpSet = this.resolveActiveStageSet(stageFilter);

    rawManpower.forEach(mp => {
      let matchStage = false;
      if (activeMpSet.has('ALL') || activeMpSet.has(mp.stage)) {
        matchStage = true;
      }
      if (!matchStage) return;

      const dailyData = [];
      let sumVal = 0;
      let cumSum = 0;
      let selectedDaysCount = 0;

      dates.forEach(d => {
        const isSelected = selectedDateSet.has(d);
        const val = mp.daily ? (mp.daily[d] || 0) : 0;
        sumVal += val;
        if (isSelected) {
          cumSum += val;
          selectedDaysCount++;
        }
        dailyData.push({ date: d, val, isSelected });
      });

      const avgVal = dates.length > 0 ? Math.round((sumVal / dates.length) * 10) / 10 : 0;
      const cumAvg = selectedDaysCount > 0 ? Math.round((cumSum / selectedDaysCount) * 10) / 10 : 0;

      manpower.push({
        stage: mp.stage,
        metric: mp.metric,
        daily: dailyData,
        cumSum: Math.round(cumSum * 10) / 10,
        cumAvg,
        avgVal,
        sumVal: Math.round(sumVal * 10) / 10
      });
    });

    // 5. Master KPIs based on Stage Summaries
    let cumPlanQty = 0;
    let cumFactQty = 0;
    let cumGapQty = 0;
    let cumPlanHours = 0;
    let cumFactHours = 0;
    let avgManpower = 0;

    if (stageSummaryResult.totalSummary) {
      cumPlanQty = stageSummaryResult.totalSummary.cumPlan;
      cumFactQty = stageSummaryResult.totalSummary.cumFact;
      cumGapQty = stageSummaryResult.totalSummary.cumGap;
      cumPlanHours = stageSummaryResult.totalSummary.cumStdHours;
      avgManpower = stageSummaryResult.totalSummary.avgPeople;
    } else if (stageSummaryResult.summaries && stageSummaryResult.summaries.length > 0) {
      const s = stageSummaryResult.summaries[0];
      if (s) {
        cumPlanQty = s.cumPlan;
        cumFactQty = s.cumFact;
        cumGapQty = s.cumGap;
        cumPlanHours = s.cumStdHours;
        avgManpower = s.avgPeople;
      }
    } else {
      cumPlanQty = items.reduce((s, i) => s + i.cumPlanQty, 0);
      cumFactQty = items.reduce((s, i) => s + i.cumFactQty, 0);
      cumGapQty = cumFactQty - cumPlanQty;
      cumPlanHours = Math.round(items.reduce((s, i) => s + i.cumPlanHours, 0) * 10) / 10;
    }

    cumFactHours = Math.round(items.reduce((s, i) => s + i.cumFactHours, 0) * 10) / 10;
    const cumRate = cumPlanQty > 0 ? ((cumFactQty / cumPlanQty) * 100).toFixed(1) : (cumFactQty > 0 ? 100 : 0);

    return {
      dates,
      selectedDates: Array.from(selectedDateSet),
      stageSummaries: stageSummaryResult.summaries,
      stageTotalSummary: stageSummaryResult.totalSummary,
      hardtestGroupSummary: stageSummaryResult.hardtestGroupSummary,
      items,
      manpower,
      kpis: {
        cumPlanQty,
        cumFactQty,
        cumGapQty,
        cumPlanHours,
        cumFactHours,
        cumGapHours: Math.round((cumFactHours - cumPlanHours) * 10) / 10,
        cumRate,
        avgManpower: Math.round(avgManpower * 10) / 10,
        selectedDaysCount: selectedDateSet.size,
        totalDaysCount: dates.length,
        filteredItemsCount: items.length
      }
    };
  }

  // Backward compatible wrapper
  getWeeklySchedule(weekIdx = 0, stageFilter = 'ALL', searchModel = '') {
    const weeks = this.getDataMassWeeks();
    const safeIdx = Math.max(0, Math.min(weekIdx, weeks.length - 1));
    const targetWeek = weeks[safeIdx];
    if (!targetWeek || !targetWeek.days || targetWeek.days.length === 0) {
      return this.getDetailedSchedule({ fromDate: '10/9/2025', toDate: '10/15/2025', stageFilter, search1C: searchModel });
    }
    const fromDate = targetWeek.days[0].date;
    const toDate = targetWeek.days[targetWeek.days.length - 1].date;
    const selected = this.getSelectedDays(safeIdx);
    const res = this.getDetailedSchedule({ fromDate, toDate, stageFilter, search1C: searchModel, selectedDates: selected });
    res.week = targetWeek;
    res.days = targetWeek.days;
    return res;
  }

  updateAsItemLine(id, lineId) {
    const item = this.asPlan.find(i => i.id === id);
    if (!item) return;

    item.assignedLine = lineId;
    if (lineId && window.MatrixService) {
      const prod = window.MatrixService.getProductivity(item.normingGroup, lineId);
      item.productivity = prod !== null ? prod : 100;
    } else {
      item.productivity = 0;
    }

    if (item.productivity > 0) {
      item.hoursActual = Math.round((item.hoursPlan / (item.productivity / 100)) * 100) / 100;
    } else {
      item.hoursActual = item.hoursPlan;
    }
    this.save();
  }

  autoAssignAllBestLines() {
    let count = 0;
    this.asPlan.forEach(item => {
      if (window.MatrixService) {
        const best = window.MatrixService.getBestLine(item.normingGroup);
        if (best && best.line) {
          item.assignedLine = best.line;
          item.productivity = best.productivity;
          item.hoursActual = best.productivity > 0 ? Math.round((item.hoursPlan / (best.productivity / 100)) * 100) / 100 : item.hoursPlan;
          count++;
        }
      }
    });
    this.save();
    return count;
  }

  resetToDefault() {
    this.asPlan = JSON.parse(JSON.stringify(SEED_AS_DATA));
    this.htPlan = JSON.parse(JSON.stringify(SEED_HT_DATA));
    this.fttStats = JSON.parse(JSON.stringify(SEED_FTT_DATA));
    if (window.DEFAULT_DATAMASS_DATA) {
      this.dataMass = JSON.parse(JSON.stringify(window.DEFAULT_DATAMASS_DATA));
      this._normalizedWeeks = null;
      try {
        localStorage.removeItem('AJAX_PROPLAN_DATAMASS');
        localStorage.removeItem('AJAX_PROPLAN_LAST_SYNC');
      } catch(e) {}
    }
    this.save();
    this.notify();
  }

  subscribe(fn) {
    this.listeners.push(fn);
    return () => {
      this.listeners = this.listeners.filter(l => l !== fn);
    };
  }

  notify() {
    this.listeners.forEach(fn => {
      try { fn(this); } catch(e) {}
    });
  }

  getDashboardKPIs() {
    const totalPlanAs = this.asPlan.reduce((s, i) => s + i.planQty, 0);
    const totalFactAs = this.asPlan.reduce((s, i) => s + i.factQty, 0);
    const totalGapAs = this.asPlan.reduce((s, i) => s + i.gapQty, 0);
    const totalPlanHours = this.asPlan.reduce((s, i) => s + i.hoursPlan, 0);
    const totalActualHours = this.asPlan.reduce((s, i) => s + i.hoursActual, 0);

    const completionRate = totalPlanAs > 0 ? ((totalFactAs / totalPlanAs) * 100).toFixed(1) : 0;

    // FTT Average
    const validFtt = this.fttStats.map(f => parseFloat(f.fttPct.replace('%', '')) || 0).filter(v => v > 0);
    const avgFtt = validFtt.length > 0 ? (validFtt.reduce((a, b) => a + b, 0) / validFtt.length).toFixed(1) : 94.5;

    // Line capacity load summary
    const lineLoadMap = {};
    const lines = window.MatrixService ? window.MatrixService.getLines() : [];
    lines.forEach(l => { lineLoadMap[l.id] = { name: l.name, hours: 0, itemsCount: 0 }; });

    this.asPlan.forEach(item => {
      if (item.assignedLine && lineLoadMap[item.assignedLine]) {
        lineLoadMap[item.assignedLine].hours += item.hoursActual;
        lineLoadMap[item.assignedLine].itemsCount++;
      }
    });

    return {
      totalPlanAs,
      totalFactAs,
      totalGapAs,
      totalPlanHours: Math.round(totalPlanHours * 10) / 10,
      totalActualHours: Math.round(totalActualHours * 10) / 10,
      completionRate,
      avgFtt,
      lineLoadMap
    };
  }

  // ==========================================
  // CAPACITY PLANNING & LINE PERFORMANCE (IE)
  // ==========================================
  getAssemblyCapacityData() {
    if (!this.assemblyCapacity && window.ASSEMBLY_CAPACITY_DATA) {
      this.assemblyCapacity = window.ASSEMBLY_CAPACITY_DATA;
    }
    if (!this.assemblyCapacity && this.dataMass && this.dataMass.assemblyCapacity) {
      this.assemblyCapacity = this.dataMass.assemblyCapacity;
    }
    return this.assemblyCapacity || { stage: 'ASSEMBLY', items: [], groups: [], lines: [], totalItems: 0, totalGroups: 0 };
  }

  getHardtestCapacityData() {
    if (!this.hardtestCapacity && window.HARDTEST_CAPACITY_DATA) {
      this.hardtestCapacity = window.HARDTEST_CAPACITY_DATA;
    }
    if (!this.hardtestCapacity && this.dataMass && this.dataMass.hardtestCapacity) {
      this.hardtestCapacity = this.dataMass.hardtestCapacity;
    }
    return this.hardtestCapacity || { stage: 'TOTAL_HARDTEST', title: 'Total Hardtest (Hard Test / Optics ASM / Focus)', items: [], groups: [], subStages: [], totalItems: 0, totalGroups: 0, totalTbQty: 0 };
  }

  getFilteredHardtestCapacityItems({ groupFilter = 'ALL', stageFilter = 'ALL', search = '', shiftHours = 21.41, capMode = 'ACTUAL' } = {}) {
    const data = this.getHardtestCapacityData();
    let items = (data.items || []).map(it => {
      const tbQty = it.tbQty || 0;
      const ctNorm = it.ctNorm || 0;
      const ctActual = it.ctActual || it.calcCtActual || ctNorm;
      const ftt = it.ftt || 1.0;
      const dtTotalPct = it.dtTotalPct || 2.5;

      const uphStd = it.uphStandard || (ctNorm > 0 && tbQty > 0 ? Math.round(((3600.0 * tbQty) / ctNorm) * 10) / 10 : 0);
      const uphAct = it.uphActual || (ctActual > 0 && tbQty > 0 ? Math.round(((3600.0 * tbQty) / ctActual) * 10) / 10 : 0);

      const dayShiftStd = it.dayShiftCapacityStandard || (ctNorm > 0 && tbQty > 0 ? Math.round((38988.0 * tbQty) / ctNorm) : 0);
      const dayShiftAct = it.dayShiftCapacityActual || (ctActual > 0 && tbQty > 0 ? Math.round((38988.0 * tbQty) / ctActual) : 0);

      const nightShiftStd = it.nightShiftCapacityStandard || (ctNorm > 0 && tbQty > 0 ? Math.round((38088.0 * tbQty) / ctNorm) : 0);
      const nightShiftAct = it.nightShiftCapacityActual || (ctActual > 0 && tbQty > 0 ? Math.round((38088.0 * tbQty) / ctActual) : 0);

      const totalDayStd = it.totalDayCapacityStandard || (dayShiftStd + nightShiftStd);
      const totalDayAct = it.totalDayCapacityActual || (dayShiftAct + nightShiftAct);

      return {
        ...it,
        tbQty,
        ctNorm,
        ctActual,
        fttPct: it.fttPct != null ? it.fttPct : Math.round(ftt * 100),
        dtTotalPct,
        uphStandard: uphStd,
        uphActual: uphAct,
        dayShiftCapacityStandard: dayShiftStd,
        dayShiftCapacityActual: dayShiftAct,
        nightShiftCapacityStandard: nightShiftStd,
        nightShiftCapacityActual: nightShiftAct,
        totalDayCapacityStandard: totalDayStd,
        totalDayCapacityActual: totalDayAct
      };
    });

    if (stageFilter && stageFilter !== 'ALL') {
      items = items.filter(it => it.stage === stageFilter);
    }

    if (groupFilter && groupFilter !== 'ALL') {
      items = items.filter(it => it.group === groupFilter);
    }

    if (search) {
      const s = search.toLowerCase();
      items = items.filter(it => 
        (it.group || '').toLowerCase().includes(s) || 
        (it.board || '').toLowerCase().includes(s) ||
        (it.note || '').toLowerCase().includes(s) ||
        (it.stage || '').toLowerCase().includes(s)
      );
    }

    return items;
  }

  getFilteredCapacityItems({ groupFilter = 'ALL', lineFilter = 'ALL', search = '', shiftHours = 21.41 } = {}) {
    const data = this.getAssemblyCapacityData();
    // Quy chuẩn thời gian làm việc:
    // Ca Ngày: 10.83 giờ (38,988s) | Ca Đêm: 10.58 giờ (38,088s) | Tổng Ngày (Cả 2 Ca): 21.41 giờ (77,076s)
    const TOTAL_DAY_SECONDS = 77076.0;
    const DAY_SHIFT_SECONDS = 38988.0;
    const NIGHT_SHIFT_SECONDS = 38088.0;

    let items = (data.items || []).map(it => {
      const norm = it.norm || 0;
      const uphStd = norm > 0 ? Math.round((3600.0 / norm) * 10) / 10 : 0;
      const dayCapStd = norm > 0 ? Math.round(TOTAL_DAY_SECONDS / norm) : 0;
      const dayShiftCapStd = norm > 0 ? Math.round(DAY_SHIFT_SECONDS / norm) : 0;
      const nightShiftCapStd = norm > 0 ? Math.round(NIGHT_SHIFT_SECONDS / norm) : 0;

      const lines = {};
      Object.entries(it.lines || {}).forEach(([lid, linfo]) => {
        const perf = linfo.perf || 0;
        const actCt = linfo.actualCycleTime || (perf > 0 && norm > 0 ? Math.round((norm / perf) * 100) / 100 : 0);
        const actUph = actCt > 0 ? Math.round((3600.0 / actCt) * 10) / 10 : 0;
        const actDayCap = actCt > 0 ? Math.round(TOTAL_DAY_SECONDS / actCt) : 0;
        const actDayShiftCap = actCt > 0 ? Math.round(DAY_SHIFT_SECONDS / actCt) : 0;
        const actNightShiftCap = actCt > 0 ? Math.round(NIGHT_SHIFT_SECONDS / actCt) : 0;

        lines[lid] = {
          perf,
          perfPct: linfo.perfPct || Math.round(perf * 100),
          actualCycleTime: actCt,
          actualUph: actUph,
          actualShiftCapacity: actDayCap,   // tương thích ngược
          actualDayCapacity: actDayCap,
          actualDayShiftCapacity: actDayShiftCap,
          actualNightShiftCapacity: actNightShiftCap
        };
      });

      return {
        ...it,
        norm,
        uphStandard: uphStd,
        shiftCapacityStandard: dayCapStd, // tương thích ngược
        dayCapacityStandard: dayCapStd,
        dayShiftCapacityStandard: dayShiftCapStd,
        nightShiftCapacityStandard: nightShiftCapStd,
        lines
      };
    });

    if (groupFilter && groupFilter !== 'ALL') {
      items = items.filter(it => it.group === groupFilter);
    }

    if (lineFilter && lineFilter !== 'ALL') {
      items = items.filter(it => it.lines && it.lines[lineFilter]);
    }

    if (search) {
      const s = search.toLowerCase();
      items = items.filter(it => 
        (it.group || '').toLowerCase().includes(s) || 
        (it.board || '').toLowerCase().includes(s) ||
        (it.productName1C || '').toLowerCase().includes(s)
      );
    }

    return items;
  }

  simulateCapacityDemand({ groupName = '', boardName = '', planQty = 0, shiftHours = 21.41, stage = null } = {}) {
    const activeStage = stage || this.selectedCapacityStage || 'ASSEMBLY';
    if (activeStage === 'TOTAL_HARDTEST') {
      const htData = this.getHardtestCapacityData();
      let targetItem = null;
      if (boardName) {
        targetItem = (htData.items || []).find(it => it.board === boardName);
      }
      if (!targetItem && groupName) {
        targetItem = (htData.items || []).find(it => it.group === groupName);
      }
      if (!targetItem && (htData.items || []).length > 0) {
        targetItem = htData.items[0];
      }
      if (!targetItem) return null;

      const tbQty = targetItem.tbQty || 1;
      const ctNorm = targetItem.ctNorm || 0;
      const ctAct = targetItem.ctActual || ctNorm;
      
      const stdHours = (ctNorm > 0 && tbQty > 0) ? Math.round(((planQty * ctNorm) / (3600.0 * tbQty)) * 10) / 10 : 0;
      const actHours = (ctAct > 0 && tbQty > 0) ? Math.round(((planQty * ctAct) / (3600.0 * tbQty)) * 10) / 10 : 0;
      const stdDays = stdHours > 0 ? Math.round((stdHours / 21.41) * 10) / 10 : 0;
      const actDays = actHours > 0 ? Math.round((actHours / 21.41) * 10) / 10 : 0;

      return {
        stage: 'TOTAL_HARDTEST',
        item: targetItem,
        planQty,
        shiftHours,
        stdHours,
        stdDays,
        actHours,
        actDays,
        tbQty,
        ctNorm,
        ctAct,
        fttPct: targetItem.fttPct,
        dtTotalPct: targetItem.dtTotalPct,
        lineResults: [
          {
            lineId: 'HardtestCluster',
            lineName: `Cụm Test Block (${tbQty} TB - ${targetItem.stage})`,
            perf: (ctNorm > 0 && ctAct > 0) ? ctNorm / ctAct : 1.0,
            perfPct: (ctNorm > 0 && ctAct > 0) ? Math.round((ctNorm / ctAct) * 100) : 100,
            actualCycleTime: ctAct,
            actualUph: targetItem.uphActual,
            actualShiftCapacity: targetItem.dayShiftCapacityActual,
            actualDayCapacity: targetItem.totalDayCapacityActual,
            requiredHours: actHours,
            requiredDays: actDays,
            requiredShifts: Math.round((actHours / 10.7) * 10) / 10,
            diffHoursFromStd: Math.round((actHours - stdHours) * 10) / 10,
            isBest: true
          }
        ]
      };
    }

    const data = this.getAssemblyCapacityData();
    let targetItem = null;
    if (boardName) {
      targetItem = (data.items || []).find(it => it.board === boardName);
    }
    if (!targetItem && groupName) {
      targetItem = (data.items || []).find(it => it.group === groupName);
    }
    if (!targetItem && (data.items || []).length > 0) {
      targetItem = data.items[0];
    }
    if (!targetItem) return null;

    const norm = targetItem.norm || 0;
    const stdHours = norm > 0 ? Math.round(((planQty * norm) / 3600.0) * 10) / 10 : 0;
    const stdDays = stdHours > 0 ? Math.round((stdHours / 21.41) * 10) / 10 : 0;

    const lineResults = [];
    Object.entries(targetItem.lines || {}).forEach(([lid, linfo]) => {
      const perf = linfo.perf || 0;
      const actCt = linfo.actualCycleTime || (perf > 0 && norm > 0 ? Math.round((norm / perf) * 100) / 100 : 0);
      const actHours = actCt > 0 ? Math.round(((planQty * actCt) / 3600.0) * 10) / 10 : 0;
      const actDays = actHours > 0 ? Math.round((actHours / 21.41) * 10) / 10 : 0;
      const actUph = actCt > 0 ? Math.round((3600.0 / actCt) * 10) / 10 : 0;
      const actDayCap = actCt > 0 ? Math.round(77076.0 / actCt) : 0;

      const displayName = lid.startsWith('Line') ? lid : `Line ${lid}`;

      lineResults.push({
        lineId: lid,
        lineName: displayName,
        perf,
        perfPct: linfo.perfPct || Math.round(perf * 100),
        actualCycleTime: actCt,
        actualUph: actUph,
        actualShiftCapacity: actDayCap,
        actualDayCapacity: actDayCap,
        requiredHours: actHours,
        requiredDays: actDays,
        requiredShifts: Math.round((actHours / 10.7) * 10) / 10,
        diffHoursFromStd: Math.round((actHours - stdHours) * 10) / 10,
        isBest: perf >= 1.0
      });
    });

    lineResults.sort((a, b) => b.perf - a.perf || a.lineId.localeCompare(b.lineId));

    return {
      item: targetItem,
      planQty,
      shiftHours,
      stdHours,
      stdDays,
      lineResults
    };
  }

  /**
   * ==========================================
   * WIP CONTROL (WORK IN PROGRESS) DATA ENGINE
   * ==========================================
   */
  getWipControlData({
    stageFilter = 'ALL',
    modelFilter = 'ALL',
    lastStepFilter = 'ALL',
    statusFilter = 'ALL',
    gapFilter = 'ALL', // 'ALL' | 'NEGATIVE' (< 0) | 'POSITIVE' (> 0) | 'ZERO' (= 0)
    sortBy = 'DEFAULT', // 'DEFAULT' | 'GAP_ASC' (âm nhiều nhất) | 'GAP_DESC' | 'PLAN_DESC' | 'STOCK_DESC' | 'DEFICIT_1C'
    search = '',
    date = null, // Ngày kiểm kê duy nhất (mặc định hôm nay)
    fromDate = null,
    toDate = null,
    pageIndex = 0,
    pageSize = 50
  } = {}) {
    const rawItems = (this.dataMass && this.dataMass.items) ? this.dataMass.items : [];
    const searchLow = (search || '').toLowerCase().trim();

    // 1. Determine active dates for calculating Plan / Fact
    let dates = [];
    if (fromDate && toDate) {
      dates = this.getDatesInRange(fromDate, toDate);
      if (dates.length === 0 && fromDate === toDate) {
        const t = this.parseDate(fromDate).getTime();
        const all = this.getAllDates();
        dates = all.filter(d => this.parseDate(d).getTime() === t);
      }
    } else if (date) {
      dates = this.getDatesInRange(date, date);
      if (dates.length === 0) {
        const t = this.parseDate(date).getTime();
        const all = this.getAllDates();
        dates = all.filter(d => this.parseDate(d).getTime() === t);
      }
    } else {
      const todayIso = '2026-10-22';
      dates = this.getDatesInRange(todayIso, '2026-10-28');
      if (dates.length === 0) {
        const all = this.getAllDates();
        dates = all.slice(0, 7);
      }
    }
    const dateSet = new Set(dates);

    // 2. Filter items
    const filtered = [];
    rawItems.forEach((it, idx) => {
      // Stage match (supports 'ALL', specific stage string, array of stages, or comma-separated string)
      if (Array.isArray(stageFilter)) {
        if (!stageFilter.includes('ALL') && !stageFilter.includes(it.stage)) return;
      } else if (typeof stageFilter === 'string' && stageFilter.includes(',')) {
        const arr = stageFilter.split(',').map(s => s.trim());
        if (!arr.includes('ALL') && !arr.includes(it.stage)) return;
      } else if (stageFilter !== 'ALL' && it.stage !== stageFilter) {
        return;
      }

      // Model match
      if (modelFilter !== 'ALL' && it.model !== modelFilter) return;

      // Last Step match
      const lastStepVal = (it.lastStep || '').trim();
      if (lastStepFilter !== 'ALL') {
        if (lastStepFilter === '__EMPTY__' && lastStepVal !== '') return;
        if (lastStepFilter !== '__EMPTY__' && lastStepVal !== lastStepFilter) return;
      }

      // Extract normKey & normKeyShort (lấy phần sau dấu -)
      const normKey = (it.normKey || '').trim();
      let normKeyShort = (it.normKeyShort || '').trim();
      if (!normKeyShort && normKey) {
        normKeyShort = normKey.includes(' - ') ? normKey.split(' - ').slice(1).join(' - ').trim() : normKey;
      }

      const p1c = it.productName1C || it.productName || '';
      const rawSpecCode = (it.specCode || '').trim();
      // Bỏ các số "0" ở đầu theo yêu cầu mới nhất (ví dụ 000061999 -> 61999)
      let specCode = rawSpecCode;
      if (rawSpecCode && /^\d+$/.test(rawSpecCode)) {
        specCode = rawSpecCode.replace(/^0+/, '') || '0';
      }
      const padSpecCode = rawSpecCode.padStart(9, '0');

      // Tra cứu dữ liệu BOM từ window.BOM_MASTER_DATA (từ sheet BOM-Plan mới)
      let bomData = null;
      if (window.BOM_MASTER_DATA && (specCode || rawSpecCode)) {
        bomData = window.BOM_MASTER_DATA[specCode] || window.BOM_MASTER_DATA[rawSpecCode] || window.BOM_MASTER_DATA[padSpecCode] || null;
      }
      let bomMaterials = (bomData && bomData.materials) ? bomData.materials : [];
      if (bomMaterials.length > 1) {
        bomMaterials = [...bomMaterials].sort((a, b) => {
          const isSfgA = String(a.nomenclature || a.spec || '').trim().toLowerCase().startsWith('ajax');
          const isSfgB = String(b.nomenclature || b.spec || '').trim().toLowerCase().startsWith('ajax');
          if (isSfgA && !isSfgB) return -1;
          if (!isSfgA && isSfgB) return 1;
          return 0;
        });
      }

      // Search match: matches stage, model, p1c, specCode, rawSpecCode, normKey, normKeyShort, lastStep và BOM materials
      if (searchLow) {
        let bomSearchText = '';
        if (bomMaterials.length > 0) {
          bomSearchText = bomMaterials.map(m => `${m.materialCode} ${m.nomenclature} ${m.spec} ${m.category}`).join(' ');
        }
        const str = `${it.stage} ${it.model} ${p1c} ${specCode} ${rawSpecCode} ${normKey} ${normKeyShort} ${lastStepVal} ${bomSearchText}`.toLowerCase();
        if (!str.includes(searchLow)) return;
      }

      // Calculate plan and fact in date range
      let planQty = 0;
      let factQty = 0;
      if (it.plan) {
        for (const [d, val] of Object.entries(it.plan)) {
          if (dateSet.size === 0 || dateSet.has(d)) planQty += (val || 0);
        }
      }
      if (it.fact) {
        for (const [d, val] of Object.entries(it.fact)) {
          if (dateSet.size === 0 || dateSet.has(d)) factQty += (val || 0);
        }
      }

      const gapQty = factQty - planQty;
      let status = 'BALANCED';
      if (planQty > 0 && factQty >= planQty) status = 'COMPLETED';
      else if (factQty > 0 && factQty < planQty) status = 'IN_PROGRESS';
      else if (planQty > 0 && factQty === 0) status = 'PENDING';
      else if (planQty === 0 && factQty > 0) status = 'UNPLANNED';

      if (statusFilter !== 'ALL' && status !== statusFilter) return;

      // Lọc theo Chênh Lệch (Gap Filter: < 0, All, > 0, = 0, HAS_GAP: chỉ lấy các mã có GAP != 0)
      if (gapFilter === 'NEGATIVE' && gapQty >= 0) return;
      if (gapFilter === 'POSITIVE' && gapQty <= 0) return;
      if (gapFilter === 'ZERO' && gapQty !== 0) return;
      if (gapFilter === 'HAS_GAP' && gapQty === 0) return;

      const itemKey = `${it.stage}|||${it.model}|||${p1c}`;
      const targetDate = toDate || fromDate || (dates.length > 0 ? dates[dates.length - 1] : null);
      const stockInfo = this.getStock1C(itemKey, targetDate, it);
      const stock1C = stockInfo.val;

      filtered.push({
        id: idx + 1,
        itemKey,
        stage: it.stage || 'N/A',
        productName1C: p1c,
        productNameEnglish: it.productNameEnglish || '',
        specCode: specCode,
        rawSpecCode: rawSpecCode,
        bom: bomData,
        bomMaterials: bomMaterials,
        normKey: normKey,
        normKeyShort: normKeyShort || '-',
        lastStep: lastStepVal || '-',
        hasLastStep: Boolean(lastStepVal),
        model: it.model || 'N/A',
        planQty,
        factQty,
        gapQty,
        stock1C,
        isManualStock: stockInfo.isManual,
        stockWarehouses: stockInfo.warehouses || {},
        status
      });
    });

    // 3. Sắp Xếp (Sorting):
    // Khi gapFilter === 'NEGATIVE' hoặc sortBy === 'GAP_ASC': Sắp xếp theo thứ tự âm nhiều nhất lên trên (-5.073 < -1.000)
    if (sortBy === 'GAP_ASC' || (gapFilter === 'NEGATIVE' && sortBy === 'DEFAULT')) {
      filtered.sort((a, b) => a.gapQty - b.gapQty);
    } else if (sortBy === 'GAP_DESC') {
      filtered.sort((a, b) => b.gapQty - a.gapQty);
    } else if (sortBy === 'PLAN_DESC') {
      filtered.sort((a, b) => b.planQty - a.planQty);
    } else if (sortBy === 'STOCK_DESC') {
      filtered.sort((a, b) => b.stock1C - a.stock1C);
    } else if (sortBy === 'DEFICIT_1C') {
      filtered.sort((a, b) => (b.planQty - b.stock1C) - (a.planQty - a.stock1C));
    }

    // Đánh lại số thứ tự ID sau khi sắp xếp
    filtered.forEach((it, i) => { it.id = i + 1; });

    // 4. Metadata for KPI badges
    const totalItems = filtered.length;
    const totalStock1C = filtered.reduce((acc, cur) => acc + (cur.stock1C || 0), 0);
    const totalPlan = filtered.reduce((acc, cur) => acc + cur.planQty, 0);
    const totalFact = filtered.reduce((acc, cur) => acc + cur.factQty, 0);
    const totalGap = totalFact - totalPlan;
    const deficitCount = filtered.filter(x => x.planQty > 0 && x.stock1C < x.planQty).length;
    const inStockCount = filtered.filter(x => x.stock1C > 0).length;

    // 5. Pagination
    const totalPages = Math.ceil(totalItems / pageSize) || 1;
    const currentPage = Math.min(Math.max(0, pageIndex), totalPages - 1);
    const pageItems = filtered.slice(currentPage * pageSize, (currentPage + 1) * pageSize);

    return {
      items: pageItems,
      totalItems,
      totalPages,
      currentPage,
      pageSize,
      activeDates: dates,
      dateRangeText: dates.length === 1 
        ? (() => {
            const parts = dates[0].split('/');
            if (parts.length === 3) return `${String(parts[1]).padStart(2, '0')}/${String(parts[0]).padStart(2, '0')}/${parts[2]}`;
            return dates[0];
          })()
        : (dates.length > 1 ? `${dates[0]} → ${dates[dates.length - 1]} (${dates.length} ngày)` : 'Toàn bộ kỳ'),
      stats: {
        totalStock1C,
        totalPlan,
        totalFact,
        totalGap,
        deficitCount,
        inStockCount,
        totalItems
      }
    };
  }

  getStock1C(itemKey, dateStr, itemObj = null) {
    if (!this.stock1CData) {
      try {
        const stored = localStorage.getItem('AJAX_PROPLAN_WIP_STOCK_1C');
        this.stock1CData = stored ? JSON.parse(stored) : {};
      } catch (e) {
        this.stock1CData = {};
      }
    }
    const byItem = this.stock1CData[itemKey];
    if (byItem) {
      if (dateStr && byItem[dateStr] !== undefined) {
        return { val: byItem[dateStr], isManual: true, warehouses: {} };
      }
      if (byItem['_LATEST_'] !== undefined) {
        return { val: byItem['_LATEST_'], isManual: true, warehouses: {} };
      }
    }

    // 2. Pre-computed or Live Stock from Sheet Inventory 1C
    if (itemObj) {
      if (itemObj.stock1C !== undefined) {
        return { val: itemObj.stock1C, isManual: false, warehouses: itemObj.stock1CWarehouses || {} };
      }
      const invMap = window.INVENTORY_1C_MASTER_DATA || {};
      const p1c = itemObj.productName1C || '';
      const peng = itemObj.productNameEnglish || '';
      const normKeyShort = itemObj.normKeyShort || '';
      const stage = (itemObj.stage || '').toUpperCase();

      let matched = null;
      if (p1c && invMap[p1c]) matched = invMap[p1c];
      else if (peng && invMap[peng]) matched = invMap[peng];
      else if (p1c) {
        const clean = p1c.replace('(BOT)', '').replace('(TOP)', '').trim();
        if (invMap[clean]) matched = invMap[clean];
        else if (normKeyShort && normKeyShort !== '-') {
          // Chỉ fallback cho các công đoạn sản xuất bo mạch phôi chung (SMD, LAQ, DIP)
          if (stage.includes('SMD') || stage.includes('LAQ') || stage.includes('DIP')) {
            for (const [n, dObj] of Object.entries(invMap)) {
              if (n.includes(normKeyShort)) {
                if ((stage.includes('SMD') || stage.includes('LAQ')) && (n.includes('board with components') || n.includes('плата з комп'))) {
                  matched = dObj; break;
                } else if (stage.includes('DIP') && n.includes('_DIP')) {
                  matched = dObj; break;
                }
              }
            }
          }
        }
      }
      if (matched) {
        return { val: matched.total || 0, isManual: false, warehouses: matched.warehouses || {} };
      }
    }

    return { val: 0, isManual: false, warehouses: {} };
  }

  setStock1C(itemKey, dateStr, value) {
    if (!this.stock1CData) {
      try {
        const stored = localStorage.getItem('AJAX_PROPLAN_WIP_STOCK_1C');
        this.stock1CData = stored ? JSON.parse(stored) : {};
      } catch (e) {
        this.stock1CData = {};
      }
    }
    if (!this.stock1CData[itemKey]) this.stock1CData[itemKey] = {};
    const num = Math.max(0, parseInt(value, 10) || 0);
    if (dateStr) {
      this.stock1CData[itemKey][dateStr] = num;
    }
    this.stock1CData[itemKey]['_LATEST_'] = num;
    try {
      localStorage.setItem('AJAX_PROPLAN_WIP_STOCK_1C', JSON.stringify(this.stock1CData));
    } catch (e) {}
    return num;
  }

  getWipDistinctStages() {
    const rawItems = (this.dataMass && this.dataMass.items) ? this.dataMass.items : [];
    const stages = new Set();
    rawItems.forEach(it => {
      if (it.stage) stages.add(it.stage);
    });
    return Array.from(stages).sort();
  }

  getWipDistinctModels(stage = 'ALL') {
    const rawItems = (this.dataMass && this.dataMass.items) ? this.dataMass.items : [];
    const models = new Set();
    const isStageMatch = (st) => {
      if (!stage || stage === 'ALL') return true;
      if (Array.isArray(stage)) return stage.includes('ALL') || stage.includes(st);
      if (typeof stage === 'string' && stage.includes(',')) {
        const arr = stage.split(',').map(s => s.trim());
        return arr.includes('ALL') || arr.includes(st);
      }
      return stage === st;
    };
    rawItems.forEach(it => {
      if (isStageMatch(it.stage)) {
        if (it.model) models.add(it.model);
      }
    });
    return Array.from(models).sort();
  }

  getWipDistinctLastSteps(stage = 'ALL') {
    const rawItems = (this.dataMass && this.dataMass.items) ? this.dataMass.items : [];
    const lastSteps = new Set();
    const isStageMatch = (st) => {
      if (!stage || stage === 'ALL') return true;
      if (Array.isArray(stage)) return stage.includes('ALL') || stage.includes(st);
      if (typeof stage === 'string' && stage.includes(',')) {
        const arr = stage.split(',').map(s => s.trim());
        return arr.includes('ALL') || arr.includes(st);
      }
      return stage === st;
    };
    rawItems.forEach(it => {
      if (isStageMatch(it.stage)) {
        if (it.lastStep && it.lastStep.trim()) lastSteps.add(it.lastStep.trim());
      }
    });
    return Array.from(lastSteps).sort();
  }

  /**
   * Tra cứu nguyên nhân âm / thiếu hụt sản lượng từ Sheet Mass-History.
   * Hỗ trợ lọc theo:
   * - 1 ngày cụ thể (date) & ca (shiftFilter: DAY, NIGHT, ALL, SPLIT)
   * - Khoảng thời gian / tuần (dates / fromDate - toDate): tự động tổng hợp tất cả nguyên nhân trong kỳ.
   */
  getShortageReasons({
    stage,
    model,
    productName1C,
    specCode,
    date,
    dates = [],
    shift = 'ALL'
  } = {}) {
    const historyList = window.MASS_HISTORY_DATA || (this.dataMass && this.dataMass.massHistory) || [];
    if (!historyList || historyList.length === 0) {
      return {
        items: [],
        uniqueReasons: [],
        totalGap: 0,
        hasReasons: false,
        isMultipleDays: false
      };
    }

    // 1. Tập hợp các ngày cần tra cứu (chấp nhận cả YYYY-MM-DD và M/D/YYYY)
    const targetDateSet = new Set();
    const addDateVariants = (dStr) => {
      if (!dStr) return;
      targetDateSet.add(dStr);
      if (dStr.includes('/')) {
        const parts = dStr.split('/');
        if (parts.length === 3) {
          const m = parts[0].padStart(2, '0');
          const d = parts[1].padStart(2, '0');
          const y = parts[2];
          targetDateSet.add(`${y}-${m}-${d}`);
        }
      } else if (dStr.includes('-')) {
        const parts = dStr.split('-');
        if (parts.length === 3) {
          const y = parts[0];
          const m = parseInt(parts[1], 10);
          const d = parseInt(parts[2], 10);
          targetDateSet.add(`${m}/${d}/${y}`);
        }
      }
    };

    if (date) addDateVariants(date);
    if (dates && Array.isArray(dates)) {
      dates.forEach(d => addDateVariants(d));
    }

    // 2. Chuẩn hóa tên sản phẩm, công đoạn, mã thông số kỹ thuật
    const cleanPname = (productName1C || '').toLowerCase().trim();
    const cleanModel = (model || '').toLowerCase().trim();
    const cleanSpec = (specCode || '').trim();
    const cleanStage = (stage || '').toLowerCase().trim();

    const isStageMatch = (recProcess) => {
      if (!cleanStage || cleanStage === 'all' || cleanStage === 'major_composite') return true;
      const rp = (recProcess || '').toLowerCase().trim();
      if (cleanStage === 'assembly') return rp === 'assembly';
      if (cleanStage.includes('hard')) return rp.includes('hard') || rp.includes('optics') || rp.includes('focus');
      return rp === cleanStage || cleanStage.includes(rp) || rp.includes(cleanStage);
    };

    const isShiftMatch = (recShift) => {
      if (!shift || shift === 'ALL' || shift === 'SPLIT') return true;
      const rs = (recShift || '').toLowerCase().trim();
      if (shift === 'DAY') return rs === 'day';
      if (shift === 'NIGHT') return rs === 'night';
      return true;
    };

    // 3. Lọc danh sách bản ghi
    const matched = [];
    const reasonSet = new Set();
    let totalGap = 0;

    for (let i = 0; i < historyList.length; i++) {
      const rec = historyList[i];
      if (targetDateSet.size > 0 && !targetDateSet.has(rec.date) && !targetDateSet.has(rec.rawDate)) {
        continue;
      }
      if (!isShiftMatch(rec.shift)) {
        continue;
      }
      if (!isStageMatch(rec.process)) {
        continue;
      }

      const recM = (rec.model || '').toLowerCase().trim();
      const recSpec = (rec.specCode || '').trim();

      let isMatch = false;
      if (cleanSpec && recSpec && cleanSpec === recSpec) {
        isMatch = true;
      } else if (cleanPname && recM === cleanPname) {
        isMatch = true;
      } else if (cleanPname && (recM.includes(cleanPname) || cleanPname.includes(recM))) {
        isMatch = true;
      } else if (cleanModel && recM.includes(cleanModel)) {
        isMatch = true;
      }

      if (isMatch) {
        matched.push(rec);
        if (rec.reason && rec.reason.trim()) {
          reasonSet.add(rec.reason.trim());
        }
        if (rec.gap < 0) {
          totalGap += rec.gap;
        }
      }
    }

    // Sắp xếp bản ghi theo ngày tăng dần, ca ngày trước ca đêm
    matched.sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      if (a.shift !== b.shift) return a.shift === 'day' ? -1 : 1;
      return 0;
    });

    const uniqueReasons = Array.from(reasonSet);
    const hasReasons = uniqueReasons.length > 0;

    return {
      items: matched,
      uniqueReasons,
      totalGap,
      hasReasons,
      isMultipleDays: targetDateSet.size > 2
    };
  }
}

window.AppStore = new Store();
window.getFactoryWeekRange = function(refDate, isFullWeek) {
  return window.AppStore ? window.AppStore.getFactoryWeekRange(refDate, isFullWeek) : null;
};
