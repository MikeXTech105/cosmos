import { beforeEach,describe,expect,it,vi } from "vitest";
import api from "../../api/axios";
import { itemService } from "./itemService";
import { categoryService } from "./categoryService";
import { unitService } from "./unitService";
vi.mock("../../api/axios",()=>({default:{post:vi.fn()}}));
beforeEach(()=>{vi.resetAllMocks();api.post.mockImplementation(async(_url,_body,config)=>({data:config.transformResponse[0]('{"succeeded":true,"data":{"id":9007199254740993,"name":"Created master"}}')}));});
describe("Canonical create response identity",()=>{
  it.each([["category",()=>categoryService.createCategory({name:"Category"})],["unit",()=>unitService.createUnit({name:"Unit",shortName:"U"})]])("keeps new %s IDs exact for immediate parent selection",async(_kind,create)=>{const response=await create();expect(String(response.data.id)).toBe("9007199254740993");});
  it("keeps multipart Item input untransformed and parses its exact canonical created ID",async()=>{
    const response=await itemService.createItem({name:"Item",categoryId:"9007199254740995",openingStock:"9999999999999999.123456"});const [,body,config]=api.post.mock.calls[0];
    expect(body).toBeInstanceOf(FormData);expect(body.get("CategoryId")).toBe("9007199254740995");expect(body.get("OpeningStock")).toBe("9999999999999999.123456");expect(config).not.toHaveProperty("transformRequest");expect(String(response.data.id)).toBe("9007199254740993");
  });
});
