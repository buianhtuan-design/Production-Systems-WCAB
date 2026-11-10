/**
 * =========================================================================
 * AJAX PROPLAN MES - KPI RESULT DASHBOARD MODULE (MASTER MULTI-METRIC)
 * =========================================================================
 * BẢNG TỔNG HỢP 5 CHỈ SỐ THEO CONCEPT ẢNH SỐ 2:
 * 1. Productivity
 * 2. Inspection remarks, %
 * 3. Scrap, % All
 * 4. Blocked batches (v1)
 * 5. Clip (all plant)
 * 
 * - Bộ lọc ĐÁNH GIÁ (Filter Đạt & Không đạt):
 *   + Dropdown filter trực tiếp tại Header Cột "ĐÁNH GIÁ" (Productivity & Remarks)
 *   + Dropdown filter đồng bộ trên thanh Toolbar
 *   + Cho phép lọc nhanh các Team 🟢 Đạt, 🔴 Chưa đạt hoặc Tất cả
 * - Dòng trên cùng: SFPD | SFPD | ALL (màu xanh lá) tổng hợp toàn nhà máy
 * - Các dòng Team: Danh sách Workcell A & Workcell B theo dòng chảy Focus ➔ HardTest ➔ Assembly
 * - Hàng Ave: Tính toán trung bình cho từng Stage ở các chỉ số có data (màu vàng nổi bật)
 * - Các chỉ số 3, 4, 5: Tạm thời data đặt ở dòng SFPD ALL, các team có ô Target tự input
 * - Cột Target cho phép người dùng tự do input, lưu tự động localStorage
 * - Hỗ trợ Copy cho Sheet (18 cột chuẩn khớp Excel) và Xuất file Sheet CSV UTF-8 BOM
 * =========================================================================
 */

