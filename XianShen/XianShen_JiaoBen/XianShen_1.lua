XianShen_Dz = nil
function ChuSi()
  gg.setVisible(false)
  gg.clearResults()
  gg.setRanges(4)
  XianShen_searchNumber("-1,067,909,120", gg.TYPE_DWORD)
  gg.refineNumber("-1,067,909,120", gg.TYPE_DWORD)
  local XianShen_Jg = gg.getResultCount()
  if XianShen_Jg >= 1 then
    local XianShen_Zjg = gg.getResults(XianShen_Jg)
    local XianShen_Tmp = {}
    for k, v in pairs(XianShen_Zjg) do
      XianShen_Tmp[#XianShen_Tmp + 1] = {}
      XianShen_Tmp[#XianShen_Tmp].address = v.address + 60
      XianShen_Tmp[#XianShen_Tmp].flags = gg.TYPE_DWORD
    end
    XianShen_Tmp = gg.getValues(XianShen_Tmp)
    for k, v in pairs(XianShen_Tmp) do
      if v.value == 1 then
        XianShen_Zjg[1] = XianShen_Tmp[k]
        break
      end
    end
    local XianShen_Tpp = {}
    XianShen_Tpp[1] = {}
    XianShen_Tpp[1].address = XianShen_Zjg[1].address+92
    XianShen_Tpp[1].flags = gg.TYPE_DWORD
    XianShen_Dz = gg.getValues(XianShen_Tpp)
    gg.clearResults()
    gg.toast("XianShen🔰:人物坐标获取成功")
   else
    gg.toast("XianShen🔰:人物坐标获取失败")
    os.exit()
  end
end