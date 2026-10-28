const FIELD_LABELS={itemId:"Item",customerPartyId:"Customer",supplierId:"Supplier",purchaseBillId:"Original bill",categoryId:"Category",unitId:"Unit",gstRate:"GST rate",hsnCode:"HSN/SAC code",companyGstRegistrationId:"Issuing GST registration",priceBasis:"Pricing mode",placeOfSupplyStateCode:"Place of supply",placeOfSupplySource:"Reviewed place-of-supply basis",imageFile:"Item image",quantity:"Quantity",rate:"Rate",purchasePrice:"Purchase price",salesPrice:"Sale price",discountPercentage:"Discount percentage",discountAmount:"Discount amount",taxPercentage:"Tax percentage",minimumStock:"Minimum stock",openingStock:"Opening stock",openingStockValue:"Opening stock value",procurementClassification:"Material type",items:"Line items"};

export function collectFormErrors(errors,path="",result=[]) {
  if(!errors||typeof errors!=="object")return result;
  if(typeof errors.message==="string"&&errors.message.trim())result.push({field:path.startsWith("root.")?null:path,message:errors.message});
  for(const [key,value] of Object.entries(errors)){
    if(["message","type","types","ref"].includes(key))continue;
    collectFormErrors(value,path?`${path}.${key}`:key,result);
  }
  return result;
}

export function formErrorLabel(field,labels={}) {
  const line=String(field??"").match(/^items\.(\d+)\.(.+)$/);
  const name=line?line[2]:field;
  const title=labels[field]??labels[name]??FIELD_LABELS[name]??String(name??"").replace(/Id$/," ").replace(/([a-z])([A-Z])/g,"$1 $2").trim().replace(/^./,letter=>letter.toUpperCase());
  return line?`Line ${Number(line[1])+1}: ${title}`:title;
}

export function focusFormError(form,field) {
  if(!form||!field)return false;
  const controls=[...form.querySelectorAll("[name]")];
  let target=controls.find(element=>element.getAttribute("name")===field&&element.type!=="hidden")??controls.find(element=>element.getAttribute("name")===field);
  const section=[...form.querySelectorAll("[data-error-field]")].find(element=>element.dataset.errorField===field);
  target??=section?.querySelector("input,button,textarea,select,[tabindex]")??section;
  if(!target&&field==="items")target=controls.find(element=>element.getAttribute("name")?.startsWith("items."));
  if(!target&&/^items\.\d+\./.test(field))target=controls.find(element=>element.getAttribute("name")===`${field.split(".").slice(0,2).join(".")}.itemId`);
  if(!target)return false;
  if(target.disabled){target=section??target.parentElement;target.tabIndex=-1;}
  target.focus?.({preventScroll:true});
  const focused=form.contains(document.activeElement)?document.activeElement:target;
  focused.scrollIntoView?.({behavior:"smooth",block:"center"});
  return true;
}