(function() {
  'use strict';

  const RAW_KPI_PRODUCTIVITY_DATA = [{"id": "prod_1", "district": "Hard Test", "stage": "Total", "team": "", "fact": "103.284", "normH": "1,423,944,683", "haveH": "1,217,666,667", "result": "116,94%"}, {"id": "prod_2", "district": "Hard Test", "stage": "Focus", "team": "Total", "fact": "8.253", "normH": "", "haveH": "", "result": "131,42%"}, {"id": "prod_3", "district": "Hard Test", "stage": "Focus", "team": "[VTP] Workcell Video-Hard test-Team 1 A", "fact": "1.679", "normH": "5,783,222,222", "haveH": "3,883,333,333", "result": "148,92%"}, {"id": "prod_4", "district": "Hard Test", "stage": "Focus", "team": "[VTP] Workcell B-Hard Test-Team 1 B", "fact": "1.466", "normH": "5,085,069,444", "haveH": "", "result": "98,74%"}, {"id": "prod_5", "district": "Hard Test", "stage": "Focus", "team": "[VTP] Workcell A-Hard Test-Team 1 D", "fact": "1.29", "normH": "5,195,833,333", "haveH": "5,391,666,667", "result": "96,37%"}, {"id": "prod_6", "district": "Hard Test", "stage": "Focus", "team": "[VTP] WORKCELL B-Hard Test-Team 1 C", "fact": "1.061", "normH": "3,004,722,222", "haveH": "", "result": "109,26%"}, {"id": "prod_7", "district": "Hard Test", "stage": "Focus", "team": "! No Team", "fact": "1.484", "normH": "", "haveH": "", "result": ""}, {"id": "prod_8", "district": "Hard Test", "stage": "Focus", "team": "[VTP] Workcell A-Hard Test-Team 1 A", "fact": "1.273", "normH": "3,502,152,778", "haveH": "", "result": ""}, {"id": "prod_9", "district": "Hard Test", "stage": "HardTest", "team": "Total", "fact": "95.031", "normH": "1,198,234,683", "haveH": "1,045,916,667", "result": "114,56%"}, {"id": "prod_10", "district": "Hard Test", "stage": "HardTest", "team": "[VTP] Workcell B-Hard Test-Team 1 B", "fact": "10.002", "normH": "1,717,482,639", "haveH": "", "result": "101,33%"}, {"id": "prod_11", "district": "Hard Test", "stage": "HardTest", "team": "[VTP] Workcell A-Hard Test-Team 1 A", "fact": "7.232", "normH": "1,076,092,694", "haveH": "133", "result": "80,91%"}, {"id": "prod_12", "district": "Hard Test", "stage": "HardTest", "team": "[VTP] Workcell Video-Hard test-Team 1 A", "fact": "2.377", "normH": "4,999,748,611", "haveH": "46", "result": "108,69%"}, {"id": "prod_13", "district": "Hard Test", "stage": "HardTest", "team": "[VTP] Workcell A-Hard Test-Team 1 D", "fact": "26.984", "normH": "4,720,288,861", "haveH": "3,775,833,333", "result": "125,01%"}, {"id": "prod_14", "district": "Hard Test", "stage": "HardTest", "team": "[VTP] WORKCELL B-Hard Test-Team 1 C", "fact": "16.686", "normH": "3,490,689,667", "haveH": "3,198,333,333", "result": "109,14%"}, {"id": "prod_15", "district": "Hard Test", "stage": "HardTest", "team": "! No Team", "fact": "16.442", "normH": "", "haveH": "", "result": ""}, {"id": "prod_16", "district": "Hard Test", "stage": "HardTest", "team": "[VTP] Production Team", "fact": "24", "normH": "684,472,222", "haveH": "", "result": ""}, {"id": "prod_17", "district": "Hard Test", "stage": "HardTest", "team": "[VTP] Workcell A-Long Test-Team 1 B", "fact": "1", "normH": "35,638,889", "haveH": "", "result": ""}, {"id": "prod_18", "district": "Hard Test", "stage": "HardTest", "team": "[VTP] Workcell A-PKG-Team 1 C", "fact": "4.089", "normH": "12,291,667", "haveH": "", "result": ""}, {"id": "prod_19", "district": "Hard Test", "stage": "HardTest", "team": "[VTP] Workcell A-QC-Team", "fact": "890", "normH": "6,488,661,111", "haveH": "", "result": ""}, {"id": "prod_20", "district": "Hard Test", "stage": "HardTest", "team": "[VTP] WORKCELL B-Long Test-Team 1 A", "fact": "3.415", "normH": "3,991,955,556", "haveH": "", "result": ""}, {"id": "prod_21", "district": "Hard Test", "stage": "HardTest", "team": "[VTP] WORKCELL B-PKG-Team 1 B", "fact": "3.417", "normH": "0", "haveH": "", "result": ""}, {"id": "prod_22", "district": "Hard Test", "stage": "HardTest", "team": "[VTP] Workcell B-PKG-Team 1 D", "fact": "3.438", "normH": "0", "haveH": "", "result": ""}, {"id": "prod_23", "district": "Hard Test", "stage": "HardTest", "team": "[VTP] Workcell DRD-Assembly Rework-Team 1 A", "fact": "4", "normH": "126,472,222", "haveH": "", "result": ""}, {"id": "prod_24", "district": "Hard Test", "stage": "HardTest", "team": "[VTP] Workcell DRD-Assembly Rework-Team 1 B", "fact": "24", "normH": "397,136,111", "haveH": "", "result": ""}, {"id": "prod_25", "district": "Hard Test", "stage": "HardTest", "team": "[VTP] Workcell DRD-Assembly Rework-Team 1 D", "fact": "6", "normH": "117,583,333", "haveH": "", "result": ""}, {"id": "prod_26", "district": "Long Test", "stage": "Total", "team": "", "fact": "121.65", "normH": "6,151,323,824", "haveH": "5,518,333,333", "result": "111,47%"}, {"id": "prod_27", "district": "Long Test", "stage": "TestRoom", "team": "Total", "fact": "26.379", "normH": "2,849,170,963", "haveH": "", "result": "127,34%"}, {"id": "prod_28", "district": "Long Test", "stage": "LongTest", "team": "Total", "fact": "54.699", "normH": "3,302,152,861", "haveH": "3,280,833,333", "result": "100,65%"}, {"id": "prod_29", "district": "Long Test", "stage": "Calibration", "team": "Total", "fact": "40.572", "normH": "", "haveH": "", "result": ""}, {"id": "prod_30", "district": "QC", "stage": "Total", "team": "", "fact": "63.547", "normH": "1,207,922,083", "haveH": "", "result": "116,74%"}, {"id": "prod_31", "district": "QC", "stage": "QC", "team": "Total", "fact": "63.547", "normH": "1,207,922,083", "haveH": "", "result": "116,74%"}, {"id": "prod_32", "district": "Assembly", "stage": "Total", "team": "", "fact": "65.829", "normH": "3,102,391,667", "haveH": "3,319,833,333", "result": "93,45%"}, {"id": "prod_33", "district": "Assembly", "stage": "Assembly", "team": "Total", "fact": "65.829", "normH": "3,102,391,667", "haveH": "3,319,833,333", "result": "93,45%"}, {"id": "prod_34", "district": "Assembly", "stage": "Assembly", "team": "[VTP] Workcell A-Assembly-Team 1 B", "fact": "1.003", "normH": "1,287,922,222", "haveH": "1,191,666,667", "result": "108,08%"}, {"id": "prod_35", "district": "Assembly", "stage": "Assembly", "team": "[VTP] WORKCELL B-Assembly-Team 3 C", "fact": "7.151", "normH": "3,227,905,556", "haveH": "326", "result": "99,02%"}, {"id": "prod_36", "district": "Assembly", "stage": "Assembly", "team": "[VTP] Workcell Fire-Assembly-Team 1 D", "fact": "2.689", "normH": "2,656,347,222", "haveH": "2,676,666,667", "result": "99,24%"}, {"id": "prod_37", "district": "Assembly", "stage": "Assembly", "team": "[VTP] Workcell Fire-Assembly-Team 2 B", "fact": "595", "normH": "", "haveH": "77", "result": "69,55%"}, {"id": "prod_38", "district": "Assembly", "stage": "Assembly", "team": "[VTP] WORKCELL B-Assembly-Team 2 D", "fact": "317", "normH": "4,826,611,111", "haveH": "3,921,666,667", "result": "12,31%"}, {"id": "prod_39", "district": "Assembly", "stage": "Assembly", "team": "[VTP] Workcell Fire-Assembly-Team 1 C", "fact": "2.136", "normH": "2,361,761,111", "haveH": "3,466,666,667", "result": "68,13%"}, {"id": "prod_40", "district": "Assembly", "stage": "Assembly", "team": "[VTP] WORKCELL B-Assembly-Team 2 B", "fact": "13.45", "normH": "1,832,133,333", "haveH": "2,399,166,667", "result": "76,37%"}, {"id": "prod_41", "district": "Assembly", "stage": "Assembly", "team": "[VTP] Workcell Video-Assembly-Team 1 A", "fact": "443", "normH": "6,078,944,444", "haveH": "1,061,666,667", "result": "57,26%"}, {"id": "prod_42", "district": "Assembly", "stage": "Assembly", "team": "[VTP] WORKCELL B-Assembly-Team 1 C", "fact": "7.004", "normH": "3,645,375", "haveH": "3,168,333,333", "result": "115,06%"}, {"id": "prod_43", "district": "Assembly", "stage": "Assembly", "team": "[VTP] WORKCELL B-Assembly-Team 2 A", "fact": "1.901", "normH": "1,431,672,222", "haveH": "1,925,833,333", "result": "74,34%"}, {"id": "prod_44", "district": "Assembly", "stage": "Assembly", "team": "[VTP] WORKCELL B-Assembly-Team 3 A", "fact": "2.009", "normH": "1,057,288,889", "haveH": "1,551,666,667", "result": "68,14%"}, {"id": "prod_45", "district": "Assembly", "stage": "Assembly", "team": "[VTP] Workcell A-Assembly-Team 1 D", "fact": "7.579", "normH": "3,775,872,222", "haveH": "4,098,333,333", "result": "92,13%"}, {"id": "prod_46", "district": "Assembly", "stage": "Assembly", "team": "[VTP] WORKCELL B-Assembly-Team 1 A", "fact": "5.38", "normH": "1,226,036,111", "haveH": "5,716,666,667", "result": "214,47%"}, {"id": "prod_47", "district": "Assembly", "stage": "Assembly", "team": "[VTP] Workcell Fire-Assembly-Team 1 B", "fact": "2.725", "normH": "2,421,894,444", "haveH": "", "result": "100,39%"}, {"id": "prod_48", "district": "Assembly", "stage": "Assembly", "team": "! No Team", "fact": "5.694", "normH": "", "haveH": "", "result": ""}, {"id": "prod_49", "district": "Assembly", "stage": "Assembly", "team": "[VTP] Production Team", "fact": "177", "normH": "1,264,805,556", "haveH": "", "result": ""}, {"id": "prod_50", "district": "Assembly", "stage": "Assembly", "team": "[VTP] Workcell A-QC-Team 1 C", "fact": "887", "normH": "921,825", "haveH": "", "result": ""}, {"id": "prod_51", "district": "Assembly", "stage": "Assembly", "team": "[VTP] Workcell B-Assembly-Team 3 B", "fact": "42", "normH": "1,105", "haveH": "", "result": ""}, {"id": "prod_52", "district": "Assembly", "stage": "Assembly", "team": "[VTP] WORKCELL B-PKG-Team 1 A", "fact": "493", "normH": "0", "haveH": "", "result": ""}, {"id": "prod_53", "district": "Assembly", "stage": "Assembly", "team": "[VTP] Workcell DRD-Assembly Rework-Team 1 A", "fact": "234", "normH": "2,083,527,778", "haveH": "", "result": ""}, {"id": "prod_54", "district": "Assembly", "stage": "Assembly", "team": "[VTP] Workcell DRD-Assembly Rework-Team 1 B", "fact": "611", "normH": "5,270,916,667", "haveH": "", "result": ""}, {"id": "prod_55", "district": "Assembly", "stage": "Assembly", "team": "[VTP] Workcell DRD-Assembly Rework-Team 1 D", "fact": "438", "normH": "3,805,305,556", "haveH": "", "result": ""}, {"id": "prod_56", "district": "Assembly", "stage": "Assembly", "team": "[VTP] Workcell Fire-Assembly-Team 1 A", "fact": "500", "normH": "3,333,333,333", "haveH": "4,491,666,667", "result": "74,21%"}, {"id": "prod_57", "district": "Assembly", "stage": "Assembly", "team": "[VTP] Workcell Fire-Assembly-Team 2 A", "fact": "327", "normH": "", "haveH": "2,733,333,333", "result": "107,67%"}, {"id": "prod_58", "district": "Assembly", "stage": "Assembly", "team": "[VTP] Workcell Fire-Assembly-Team 2 C", "fact": "1.266", "normH": "", "haveH": "", "result": ""}, {"id": "prod_59", "district": "Assembly", "stage": "Assembly", "team": "[VTP] WORKCELL-Assembly-Team 2D", "fact": "778", "normH": "5,312,888,889", "haveH": "", "result": ""}, {"id": "prod_60", "district": "PKG", "stage": "Total", "team": "", "fact": "62.955", "normH": "1,711,966,028", "haveH": "1,568,333,333", "result": "109,16%"}, {"id": "prod_61", "district": "PKG", "stage": "PKG", "team": "Total", "fact": "62.955", "normH": "1,711,966,028", "haveH": "1,568,333,333", "result": "109,16%"}, {"id": "prod_62", "district": "DIP", "stage": "Total", "team": "", "fact": "92.626", "normH": "9,897,431,389", "haveH": "", "result": "89,50%"}, {"id": "prod_63", "district": "DIP", "stage": "DIP", "team": "Total", "fact": "92.626", "normH": "9,897,431,389", "haveH": "", "result": "89,50%"}, {"id": "prod_64", "district": "COM PKG", "stage": "Total", "team": "", "fact": "47.06", "normH": "3,687,277,778", "haveH": "", "result": "86,25%"}, {"id": "prod_65", "district": "COM PKG", "stage": "Completing PKG", "team": "Total", "fact": "47.06", "normH": "3,687,277,778", "haveH": "", "result": "86,25%"}, {"id": "prod_66", "district": "Masterbox", "stage": "Total", "team": "", "fact": "51.518", "normH": "1,693,908,111", "haveH": "1,436,666,667", "result": "117,91%"}, {"id": "prod_67", "district": "Masterbox", "stage": "Masterbox", "team": "Total", "fact": "51.518", "normH": "1,693,908,111", "haveH": "1,436,666,667", "result": "117,91%"}, {"id": "prod_68", "district": "Total", "stage": "", "team": "", "fact": "608.469", "normH": "9,589,218,571", "haveH": "9,369,433,333", "result": "102,35%"}];
  const RAW_KPI_REMARKS_DATA = [{"team": "[VTP] WH-Warehouse PROD-Team 1 A", "resultAve": "96 %", "count": "2"}, {"team": "[VTP] WH-Warehouse PROD-Team 1 B", "resultAve": "100 %", "count": "1"}, {"team": "[VTP] WH-Warehouse PROD-Team 1 C", "resultAve": "100 %", "count": "3"}, {"team": "[VTP] WH-Warehouse PROD-Team 1 D", "resultAve": "100 %", "count": "1"}, {"team": "[VTP] Workcell A-Assembly-Team 1 B", "resultAve": "93 %", "count": "2"}, {"team": "[VTP] Workcell A-Assembly-Team 2 C", "resultAve": "100 %", "count": "2"}, {"team": "[VTP] Workcell A-Hard Test-Team 1 A", "resultAve": "100 %", "count": "1"}, {"team": "[VTP] Workcell A-Hard Test-Team 1 D", "resultAve": "100 %", "count": "3"}, {"team": "[VTP] Workcell A-Long Test-Team 1 B", "resultAve": "100 %", "count": "1"}, {"team": "[VTP] Workcell A-Masterbox-Team 1 A", "resultAve": "100 %", "count": "1"}, {"team": "[VTP] Workcell A-Masterbox-Team 1 B", "resultAve": "100 %", "count": "1"}, {"team": "[VTP] Workcell A-Masterbox-Team 1 D", "resultAve": "100 %", "count": "1"}, {"team": "[VTP] Workcell A-PKG-Team 1 C", "resultAve": "100 %", "count": "3"}, {"team": "[VTP] Workcell A-QC-Team 1 C", "resultAve": "100 %", "count": "3"}, {"team": "[VTP] Workcell B-Assembly-Team 1 A", "resultAve": "96 %", "count": "2"}, {"team": "[VTP] Workcell B-Assembly-Team 1 C", "resultAve": "96 %", "count": "3"}, {"team": "[VTP] Workcell B-Assembly-Team 1 D", "resultAve": "93 %", "count": "3"}, {"team": "[VTP] Workcell B-Assembly-Team 2 A", "resultAve": "100 %", "count": "1"}, {"team": "[VTP] Workcell B-Assembly-Team 2 B", "resultAve": "87 %", "count": "1"}, {"team": "[VTP] Workcell B-Assembly-Team 2 D", "resultAve": "95 %", "count": "3"}, {"team": "[VTP] Workcell B-Assembly-Team 3 A", "resultAve": "96 %", "count": "2"}, {"team": "[VTP] Workcell B-Assembly-Team 3 C", "resultAve": "95 %", "count": "5"}, {"team": "[VTP] Workcell B-COM PKG-Team 1 A", "resultAve": "100 %", "count": "2"}, {"team": "[VTP] Workcell B-COM PKG-Team 1 C", "resultAve": "100 %", "count": "1"}, {"team": "[VTP] Workcell B-COM PKG-Team 1 D", "resultAve": "100 %", "count": "3"}, {"team": "[VTP] Workcell B-Hard Test-Team 1 B", "resultAve": "100 %", "count": "2"}, {"team": "[VTP] Workcell B-Hard Test-Team 1 C", "resultAve": "100 %", "count": "3"}, {"team": "[VTP] Workcell B-Long Test-Team 1 A", "resultAve": "99 %", "count": "3"}, {"team": "[VTP] Workcell B-Long Test-Team 1 C", "resultAve": "96 %", "count": "4"}, {"team": "[VTP] Workcell B-Long Test-Team 1 D", "resultAve": "100 %", "count": "4"}, {"team": "[VTP] Workcell B-Masterbox-Team 1 A", "resultAve": "100 %", "count": "1"}, {"team": "[VTP] Workcell B-Masterbox-Team 1 B", "resultAve": "75 %", "count": "1"}, {"team": "[VTP] Workcell B-Masterbox-Team 1 C", "resultAve": "100 %", "count": "2"}, {"team": "[VTP] Workcell B-Masterbox-Team 1 D", "resultAve": "100 %", "count": "2"}, {"team": "[VTP] Workcell B-PKG FULL-Team 1 A", "resultAve": "100 %", "count": "1"}, {"team": "[VTP] Workcell B-PKG FULL-Team 1 B", "resultAve": "100 %", "count": "1"}, {"team": "[VTP] Workcell B-PKG-Team 1 A", "resultAve": "100 %", "count": "1"}, {"team": "[VTP] Workcell B-PKG-Team 1 B", "resultAve": "100 %", "count": "1"}, {"team": "[VTP] Workcell B-PKG-Team 1 D", "resultAve": "100 %", "count": "3"}, {"team": "[VTP] Workcell B-QC-Team 1 A", "resultAve": "100 %", "count": "2"}, {"team": "[VTP] Workcell B-QC-Team 1 B", "resultAve": "100 %", "count": "2"}, {"team": "[VTP] Workcell B-QC-Team 1 D", "resultAve": "100 %", "count": "4"}, {"team": "[VTP] Workcell DRD-Assembly Rework-Team 1 A", "resultAve": "100 %", "count": "2"}, {"team": "[VTP] Workcell DRD-Assembly Rework-Team 1 C", "resultAve": "100 %", "count": "3"}, {"team": "[VTP] Workcell DRD-Assembly Rework-Team 1 D", "resultAve": "95 %", "count": "4"}, {"team": "[VTP] Workcell DRD-Debug-Team 1 A", "resultAve": "100 %", "count": "2"}, {"team": "[VTP] Workcell DRD-Debug-Team 1 C", "resultAve": "100 %", "count": "3"}, {"team": "[VTP] Workcell DRD-Debug-Team 1 D", "resultAve": "100 %", "count": "3"}, {"team": "[VTP] Workcell Fire-Assembly-Team 1 A", "resultAve": "96 %", "count": "2"}, {"team": "[VTP] Workcell Fire-Assembly-Team 1 C", "resultAve": "100 %", "count": "3"}, {"team": "[VTP] Workcell Fire-Assembly-Team 1 D", "resultAve": "96 %", "count": "3"}, {"team": "[VTP] Workcell Fire-Long Test-Team 1 C", "resultAve": "100 %", "count": "3"}, {"team": "[VTP] Workcell Fire-Long Test-Team 1 D", "resultAve": "100 %", "count": "1"}, {"team": "[VTP] Workcell Fire-PKG-Team 1 A", "resultAve": "100 %", "count": "1"}, {"team": "[VTP] Workcell Fire-PKG-Team 1 C", "resultAve": "100 %", "count": "3"}, {"team": "[VTP] Workcell Fire-PKG-Team 1 D", "resultAve": "92 %", "count": "2"}, {"team": "[VTP] Workcell UEA-DIP-Team 1 A", "resultAve": "100 %", "count": "2"}, {"team": "[VTP] Workcell UEA-DIP-Team 1 B", "resultAve": "100 %", "count": "1"}, {"team": "[VTP] Workcell UEA-DIP-Team 1 C", "resultAve": "95 %", "count": "3"}, {"team": "[VTP] Workcell UEA-DIP-Team 1 D", "resultAve": "98 %", "count": "4"}, {"team": "[VTP] Workcell UEA-Lacquering-Team 1 A", "resultAve": "100 %", "count": "2"}, {"team": "[VTP] Workcell UEA-Lacquering-Team 1 B", "resultAve": "100 %", "count": "2"}, {"team": "[VTP] Workcell UEA-Lacquering-Team 1 C", "resultAve": "100 %", "count": "3"}, {"team": "[VTP] Workcell UEA-Lacquering-Team 1 D", "resultAve": "100 %", "count": "3"}, {"team": "[VTP] Workcell UEA-Selective-Team 1 A", "resultAve": "100 %", "count": "2"}, {"team": "[VTP] Workcell UEA-Selective-Team 1 B", "resultAve": "100 %", "count": "2"}, {"team": "[VTP] Workcell UEA-Selective-Team 1 C", "resultAve": "100 %", "count": "3"}, {"team": "[VTP] Workcell UEA-Selective-Team 1 D", "resultAve": "100 %", "count": "3"}, {"team": "[VTP] Workcell UEA-SMT-Team 1 A", "resultAve": "100 %", "count": "2"}, {"team": "[VTP] Workcell UEA-SMT-Team 1 B", "resultAve": "100 %", "count": "2"}, {"team": "[VTP] Workcell UEA-SMT-Team 1 C", "resultAve": "100 %", "count": "3"}, {"team": "[VTP] Workcell UEA-SMT-Team 1 D", "resultAve": "99 %", "count": "3"}, {"team": "[VTP] Workcell Video-Assembly-Team 1 A", "resultAve": "95 %", "count": "5"}, {"team": "[VTP] Workcell Video-Hard Test-Team 1 A", "resultAve": "100 %", "count": "5"}, {"team": "[VTP] Workcell Video-Long test-Team 1 A", "resultAve": "100 %", "count": "2"}, {"team": "[VTP] Workcell Video-PKG-Team 1 A", "resultAve": "100 %", "count": "3"}, {"team": "Total", "resultAve": "98 %", "count": "178"}, {"team": "Applied filters:Date is on or after 11/1/2026 and is before 11/6/2026", "resultAve": "", "count": ""}];

  /**
   * Lấy khoảng thời gian mặc định: Từ đầu tháng đến ngày hôm trước (yesterday)
   */
  function getKpiDefaultDateRange() {
    const d = new Date();
    const pad = n => String(n).padStart(2, '0');
    const fmt = dt => `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;

    const startOfMonth = new Date(d.getFullYear(), d.getMonth(), 1);
    const yesterday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1);
    const finalToDate = yesterday < startOfMonth ? startOfMonth : yesterday;

    return {
      fromDate: fmt(startOfMonth),
      toDate: fmt(finalToDate),
      label: `Từ ${fmt(startOfMonth)} ➔ ${fmt(finalToDate)}`
    };
  }

  const defaultRange = getKpiDefaultDateRange();

  // Khởi tạo Map tra cứu Remarks mặc định theo Team
  function buildRemarksLookupMap(rawList) {
    const map = {};
    if (Array.isArray(rawList)) {
      rawList.forEach(item => {
        if (item.team) {
          const key = item.team.trim().replace(/\s+/g, ' ').toUpperCase();
          map[key] = item.resultAve;
        }
      });
    }
    return map;
  }

  // Kiểm tra danh sách Productivity có chứa ít nhất 1 team Workcell A/B hợp lệ hay không
  function hasValidWorkcellTeams(list) {
    return Array.isArray(list) && list.some(item => item && isWorkcellAorB(item.team));
  }

  function getMasterRemarksList() {
    if (window.KpiResultStore && Array.isArray(window.KpiResultStore.customRemarksData) && window.KpiResultStore.customRemarksData.length > 0) {
      return window.KpiResultStore.customRemarksData;
    }
    if (window.KPI_MASTER_DATA && Array.isArray(window.KPI_MASTER_DATA.remarks) && window.KPI_MASTER_DATA.remarks.length > 0) {
      return window.KPI_MASTER_DATA.remarks;
    }
    return RAW_KPI_REMARKS_DATA;
  }

  // Khởi tạo Store lưu trữ trạng thái KPI Result
  window.KpiResultStore = {
    fromDate: defaultRange.fromDate,
    toDate: defaultRange.toDate,
    stageFilter: 'ALL',   // 'ALL' | 'Focus' | 'HardTest' | 'Assembly'
    evalFilter: 'ALL',    // 'ALL' | 'PROD_PASS' | 'PROD_FAIL' | 'REM_PASS' | 'REM_FAIL'
    customProductivityData: null,
    customRemarksData: null,
    customScrapData: null,
    lastSyncedAt: (window.KPI_MASTER_DATA && window.KPI_MASTER_DATA.timestamp) || null,
    filterNote: (window.KPI_MASTER_DATA && window.KPI_MASTER_DATA.meta && window.KPI_MASTER_DATA.meta.remarksFilterNote) || '',
    remarksMap: buildRemarksLookupMap((window.KPI_MASTER_DATA && window.KPI_MASTER_DATA.remarks) || RAW_KPI_REMARKS_DATA),
    targetsMap: {}, // Lưu toàn bộ targets theo key: `${metric}_${district}_${stage}_${team}`
    resultsMap: {}  // Lưu các kết quả nhập tay (Scrap, Blocked...) theo key: `${metric}_${district}_${stage}_${team}`
  };

  // Khôi phục targets và custom data từ localStorage
  try {
    const savedTargets = localStorage.getItem('AJAX_PROPLAN_KPI_ALL_TARGETS');
    if (savedTargets) {
      window.KpiResultStore.targetsMap = JSON.parse(savedTargets) || {};
    } else {
      const oldProdTargets = localStorage.getItem('AJAX_PROPLAN_KPI_TARGETS');
      if (oldProdTargets) {
        const pMap = JSON.parse(oldProdTargets);
        Object.keys(pMap).forEach(k => {
          window.KpiResultStore.targetsMap[`prod_${k}`] = pMap[k];
        });
      }
    }

    const savedResults = localStorage.getItem('AJAX_PROPLAN_KPI_ALL_RESULTS');
    if (savedResults) {
      window.KpiResultStore.resultsMap = JSON.parse(savedResults) || {};
    }

    const savedCustomProd = localStorage.getItem('AJAX_PROPLAN_KPI_PRODUCTIVITY_CUSTOM_DATA');
    if (savedCustomProd) {
      const parsedProd = JSON.parse(savedCustomProd);
      // Nếu bản lưu tạm bị rỗng Workcell teams (do lỗi sync cũ), tự động loại bỏ để không hiển thị 0 Teams
      if (hasValidWorkcellTeams(parsedProd)) {
        window.KpiResultStore.customProductivityData = parsedProd;
      } else {
        localStorage.removeItem('AJAX_PROPLAN_KPI_PRODUCTIVITY_CUSTOM_DATA');
      }
    }
    const savedCustomRemarks = localStorage.getItem('AJAX_PROPLAN_KPI_REMARKS_CUSTOM_DATA');
    if (savedCustomRemarks) {
      const parsedRem = JSON.parse(savedCustomRemarks);
      if (Array.isArray(parsedRem) && parsedRem.length > 0) {
        window.KpiResultStore.customRemarksData = parsedRem;
        window.KpiResultStore.remarksMap = buildRemarksLookupMap(parsedRem);
      } else {
        localStorage.removeItem('AJAX_PROPLAN_KPI_REMARKS_CUSTOM_DATA');
      }
    }
    const savedCustomScrap = localStorage.getItem('AJAX_PROPLAN_KPI_SCRAP_CUSTOM_DATA');
    if (savedCustomScrap) {
      window.KpiResultStore.customScrapData = JSON.parse(savedCustomScrap);
    }
    const savedMeta = localStorage.getItem('AJAX_PROPLAN_KPI_META_CUSTOM_DATA');
    if (savedMeta) {
      const parsedMeta = JSON.parse(savedMeta);
      if (parsedMeta && parsedMeta.timestamp) window.KpiResultStore.lastSyncedAt = parsedMeta.timestamp;
      if (parsedMeta && parsedMeta.filterNote) window.KpiResultStore.filterNote = parsedMeta.filterNote;
    }
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const urlEval = urlParams.get('kpiEvalFilter');
      if (urlEval) {
        window.KpiResultStore.evalFilter = urlEval;
      }
    } catch (e) {}
  } catch (e) {
    console.warn('Lỗi đọc localStorage KPI:', e);
  }

  /**
   * Lấy dữ liệu Productivity hiện hành
   */
  function getCurrentProductivityData() {
    if (hasValidWorkcellTeams(window.KpiResultStore.customProductivityData)) {
      return window.KpiResultStore.customProductivityData;
    }
    if (window.KPI_MASTER_DATA && hasValidWorkcellTeams(window.KPI_MASTER_DATA.productivity)) {
      return window.KPI_MASTER_DATA.productivity;
    }
    return RAW_KPI_PRODUCTIVITY_DATA;
  }

  /**
   * Kiểm tra Team có thuộc Workcell A hoặc Workcell B hay không
   */
  function isWorkcellAorB(team) {
    if (!team) return false;
    const t = String(team).trim().toUpperCase();
    return t.includes('WORKCELL A') || t.includes('WORKCEL A') ||
           t.includes('WORKCELL B') || t.includes('WORKCEL B');
  }

  /**
   * Hàm xếp thứ tự dòng chảy Stage: Focus (1) -> HardTest (2) -> Assembly (3) -> các stage khác
   */
  function getStageSortWeight(stage) {
    if (!stage) return 99;
    const s = String(stage).trim().toLowerCase();
    if (s === 'focus') return 1;
    if (s === 'hardtest' || s === 'hard test') return 2;
    if (s === 'assembly') return 3;
    return 20;
  }

  /**
   * Hàm xếp thứ tự Team: Workcell A -> Workcell B
   */
  function getTeamSortWeight(team) {
    if (!team) return { rank: 99, text: '' };
    const t = String(team).trim().toUpperCase();
    if (t.includes('WORKCELL A') || t.includes('WORKCEL A')) {
      return { rank: 1, text: t };
    }
    if (t.includes('WORKCELL B') || t.includes('WORKCEL B')) {
      return { rank: 2, text: t };
    }
    return { rank: 5, text: t };
  }

  /**
   * Lấy Target đa năng theo metric và record
   */
  function getMetricTarget(metric, district, stage, team, defaultVal = 95) {
    const key = `${metric}_${district}_${stage}_${team}`;
    if (window.KpiResultStore.targetsMap && window.KpiResultStore.targetsMap[key] !== undefined) {
      return window.KpiResultStore.targetsMap[key];
    }
    return defaultVal;
  }

  /**
   * Lấy Result nhập tay (Scrap, Blocked...) theo metric và record
   */
  function getMetricResultInput(metric, district, stage, team, defaultVal = '') {
    const key = `${metric}_${district}_${stage}_${team}`;
    if (window.KpiResultStore.resultsMap && window.KpiResultStore.resultsMap[key] !== undefined) {
      return window.KpiResultStore.resultsMap[key];
    }
    return defaultVal;
  }

  function parseNumericInput(val) {
    if (val === null || val === undefined) return null;
    const s = String(val).replace('%', '').replace(',', '.').trim();
    if (!s) return null;
    const n = parseFloat(s);
    return isNaN(n) ? null : n;
  }

  function evaluateRowMetricBadge(row, metric) {
    if (!row) return;
    const badge = row.querySelector(`.kpi-eval-badge-${metric}`);
    const targetInput = row.querySelector(`.kpi-target-input-${metric}`);
    const resultInput = row.querySelector(`.kpi-result-input-${metric}`);

    const targetVal = targetInput ? parseNumericInput(targetInput.value) : parseNumericInput(row.getAttribute(`data-${metric}-target`));
    const resVal = resultInput ? parseNumericInput(resultInput.value) : parseNumericInput(row.getAttribute(`data-${metric}-val`));

    if (targetInput) {
      row.setAttribute(`data-${metric}-target`, targetVal !== null ? String(targetVal) : '');
    }
    if (resultInput) {
      row.setAttribute(`data-${metric}-val`, resVal !== null ? String(resVal) : '');
    }

    if (!badge) return;
    if (targetVal !== null && resVal !== null) {
      const isBetterLower = metric === 'scrap' || metric === 'blocked';
      const isPass = isBetterLower ? (resVal <= targetVal) : (resVal >= targetVal);
      if (isPass) {
        badge.className = `badge badge-green kpi-eval-badge-${metric}`;
        badge.style.color = '';
        badge.style.fontSize = '';
        badge.textContent = '🟢 Đạt';
      } else {
        badge.className = `badge badge-red kpi-eval-badge-${metric}`;
        badge.style.color = '';
        badge.style.fontSize = '';
        badge.textContent = '🔴 Chưa đạt';
      }
      if (resultInput) {
        resultInput.style.color = isPass ? '#34d399' : '#f87171';
      }
    } else {
      badge.className = `kpi-eval-badge-${metric}`;
      badge.style.color = 'var(--text-muted)';
      badge.style.fontSize = '0.675rem';
      badge.textContent = '-';
      if (resultInput) {
        resultInput.style.color = row.getAttribute('data-is-sfpd') === 'true' ? '#ffffff' : '#f8fafc';
      }
    }
  }

  function refreshStageAveManualMetric(stageName, metric) {
    if (!stageName) return;
    const table = document.getElementById('kpiMasterTableMain');
    if (!table) return;
    const aveRow = table.querySelector(`tr[data-is-ave="true"][data-stage-group="${CSS.escape ? CSS.escape(stageName) : stageName}"]`);
    if (!aveRow) return;
    const aveDistrict = aveRow.getAttribute('data-district') || '';
    const aveKey = `${metric}_${aveDistrict}_${stageName}_Ave`;
    // Nếu người dùng tự nhập trực tiếp cho hàng Ave thì giữ nguyên giá trị nhập tay ở hàng Ave
    if (window.KpiResultStore.resultsMap && window.KpiResultStore.resultsMap[aveKey] !== undefined && String(window.KpiResultStore.resultsMap[aveKey]).trim() !== '') {
      return;
    }

    const teamRows = table.querySelectorAll(`tr[data-is-team="true"][data-stage-group="${CSS.escape ? CSS.escape(stageName) : stageName}"]`);
    const nums = [];
    teamRows.forEach(tr => {
      const inp = tr.querySelector(`.kpi-result-input-${metric}`);
      const n = inp ? parseNumericInput(inp.value) : null;
      if (n !== null) nums.push(n);
    });

    const aveInp = aveRow.querySelector(`.kpi-result-input-${metric}`);
    if (aveInp) {
      if (nums.length > 0) {
        const avg = Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 100) / 100;
        aveInp.value = String(avg);
        aveRow.setAttribute(`data-${metric}-val`, String(avg));
      } else {
        aveInp.value = '';
        aveRow.setAttribute(`data-${metric}-val`, '');
      }
    }
    evaluateRowMetricBadge(aveRow, metric);
  }

  /**
   * Lưu target khi người dùng tự input
   */
  window.handleKpiUniversalTargetChange = function(inputElem, metric, district, stage, team) {
    const raw = String(inputElem.value || '').trim();
    const key = `${metric}_${district}_${stage}_${team}`;
    if (!window.KpiResultStore.targetsMap) window.KpiResultStore.targetsMap = {};

    if (raw === '') {
      // Nếu người dùng xóa trắng Target của Scrap/Blocked thì giữ rỗng, các chỉ số khác giữ mặc định hoặc rỗng
      if (metric === 'scrap' || metric === 'blocked' || team !== 'ALL') {
        window.KpiResultStore.targetsMap[key] = '';
      } else {
        delete window.KpiResultStore.targetsMap[key];
      }
    } else {
      const val = parseNumericInput(raw);
      if (val !== null) {
        window.KpiResultStore.targetsMap[key] = val;
      }
    }

    try {
      localStorage.setItem('AJAX_PROPLAN_KPI_ALL_TARGETS', JSON.stringify(window.KpiResultStore.targetsMap));
    } catch (e) {}

    const row = inputElem.closest('tr');
    evaluateRowMetricBadge(row, metric);
  };

  /**
   * Lưu Result khi người dùng tự input (dành cho Scrap, % All và Blocked batches (v1))
   */
  window.handleKpiUniversalResultChange = function(inputElem, metric, district, stage, team) {
    const raw = String(inputElem.value || '').trim();
    const key = `${metric}_${district}_${stage}_${team}`;
    if (!window.KpiResultStore.resultsMap) window.KpiResultStore.resultsMap = {};

    if (raw === '') {
      delete window.KpiResultStore.resultsMap[key];
    } else {
      window.KpiResultStore.resultsMap[key] = raw;
    }

    try {
      localStorage.setItem('AJAX_PROPLAN_KPI_ALL_RESULTS', JSON.stringify(window.KpiResultStore.resultsMap));
    } catch (e) {}

    const row = inputElem.closest('tr');
    evaluateRowMetricBadge(row, metric);

    if (team !== 'Ave' && team !== 'ALL') {
      refreshStageAveManualMetric(stage, metric);
    }
  };

  /**
   * Tra cứu số liệu Inspection remarks cho 1 team
   */
  function getRemarksResultForTeam(teamName) {
    if (!teamName) return null;
    const key = teamName.trim().replace(/\s+/g, ' ').toUpperCase();
    const val = window.KpiResultStore.remarksMap ? window.KpiResultStore.remarksMap[key] : null;
    return val || null;
  }

  /**
   * Parse số phần trăm từ chuỗi (vd "148,92%" -> 148.92)
   */
  function parsePercentVal(pctStr) {
    if (!pctStr || pctStr === '-') return null;
    let s = String(pctStr).replace('%', '').trim();
    s = s.replace(',', '.');
    const n = parseFloat(s);
    return isNaN(n) ? null : n;
  }

  /**
   * Lấy kết quả thực tế (Actual) của Clip (all plant) từ Tab Tra Cứu Clips All
   */
  function getClipsAllActualFromClipsTab() {
    const st = window.KpiResultStore;
    let targetMonth = '';
    if (st && st.fromDate && st.fromDate.length >= 7) {
      targetMonth = st.fromDate.substring(0, 7);
    } else if (st && st.toDate && st.toDate.length >= 7) {
      targetMonth = st.toDate.substring(0, 7);
    }

    // 1. Đồng bộ kỳ ngày sang ClipsPlanStore nếu có
    if (window.ClipsPlanStore && st) {
      if (st.fromDate) window.ClipsPlanStore.fromDate = st.fromDate;
      if (st.toDate) window.ClipsPlanStore.toDate = st.toDate;
      if (targetMonth) {
        window.ClipsPlanStore.selectedHistoryMonth = targetMonth;
      }
    }

    // 2. Thử lấy từ hàm buildClipsAllPlanData của Tab Tra Cứu Clips All
    if (typeof window.buildClipsAllPlanData === 'function') {
      try {
        const dataObj = window.buildClipsAllPlanData();
        if (dataObj && dataObj.stats) {
          const stats = dataObj.stats;
          const rateStr = stats.clipAllPlantRate || stats.clipsOverallRate;
          if (rateStr) {
            const num = parseFloat(String(rateStr).replace('%', '').replace(',', '.'));
            return {
              str: typeof rateStr === 'string' ? rateStr.replace('.', ',') : (num.toFixed(1).replace('.', ',') + '%'),
              val: !isNaN(num) ? num : 21.5,
              qtyAll: stats.qtyAllDevice || 246,
              qtyDone: stats.qtyDoneDevice || 53,
              plan: stats.sumClipsAllPlan || 485822,
              fact: stats.sumClipsAllFact || 59943,
              period: stats.clipsMasterPeriodName || 'Tháng 11/2026'
            };
          }
        }
      } catch (e) {
        console.warn('Lỗi gọi buildClipsAllPlanData:', e);
      }
    }

    // 2. Tra cứu theo snapshots lịch sử trong CLIPS_ALLS_HISTORY / CLIPS_ALLS_MASTER_DATA
    const history = window.CLIPS_ALLS_HISTORY || window.CLIPS_ALLS_MASTER_DATA?.history;
    const snapshots = (history && history.snapshots) ? history.snapshots : {};
    
    // Nếu tháng lọc của KPI là 2026-10 hoặc 2026-11
    const snap = (targetMonth && snapshots[targetMonth]) ? snapshots[targetMonth] : (window.CLIPS_ALLS_MASTER_DATA || snapshots['2026-11'] || snapshots['2026-10']);
    if (snap) {
      const rateStr = snap.clipAllPlant || (snap.clipAllPlantPct != null ? `${snap.clipAllPlantPct}%` : '21.5%');
      const num = snap.clipAllPlantPct != null ? snap.clipAllPlantPct : (parseFloat(String(rateStr).replace('%', '').replace(',', '.')) || 21.5);
      return {
        str: typeof rateStr === 'string' ? rateStr.replace('.', ',') : (num.toFixed(1).replace('.', ',') + '%'),
        val: num,
        qtyAll: snap.qtyAllDevice || 246,
        qtyDone: snap.qtyDoneDevice || 53,
        plan: snap.totalPlan || 485822,
        fact: snap.totalSheetFact || 59943,
        period: snap.periodName || snap.monthLabel || 'Tháng 11/2026'
      };
    }

    // 3. Fallback mặc định
    return {
      str: '21,5%',
      val: 21.5,
      qtyAll: 246,
      qtyDone: 53,
      plan: 485822,
      fact: 59943,
      period: 'Tháng 11/2026'
    };
  }

  /**
   * Xử lý bộ lọc Đánh Giá từ Header Cột
   */
  window.handleKpiEvalFilter = function(val, metric) {
    if (val === 'ALL') {
      window.KpiResultStore.evalFilter = 'ALL';
    } else if (metric === 'rem') {
      window.KpiResultStore.evalFilter = val === 'PASS' ? 'REM_PASS' : 'REM_FAIL';
    } else if (metric === 'clip') {
      window.KpiResultStore.evalFilter = val === 'PASS' ? 'CLIP_PASS' : 'CLIP_FAIL';
    } else {
      window.KpiResultStore.evalFilter = val === 'PASS' ? 'PROD_PASS' : 'PROD_FAIL';
    }
    window.renderKpiResultView();
  };

  /**
   * Xử lý bộ lọc Đánh Giá từ Toolbar
   */
  window.handleKpiToolbarEvalFilter = function(val) {
    window.KpiResultStore.evalFilter = val;
    window.renderKpiResultView();
  };

  /**
   * Render toàn bộ giao diện của Tab KPI Result
   */
  window.renderKpiResultView = function(containerId) {
    const container = document.getElementById(containerId || 'kpiResultContainer');
    if (!container) return;

    const st = window.KpiResultStore;
    const allData = getCurrentProductivityData();
    const activeRemarksList = getMasterRemarksList();
    st.remarksMap = buildRemarksLookupMap(activeRemarksList);

    // 1. Lọc tất cả các Team thuộc Workcell A và Workcell B
    const workcellTeams = allData.filter(item => isWorkcellAorB(item.team));

    // 2. Sắp xếp theo dòng chảy: Focus ➔ HardTest ➔ Assembly và Workcell A ➔ Workcell B
    const sortedTeams = [...workcellTeams].sort((a, b) => {
      const wStageA = getStageSortWeight(a.stage);
      const wStageB = getStageSortWeight(b.stage);
      if (wStageA !== wStageB) return wStageA - wStageB;

      const wTeamA = getTeamSortWeight(a.team);
      const wTeamB = getTeamSortWeight(b.team);
      if (wTeamA.rank !== wTeamB.rank) return wTeamA.rank - wTeamB.rank;
      return wTeamA.text.localeCompare(wTeamB.text);
    });

    const focusTeamsCount = sortedTeams.filter(it => (it.stage || '').toLowerCase() === 'focus').length;
    const htTeamsCount = sortedTeams.filter(it => (it.stage || '').toLowerCase() === 'hardtest').length;
    const asmTeamsCount = sortedTeams.filter(it => (it.stage || '').toLowerCase() === 'assembly').length;

    // 3. Lọc theo bộ lọc Stage nếu người dùng chọn
    const activeStageFilter = st.stageFilter || 'ALL';
    const stageFilteredTeams = sortedTeams.filter(item => {
      if (activeStageFilter !== 'ALL') {
        return (item.stage || '').toLowerCase() === activeStageFilter.toLowerCase();
      }
      return true;
    });

    // 4. Lọc theo BỘ LỌC ĐÁNH GIÁ (Đạt / Chưa đạt)
    const activeEvalFilter = st.evalFilter || 'ALL';
    const displayTeams = stageFilteredTeams.filter(item => {
      if (activeEvalFilter === 'ALL') return true;

      // Đánh giá Productivity của Team
      const prodTarget = getMetricTarget('prod', item.district, item.stage, item.team, 95);
      const prodNum = parsePercentVal(item.result);
      const hasProd = prodNum !== null;
      const isProdPass = hasProd && (prodNum >= prodTarget);
      const isProdFail = hasProd && (prodNum < prodTarget);

      // Đánh giá Remarks của Team
      const remTarget = getMetricTarget('rem', item.district, item.stage, item.team, 95);
      const remStr = getRemarksResultForTeam(item.team);
      const remNum = parsePercentVal(remStr);
      const hasRem = remNum !== null;
      const isRemPass = hasRem && (remNum >= remTarget);
      const isRemFail = hasRem && (remNum < remTarget);

      if (activeEvalFilter === 'PROD_PASS' || activeEvalFilter === 'PASS') {
        return isProdPass;
      }
      if (activeEvalFilter === 'PROD_FAIL' || activeEvalFilter === 'FAIL') {
        return isProdFail;
      }
      if (activeEvalFilter === 'REM_PASS') {
        return isRemPass;
      }
      if (activeEvalFilter === 'REM_FAIL') {
        return isRemFail;
      }
      return true;
    });

    // 5. Nhóm theo Stage để chèn hàng Ave
    const stageGroups = [];
    const stageMap = new Map();
    displayTeams.forEach(item => {
      const stageKey = item.stage || 'Khác';
      if (!stageMap.has(stageKey)) {
        const group = {
          stage: stageKey,
          district: item.district || '',
          teams: []
        };
        stageMap.set(stageKey, group);
        stageGroups.push(group);
      }
      stageMap.get(stageKey).teams.push(item);
    });

    // 6. Giá trị dòng đầu tiên: SFPD | SFPD | ALL
    const clipsActual = getClipsAllActualFromClipsTab();
    const clipTarget = getMetricTarget('clip', 'SFPD', 'SFPD', 'ALL', 98);

    const hasLiveProd = hasValidWorkcellTeams(st.customProductivityData) || (window.KPI_MASTER_DATA && hasValidWorkcellTeams(window.KPI_MASTER_DATA.productivity));
    const totalProdRow = allData.find(it => (it.district || '').trim().toLowerCase() === 'total' && !(it.stage || '').trim() && !(it.team || '').trim() && it.result);
    const liveProdStr = (hasLiveProd && totalProdRow && totalProdRow.result) ? totalProdRow.result : '116,94%';
    const liveProdVal = parsePercentVal(liveProdStr);

    const hasLiveRemarks = (Array.isArray(st.customRemarksData) && st.customRemarksData.length > 0) || (window.KPI_MASTER_DATA && Array.isArray(window.KPI_MASTER_DATA.remarks) && window.KPI_MASTER_DATA.remarks.length > 0);
    const totalRemRow = activeRemarksList.find(it => (it.team || '').trim().toLowerCase() === 'total' && it.resultAve);
    const liveRemStr = (hasLiveRemarks && totalRemRow && totalRemRow.resultAve) ? String(totalRemRow.resultAve).replace(/\s+/g, '') : '98,45%';
    const liveRemVal = parsePercentVal(liveRemStr);

    const sfpdScrapTarget = getMetricTarget('scrap', 'SFPD', 'SFPD', 'ALL', '');
    const sfpdScrapResultInput = getMetricResultInput('scrap', 'SFPD', 'SFPD', 'ALL', '');
    const sfpdScrapTargetNum = parseNumericInput(sfpdScrapTarget);
    const sfpdScrapResultNum = parseNumericInput(sfpdScrapResultInput);

    const sfpdBlockedTarget = getMetricTarget('blocked', 'SFPD', 'SFPD', 'ALL', '');
    const sfpdBlockedResultInput = getMetricResultInput('blocked', 'SFPD', 'SFPD', 'ALL', '');
    const sfpdBlockedTargetNum = parseNumericInput(sfpdBlockedTarget);
    const sfpdBlockedResultNum = parseNumericInput(sfpdBlockedResultInput);

    const sfpdData = {
      district: 'SFPD',
      stage: 'SFPD',
      team: 'ALL',
      // 1. Productivity
      prodTarget: getMetricTarget('prod', 'SFPD', 'SFPD', 'ALL', 95),
      prodResult: liveProdStr,
      prodVal: liveProdVal !== null ? liveProdVal : 116.94,
      // 2. Remarks
      remTarget: getMetricTarget('rem', 'SFPD', 'SFPD', 'ALL', 95),
      remResult: liveRemStr,
      remVal: liveRemVal !== null ? liveRemVal : 98.45,
      // 3. Scrap (Tự input Target và Result)
      scrapTarget: sfpdScrapTarget,
      scrapResultInput: sfpdScrapResultInput,
      scrapTargetNum: sfpdScrapTargetNum,
      scrapVal: sfpdScrapResultNum,
      // 4. Blocked batches (Tự input Target và Result)
      blockedTarget: sfpdBlockedTarget,
      blockedResultInput: sfpdBlockedResultInput,
      blockedTargetNum: sfpdBlockedTargetNum,
      blockedVal: sfpdBlockedResultNum,
      // 5. Clip (Lấy kết quả thực tế từ Tab Tra Cứu Clips All)
      clipTarget: clipTarget,
      clipResult: clipsActual.str,
      clipVal: clipsActual.val,
      clipQtyDone: clipsActual.qtyDone,
      clipQtyAll: clipsActual.qtyAll,
      clipPlan: clipsActual.plan,
      clipFact: clipsActual.fact,
      clipPeriod: clipsActual.period
    };

    const sfpdProdPass = sfpdData.prodVal >= sfpdData.prodTarget;
    const sfpdRemPass = sfpdData.remVal >= sfpdData.remTarget;
    const sfpdHasScrapEval = sfpdData.scrapVal !== null && sfpdData.scrapTargetNum !== null;
    const sfpdScrapPass = sfpdHasScrapEval ? (sfpdData.scrapVal <= sfpdData.scrapTargetNum) : null;
    const sfpdHasBlockedEval = sfpdData.blockedVal !== null && sfpdData.blockedTargetNum !== null;
    const sfpdBlockedPass = sfpdHasBlockedEval ? (sfpdData.blockedVal <= sfpdData.blockedTargetNum) : null;
    const sfpdClipPass = sfpdData.clipVal >= sfpdData.clipTarget;

    // Xác định xem dòng SFPD có hiển thị không dựa vào bộ lọc Đánh giá
    let showSfpdRow = true;
    if (activeEvalFilter === 'PROD_FAIL' || activeEvalFilter === 'FAIL') {
      showSfpdRow = !sfpdProdPass;
    } else if (activeEvalFilter === 'PROD_PASS' || activeEvalFilter === 'PASS') {
      showSfpdRow = sfpdProdPass;
    } else if (activeEvalFilter === 'REM_FAIL') {
      showSfpdRow = !sfpdRemPass;
    } else if (activeEvalFilter === 'REM_PASS') {
      showSfpdRow = sfpdRemPass;
    } else if (activeEvalFilter === 'CLIP_FAIL') {
      showSfpdRow = !sfpdClipPass;
    } else if (activeEvalFilter === 'CLIP_PASS') {
      showSfpdRow = sfpdClipPass;
    }

    // 7. Danh sách các đầu mục tiếp theo (Mục 6, 7, 8)
    const otherSections = [
      { id: 'kpiSecAttendance', icon: '👥', title: '6. Attendance %', desc: 'Tỉ lệ chuyên cần & cân đối nhân lực thực tế theo ca' },
      { id: 'kpiSecFtt', icon: '✨', title: '7. FTT %', desc: 'First Time Through - Tỉ lệ đạt chất lượng ngay lần kiểm tra đầu' },
      { id: 'kpiSecDownTime', icon: '⏱️', title: '8. Down Time', desc: 'Thời gian dừng máy & phân loại nguyên nhân sự cố dây chuyền' }
    ];

    container.innerHTML = `
      <div class="kpi-result-dashboard" style="display: flex; flex-direction: column; gap: 1.25rem; padding-bottom: 3rem;">
        
        <!-- ======================================================== -->
        <!-- TOP TOOLBAR: BỘ LỌC THỜI GIAN MẶC ĐỊNH (TỪ ĐẦU THÁNG ĐẾN HÔM TRƯỚC) -->
        <!-- ======================================================== -->
        <div class="card" style="padding: 0.85rem 1.15rem; background: var(--bg-card); border: 1px solid var(--border-glass); border-radius: var(--radius-md); box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
          <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem;">
            
            <div style="display: flex; align-items: center; gap: 0.75rem;">
              <div style="width: 38px; height: 38px; border-radius: 8px; background: rgba(245, 158, 11, 0.15); border: 1px solid rgba(245, 158, 11, 0.35); display: flex; align-items: center; justify-content: center; font-size: 1.25rem;">
                📊
              </div>
              <div style="display: flex; align-items: center; gap: 0.5rem;">
                <h2 style="font-size: 1.05rem; font-weight: 800; color: #f8fafc; margin: 0;">BÁO CÁO CHỈ SỐ VẬN HÀNH (KPI RESULT DASHBOARD)</h2>
                <span class="badge" style="background: rgba(16, 185, 129, 0.2); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.4); font-size: 0.7rem; font-weight: 700; padding: 0.15rem 0.5rem;">
                  🟢 DATA REAL-TIME
                </span>
                ${st.lastSyncedAt || (window.KPI_MASTER_DATA && window.KPI_MASTER_DATA.timestamp) ? `
                  <span style="font-size: 0.7rem; color: #94a3b8; font-weight: 600;">
                    Cập nhật Sheet: <strong style="color: #cbd5e1;">${st.lastSyncedAt || window.KPI_MASTER_DATA.timestamp}</strong>
                  </span>
                ` : ''}
              </div>
            </div>

            <div style="display: flex; align-items: center; flex-wrap: wrap; gap: 0.75rem;">
              <div style="display: flex; align-items: center; gap: 0.35rem; background: rgba(15, 23, 42, 0.6); padding: 0.3rem 0.75rem; border-radius: 6px; border: 1px solid var(--border-glass);">
                <span style="font-size: 0.775rem; font-weight: 800; color: #60a5fa; display: flex; align-items: center; gap: 0.25rem;">
                  📅 Từ:
                </span>
                <input type="date" id="kpiFromDate" class="select-filter font-mono" value="${st.fromDate}" onchange="handleKpiDateChange()" style="padding: 0.2rem 0.45rem; font-size: 0.775rem;">
                <span style="font-size: 0.775rem; font-weight: 800; color: #60a5fa; margin-left: 0.25rem;">
                  Đến:
                </span>
                <input type="date" id="kpiToDate" class="select-filter font-mono" value="${st.toDate}" onchange="handleKpiDateChange()" style="padding: 0.2rem 0.45rem; font-size: 0.775rem;">
              </div>
            </div>

          </div>
        </div>

        <!-- ======================================================== -->
        <!-- BẢNG TỔNG HỢP 5 CHỈ SỐ (THEO ĐÚNG CONCEPT ẢNH SỐ 2)      -->
        <!-- ======================================================== -->
        <div class="section-card" id="kpiSecProductivity" style="background: var(--bg-card); border: 1px solid var(--border-glass); border-radius: var(--radius-md); overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.2);">
          
          <!-- Header Bar -->
          <div class="section-header-row" style="background: rgba(15, 23, 42, 0.8); padding: 0.85rem 1.25rem; border-bottom: 1px solid var(--border-glass); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.75rem;">
            
            <div style="display: flex; align-items: center; gap: 0.75rem;">
              <span style="font-size: 1.25rem;">⚡</span>
              <h3 style="font-size: 1rem; font-weight: 800; color: #f8fafc; margin: 0; letter-spacing: 0.2px;">
                Bảng Tổng Hợp Chỉ Số Vận Hành Trọng Yếu
              </h3>
            </div>

            <!-- Toolbar: Filter Công đoạn + Filter Đánh giá + Copy cho Sheet + Xuất File + Upload -->
            <div style="display: flex; align-items: center; flex-wrap: wrap; gap: 0.5rem;">
              
              <!-- 1. Filter Dropdown Công đoạn -->
              <div style="display: flex; align-items: center; gap: 0.35rem; background: rgba(15, 23, 42, 0.7); padding: 0.25rem 0.6rem; border-radius: 6px; border: 1px solid var(--border-glass);">
                <span style="font-size: 0.75rem; color: #94a3b8; font-weight: 700;">🔍 Công đoạn:</span>
                <select id="kpiStageFilterSelect" onchange="handleKpiStageFilter(this.value)" style="background: transparent; color: #f8fafc; border: none; font-size: 0.75rem; font-weight: 700; outline: none; cursor: pointer;">
                  <option value="ALL" ${activeStageFilter === 'ALL' ? 'selected' : ''} style="background: #0f172a; color: #fff;">Tất Cả (${sortedTeams.length} Teams)</option>
                  <option value="Focus" ${activeStageFilter === 'Focus' ? 'selected' : ''} style="background: #0f172a; color: #fff;">Focus (${focusTeamsCount} Teams)</option>
                  <option value="HardTest" ${activeStageFilter === 'HardTest' ? 'selected' : ''} style="background: #0f172a; color: #fff;">HardTest (${htTeamsCount} Teams)</option>
                  <option value="Assembly" ${activeStageFilter === 'Assembly' ? 'selected' : ''} style="background: #0f172a; color: #fff;">Assembly (${asmTeamsCount} Teams)</option>
                </select>
              </div>

              <!-- 2. Filter Dropdown ĐÁNH GIÁ (Toolbar) -->
              <div style="display: flex; align-items: center; gap: 0.35rem; background: rgba(15, 23, 42, 0.7); padding: 0.25rem 0.6rem; border-radius: 6px; border: 1px solid var(--border-glass);">
                <span style="font-size: 0.75rem; color: #94a3b8; font-weight: 700;">⚖️ Đánh giá:</span>
                <select id="kpiToolbarEvalFilterSelect" onchange="handleKpiToolbarEvalFilter(this.value)" style="background: transparent; color: ${activeEvalFilter.includes('PASS') ? '#34d399' : (activeEvalFilter.includes('FAIL') ? '#f87171' : '#f8fafc')}; border: none; font-size: 0.75rem; font-weight: 700; outline: none; cursor: pointer;">
                  <option value="ALL" ${activeEvalFilter === 'ALL' ? 'selected' : ''} style="background: #0f172a; color: #fff;">Tất Cả</option>
                  <option value="PROD_PASS" ${activeEvalFilter === 'PROD_PASS' || activeEvalFilter === 'PASS' ? 'selected' : ''} style="background: #0f172a; color: #34d399;">🟢 Productivity Đạt</option>
                  <option value="PROD_FAIL" ${activeEvalFilter === 'PROD_FAIL' || activeEvalFilter === 'FAIL' ? 'selected' : ''} style="background: #0f172a; color: #f87171;">🔴 Productivity Chưa đạt</option>
                  <option value="REM_PASS" ${activeEvalFilter === 'REM_PASS' ? 'selected' : ''} style="background: #0f172a; color: #34d399;">🟢 Remarks Đạt</option>
                  <option value="REM_FAIL" ${activeEvalFilter === 'REM_FAIL' ? 'selected' : ''} style="background: #0f172a; color: #f87171;">🔴 Remarks Chưa đạt</option>
                  <option value="CLIP_PASS" ${activeEvalFilter === 'CLIP_PASS' ? 'selected' : ''} style="background: #0f172a; color: #34d399;">🟢 Clip (all plant) Đạt</option>
                  <option value="CLIP_FAIL" ${activeEvalFilter === 'CLIP_FAIL' ? 'selected' : ''} style="background: #0f172a; color: #f87171;">🔴 Clip (all plant) Chưa đạt</option>
                </select>
              </div>

              <!-- 3. Nút Copy Bảng (cho Sheets/Excel) -->
              <button type="button" class="btn btn-sm btn-outline" onclick="handleCopyKpiMasterTableForSheet()" style="font-size: 0.75rem; font-weight: 700; display: flex; align-items: center; gap: 0.35rem; padding: 0.3rem 0.65rem; color: #38bdf8; border-color: rgba(56, 189, 248, 0.4);" title="Copy bảng dưới dạng dữ liệu dán trực tiếp vào Google Sheets hoặc Excel">
                <span>📋 Copy cho Sheet</span>
              </button>

              <!-- 4. Nút Xuất File Sheet (CSV UTF-8 BOM) -->
              <button type="button" class="btn btn-sm btn-outline" onclick="handleExportKpiMasterTableCsv()" style="font-size: 0.75rem; font-weight: 700; display: flex; align-items: center; gap: 0.35rem; padding: 0.3rem 0.65rem; color: #34d399; border-color: rgba(52, 211, 153, 0.4);" title="Tải xuống tệp dữ liệu bảng cho Google Sheets / Excel">
                <span>📥 Xuất File Sheet</span>
              </button>

              <!-- 5. Nút Upload Data -->
              <button type="button" class="btn btn-sm btn-primary" onclick="openKpiUploadModal()" style="font-size: 0.75rem; font-weight: 800; display: flex; align-items: center; gap: 0.35rem; padding: 0.3rem 0.75rem; box-shadow: 0 2px 6px rgba(59, 130, 246, 0.4);">
                <span>📤 Upload Data</span>
              </button>

            </div>

          </div>

          <!-- Bảng Master Table 2 Tầng Header (Co gọn về bên trái, mở rộng 5 nhóm chỉ số) -->
          <div style="overflow-x: auto; max-height: 600px; overflow-y: auto;">
            <table class="data-table" id="kpiMasterTableMain" style="width: 100%; border-collapse: collapse; font-size: 0.75rem; text-align: left;">
              <thead style="position: sticky; top: 0; z-index: 3; background: rgba(15, 23, 42, 0.98); backdrop-filter: blur(8px);">
                
                <!-- TẦNG 1: SUPER HEADERS (5 KHỐI CHỈ SỐ) -->
                <tr style="border-bottom: 1px solid var(--border-glass);">
                  <th colspan="3" style="padding: 0.4rem 0.6rem; font-size: 0.725rem; font-weight: 800; color: #cbd5e1; text-transform: uppercase; background: rgba(15, 23, 42, 0.95);">
                    THÔNG TIN ĐƠN VỊ
                  </th>
                  <th colspan="3" style="text-align: center; padding: 0.4rem 0.5rem; font-size: 0.75rem; font-weight: 800; color: #60a5fa; text-transform: uppercase; background: rgba(30, 58, 138, 0.3); border-left: 2px solid rgba(59, 130, 246, 0.4);">
                    Productivity
                  </th>
                  <th colspan="3" style="text-align: center; padding: 0.4rem 0.5rem; font-size: 0.75rem; font-weight: 800; color: #c084fc; text-transform: uppercase; background: rgba(88, 28, 135, 0.3); border-left: 2px solid rgba(168, 85, 247, 0.4);">
                    Inspection remarks, %
                  </th>
                  <th colspan="3" style="text-align: center; padding: 0.4rem 0.5rem; font-size: 0.75rem; font-weight: 800; color: #fbbf24; text-transform: uppercase; background: rgba(180, 83, 9, 0.3); border-left: 2px solid rgba(245, 158, 11, 0.4);">
                    Scrap, % All
                  </th>
                  <th colspan="3" style="text-align: center; padding: 0.4rem 0.5rem; font-size: 0.75rem; font-weight: 800; color: #f87171; text-transform: uppercase; background: rgba(190, 18, 60, 0.3); border-left: 2px solid rgba(244, 63, 94, 0.4);">
                    Blocked batches (v1)
                  </th>
                  <th colspan="3" style="text-align: center; padding: 0.4rem 0.5rem; font-size: 0.75rem; font-weight: 800; color: #34d399; text-transform: uppercase; background: rgba(6, 95, 70, 0.3); border-left: 2px solid rgba(16, 185, 129, 0.4);">
                    Clip (all plant)
                  </th>
                </tr>

                <!-- TẦNG 2: COLUMN HEADERS -->
                <tr style="border-bottom: 2px solid var(--border-glass); background: rgba(15, 23, 42, 0.95);">
                  <!-- Đơn vị -->
                  <th style="padding: 0.35rem 0.5rem; color: #94a3b8; font-size: 0.675rem; text-transform: uppercase; width: 75px;">District</th>
                  <th style="padding: 0.35rem 0.5rem; color: #94a3b8; font-size: 0.675rem; text-transform: uppercase; width: 70px;">Stage</th>
                  <th style="padding: 0.35rem 0.6rem; color: #94a3b8; font-size: 0.675rem; text-transform: uppercase; min-width: 175px;">Team</th>
                  
                  <!-- 1. Productivity -->
                  <th style="padding: 0.35rem 0.45rem; color: #fbbf24; font-size: 0.675rem; text-transform: uppercase; text-align: right; width: 75px; border-left: 2px solid rgba(59, 130, 246, 0.4);">Target (%)</th>
                  <th style="padding: 0.35rem 0.45rem; color: #38bdf8; font-size: 0.675rem; text-transform: uppercase; text-align: right; width: 85px;">Productivity %</th>
                  <th style="padding: 0.25rem 0.35rem; text-align: center; width: 85px;">
                    <div style="display: flex; flex-direction: column; align-items: center; gap: 0.15rem;">
                      <span style="color: #cbd5e1; font-size: 0.65rem; text-transform: uppercase; font-weight: 700;">Đánh Giá</span>
                      <select id="kpiProdEvalFilterSelect" onchange="handleKpiEvalFilter(this.value, 'prod')" 
                              style="background: rgba(15, 23, 42, 0.95); color: ${(activeEvalFilter === 'PROD_PASS' || activeEvalFilter === 'PASS') ? '#34d399' : ((activeEvalFilter === 'PROD_FAIL' || activeEvalFilter === 'FAIL') ? '#f87171' : '#cbd5e1')}; border: 1px solid rgba(255, 255, 255, 0.25); border-radius: 4px; font-size: 0.65rem; font-weight: 700; padding: 0.1rem 0.2rem; outline: none; cursor: pointer;"
                              title="Lọc các team Đạt hoặc Chưa đạt theo Productivity">
                        <option value="ALL" ${activeEvalFilter === 'ALL' ? 'selected' : ''} style="background: #0f172a; color: #fff;">Tất cả ▾</option>
                        <option value="PASS" ${(activeEvalFilter === 'PROD_PASS' || activeEvalFilter === 'PASS') ? 'selected' : ''} style="background: #0f172a; color: #34d399;">🟢 Đạt</option>
                        <option value="FAIL" ${(activeEvalFilter === 'PROD_FAIL' || activeEvalFilter === 'FAIL') ? 'selected' : ''} style="background: #0f172a; color: #f87171;">🔴 Chưa đạt</option>
                      </select>
                    </div>
                  </th>

                  <!-- 2. Inspection remarks, % -->
                  <th style="padding: 0.35rem 0.45rem; color: #fbbf24; font-size: 0.675rem; text-transform: uppercase; text-align: right; width: 75px; border-left: 2px solid rgba(168, 85, 247, 0.4);">Target (%)</th>
                  <th style="padding: 0.35rem 0.45rem; color: #c084fc; font-size: 0.675rem; text-transform: uppercase; text-align: right; width: 75px;">Result Ave</th>
                  <th style="padding: 0.25rem 0.35rem; text-align: center; width: 85px;">
                    <div style="display: flex; flex-direction: column; align-items: center; gap: 0.15rem;">
                      <span style="color: #cbd5e1; font-size: 0.65rem; text-transform: uppercase; font-weight: 700;">Đánh Giá</span>
                      <select id="kpiRemEvalFilterSelect" onchange="handleKpiEvalFilter(this.value, 'rem')" 
                              style="background: rgba(15, 23, 42, 0.95); color: ${activeEvalFilter === 'REM_PASS' ? '#34d399' : (activeEvalFilter === 'REM_FAIL' ? '#f87171' : '#cbd5e1')}; border: 1px solid rgba(255, 255, 255, 0.25); border-radius: 4px; font-size: 0.65rem; font-weight: 700; padding: 0.1rem 0.2rem; outline: none; cursor: pointer;"
                              title="Lọc các team Đạt hoặc Chưa đạt theo Inspection Remarks">
                        <option value="ALL" ${activeEvalFilter === 'ALL' ? 'selected' : ''} style="background: #0f172a; color: #fff;">Tất cả ▾</option>
                        <option value="PASS" ${activeEvalFilter === 'REM_PASS' ? 'selected' : ''} style="background: #0f172a; color: #34d399;">🟢 Đạt</option>
                        <option value="FAIL" ${activeEvalFilter === 'REM_FAIL' ? 'selected' : ''} style="background: #0f172a; color: #f87171;">🔴 Chưa đạt</option>
                      </select>
                    </div>
                  </th>

                  <!-- 3. Scrap, % All -->
                  <th style="padding: 0.35rem 0.45rem; color: #fbbf24; font-size: 0.675rem; text-transform: uppercase; text-align: right; width: 75px; border-left: 2px solid rgba(245, 158, 11, 0.4);">Target (%)</th>
                  <th style="padding: 0.35rem 0.45rem; color: #fbbf24; font-size: 0.675rem; text-transform: uppercase; text-align: right; width: 75px;">Result Ave</th>
                  <th style="padding: 0.35rem 0.45rem; color: #cbd5e1; font-size: 0.675rem; text-transform: uppercase; text-align: center; width: 70px;">Đánh Giá</th>

                  <!-- 4. Blocked batches (v1) -->
                  <th style="padding: 0.35rem 0.45rem; color: #fbbf24; font-size: 0.675rem; text-transform: uppercase; text-align: right; width: 75px; border-left: 2px solid rgba(244, 63, 94, 0.4);">Target (%)</th>
                  <th style="padding: 0.35rem 0.45rem; color: #f87171; font-size: 0.675rem; text-transform: uppercase; text-align: right; width: 75px;">Result Ave</th>
                  <th style="padding: 0.35rem 0.45rem; color: #cbd5e1; font-size: 0.675rem; text-transform: uppercase; text-align: center; width: 70px;">Đánh Giá</th>

                  <!-- 5. Clip (all plant) -->
                  <th style="padding: 0.35rem 0.45rem; color: #fbbf24; font-size: 0.675rem; text-transform: uppercase; text-align: right; width: 75px; border-left: 2px solid rgba(16, 185, 129, 0.4);">Target (%)</th>
                  <th style="padding: 0.35rem 0.45rem; color: #34d399; font-size: 0.675rem; text-transform: uppercase; text-align: right; width: 75px;" title="Actual: Kết quả thực tế lấy trực tiếp từ Tab Tra Cứu Clips All">Actual</th>
                  <th style="padding: 0.25rem 0.35rem; text-align: center; width: 85px;">
                    <div style="display: flex; flex-direction: column; align-items: center; gap: 0.15rem;">
                      <span style="color: #cbd5e1; font-size: 0.65rem; text-transform: uppercase; font-weight: 700;">Đánh Giá</span>
                      <select id="kpiClipEvalFilterSelect" onchange="handleKpiEvalFilter(this.value, 'clip')" 
                              style="background: rgba(15, 23, 42, 0.95); color: ${activeEvalFilter === 'CLIP_PASS' ? '#34d399' : (activeEvalFilter === 'CLIP_FAIL' ? '#f87171' : '#cbd5e1')}; border: 1px solid rgba(255, 255, 255, 0.25); border-radius: 4px; font-size: 0.65rem; font-weight: 700; padding: 0.1rem 0.2rem; outline: none; cursor: pointer;"
                              title="Lọc Đạt hoặc Chưa đạt theo Clip (all plant)">
                        <option value="ALL" ${activeEvalFilter === 'ALL' ? 'selected' : ''} style="background: #0f172a; color: #fff;">Tất cả ▾</option>
                        <option value="PASS" ${activeEvalFilter === 'CLIP_PASS' ? 'selected' : ''} style="background: #0f172a; color: #34d399;">🟢 Đạt</option>
                        <option value="FAIL" ${activeEvalFilter === 'CLIP_FAIL' ? 'selected' : ''} style="background: #0f172a; color: #f87171;">🔴 Chưa đạt</option>
                      </select>
                    </div>
                  </th>
                </tr>

              </thead>
              <tbody>

                <!-- ======================================================== -->
                <!-- DÒNG ĐẦU TIÊN: SFPD | SFPD | ALL (NỀN XANH LÁ NHƯ ẢNH 2)  -->
                <!-- ======================================================== -->
                ${showSfpdRow ? `
                  <tr style="background: rgba(34, 197, 94, 0.28); border-bottom: 2px solid #22c55e; font-weight: 800;" 
                      data-is-sfpd="true"
                      data-prod-val="${sfpdData.prodVal}"
                      data-rem-val="${sfpdData.remVal}"
                      data-scrap-val="${sfpdData.scrapVal !== null ? sfpdData.scrapVal : ''}"
                      data-scrap-target="${sfpdData.scrapTargetNum !== null ? sfpdData.scrapTargetNum : ''}"
                      data-blocked-val="${sfpdData.blockedVal !== null ? sfpdData.blockedVal : ''}"
                      data-blocked-target="${sfpdData.blockedTargetNum !== null ? sfpdData.blockedTargetNum : ''}"
                      data-clip-val="${sfpdData.clipVal}">
                    
                    <!-- District -->
                    <td style="padding: 0.35rem 0.5rem; font-weight: 800; color: #ffffff; white-space: nowrap;">SFPD</td>
                    
                    <!-- Stage -->
                    <td style="padding: 0.35rem 0.5rem; font-weight: 800; color: #ffffff; white-space: nowrap;">SFPD</td>
                    
                    <!-- Team -->
                    <td style="padding: 0.35rem 0.6rem; font-weight: 800; color: #ffffff;">ALL</td>

                    <!-- 1. Productivity -->
                    <td style="padding: 0.35rem 0.45rem; text-align: right; white-space: nowrap; border-left: 2px solid rgba(34, 197, 94, 0.6);">
                      <div style="display: inline-flex; align-items: center; justify-content: flex-end; gap: 0.2rem;">
                        <input type="number" step="0.1" value="${sfpdData.prodTarget}" class="font-mono"
                               oninput="handleKpiUniversalTargetChange(this, 'prod', 'SFPD', 'SFPD', 'ALL')"
                               style="width: 44px; padding: 0.15rem 0.25rem; font-size: 0.7rem; font-weight: 800; color: #fbbf24; background: rgba(15, 23, 42, 0.85); border: 1px solid rgba(245, 158, 11, 0.5); border-radius: 3px; text-align: right; outline: none;">
                      </div>
                    </td>
                    <td style="padding: 0.35rem 0.45rem; text-align: right; font-weight: 800; font-size: 0.75rem; white-space: nowrap;" class="font-mono">
                      <span style="color: #ffffff;">${sfpdData.prodResult}</span>
                    </td>
                    <td style="padding: 0.35rem 0.45rem; text-align: center; white-space: nowrap;">
                      ${sfpdProdPass ?
                        `<span class="badge badge-green kpi-eval-badge-prod">🟢 Đạt</span>` :
                        `<span class="badge badge-red kpi-eval-badge-prod">🔴 Chưa đạt</span>`
                      }
                    </td>

                    <!-- 2. Inspection remarks, % -->
                    <td style="padding: 0.35rem 0.45rem; text-align: right; white-space: nowrap; border-left: 2px solid rgba(34, 197, 94, 0.6);">
                      <div style="display: inline-flex; align-items: center; justify-content: flex-end; gap: 0.2rem;">
                        <input type="number" step="0.1" value="${sfpdData.remTarget}" class="font-mono"
                               oninput="handleKpiUniversalTargetChange(this, 'rem', 'SFPD', 'SFPD', 'ALL')"
                               style="width: 44px; padding: 0.15rem 0.25rem; font-size: 0.7rem; font-weight: 800; color: #fbbf24; background: rgba(15, 23, 42, 0.85); border: 1px solid rgba(245, 158, 11, 0.5); border-radius: 3px; text-align: right; outline: none;">
                      </div>
                    </td>
                    <td style="padding: 0.35rem 0.45rem; text-align: right; font-weight: 800; font-size: 0.75rem; white-space: nowrap;" class="font-mono">
                      <span style="color: #ffffff;">${sfpdData.remResult}</span>
                    </td>
                    <td style="padding: 0.35rem 0.45rem; text-align: center; white-space: nowrap;">
                      ${sfpdRemPass ?
                        `<span class="badge badge-green kpi-eval-badge-rem">🟢 Đạt</span>` :
                        `<span class="badge badge-red kpi-eval-badge-rem">🔴 Chưa đạt</span>`
                      }
                    </td>

                    <!-- 3. Scrap, % All (Cho phép tự input cả Target và Result) -->
                    <td style="padding: 0.35rem 0.45rem; text-align: right; white-space: nowrap; border-left: 2px solid rgba(34, 197, 94, 0.6);">
                      <div style="display: inline-flex; align-items: center; justify-content: flex-end; gap: 0.2rem;">
                        <input type="number" step="any" value="${sfpdData.scrapTarget}" class="font-mono kpi-target-input-scrap" placeholder="-"
                               oninput="handleKpiUniversalTargetChange(this, 'scrap', 'SFPD', 'SFPD', 'ALL')"
                               style="width: 48px; padding: 0.15rem 0.25rem; font-size: 0.7rem; font-weight: 800; color: #fbbf24; background: rgba(15, 23, 42, 0.85); border: 1px solid rgba(245, 158, 11, 0.5); border-radius: 3px; text-align: right; outline: none;">
                      </div>
                    </td>
                    <td style="padding: 0.35rem 0.45rem; text-align: right; white-space: nowrap;">
                      <div style="display: inline-flex; align-items: center; justify-content: flex-end; gap: 0.2rem;">
                        <input type="number" step="any" value="${sfpdData.scrapResultInput}" class="font-mono kpi-result-input-scrap" placeholder="-"
                               oninput="handleKpiUniversalResultChange(this, 'scrap', 'SFPD', 'SFPD', 'ALL')"
                               title="Nhập kết quả Scrap (%) thực tế"
                               style="width: 54px; padding: 0.15rem 0.25rem; font-size: 0.725rem; font-weight: 800; color: ${sfpdScrapPass === true ? '#34d399' : (sfpdScrapPass === false ? '#f87171' : '#ffffff')}; background: rgba(15, 23, 42, 0.85); border: 1px solid rgba(245, 158, 11, 0.45); border-radius: 3px; text-align: right; outline: none;">
                      </div>
                    </td>
                    <td style="padding: 0.35rem 0.45rem; text-align: center; white-space: nowrap;">
                      ${sfpdScrapPass === true ?
                        `<span class="badge badge-green kpi-eval-badge-scrap">🟢 Đạt</span>` :
                        (sfpdScrapPass === false ?
                          `<span class="badge badge-red kpi-eval-badge-scrap">🔴 Chưa đạt</span>` :
                          `<span class="kpi-eval-badge-scrap" style="color: var(--text-muted); font-size: 0.675rem;">-</span>`)
                      }
                    </td>

                    <!-- 4. Blocked batches (v1) (Cho phép tự input cả Target và Result) -->
                    <td style="padding: 0.35rem 0.45rem; text-align: right; white-space: nowrap; border-left: 2px solid rgba(34, 197, 94, 0.6);">
                      <div style="display: inline-flex; align-items: center; justify-content: flex-end; gap: 0.2rem;">
                        <input type="number" step="1" value="${sfpdData.blockedTarget}" class="font-mono kpi-target-input-blocked" placeholder="-"
                               oninput="handleKpiUniversalTargetChange(this, 'blocked', 'SFPD', 'SFPD', 'ALL')"
                               style="width: 48px; padding: 0.15rem 0.25rem; font-size: 0.7rem; font-weight: 800; color: #fbbf24; background: rgba(15, 23, 42, 0.85); border: 1px solid rgba(245, 158, 11, 0.5); border-radius: 3px; text-align: right; outline: none;">
                      </div>
                    </td>
                    <td style="padding: 0.35rem 0.45rem; text-align: right; white-space: nowrap;">
                      <div style="display: inline-flex; align-items: center; justify-content: flex-end; gap: 0.2rem;">
                        <input type="number" step="any" value="${sfpdData.blockedResultInput}" class="font-mono kpi-result-input-blocked" placeholder="-"
                               oninput="handleKpiUniversalResultChange(this, 'blocked', 'SFPD', 'SFPD', 'ALL')"
                               title="Nhập kết quả Blocked batches thực tế"
                               style="width: 54px; padding: 0.15rem 0.25rem; font-size: 0.725rem; font-weight: 800; color: ${sfpdBlockedPass === true ? '#34d399' : (sfpdBlockedPass === false ? '#f87171' : '#ffffff')}; background: rgba(15, 23, 42, 0.85); border: 1px solid rgba(244, 63, 94, 0.45); border-radius: 3px; text-align: right; outline: none;">
                      </div>
                    </td>
                    <td style="padding: 0.35rem 0.45rem; text-align: center; white-space: nowrap;">
                      ${sfpdBlockedPass === true ?
                        `<span class="badge badge-green kpi-eval-badge-blocked">🟢 Đạt</span>` :
                        (sfpdBlockedPass === false ?
                          `<span class="badge badge-red kpi-eval-badge-blocked">🔴 Chưa đạt</span>` :
                          `<span class="kpi-eval-badge-blocked" style="color: var(--text-muted); font-size: 0.675rem;">-</span>`)
                      }
                    </td>

                    <!-- 5. Clip (all plant) -->
                    <td style="padding: 0.35rem 0.45rem; text-align: right; white-space: nowrap; border-left: 2px solid rgba(34, 197, 94, 0.6);">
                      <div style="display: inline-flex; align-items: center; justify-content: flex-end; gap: 0.2rem;">
                        <input type="number" step="0.1" value="${sfpdData.clipTarget}" class="font-mono"
                               oninput="handleKpiUniversalTargetChange(this, 'clip', 'SFPD', 'SFPD', 'ALL')"
                               style="width: 44px; padding: 0.15rem 0.25rem; font-size: 0.7rem; font-weight: 800; color: #fbbf24; background: rgba(15, 23, 42, 0.85); border: 1px solid rgba(245, 158, 11, 0.5); border-radius: 3px; text-align: right; outline: none;">
                      </div>
                    </td>
                    <td style="padding: 0.35rem 0.45rem; text-align: right; font-weight: 800; font-size: 0.75rem; white-space: nowrap;" class="font-mono">
                      <span style="color: ${sfpdData.clipVal >= sfpdData.clipTarget ? '#34d399' : '#f87171'};" 
                            title="Lấy trực tiếp từ Tab Tra Cứu Clips All: Total Done ${sfpdData.clipQtyDone}/${sfpdData.clipQtyAll} mã device (${sfpdData.clipResult})">
                        ${sfpdData.clipResult}
                      </span>
                    </td>
                    <td style="padding: 0.35rem 0.45rem; text-align: center; white-space: nowrap;">
                      ${sfpdData.clipVal >= sfpdData.clipTarget ? 
                        `<span class="badge badge-green kpi-eval-badge-clip">🟢 Đạt</span>` : 
                        `<span class="badge badge-red kpi-eval-badge-clip" style="background: rgba(239, 68, 68, 0.2); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.4);">🔴 Chưa đạt</span>`
                      }
                    </td>

                  </tr>
                ` : ''}

                <!-- ======================================================== -->
                <!-- CÁC DÒNG CỦA TỪNG STAGE & TEAM + HÀNG AVE                 -->
                <!-- ======================================================== -->
                ${stageGroups.length === 0 ? `
                  <tr>
                    <td colspan="18" style="padding: 2rem; text-align: center; color: var(--text-muted); font-size: 0.85rem; font-style: italic;">
                      Không có Team nào phù hợp với bộ lọc hiện tại.
                    </td>
                  </tr>
                ` : stageGroups.map(group => {
                  // 1. Tính toán Ave cho Productivity
                  const validProdList = group.teams
                    .map(it => parsePercentVal(it.result))
                    .filter(v => v !== null);

                  let aveProdNum = null;
                  let aveProdStr = '-';
                  if (validProdList.length > 0) {
                    const sum = validProdList.reduce((a, b) => a + b, 0);
                    aveProdNum = Math.round((sum / validProdList.length) * 100) / 100;
                    aveProdStr = aveProdNum.toFixed(2).replace('.', ',') + '%';
                  }

                  // 2. Tính toán Ave cho Remarks
                  const validRemList = group.teams
                    .map(it => parsePercentVal(getRemarksResultForTeam(it.team)))
                    .filter(v => v !== null);

                  let aveRemNum = null;
                  let aveRemStr = '-';
                  if (validRemList.length > 0) {
                    const sum = validRemList.reduce((a, b) => a + b, 0);
                    aveRemNum = Math.round((sum / validRemList.length) * 100) / 100;
                    aveRemStr = aveRemNum.toFixed(2).replace('.', ',') + '%';
                  }

                  // Targets cho hàng Ave
                  const aveProdTarget = getMetricTarget('prod', group.district, group.stage, 'Ave', 95);
                  const aveRemTarget = getMetricTarget('rem', group.district, group.stage, 'Ave', 95);
                  const aveScrapTarget = getMetricTarget('scrap', group.district, group.stage, 'Ave', '');
                  const aveBlockedTarget = getMetricTarget('blocked', group.district, group.stage, 'Ave', '');
                  const aveClipTarget = getMetricTarget('clip', group.district, group.stage, 'Ave', 98);

                  // Giá trị nhập tay hoặc tự trung bình từ các team cho Scrap & Blocked ở hàng Ave
                  const validScrapList = group.teams
                    .map(it => parseNumericInput(getMetricResultInput('scrap', it.district, it.stage, it.team, '')))
                    .filter(v => v !== null);
                  const autoAveScrap = validScrapList.length > 0
                    ? Math.round((validScrapList.reduce((a, b) => a + b, 0) / validScrapList.length) * 100) / 100
                    : '';
                  const aveScrapResultManual = getMetricResultInput('scrap', group.district, group.stage, 'Ave', '');
                  const aveScrapResultInput = String(aveScrapResultManual).trim() !== '' ? aveScrapResultManual : (autoAveScrap !== '' ? String(autoAveScrap) : '');
                  const aveScrapTargetNum = parseNumericInput(aveScrapTarget);
                  const aveScrapResultNum = parseNumericInput(aveScrapResultInput);
                  const aveScrapPass = (aveScrapTargetNum !== null && aveScrapResultNum !== null) ? (aveScrapResultNum <= aveScrapTargetNum) : null;

                  const validBlockedList = group.teams
                    .map(it => parseNumericInput(getMetricResultInput('blocked', it.district, it.stage, it.team, '')))
                    .filter(v => v !== null);
                  const autoAveBlocked = validBlockedList.length > 0
                    ? Math.round((validBlockedList.reduce((a, b) => a + b, 0) / validBlockedList.length) * 100) / 100
                    : '';
                  const aveBlockedResultManual = getMetricResultInput('blocked', group.district, group.stage, 'Ave', '');
                  const aveBlockedResultInput = String(aveBlockedResultManual).trim() !== '' ? aveBlockedResultManual : (autoAveBlocked !== '' ? String(autoAveBlocked) : '');
                  const aveBlockedTargetNum = parseNumericInput(aveBlockedTarget);
                  const aveBlockedResultNum = parseNumericInput(aveBlockedResultInput);
                  const aveBlockedPass = (aveBlockedTargetNum !== null && aveBlockedResultNum !== null) ? (aveBlockedResultNum <= aveBlockedTargetNum) : null;

                  // Đánh giá hàng Ave Productivity & Remarks
                  let aveProdBadge = `<span style="color: var(--text-muted); font-size: 0.675rem;">-</span>`;
                  if (aveProdNum !== null) {
                    aveProdBadge = (aveProdNum >= aveProdTarget) ? 
                      `<span class="badge badge-green kpi-eval-badge-prod">🟢 Đạt</span>` : 
                      `<span class="badge badge-red kpi-eval-badge-prod">🔴 Chưa đạt</span>`;
                  }

                  let aveRemBadge = `<span style="color: var(--text-muted); font-size: 0.675rem;">-</span>`;
                  if (aveRemNum !== null) {
                    aveRemBadge = (aveRemNum >= aveRemTarget) ? 
                      `<span class="badge badge-green kpi-eval-badge-rem">🟢 Đạt</span>` : 
                      `<span class="badge badge-red kpi-eval-badge-rem">🔴 Chưa đạt</span>`;
                  }

                  // Render các hàng của Team thuộc Stage
                  const teamRowsHtml = group.teams.map((item, idx) => {
                    const prodTarget = getMetricTarget('prod', item.district, item.stage, item.team, 95);
                    const prodNum = parsePercentVal(item.result);
                    const hasProd = prodNum !== null;

                    let prodBadge = `<span style="color: var(--text-muted); font-size: 0.675rem;">-</span>`;
                    if (hasProd) {
                      prodBadge = (prodNum >= prodTarget) ? 
                        `<span class="badge badge-green kpi-eval-badge-prod">🟢 Đạt</span>` : 
                        `<span class="badge badge-red kpi-eval-badge-prod">🔴 Chưa đạt</span>`;
                    }

                    // Remarks
                    const remStr = getRemarksResultForTeam(item.team);
                    const remNum = parsePercentVal(remStr);
                    const hasRem = remNum !== null;
                    const remTarget = getMetricTarget('rem', item.district, item.stage, item.team, 95);

                    let remBadge = `<span style="color: var(--text-muted); font-size: 0.675rem;">-</span>`;
                    if (hasRem) {
                      remBadge = (remNum >= remTarget) ? 
                        `<span class="badge badge-green kpi-eval-badge-rem">🟢 Đạt</span>` : 
                        `<span class="badge badge-red kpi-eval-badge-rem">🔴 Chưa đạt</span>`;
                    }

                    // Scrap, Blocked (Tự input Target & Result), Clip (Tự input Target)
                    const scrapTarget = getMetricTarget('scrap', item.district, item.stage, item.team, '');
                    const scrapResultInput = getMetricResultInput('scrap', item.district, item.stage, item.team, '');
                    const scrapTargetNum = parseNumericInput(scrapTarget);
                    const scrapResultNum = parseNumericInput(scrapResultInput);
                    const scrapPass = (scrapTargetNum !== null && scrapResultNum !== null) ? (scrapResultNum <= scrapTargetNum) : null;

                    const blockedTarget = getMetricTarget('blocked', item.district, item.stage, item.team, '');
                    const blockedResultInput = getMetricResultInput('blocked', item.district, item.stage, item.team, '');
                    const blockedTargetNum = parseNumericInput(blockedTarget);
                    const blockedResultNum = parseNumericInput(blockedResultInput);
                    const blockedPass = (blockedTargetNum !== null && blockedResultNum !== null) ? (blockedResultNum <= blockedTargetNum) : null;

                    const clipTarget = getMetricTarget('clip', item.district, item.stage, item.team, '');

                    const rowBg = idx % 2 === 0 ? 'background: rgba(255, 255, 255, 0.015);' : '';
                    const teamColor = item.team.toUpperCase().includes('WORKCELL A') ? '#60a5fa' : '#c084fc';

                    return `
                      <tr style="border-bottom: 1px solid var(--border-glass); ${rowBg}" 
                          data-is-team="true"
                          data-stage-group="${group.stage}"
                          data-district="${item.district}"
                          data-prod-val="${prodNum !== null ? prodNum : ''}"
                          data-rem-val="${remNum !== null ? remNum : ''}"
                          data-scrap-val="${scrapResultNum !== null ? scrapResultNum : ''}"
                          data-scrap-target="${scrapTargetNum !== null ? scrapTargetNum : ''}"
                          data-blocked-val="${blockedResultNum !== null ? blockedResultNum : ''}"
                          data-blocked-target="${blockedTargetNum !== null ? blockedTargetNum : ''}">
                        
                        <!-- District -->
                        <td style="padding: 0.35rem 0.5rem; font-weight: 600; color: #cbd5e1; white-space: nowrap;">
                          ${item.district || '-'}
                        </td>

                        <!-- Stage -->
                        <td style="padding: 0.35rem 0.5rem; white-space: nowrap;">
                          <span style="color: ${item.stage === 'Focus' ? '#38bdf8' : (item.stage === 'HardTest' ? '#fbbf24' : '#34d399')}; font-weight: 700;">
                            ${item.stage || '-'}
                          </span>
                        </td>

                        <!-- Team -->
                        <td style="padding: 0.35rem 0.6rem; font-weight: 600; color: ${teamColor}; white-space: nowrap;">
                          ${item.team}
                        </td>

                        <!-- 1. Productivity -->
                        <td style="padding: 0.35rem 0.45rem; text-align: right; white-space: nowrap; border-left: 2px solid rgba(59, 130, 246, 0.25);">
                          <div style="display: inline-flex; align-items: center; justify-content: flex-end; gap: 0.2rem;">
                            <input type="number" step="0.1" value="${prodTarget}" class="font-mono"
                                   oninput="handleKpiUniversalTargetChange(this, 'prod', '${item.district}', '${item.stage}', '${item.team}')"
                                   style="width: 44px; padding: 0.15rem 0.25rem; font-size: 0.7rem; font-weight: 800; color: #fbbf24; background: rgba(15, 23, 42, 0.7); border: 1px solid rgba(245, 158, 11, 0.35); border-radius: 3px; text-align: right; outline: none;">
                          </div>
                        </td>
                        <td style="padding: 0.35rem 0.45rem; text-align: right; font-weight: 800; font-size: 0.75rem; white-space: nowrap;" class="font-mono">
                          <span style="color: ${hasProd ? (prodNum >= prodTarget ? '#34d399' : '#f87171') : 'var(--text-muted)'};">
                            ${item.result || '-'}
                          </span>
                        </td>
                        <td style="padding: 0.35rem 0.45rem; text-align: center; white-space: nowrap;">
                          ${prodBadge}
                        </td>

                        <!-- 2. Inspection remarks, % -->
                        <td style="padding: 0.35rem 0.45rem; text-align: right; white-space: nowrap; border-left: 2px solid rgba(168, 85, 247, 0.25);">
                          <div style="display: inline-flex; align-items: center; justify-content: flex-end; gap: 0.2rem;">
                            <input type="number" step="0.1" value="${remTarget}" class="font-mono"
                                   oninput="handleKpiUniversalTargetChange(this, 'rem', '${item.district}', '${item.stage}', '${item.team}')"
                                   style="width: 44px; padding: 0.15rem 0.25rem; font-size: 0.7rem; font-weight: 800; color: #fbbf24; background: rgba(15, 23, 42, 0.7); border: 1px solid rgba(245, 158, 11, 0.35); border-radius: 3px; text-align: right; outline: none;">
                          </div>
                        </td>
                        <td style="padding: 0.35rem 0.45rem; text-align: right; font-weight: 800; font-size: 0.75rem; white-space: nowrap;" class="font-mono">
                          <span style="color: ${hasRem ? (remNum >= remTarget ? '#34d399' : '#f87171') : 'var(--text-muted)'};">
                            ${remStr || '-'}
                          </span>
                        </td>
                        <td style="padding: 0.35rem 0.45rem; text-align: center; white-space: nowrap;">
                          ${remBadge}
                        </td>

                        <!-- 3. Scrap, % All (Cho phép tự input cả Target và Result) -->
                        <td style="padding: 0.35rem 0.45rem; text-align: right; white-space: nowrap; border-left: 2px solid rgba(245, 158, 11, 0.25);">
                          <div style="display: inline-flex; align-items: center; justify-content: flex-end; gap: 0.2rem;">
                            <input type="number" step="any" value="${scrapTarget}" class="font-mono kpi-target-input-scrap" placeholder="-"
                                   oninput="handleKpiUniversalTargetChange(this, 'scrap', '${item.district}', '${item.stage}', '${item.team}')"
                                   style="width: 48px; padding: 0.15rem 0.25rem; font-size: 0.7rem; font-weight: 800; color: #fbbf24; background: rgba(15, 23, 42, 0.7); border: 1px solid rgba(245, 158, 11, 0.35); border-radius: 3px; text-align: right; outline: none;">
                          </div>
                        </td>
                        <td style="padding: 0.35rem 0.45rem; text-align: right; white-space: nowrap;">
                          <div style="display: inline-flex; align-items: center; justify-content: flex-end; gap: 0.2rem;">
                            <input type="number" step="any" value="${scrapResultInput}" class="font-mono kpi-result-input-scrap" placeholder="-"
                                   oninput="handleKpiUniversalResultChange(this, 'scrap', '${item.district}', '${item.stage}', '${item.team}')"
                                   title="Nhập kết quả Scrap (%) cho ${item.team}"
                                   style="width: 54px; padding: 0.15rem 0.25rem; font-size: 0.725rem; font-weight: 800; color: ${scrapPass === true ? '#34d399' : (scrapPass === false ? '#f87171' : '#f8fafc')}; background: rgba(15, 23, 42, 0.7); border: 1px solid rgba(245, 158, 11, 0.35); border-radius: 3px; text-align: right; outline: none;">
                          </div>
                        </td>
                        <td style="padding: 0.35rem 0.45rem; text-align: center; white-space: nowrap;">
                          ${scrapPass === true ?
                            `<span class="badge badge-green kpi-eval-badge-scrap">🟢 Đạt</span>` :
                            (scrapPass === false ?
                              `<span class="badge badge-red kpi-eval-badge-scrap">🔴 Chưa đạt</span>` :
                              `<span class="kpi-eval-badge-scrap" style="color: var(--text-muted); font-size: 0.675rem;">-</span>`)
                          }
                        </td>

                        <!-- 4. Blocked batches (v1) (Cho phép tự input cả Target và Result) -->
                        <td style="padding: 0.35rem 0.45rem; text-align: right; white-space: nowrap; border-left: 2px solid rgba(244, 63, 94, 0.25);">
                          <div style="display: inline-flex; align-items: center; justify-content: flex-end; gap: 0.2rem;">
                            <input type="number" step="1" value="${blockedTarget}" class="font-mono kpi-target-input-blocked" placeholder="-"
                                   oninput="handleKpiUniversalTargetChange(this, 'blocked', '${item.district}', '${item.stage}', '${item.team}')"
                                   style="width: 48px; padding: 0.15rem 0.25rem; font-size: 0.7rem; font-weight: 800; color: #fbbf24; background: rgba(15, 23, 42, 0.7); border: 1px solid rgba(245, 158, 11, 0.35); border-radius: 3px; text-align: right; outline: none;">
                          </div>
                        </td>
                        <td style="padding: 0.35rem 0.45rem; text-align: right; white-space: nowrap;">
                          <div style="display: inline-flex; align-items: center; justify-content: flex-end; gap: 0.2rem;">
                            <input type="number" step="any" value="${blockedResultInput}" class="font-mono kpi-result-input-blocked" placeholder="-"
                                   oninput="handleKpiUniversalResultChange(this, 'blocked', '${item.district}', '${item.stage}', '${item.team}')"
                                   title="Nhập kết quả Blocked batches cho ${item.team}"
                                   style="width: 54px; padding: 0.15rem 0.25rem; font-size: 0.725rem; font-weight: 800; color: ${blockedPass === true ? '#34d399' : (blockedPass === false ? '#f87171' : '#f8fafc')}; background: rgba(15, 23, 42, 0.7); border: 1px solid rgba(244, 63, 94, 0.35); border-radius: 3px; text-align: right; outline: none;">
                          </div>
                        </td>
                        <td style="padding: 0.35rem 0.45rem; text-align: center; white-space: nowrap;">
                          ${blockedPass === true ?
                            `<span class="badge badge-green kpi-eval-badge-blocked">🟢 Đạt</span>` :
                            (blockedPass === false ?
                              `<span class="badge badge-red kpi-eval-badge-blocked">🔴 Chưa đạt</span>` :
                              `<span class="kpi-eval-badge-blocked" style="color: var(--text-muted); font-size: 0.675rem;">-</span>`)
                          }
                        </td>

                        <!-- 5. Clip (all plant) -->
                        <td style="padding: 0.35rem 0.45rem; text-align: right; white-space: nowrap; border-left: 2px solid rgba(16, 185, 129, 0.25);">
                          <div style="display: inline-flex; align-items: center; justify-content: flex-end; gap: 0.2rem;">
                            <input type="number" step="0.1" value="${clipTarget}" class="font-mono" placeholder="-"
                                   oninput="handleKpiUniversalTargetChange(this, 'clip', '${item.district}', '${item.stage}', '${item.team}')"
                                   style="width: 44px; padding: 0.15rem 0.25rem; font-size: 0.7rem; font-weight: 800; color: #fbbf24; background: rgba(15, 23, 42, 0.7); border: 1px solid rgba(245, 158, 11, 0.35); border-radius: 3px; text-align: right; outline: none;">
                          </div>
                        </td>
                        <td style="padding: 0.35rem 0.45rem; text-align: right; font-weight: 600; font-size: 0.75rem; color: var(--text-muted); white-space: nowrap;" class="font-mono">
                          -
                        </td>
                        <td style="padding: 0.35rem 0.45rem; text-align: center; color: var(--text-muted); font-size: 0.675rem; white-space: nowrap;">
                          -
                        </td>

                      </tr>
                    `;
                  }).join('');

                  // Render hàng Ave (Màu vàng nổi bật như ảnh số 2)
                  const aveRowHtml = `
                    <tr style="border-top: 1px solid rgba(234, 179, 8, 0.6); border-bottom: 2px solid rgba(234, 179, 8, 0.6); background: rgba(234, 179, 8, 0.18); font-weight: 800;" 
                        data-is-ave="true" 
                        data-stage-group="${group.stage}"
                        data-district="${group.district}"
                        data-prod-val="${aveProdNum !== null ? aveProdNum : ''}"
                        data-rem-val="${aveRemNum !== null ? aveRemNum : ''}"
                        data-scrap-val="${aveScrapResultNum !== null ? aveScrapResultNum : ''}"
                        data-scrap-target="${aveScrapTargetNum !== null ? aveScrapTargetNum : ''}"
                        data-blocked-val="${aveBlockedResultNum !== null ? aveBlockedResultNum : ''}"
                        data-blocked-target="${aveBlockedTargetNum !== null ? aveBlockedTargetNum : ''}">
                      
                      <!-- District -->
                      <td style="padding: 0.35rem 0.5rem; font-weight: 800; color: #fef08a; white-space: nowrap;">
                        ${group.district}
                      </td>

                      <!-- Stage -->
                      <td style="padding: 0.35rem 0.5rem; font-weight: 800; color: #fef08a; white-space: nowrap;">
                        ${group.stage}
                      </td>

                      <!-- Team: Ave -->
                      <td style="padding: 0.35rem 0.6rem; font-weight: 800; color: #fef08a;">
                        Ave
                      </td>

                      <!-- 1. Productivity Ave -->
                      <td style="padding: 0.35rem 0.45rem; text-align: right; white-space: nowrap; border-left: 2px solid rgba(234, 179, 8, 0.5);">
                        <div style="display: inline-flex; align-items: center; justify-content: flex-end; gap: 0.2rem;">
                          <input type="number" step="0.1" value="${aveProdTarget}" class="font-mono"
                                 oninput="handleKpiUniversalTargetChange(this, 'prod', '${group.district}', '${group.stage}', 'Ave')"
                                 style="width: 44px; padding: 0.15rem 0.25rem; font-size: 0.7rem; font-weight: 800; color: #fbbf24; background: rgba(15, 23, 42, 0.85); border: 1px solid rgba(245, 158, 11, 0.5); border-radius: 3px; text-align: right; outline: none;">
                        </div>
                      </td>
                      <td style="padding: 0.35rem 0.45rem; text-align: right; font-weight: 800; font-size: 0.75rem; white-space: nowrap;" class="font-mono">
                        <span style="color: ${aveProdNum !== null ? (aveProdNum >= aveProdTarget ? '#34d399' : '#f87171') : 'var(--text-muted)'};">
                          ${aveProdStr}
                        </span>
                      </td>
                      <td style="padding: 0.35rem 0.45rem; text-align: center; white-space: nowrap;">
                        ${aveProdBadge}
                      </td>

                      <!-- 2. Remarks Ave -->
                      <td style="padding: 0.35rem 0.45rem; text-align: right; white-space: nowrap; border-left: 2px solid rgba(234, 179, 8, 0.5);">
                        <div style="display: inline-flex; align-items: center; justify-content: flex-end; gap: 0.2rem;">
                          <input type="number" step="0.1" value="${aveRemTarget}" class="font-mono"
                                 oninput="handleKpiUniversalTargetChange(this, 'rem', '${group.district}', '${group.stage}', 'Ave')"
                                 style="width: 44px; padding: 0.15rem 0.25rem; font-size: 0.7rem; font-weight: 800; color: #fbbf24; background: rgba(15, 23, 42, 0.85); border: 1px solid rgba(245, 158, 11, 0.5); border-radius: 3px; text-align: right; outline: none;">
                        </div>
                      </td>
                      <td style="padding: 0.35rem 0.45rem; text-align: right; font-weight: 800; font-size: 0.75rem; white-space: nowrap;" class="font-mono">
                        <span style="color: ${aveRemNum !== null ? (aveRemNum >= aveRemTarget ? '#34d399' : '#f87171') : 'var(--text-muted)'};">
                          ${aveRemStr}
                        </span>
                      </td>
                      <td style="padding: 0.35rem 0.45rem; text-align: center; white-space: nowrap;">
                        ${aveRemBadge}
                      </td>

                      <!-- 3. Scrap Ave (Cho phép tự input cả Target và Result) -->
                      <td style="padding: 0.35rem 0.45rem; text-align: right; white-space: nowrap; border-left: 2px solid rgba(234, 179, 8, 0.5);">
                        <div style="display: inline-flex; align-items: center; justify-content: flex-end; gap: 0.2rem;">
                          <input type="number" step="any" value="${aveScrapTarget}" class="font-mono kpi-target-input-scrap" placeholder="-"
                                 oninput="handleKpiUniversalTargetChange(this, 'scrap', '${group.district}', '${group.stage}', 'Ave')"
                                 style="width: 48px; padding: 0.15rem 0.25rem; font-size: 0.7rem; font-weight: 800; color: #fbbf24; background: rgba(15, 23, 42, 0.85); border: 1px solid rgba(245, 158, 11, 0.5); border-radius: 3px; text-align: right; outline: none;">
                        </div>
                      </td>
                      <td style="padding: 0.35rem 0.45rem; text-align: right; white-space: nowrap;">
                        <div style="display: inline-flex; align-items: center; justify-content: flex-end; gap: 0.2rem;">
                          <input type="number" step="any" value="${aveScrapResultInput}" class="font-mono kpi-result-input-scrap" placeholder="-"
                                 oninput="handleKpiUniversalResultChange(this, 'scrap', '${group.district}', '${group.stage}', 'Ave')"
                                 title="Nhập kết quả Scrap (%) trung bình cho Stage ${group.stage}"
                                 style="width: 54px; padding: 0.15rem 0.25rem; font-size: 0.725rem; font-weight: 800; color: ${aveScrapPass === true ? '#34d399' : (aveScrapPass === false ? '#f87171' : '#fef08a')}; background: rgba(15, 23, 42, 0.85); border: 1px solid rgba(245, 158, 11, 0.45); border-radius: 3px; text-align: right; outline: none;">
                        </div>
                      </td>
                      <td style="padding: 0.35rem 0.45rem; text-align: center; white-space: nowrap;">
                        ${aveScrapPass === true ?
                          `<span class="badge badge-green kpi-eval-badge-scrap">🟢 Đạt</span>` :
                          (aveScrapPass === false ?
                            `<span class="badge badge-red kpi-eval-badge-scrap">🔴 Chưa đạt</span>` :
                            `<span class="kpi-eval-badge-scrap" style="color: var(--text-muted); font-size: 0.675rem;">-</span>`)
                        }
                      </td>

                      <!-- 4. Blocked Ave (Cho phép tự input cả Target và Result) -->
                      <td style="padding: 0.35rem 0.45rem; text-align: right; white-space: nowrap; border-left: 2px solid rgba(234, 179, 8, 0.5);">
                        <div style="display: inline-flex; align-items: center; justify-content: flex-end; gap: 0.2rem;">
                          <input type="number" step="1" value="${aveBlockedTarget}" class="font-mono kpi-target-input-blocked" placeholder="-"
                                 oninput="handleKpiUniversalTargetChange(this, 'blocked', '${group.district}', '${group.stage}', 'Ave')"
                                 style="width: 48px; padding: 0.15rem 0.25rem; font-size: 0.7rem; font-weight: 800; color: #fbbf24; background: rgba(15, 23, 42, 0.85); border: 1px solid rgba(245, 158, 11, 0.5); border-radius: 3px; text-align: right; outline: none;">
                        </div>
                      </td>
                      <td style="padding: 0.35rem 0.45rem; text-align: right; white-space: nowrap;">
                        <div style="display: inline-flex; align-items: center; justify-content: flex-end; gap: 0.2rem;">
                          <input type="number" step="any" value="${aveBlockedResultInput}" class="font-mono kpi-result-input-blocked" placeholder="-"
                                 oninput="handleKpiUniversalResultChange(this, 'blocked', '${group.district}', '${group.stage}', 'Ave')"
                                 title="Nhập kết quả Blocked batches trung bình cho Stage ${group.stage}"
                                 style="width: 54px; padding: 0.15rem 0.25rem; font-size: 0.725rem; font-weight: 800; color: ${aveBlockedPass === true ? '#34d399' : (aveBlockedPass === false ? '#f87171' : '#fef08a')}; background: rgba(15, 23, 42, 0.85); border: 1px solid rgba(244, 63, 94, 0.45); border-radius: 3px; text-align: right; outline: none;">
                        </div>
                      </td>
                      <td style="padding: 0.35rem 0.45rem; text-align: center; white-space: nowrap;">
                        ${aveBlockedPass === true ?
                          `<span class="badge badge-green kpi-eval-badge-blocked">🟢 Đạt</span>` :
                          (aveBlockedPass === false ?
                            `<span class="badge badge-red kpi-eval-badge-blocked">🔴 Chưa đạt</span>` :
                            `<span class="kpi-eval-badge-blocked" style="color: var(--text-muted); font-size: 0.675rem;">-</span>`)
                        }
                      </td>

                      <!-- 5. Clip Ave -->
                      <td style="padding: 0.35rem 0.45rem; text-align: right; white-space: nowrap; border-left: 2px solid rgba(234, 179, 8, 0.5);">
                        <div style="display: inline-flex; align-items: center; justify-content: flex-end; gap: 0.2rem;">
                          <input type="number" step="0.1" value="${aveClipTarget}" class="font-mono" placeholder="-"
                                 oninput="handleKpiUniversalTargetChange(this, 'clip', '${group.district}', '${group.stage}', 'Ave')"
                                 style="width: 44px; padding: 0.15rem 0.25rem; font-size: 0.7rem; font-weight: 800; color: #fbbf24; background: rgba(15, 23, 42, 0.85); border: 1px solid rgba(245, 158, 11, 0.5); border-radius: 3px; text-align: right; outline: none;">
                        </div>
                      </td>
                      <td style="padding: 0.35rem 0.45rem; text-align: right; font-weight: 600; font-size: 0.75rem; color: var(--text-muted); white-space: nowrap;" class="font-mono">
                        -
                      </td>
                      <td style="padding: 0.35rem 0.45rem; text-align: center; color: var(--text-muted); font-size: 0.675rem; white-space: nowrap;">
                        -
                      </td>

                    </tr>
                  `;

                  return teamRowsHtml + aveRowHtml;
                }).join('')}
              </tbody>
            </table>
          </div>

        </div>

        <!-- ======================================================== -->
        <!-- DANH SÁCH 3 MỤC CÒN LẠI (6, 7, 8) SẴN SÀNG NHẬN FORMAT   -->
        <!-- ======================================================== -->
        <div style="display: flex; flex-direction: column; gap: 1rem;">
          ${otherSections.map((sec, idx) => `
            <div class="section-card" id="${sec.id}" style="background: var(--bg-card); border: 1px solid var(--border-glass); border-radius: var(--radius-md); overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.12);">
              <div class="section-header-row" style="background: rgba(15, 23, 42, 0.65); padding: 0.85rem 1.25rem; border-bottom: 1px solid var(--border-glass); display: flex; justify-content: space-between; align-items: center;">
                <div style="display: flex; align-items: center; gap: 0.75rem;">
                  <span style="font-size: 1.2rem;">${sec.icon}</span>
                  <div>
                    <h3 style="font-size: 0.975rem; font-weight: 800; color: #f8fafc; margin: 0; letter-spacing: 0.2px;">
                      ${sec.title}
                    </h3>
                    <span style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.15rem; display: block;">
                      ${sec.desc}
                    </span>
                  </div>
                </div>
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                  <span class="badge" style="background: rgba(59, 130, 246, 0.15); color: #60a5fa; border: 1px solid rgba(59, 130, 246, 0.35); font-size: 0.725rem; font-weight: 700; padding: 0.2rem 0.6rem;">
                    Mục ${idx + 6}
                  </span>
                </div>
              </div>

              <div id="${sec.id}Content" style="padding: 1.25rem; min-height: 70px; display: flex; align-items: center; justify-content: center; background: rgba(15, 23, 42, 0.25); border-top: 1px dashed rgba(255, 255, 255, 0.05);">
                <div style="text-align: center; color: var(--text-muted); font-size: 0.825rem; font-style: italic;">
                  (Khu vực chờ cập nhật format chi tiết cho ${sec.title})
                </div>
              </div>
            </div>
          `).join('')}
        </div>

      </div>

      <!-- ======================================================== -->
      <!-- MODAL UPLOAD DATA HÀNG NGÀY CHO CÁC CHỈ SỐ               -->
      <!-- ======================================================== -->
      <div id="kpiUploadModalOverlay" style="display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.75); backdrop-filter: blur(4px); z-index: 9999; align-items: center; justify-content: center; padding: 1.5rem;">
        <div style="background: #0f172a; border: 1px solid rgba(59, 130, 246, 0.4); border-radius: 12px; width: 100%; max-width: 650px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
          
          <div style="padding: 1rem 1.25rem; background: rgba(30, 41, 59, 0.8); border-bottom: 1px solid var(--border-glass); display: flex; justify-content: space-between; align-items: center;">
            <div style="display: flex; align-items: center; gap: 0.5rem;">
              <span style="font-size: 1.25rem;">📤</span>
              <h3 style="font-size: 1rem; font-weight: 800; color: #f8fafc; margin: 0;">Upload &amp; Cập Nhật Dữ Liệu KPI Mới Nhất</h3>
            </div>
            <button type="button" onclick="closeKpiUploadModal()" style="background: transparent; border: none; color: #94a3b8; font-size: 1.25rem; cursor: pointer;">✕</button>
          </div>

          <div style="padding: 1.25rem; display: flex; flex-direction: column; gap: 1rem;">
            
            <div style="background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 8px; padding: 0.85rem 1rem; display: flex; justify-content: space-between; align-items: center;">
              <div>
                <strong style="color: #34d399; font-size: 0.85rem; display: block;">🔄 Cách 1: Live Sync Từ Google Sheet "KPI Data"</strong>
                <span style="font-size: 0.725rem; color: var(--text-muted);">Tự động kéo dữ liệu KPI từ Google Spreadsheet</span>
              </div>
              <button type="button" id="btnKpiLiveSync" class="btn btn-sm btn-primary" onclick="handleKpiLiveSyncGoogleSheet()" style="font-weight: 700; font-size: 0.75rem; white-space: nowrap;">
                Đồng Bộ Ngay ⚡
              </button>
            </div>

            <div>
              <label style="display: block; font-size: 0.8rem; font-weight: 700; color: #cbd5e1; margin-bottom: 0.35rem;">
                📋 Cách 2: Dán bảng dữ liệu copy từ Google Sheet / Excel:
              </label>
              <textarea id="kpiPasteTextarea" rows="6" class="font-mono" placeholder="Dán các cột từ Google Sheet vào đây..." style="width: 100%; box-sizing: border-box; background: rgba(15, 23, 42, 0.8); border: 1px solid var(--border-glass); border-radius: 6px; padding: 0.6rem; color: #f8fafc; font-size: 0.75rem; resize: vertical;"></textarea>
            </div>

            <div>
              <label style="display: block; font-size: 0.8rem; font-weight: 700; color: #cbd5e1; margin-bottom: 0.35rem;">
                📁 Cách 3: Hoặc chọn file CSV / Text xuất từ Sheet:
              </label>
              <input type="file" id="kpiFileInput" accept=".csv,.txt,.tsv" onchange="handleKpiFileInputChange(event)" style="font-size: 0.775rem; color: #94a3b8;">
            </div>

          </div>

          <div style="padding: 0.85rem 1.25rem; background: rgba(15, 23, 42, 0.9); border-top: 1px solid var(--border-glass); display: flex; justify-content: space-between; align-items: center;">
            <button type="button" class="btn btn-sm btn-outline" onclick="handleResetKpiProductivityDefault()" style="color: #f87171; border-color: rgba(239, 68, 68, 0.3); font-size: 0.75rem;">
              ↺ Khôi Phục Dữ Liệu Gốc
            </button>
            <div style="display: flex; gap: 0.5rem;">
              <button type="button" class="btn btn-sm btn-outline" onclick="closeKpiUploadModal()" style="font-size: 0.75rem;">Đóng</button>
              <button type="button" class="btn btn-sm btn-primary" onclick="handleApplyKpiPasteData()" style="font-size: 0.75rem; font-weight: 700;">✓ Cập Nhật Dữ Liệu</button>
            </div>
          </div>

        </div>
      </div>
    `;
  };

  /**
   * Bộ lọc nhanh Stage
   */
  window.handleKpiStageFilter = function(stage) {
    window.KpiResultStore.stageFilter = stage;
    window.renderKpiResultView();
  };

  /**
   * Thay đổi bộ lọc thời gian
   */
  window.handleKpiDateChange = function() {
    const from = document.getElementById('kpiFromDate')?.value;
    const to = document.getElementById('kpiToDate')?.value;
    if (from) window.KpiResultStore.fromDate = from;
    if (to) window.KpiResultStore.toDate = to;
    window.renderKpiResultView();
  };

  /**
   * Copy toàn bộ bảng Master cho Google Sheets hoặc Excel (18 cột khớp mẫu ảnh số 2)
   */
  window.handleCopyKpiMasterTableForSheet = function() {
    const table = document.getElementById('kpiMasterTableMain');
    if (!table) return;

    const headers = [
      'District', 'Stage', 'Team', 
      'Productivity Target (%)', 'Productivity %', 'Productivity Đánh Giá',
      'Remarks Target (%)', 'Remarks Result Ave', 'Remarks Đánh Giá',
      'Scrap Target (%)', 'Scrap Result Ave', 'Scrap Đánh Giá',
      'Blocked Target (%)', 'Blocked Result Ave', 'Blocked Đánh Giá',
      'Clip Target (%)', 'Clip Actual', 'Clip Đánh Giá'
    ];
    const lines = [headers.join('\t')];

    const rows = table.querySelectorAll('tbody tr');
    rows.forEach(tr => {
      const tds = tr.querySelectorAll('td');
      if (tds.length >= 18) {
        const rowVals = [];
        rowVals.push(tds[0].textContent.trim());
        rowVals.push(tds[1].textContent.trim());
        rowVals.push(tds[2].textContent.trim());

        for (let colIdx = 3; colIdx < 18; colIdx += 3) {
          const targetInp = tds[colIdx].querySelector('input');
          const target = targetInp ? (targetInp.value.trim() || '-') : tds[colIdx].textContent.trim();
          const resInp = tds[colIdx + 1].querySelector('input');
          const result = resInp ? (resInp.value.trim() || '-') : tds[colIdx + 1].textContent.trim();
          const evalText = tds[colIdx + 2].textContent.trim();
          rowVals.push(target, result, evalText);
        }
        lines.push(rowVals.join('\t'));
      }
    });

    const tsvContent = lines.join('\n');

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(tsvContent).then(() => {
        if (window.showToast) {
          window.showToast('success', '📋 Đã copy toàn bộ 18 cột bảng KPI! Hãy dán (Ctrl+V) vào Google Sheets hoặc Excel.');
        } else {
          alert('Đã copy bảng vào Clipboard! Bạn có thể dán (Ctrl+V) vào Google Sheets hoặc Excel.');
        }
      }).catch(() => {
        fallbackCopyText(tsvContent);
      });
    } else {
      fallbackCopyText(tsvContent);
    }
  };

  function fallbackCopyText(text) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      if (window.showToast) {
        window.showToast('success', '📋 Đã copy bảng cho Google Sheets / Excel!');
      } else {
        alert('Đã copy bảng vào Clipboard!');
      }
    } catch (e) {
      alert('Không thể copy tự động, vui lòng thử lại.');
    }
    document.body.removeChild(ta);
  }

  /**
   * Xuất file CSV UTF-8 BOM chuẩn cho Google Sheets / Excel
   */
  window.handleExportKpiMasterTableCsv = function() {
    const table = document.getElementById('kpiMasterTableMain');
    if (!table) return;

    const headers = [
      'District', 'Stage', 'Team', 
      'Productivity Target (%)', 'Productivity %', 'Productivity Đánh Giá',
      'Remarks Target (%)', 'Remarks Result Ave', 'Remarks Đánh Giá',
      'Scrap Target (%)', 'Scrap Result Ave', 'Scrap Đánh Giá',
      'Blocked Target (%)', 'Blocked Result Ave', 'Blocked Đánh Giá',
      'Clip Target (%)', 'Clip Actual', 'Clip Đánh Giá'
    ];
    const csvRows = [headers.join(',')];

    const rows = table.querySelectorAll('tbody tr');
    rows.forEach(tr => {
      const tds = tr.querySelectorAll('td');
      if (tds.length >= 18) {
        const rowVals = [];
        rowVals.push(`"${tds[0].textContent.trim().replace(/"/g, '""')}"`);
        rowVals.push(`"${tds[1].textContent.trim().replace(/"/g, '""')}"`);
        rowVals.push(`"${tds[2].textContent.trim().replace(/"/g, '""')}"`);

        for (let colIdx = 3; colIdx < 18; colIdx += 3) {
          const targetInp = tds[colIdx].querySelector('input');
          const target = (targetInp ? (targetInp.value.trim() || '-') : tds[colIdx].textContent.trim()).replace(/"/g, '""');
          const resInp = tds[colIdx + 1].querySelector('input');
          const result = (resInp ? (resInp.value.trim() || '-') : tds[colIdx + 1].textContent.trim()).replace(/"/g, '""');
          const evalText = tds[colIdx + 2].textContent.trim().replace(/"/g, '""');
          rowVals.push(`"${target}"`, `"${result}"`, `"${evalText}"`);
        }
        csvRows.push(rowVals.join(','));
      }
    });

    const csvContent = '\uFEFF' + csvRows.join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const fromDate = window.KpiResultStore.fromDate || '';
    const toDate = window.KpiResultStore.toDate || '';
    link.setAttribute('href', url);
    link.setAttribute('download', `KPI_Master_Dashboard_${fromDate}_den_${toDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    if (window.showToast) window.showToast('success', '📥 Đã xuất file Sheet thành công!');
  };

  /**
   * Quản lý Modal Upload Data
   */
  window.openKpiUploadModal = function() {
    const m = document.getElementById('kpiUploadModalOverlay');
    if (m) m.style.display = 'flex';
  };

  window.closeKpiUploadModal = function() {
    const m = document.getElementById('kpiUploadModalOverlay');
    if (m) m.style.display = 'none';
  };

  /**
   * Chuẩn hóa dữ liệu 4 khối (Productivity, Remarks, FTT, Scrap) từ mảng rows CSV
   * Hỗ trợ fill-down District & Stage khi ô gộp trong Google Sheet bị trống
   */
  function parseKpiMasterFromRows(rows) {
    const parsedProd = [];
    const parsedRemarks = [];
    let scrapTarget = '';
    let scrapActual = '';
    let prodFilterNote = '';
    let remarksFilterNote = '';

    if (!rows || rows.length < 2) {
      return { productivity: parsedProd, remarks: parsedRemarks, scrap: null, meta: {} };
    }

    const r0 = rows[0] || [];
    for (let c = 27; c < r0.length - 1; c++) {
      const lbl = String(r0[c] || '').trim().toLowerCase();
      const val = String(r0[c + 1] || '').trim();
      if (lbl === 'target' && val) scrapTarget = val;
      if (lbl === 'actual' && val) scrapActual = val;
    }

    let curDist = '';
    let curStage = '';
    let prodStopped = false;
    let remarksStarted = false;
    let remarksStopped = false;

    for (let i = 1; i < rows.length; i++) {
      const r = rows[i];
      if (!r || r.length === 0) continue;

      const c0 = String(r[0] || '').trim();
      const c1 = String(r[1] || '').trim();
      const c2 = String(r[2] || '').trim();

      if (!prodStopped) {
        if (c0.startsWith('Applied filters') || c0.startsWith('[Param]')) {
          prodFilterNote = c0;
          prodStopped = true;
        } else if (c0.toLowerCase() !== 'district' && (c0 || c1 || c2)) {
          if (c0) {
            curDist = c0;
            if (c1.toLowerCase() === 'total' || !c1) curStage = '';
          }
          if (c1 && c1.toLowerCase() !== 'total') {
            curStage = c1;
          }
          const useDist = c0 || curDist;
          const useStage = c1 || curStage;
          if (useDist) {
            parsedProd.push({
              id: `prod_live_${parsedProd.length + 1}`,
              district: useDist,
              stage: useStage,
              team: c2,
              fact: r[3] ? String(r[3]).trim() : '',
              normH: r[4] ? String(r[4]).trim() : '',
              haveH: r[5] ? String(r[5]).trim() : '',
              result: r[6] ? String(r[6]).trim() : (r.length <= 6 && r[4] ? String(r[4]).trim() : '')
            });
          }
        }
      }

      const c14 = String(r[14] || '').trim();
      const c15 = String(r[15] || '').trim();
      const c16 = String(r[16] || '').trim();
      if (!remarksStopped) {
        if (c14.toLowerCase().startsWith('otvrukovod') || c14.toLowerCase() === 'date') {
          remarksStarted = true;
        } else if (c14.startsWith('Applied filters')) {
          remarksFilterNote = c14;
          remarksStopped = true;
        } else if (remarksStarted && c14) {
          parsedRemarks.push({
            team: c14,
            resultAve: c15,
            count: c16
          });
        }
      }
    }

    const scrapObj = (scrapTarget || scrapActual) ? { target: scrapTarget, actual: scrapActual } : null;
    return {
      productivity: parsedProd,
      remarks: parsedRemarks,
      scrap: scrapObj,
      meta: { prodFilterNote, remarksFilterNote }
    };
  }

  function applySyncedKpiPayload(payload) {
    const prodList = payload && Array.isArray(payload.productivity) ? payload.productivity : [];
    const remList = payload && Array.isArray(payload.remarks) ? payload.remarks : [];
    const scrapObj = (payload && payload.scrap) ? payload.scrap : null;
    const syncTs = (payload && payload.timestamp) || new Date().toLocaleString('vi-VN');
    const filterNote = (payload && payload.meta && (payload.meta.remarksFilterNote || payload.meta.prodFilterNote)) || '';

    if (!hasValidWorkcellTeams(prodList)) {
      throw new Error('Không tìm thấy dữ liệu team Workcell A/B hợp lệ từ Sheet KPI Data');
    }

    window.KpiResultStore.customProductivityData = prodList;
    window.KpiResultStore.lastSyncedAt = syncTs;
    if (filterNote) window.KpiResultStore.filterNote = filterNote;
    try {
      localStorage.setItem('AJAX_PROPLAN_KPI_PRODUCTIVITY_CUSTOM_DATA', JSON.stringify(prodList));
      localStorage.setItem('AJAX_PROPLAN_KPI_META_CUSTOM_DATA', JSON.stringify({ timestamp: syncTs, filterNote }));
    } catch (e) {}

    if (remList.length > 0) {
      window.KpiResultStore.customRemarksData = remList;
      window.KpiResultStore.remarksMap = buildRemarksLookupMap(remList);
      try {
        localStorage.setItem('AJAX_PROPLAN_KPI_REMARKS_CUSTOM_DATA', JSON.stringify(remList));
      } catch (e) {}
    }

    if (scrapObj && (scrapObj.actual || scrapObj.target)) {
      window.KpiResultStore.customScrapData = scrapObj;
      try {
        localStorage.setItem('AJAX_PROPLAN_KPI_SCRAP_CUSTOM_DATA', JSON.stringify(scrapObj));
      } catch (e) {}
    }

    return prodList.filter(it => isWorkcellAorB(it.team)).length;
  }

  /**
   * Live Sync trực tiếp từ Google Sheet "KPI Data" (gid=56968671)
   * Ưu tiên gọi API /api/sync-kpi trên máy chủ local, fallback sang CSV Google Sheets
   */
  window.handleKpiLiveSyncGoogleSheet = async function() {
    const btn = document.getElementById('btnKpiLiveSync');
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Đang đồng bộ... ⏳';
    }

    try {
      // 1. Ưu tiên gọi máy chủ local (/api/sync-kpi) để tải trọn vẹn trực tiếp từ Sheet gid=56968671
      try {
        const apiResp = await fetch('/api/sync-kpi?t=' + Date.now(), { method: 'GET', cache: 'no-cache' });
        if (apiResp && apiResp.ok) {
          const apiData = await apiResp.json();
          if (apiData && apiData.success && hasValidWorkcellTeams(apiData.productivity)) {
            const wcCount = applySyncedKpiPayload(apiData);
            if (window.SyncService && typeof window.SyncService.reloadScriptFile === 'function') {
              await window.SyncService.reloadScriptFile('js/kpi-data.js');
            }
            window.closeKpiUploadModal();
            window.renderKpiResultView();
            if (window.showToast) {
              window.showToast('success', `✅ Đã đồng bộ KPI mới nhất từ Google Sheet (${wcCount} Workcell Teams)!`);
            }
            return;
          }
        }
      } catch (apiErr) {
        console.warn('API /api/sync-kpi không khả dụng, chuyển sang tải CSV trực tiếp:', apiErr);
      }

      // 2. Fallback trình duyệt trực tiếp (GitHub Pages / tĩnh)
      const sheetId = '1wtuLHVwH4U4OfJ3bKQjTgC13g8EZfZePOyLnqnWzfl4';
      const kpiGid = '56968671';
      const candidateUrls = [
        `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&gid=${kpiGid}`,
        `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent('KPI Data')}`,
        `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${kpiGid}`,
        `https://api.allorigins.win/raw?url=${encodeURIComponent(`https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${kpiGid}`)}`
      ];

      let parsedOk = false;
      for (const u of candidateUrls) {
        try {
          const resp = await fetch(u, { cache: 'no-cache' });
          if (!resp || !resp.ok) continue;
          const csvText = await resp.text();
          if (!csvText || csvText.trim().startsWith('<!DOCTYPE') || csvText.trim().startsWith('<html')) continue;
          const rows = parseCsvText(csvText);
          const parsed = parseKpiMasterFromRows(rows);
          if (hasValidWorkcellTeams(parsed.productivity)) {
            const wcCount = applySyncedKpiPayload({
              ...parsed,
              timestamp: new Date().toLocaleString('vi-VN')
            });
            window.closeKpiUploadModal();
            window.renderKpiResultView();
            if (window.showToast) {
              window.showToast('success', `✅ Đã đồng bộ thành công dữ liệu KPI mới nhất (${wcCount} Teams)!`);
            }
            parsedOk = true;
            break;
          }
        } catch (uErr) {
          continue;
        }
      }

      if (!parsedOk) {
        throw new Error('Không thể bóc tách dữ liệu từ Sheet KPI Data');
      }
    } catch (err) {
      console.error('Live Sync Error:', err);
      if (window.showToast) window.showToast('error', 'Không thể kết nối trực tiếp Google Sheets. Bạn có thể dán bảng vào ô bên dưới!');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Đồng Bộ Ngay ⚡';
      }
    }
  };

  /**
   * Xử lý đọc file CSV upload
   */
  window.handleKpiFileInputChange = function(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
      const text = e.target.result;
      const textarea = document.getElementById('kpiPasteTextarea');
      if (textarea) textarea.value = text;
    };
    reader.readAsText(file);
  };

  /**
   * Áp dụng dữ liệu dán từ textarea
   */
  window.handleApplyKpiPasteData = function() {
    const textarea = document.getElementById('kpiPasteTextarea');
    const text = textarea?.value?.trim();
    if (!text) {
      alert('Vui lòng dán dữ liệu hoặc chọn tải tệp.');
      return;
    }

    const rows = parseCsvText(text);
    if (rows.length < 2) {
      alert('Dữ liệu không đủ dòng để xử lý.');
      return;
    }

    const parsed = parseKpiMasterFromRows(rows);
    let parsedList = parsed.productivity;

    // Fallback nếu user chỉ dán bảng 3-5 cột không có header chuẩn Sheet
    if (!hasValidWorkcellTeams(parsedList)) {
      parsedList = [];
      let curDist = '';
      let curStage = '';
      const startIndex = (rows[0][0] || '').toLowerCase().includes('district') ? 1 : 0;
      for (let i = startIndex; i < rows.length; i++) {
        const r = rows[i];
        if (r.length >= 3) {
          const c0 = (r[0] || '').trim();
          const c1 = (r[1] || '').trim();
          const c2 = (r[2] || '').trim();
          if (c0.startsWith('Applied filters')) break;
          if (c0) {
            curDist = c0;
            if (c1.toLowerCase() === 'total' || !c1) curStage = '';
          }
          if (c1 && c1.toLowerCase() !== 'total') curStage = c1;
          parsedList.push({
            id: `prod_custom_${i}`,
            district: c0 || curDist,
            stage: c1 || curStage,
            team: c2,
            fact: r[3] ? r[3].trim() : '',
            result: r[6] ? r[6].trim() : (r[4] ? r[4].trim() : '')
          });
        }
      }
    }

    if (parsedList.length > 0 && hasValidWorkcellTeams(parsedList)) {
      const wcCount = applySyncedKpiPayload({
        productivity: parsedList,
        remarks: parsed.remarks,
        scrap: parsed.scrap,
        meta: parsed.meta,
        timestamp: new Date().toLocaleString('vi-VN')
      });
      window.closeKpiUploadModal();
      window.renderKpiResultView();
      if (window.showToast) window.showToast('success', `✅ Đã cập nhật thành công ${wcCount} Teams từ dữ liệu dán!`);
    } else if (parsedList.length > 0) {
      window.KpiResultStore.customProductivityData = parsedList;
      try {
        localStorage.setItem('AJAX_PROPLAN_KPI_PRODUCTIVITY_CUSTOM_DATA', JSON.stringify(parsedList));
      } catch (e) {}
      window.closeKpiUploadModal();
      window.renderKpiResultView();
      if (window.showToast) window.showToast('success', `✅ Đã cập nhật thành công ${parsedList.length} dòng dữ liệu KPI mới!`);
    } else {
      alert('Không nhận diện được định dạng dữ liệu.');
    }
  };

  /**
   * Khôi phục dữ liệu gốc
   */
  window.handleResetKpiProductivityDefault = function() {
    window.KpiResultStore.customProductivityData = null;
    window.KpiResultStore.customRemarksData = null;
    window.KpiResultStore.customScrapData = null;
    window.KpiResultStore.lastSyncedAt = (window.KPI_MASTER_DATA && window.KPI_MASTER_DATA.timestamp) || null;
    window.KpiResultStore.remarksMap = buildRemarksLookupMap((window.KPI_MASTER_DATA && window.KPI_MASTER_DATA.remarks) || RAW_KPI_REMARKS_DATA);
    try {
      localStorage.removeItem('AJAX_PROPLAN_KPI_PRODUCTIVITY_CUSTOM_DATA');
      localStorage.removeItem('AJAX_PROPLAN_KPI_REMARKS_CUSTOM_DATA');
      localStorage.removeItem('AJAX_PROPLAN_KPI_SCRAP_CUSTOM_DATA');
      localStorage.removeItem('AJAX_PROPLAN_KPI_META_CUSTOM_DATA');
    } catch (e) {}
    window.closeKpiUploadModal();
    window.renderKpiResultView();
    if (window.showToast) window.showToast('info', 'Đã khôi phục dữ liệu chuẩn từ Sheet KPI Data!');
  };

  /**
   * Tiện ích parse CSV/TSV hỗ trợ xuống dòng bên trong dấu nháy kép ("Applied filters:\n...")
   */
  function parseCsvText(text) {
    if (!text) return [];
    const sampleLine = text.split(/\r?\n/, 1)[0] || '';
    if (sampleLine.includes('\t')) {
      return text.split(/\r?\n/).filter(l => l.trim().length > 0).map(line =>
        line.split('\t').map(c => c.trim().replace(/^"|"$/g, ''))
      );
    }

    const rows = [];
    let row = [];
    let cur = '';
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      const next = text[i + 1];

      if (c === '"') {
        if (inQuotes && next === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (c === ',' && !inQuotes) {
        row.push(cur.trim());
        cur = '';
      } else if ((c === '\r' || c === '\n') && !inQuotes) {
        if (c === '\r' && next === '\n') i++;
        row.push(cur.trim());
        if (row.some(cell => cell.length > 0)) {
          rows.push(row);
        }
        row = [];
        cur = '';
      } else {
        cur += c;
      }
    }
    if (cur.length > 0 || row.length > 0) {
      row.push(cur.trim());
      if (row.some(cell => cell.length > 0)) {
        rows.push(row);
      }
    }
    return rows;
  }

})();
