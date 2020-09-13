XianShen_Mzxc = {}
function RymQz()
  gg.setVisible(false)
  gg.clearResults()
  XianShen_searchNumber("1487508559", gg.TYPE_DWORD)
  gg.refineNumber('1487508559',gg.TYPE_DWORD)
  XianShen_Za = gg.getResultCount()
  XianShen_Mzxc = gg.getResults(XianShen_Za)
  XianShen_Tmp = {}
  for i, v in ipairs(XianShen_Mzxc) do
    XianShen_Tmp[#XianShen_Tmp + 1] = {}
    XianShen_Tmp[#XianShen_Tmp].address = v.address + 12
    XianShen_Tmp[#XianShen_Tmp].flags = gg.TYPE_BYTE
  end
  XianShen_Tmp = gg.getValues(XianShen_Tmp)
  XianShen_Mzxc.address = XianShen_Tmp[1].address
  XianShen_Tmp4 = {}
  XianShen_Tmp5= {}
  for i = 1,24 do
    XianShen_Tmp4[i]= 0
    XianShen_Tmp4[i]= string.byte('CandleSpace', i, i)
    if XianShen_Tmp4[i] == nil then
      XianShen_Tmp4[i]=0
    end
    XianShen_Tmp5[i] = {}
    XianShen_Tmp5[i].address = XianShen_Mzxc.address + i - 1
    XianShen_Tmp5[i].flags = gg.TYPE_BYTE
    XianShen_Tmp5[i].value = XianShen_Tmp4[i]
    gg.setValues(XianShen_Tmp5)
  end
  gg.setValues(XianShen_Tmp5)
end
function RenYiMeng(x)
  local XianShen_Mmqm = {{812663058;1953384759;1761636210;27502;0;0;1851867932;1399155812;1701011824;0;0;0;0;0;0;0;0;0;-11796322;1;0;0},{812663058;1953384759;1761636210;27502;0;0;2002863132;110;0;0;0;0;0;0;0;0;0;0;-11796322;1;0;0},{812663058;1953384759;1761636210;27502;0;0;2002863132;110;0;0;0;0;0;0;0;0;0;0;-11796322;1;0;0},{812663058;1953384759;1761636210;27502;0;0;2036417564;6581829;0;0;0;0;0;0;0;0;0;0;-11796322;1;0;0},{812663058;1953384759;1761636210;27502;0;0;1634881564;1701409385;1986085727;101;0;0;0;0;0;0;0;0;-11796322;1;0;0},{812663058;1953384759;28530;0;0;0;1634881582;1701409385;1936019039;1684947316;1885693259;29285;0;0;0;0;0;0;-11796322;1;0;0},{812663058;1953384759;1761636210;27502;0;0;2036417564;1130526024;6649441;0;0;0;0;0;0;0;0;0;-11796322;1;0;0},{812663058;1953384759;1761636210;27502;0;0;2036417564;6581829;0;0;0;0;0;0;0;0;0;0;-11796322;1;0;0},{812663058;1953384759;1761636210;27502;0;0;1767985692;110;0;0;0;0;0;0;0;0;0;0;-11796322;1;0;0},{812663058;1953384759;1761636210;27502;0;0;1767985692;1919895150;7631717;0;0;0;0;0;0;0;0;0;-11796322;1;0;0},{812663058;1953384759;1761636210;27502;0;0;1767985692;1701335918;1919251564;0;0;0;0;0;0;0;0;0;-11796322;1;0;0},{812663058;1953384759;1761636210;27502;0;0;1767985692;1631805294;25974;0;0;0;0;0;0;0;0;0;-11796322;1;0;0},{812663058;1953384759;1761636210;27502;0;0;1767985692;1684622702;0;0;0;0;0;0;0;0;0;0;-11796322;1;0;0},{812663058;1953384759;1761636210;27502;0;0;1767985692;1684948334;0;0;0;0;0;0;0;0;0;0;-11796322;1;0;0},{812663058;1953384759;1761636210;27502;0;0;1853182748;7628147;0;0;0;0;0;0;0;0;0;0;-11796322;1;0;0},{812663058;1953384759;1761636210;27502;0;0;1853182750;1601463667;1635019075;7103844;0;0;0;0;0;0;0;0;-11796322;1;0;0},{812663058;1953384759;1761636210;27502;0;0;1853182748;1165256051;25710;0;0;0;0;0;0;0;0;0;-11796322;1;0;0},{812663058;1953384759;1761636210;27502;0;0;1853182748;1383359859;6644577;0;0;0;0;0;0;0;0;0;-11796322;1;0;0},{812663058;1953384759;1761636210;27502;0;0;1853182748;1165256051;25710;0;0;0;0;0;0;0;0;0;-11796322;1;0;0},{812663058;1953384759;1761636210;27502;0;0;1853182748;1165256051;3302510;0;0;0;0;0;0;0;0;0;-11796322;1;0;0},{812663058;1953384759;1761636210;27502;0;0;1937064988;1635013483;29810;0;0;0;0;0;0;0;0;0;-11796322;1;0;0},{812663058;1953384759;1761636210;27502;0;0;1937064988;107;0;0;0;0;0;0;0;0;0;0;-11796322;1;0;0},{812663058;1953384759;1761636210;27502;0;0;1937064988;1935757163;29545;0;0;0;0;0;0;0;0;0;-11796322;1;0;0},{812663058;1953384759;1761636210;27502;0;0;1937064988;1684622699;0;0;0;0;0;0;0;0;0;0;-11796322;1;0;0},{812663058;1953384759;1761636210;27502;0;0;1937064988;1684622699;0;0;0;0;0;0;0;0;0;0;-11796322;1;0;0},{812663058;1953384759;1761636210;27502;0;0;1937064988;1684622699;0;0;0;0;0;0;0;0;0;0;-11796322;1;0;0},{812663058;1953384759;1761636210;27502;0;0;1937064988;1684948331;0;0;0;0;0;0;0;0;0;0;-11796322;1;0;0},{812663058;1953384759;1761636210;27502;0;0;1734954524;29800;0;0;0;0;0;0;0;0;0;0;-11796322;1;0;0},{812663058;1953384759;1761636210;27502;0;0;1734954524;1916892264;1986619491;101;0;0;0;0;0;0;0;0;-11796322;1;0;0},{812663058;1953384759;1761636210;27502;0;0;1734954524;3306600;0;0;0;0;0;0;0;0;0;0;-11796322;1;0;0},{812663058;1953384759;1761636210;27502;0;0;1734954524;1850045544;100;0;0;0;0;0;0;0;0;0;-11796322;1;0;0},{812663058;1953384759;1761636210;27502;0;0;1128748060;1768318543;25955;0;0;0;0;0;0;0;0;0;-11796322;1;0;0},{812663058;1953384759;1761636210;27502;0;0;1869894428;1951624562;7631457;0;0;0;0;0;0;0;0;0;-11796322;1;0;0},{812663058;1953384759;1761636210;27502;0;0;1869894428;28018;0;0;0;0;0;0;0;0;0;0;-11796322;1;0;0},{812663058;1953384759;1761636210;27502;0;0;1869894428;1850043762;100;0;0;0;0;0;0;0;0;0;-11796322;1;0;0},{812663058;1953384759;1761636210;27502;0;0;1651658524;1850045545;100;0;0;0;0;0;0;0;0;0;-11796322;1;0;0},{812663058;1953384759;1761636210;27502;0;0;2002863132;110;0;0;0;0;0;0;0;0;0;0;-11796322;1;0;0},{812663058;1953384759;1761636210;27502;0;0;2002863132;110;0;0;0;0;0;0;0;0;0;0;-11796322;1;0;0}}
  local XianShen_Msj1 = {}
  local XianShen_Mzb3 = {}
  local XianShen_Mzb1 = {}
  local XianShen_Mzb2 = {}
  local XianShen_Tmp = {}
  XianShen_Tmp = {}
  XianShen_Tmp[1] = {}
  XianShen_Tmp[1].address = XianShen_Lzdz + 8849904
  XianShen_Tmp[1].flags = 4
  XianShen_Tmp = gg.getValues(XianShen_Tmp)
  if XianShen_Tmp[1].value == XianShen_Data[x][2] then
    return
  end
  local XianShen_KM = {{':Prairie_ButterflyFields', ':Prairie_Island'}, {':Prairie_ButterflyFields', ':CandleSpaceEnd'}}
  local XianShen_MF2 = {{67.93307495117;1.16085553169;456.54428100586},{-66.11747741699;85.26582336426;40.68412399292},{67.95957946777;1.16132426262;456.5735168457},{22.33564186096;98.8490447998;-46.86563491821},{67.95957946777;1.16132426262;456.5735168457}}
  local XianShen_MF1 = {{-24.71639633179;306.57260131836;33.67992782593},{57.80443954468;133.89576721191;-213.33602905273},{22.33564186096;98.8490447998;-46.86563491821}}
  for i = 1, 22 do
    XianShen_Msj1[i] = {}
    XianShen_Msj1[i].address = XianShen_Lzdz - 35216 - 76 + i * 4
    XianShen_Msj1[i].flags = gg.TYPE_DWORD
    XianShen_Msj1[i].value = XianShen_Mmqm[x][i]
  end
  gg.setValues(XianShen_Msj1)
  gg.addListItems(XianShen_Msj1)
  for i = 1, 3 do
    XianShen_Mzb1[i] = {}
    XianShen_Mzb1[i].address = XianShen_Lzdz - 35216 - 196 + 80 + i * 4
    XianShen_Mzb1[i].flags = gg.TYPE_FLOAT
    XianShen_Tmp = {}
    XianShen_Tmp[#XianShen_Tmp + 1] = {}
    XianShen_Tmp[#XianShen_Tmp].address = XianShen_Dz[1].address + i * 4
    XianShen_Tmp[#XianShen_Tmp].flags = gg.TYPE_FLOAT
    XianShen_Tmp = gg.getValues(XianShen_Tmp)
    XianShen_Mzb1[i].value = XianShen_Tmp[#XianShen_Tmp].value
  end
  gg.setValues(XianShen_Mzb1)
  if x == 38 or x == 37 or x == 3 or x == 4 or x == 25 or x == 16 or x == 17 or x == 24 or x == 6 then
    gg.sleep(500)
    if x == 17 then
      local XianShen_Kgo={}
      XianShen_Kgo[1]={}
      XianShen_Kgo[1].address = XianShen_Lzdz - 35216 +4
      XianShen_Kgo[1].flags = 4
      XianShen_Kgo[1].freeze = true
      XianShen_Kgo[1].value = 1
      gg.setValues(XianShen_Kgo)
      gg.addListItems(XianShen_Kgo)
    end
    if x == 38 or x == 37 then
      XianShen_Q1 = {}
      if x == 38 then
        XianShen_Q1[1] = {}
        XianShen_Q1[1] = XianShen_KM[1]
      end
      if x == 37 then
        XianShen_Q1[1] = {}
        XianShen_Q1[1] = XianShen_KM[2]
      end
      gg.clearResults()
      gg.setRanges(gg.REGION_C_ALLOC)
      XianShen_searchNumber(XianShen_Q1[1][1], gg.TYPE_BYTE)
      gg.refineNumber(XianShen_Q1[1][1], gg.TYPE_BYTE)
      gg.getResults(800)
      gg.editAll(XianShen_Q1[1][2], gg.TYPE_BYTE)
      gg.clearResults()
    end
    XianShen_Q1 = {}
    if x == 3 or x == 4 or x == 38 or x == 25 or x == 37 then
      if x == 3 then
        XianShen_Q1[1] = {}
        XianShen_Q1[1] = XianShen_MF2[1]
      end
      if x == 4 then
        XianShen_Q1[1] = {}
        XianShen_Q1[1] = XianShen_MF2[2]
      end
      if x == 38 then
        XianShen_Q1[1] = {}
        XianShen_Q1[1] = XianShen_MF2[3]
      end
      if x == 25 then
        XianShen_Q1[1] = {}
        XianShen_Q1[1] = XianShen_MF2[4]
      end
      if x == 27 then
        XianShen_Q1[1] = {}
        XianShen_Q1[1] = XianShen_MF2[5]
      end
      for i = 1, 3 do
        XianShen_Mzb2[i] = {}
        XianShen_Mzb2[i].address = XianShen_Lzdz - 35216 - 196 + 80 + 224 + i * 4
        XianShen_Mzb2[i].flags = gg.TYPE_FLOAT
        XianShen_Mzb2[i].freeze = true
        XianShen_Mzb2[i].value = XianShen_Q1[1][i]
      end
      gg.setValues(XianShen_Mzb2)
      gg.addListItems(XianShen_Mzb2)
      gg.sleep(500)
      gg.removeListItems(XianShen_Mzb2)
    end
    XianShen_Q1 = {}
    if x == 16 or x == 17 or x == 24 then
      if x == 16 then
        XianShen_Q1[1] = {}
        XianShen_Q1[1] = XianShen_MF1[1]
      end
      if x == 17 then
        XianShen_Q1[1] = {}
        XianShen_Q1[1] = XianShen_MF1[2]
      end
      if x == 24 then
        XianShen_Q1[1] = {}
        XianShen_Q1[1] = XianShen_MF1[3]
      end
      for i = 1, 3 do
        XianShen_Mzb1[i] = {}
        XianShen_Mzb1[i].address = XianShen_Lzdz - 35216 - 196 + 80 + i * 4
        XianShen_Mzb1[i].flags = gg.TYPE_FLOAT
        XianShen_Mzb1[i].freeze = true
        XianShen_Mzb1[i].value = XianShen_Q1[1][i]
      end
      gg.setValues(XianShen_Mzb1)
      gg.addListItems(XianShen_Mzb1)
      gg.sleep(500)
      gg.removeListItems(XianShen_Mzb1)
    end
    XianShen_Q1 = {}
    if x == 6 then
      XianShen_Q1 = {270.20822143555, 172.3408203125, 8.31658363342}
      for i = 1, 3 do
        XianShen_Mzb3[i] = {}
        XianShen_Mzb3[i].address = XianShen_Lzdz - 35216 - 196 + 80 + 448 + i * 4
        XianShen_Mzb3[i].flags = gg.TYPE_FLOAT
        XianShen_Mzb3[i].freeze = true
        XianShen_Mzb3[i].value = XianShen_Q1[i]
      end
      gg.setValues(XianShen_Mzb3)
      gg.addListItems(XianShen_Mzb3)
      gg.sleep(500)
      gg.removeListItems(XianShen_Mzb3)
    end
    if x == 17 then
      gg.sleep(500)
      ShunYi({182.99942016602;1187.02368164062;397.66998291016})
      gg.sleep(200)
      ShunYi({182.99942016602;1187.02368164062;397.66998291016})
    end
  end
end