XianShen_Lzdz = nil
XianShen_Dhdz = nil
function DhZh()
  gg.setVisible(false)
  gg.clearResults()
  gg.setRanges(gg.REGION_C_ALLOC)
  XianShen_searchNumber('3267887104', gg.TYPE_QWORD)
  local XianShen_Jg = gg.getResultCount()
  if XianShen_Jg ~= 0 then
    local XianShen_Zjg = gg.getResults(XianShen_Jg)
    local XianShen_Tmp = {}
    for k, v in pairs(XianShen_Zjg) do
      XianShen_Tmp[#XianShen_Tmp + 1] = {}
      XianShen_Tmp[#XianShen_Tmp].address = v.address - 8
      XianShen_Tmp[#XianShen_Tmp].flags = gg.TYPE_DWORD
    end
    XianShen_Tmp = gg.getValues(XianShen_Tmp)
    for k, v in pairs(XianShen_Tmp) do
      if v.value == 1 then
        XianShen_Zjg[1] = XianShen_Tmp[k]
        break
      end
    end
    local XianShen_Dzi = XianShen_Zjg[1].address
    XianShen_Lzdz = XianShen_Dzi - 48
    gg.toast('🔰点蜡获取成功')
  else
    gg.toast('🔰点蜡获取失败')
  end
  gg.clearResults()
  gg.setVisible(false)
  gg.clearResults()
  gg.setRanges(gg.REGION_C_ALLOC)
  XianShen_searchNumber('1133903872', gg.TYPE_QWORD)
  local XianShen_Jg = gg.getResultCount()
  if XianShen_Jg ~= 0 then
    local XianShen_Zjg = gg.getResults(XianShen_Jg)
    local XianShen_Tmp = {}
    for k, v in pairs(XianShen_Zjg) do
      XianShen_Tmp[#XianShen_Tmp + 1] = {}
      XianShen_Tmp[#XianShen_Tmp].address = v.address - 4
      XianShen_Tmp[#XianShen_Tmp].flags = gg.TYPE_DWORD
    end
    XianShen_Tmp = gg.getValues(XianShen_Tmp)
    for k, v in pairs(XianShen_Tmp) do
      if v.value == 3 then
        XianShen_Zjg[1] = XianShen_Tmp[k]
        break
      end
    end
    local XianShen_Dzi = XianShen_Zjg[1].address
    XianShen_Dhdz = XianShen_Dzi + 4
    gg.toast('🔰炸花获取成功')
  else
    gg.toast('🔰炸花获取失败')
  end
  gg.clearResults()
end
function Zddzuo()
  local XianShen_Tmp = {}
  for i=1,5 do
    XianShen_Tmp[i] = {}
    XianShen_Tmp[i].address = XianShen_Lzdz + (i - 1) * 24 + 10062280
    XianShen_Tmp[i].flags = gg.TYPE_DWORD
    XianShen_Tmp[i].value = 65535
  end
  gg.setValues(XianShen_Tmp)
end
function ShunD()
  local XianShen_Lz = {}
    for i = 1, 450 do
      XianShen_Lz[i] = {}
      XianShen_Lz[i].address = XianShen_Lzdz + i * 448
      XianShen_Lz[i].flags = gg.TYPE_FLOAT
      XianShen_Lz[i].value = 2
    end
    gg.setValues(XianShen_Lz)
    local XianShen_Dh = {}
    for i = 1, 266 do
      XianShen_Dh[i] = {}
      XianShen_Dh[i].address = XianShen_Dhdz + i * 8
      XianShen_Dh[i].flags = gg.TYPE_FLOAT
      XianShen_Dh[i].value = '0'
    end
    gg.setValues(XianShen_Dh)
end