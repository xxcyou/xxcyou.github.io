XianShen_SuDU = nil
function JiaSuCuS()
  gg.clearResults()
  gg.setRanges(gg.REGION_C_ALLOC)
  XianShen_searchNumber("1023969417",gg.TYPE_DWORD)
  local XianShen_Jg = gg.getResultCount()
  if(XianShen_Jg == nil or XianShen_Jg == 0) then
    gg.toast("XianShen🔰:加速初始化失败")
    return
  end
  local XianShen_Zjg = gg.getResults(XianShen_Jg)
  local XianShen_Tmp = {}
  local XianShen_Tidx = 1
  for i=1,XianShen_Jg do
    XianShen_Tmp[XianShen_Tidx] = {}
    XianShen_Tmp[XianShen_Tidx].address = XianShen_Zjg[i].address + 100
    XianShen_Tmp[XianShen_Tidx].flags = gg.TYPE_DWORD
    XianShen_Tidx = XianShen_Tidx + 1
    XianShen_Tmp[XianShen_Tidx] = {}
    XianShen_Tmp[XianShen_Tidx].address = XianShen_Zjg[i].address + 104
    XianShen_Tmp[XianShen_Tidx].flags = gg.TYPE_DWORD
    XianShen_Tidx = XianShen_Tidx + 1
  end
  local XianShen_Dt = gg.getValues(XianShen_Tmp)
  if(XianShen_Dt ~= nil and #XianShen_Dt > 0) then
    for k,v in pairs(XianShen_Dt) do

      if(v.value == 1065353216) then
        local XianShen_NdtValIdx = k + 1
        if(XianShen_NdtValIdx > #XianShen_Dt) then
          break
        end
        local XianShen_Cha = XianShen_Dt[XianShen_NdtValIdx].address - v.address
        if(XianShen_Cha == 4 and XianShen_Dt[XianShen_NdtValIdx].value == 1065353216) then
          XianShen_SuDU = {}
          XianShen_SuDU.address = XianShen_Dt[k].address - 84
          XianShen_SuDU.flags = gg.TYPE_FLOAT
          break
        end
      end
    end
  end
  gg.clearResults()
  gg.toast("XianShen🔰:加速初始化成功")
end
function JiaSu(bei)
  local XianShen_SetData = {}
  XianShen_SuDU.value = bei
  XianShen_SuDU.freeze = true
  XianShen_SuDU.flags = gg.TYPE_FLOAT
  XianShen_SetData[1] = XianShen_SuDU
  gg.addListItems(XianShen_SetData)
  gg.toast("XianShen🔰:当前倍速为"..bei.."倍！")
end