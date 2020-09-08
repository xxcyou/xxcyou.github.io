XianShen_Wxnl = false
XianShen_Wxhs = {}
function Wxnl()
  gg.setVisible(false)
  if not XianShen_Wxnl then
    gg.clearResults()
    gg.setRanges(4)
    XianShen_searchNumber("256", gg.TYPE_DWORD)
    gg.refineNumber("256", gg.TYPE_DWORD)
    XianShen_Wxhs = gg.getResultCount()
    if XianShen_Wxhs ~= 0 then
      local XianShen_Zjg = gg.getResults(XianShen_Wxhs)
      local XianShen_Tmp = {}
      for k, v in pairs(XianShen_Zjg) do
        XianShen_Tmp[#XianShen_Tmp + 1] = {}
        XianShen_Tmp[#XianShen_Tmp].address = v.address + 60
        XianShen_Tmp[#XianShen_Tmp].flags = gg.TYPE_FLOAT
      end
      local XianShen_Tmp = gg.getValues(XianShen_Tmp)
      for k, v in pairs(XianShen_Tmp) do
        if v.value == 1.25 then
          XianShen_Zjg[1] = XianShen_Tmp[k]
          break
        end
      end
      XianShen_Wxhs = {}
      XianShen_Wxhs[1] = {}
      XianShen_Wxhs[1].address = XianShen_Zjg[1].address - 56
      XianShen_Wxhs[1].flags = gg.TYPE_FLOAT
      XianShen_Wxhs[1].value = "14"
      XianShen_Wxhs[1].freeze = true
      gg.addListItems(XianShen_Wxhs)
      gg.clearResults()
      gg.toast("XianShen🔰:无限能量开启成功")
      XianShen_Wxnl = true
    end
   else
    gg.toast("XianShen🔰:无限能量关闭成功")
    XianShen_Wxhs[1].freeze = false
    gg.addListItems(XianShen_Wxhs)
    XianShen_Wxnl = false
  end
end