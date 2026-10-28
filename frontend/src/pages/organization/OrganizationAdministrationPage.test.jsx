// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { store } from "../../store/store";
import OrganizationAdministrationPage from "./OrganizationAdministrationPage";
import { organizationService } from "../../services/organization/organizationService";
import { userService } from "../../services/rbac/userService";

vi.mock("../../services/organization/organizationService",()=>({organizationService:{companies:vi.fn(),branches:vi.fn(),assignments:vi.fn(),saveCompany:vi.fn(),saveBranch:vi.fn(),grant:vi.fn(),revoke:vi.fn()}}));
vi.mock("../../services/rbac/userService",()=>({userService:{getUsers:vi.fn()}}));
const capabilityState = vi.hoisted(() => ({ master: { canView: true, canCreate: true, canEdit: true }, scopes: { canView: true, canCreate: true, canEdit: true } }));
vi.mock("../../hooks/useCapabilities",()=>({default:({ resource }) => resource === "scope-assignments" ? capabilityState.scopes : capabilityState.master}));
const response=data=>({data});
const mount=()=>render(<Provider store={store}><MemoryRouter><OrganizationAdministrationPage /></MemoryRouter></Provider>);
const seed = () => {
 organizationService.companies.mockResolvedValue(response([{id:1,code:"C1",name:"Company",isActive:true},{id:2,code:"C2",name:"Inactive",isActive:false}]));
 organizationService.branches.mockResolvedValue(response([{id:10,companyId:1,code:"B1",name:"Branch One",isActive:true},{id:20,companyId:2,code:"B2",name:"Branch Two",isActive:true}]));
 userService.getUsers.mockResolvedValue(response([{id:7,username:"scope-user",isActive:true}]));
 organizationService.assignments.mockResolvedValue(response([{id:31,companyId:1,branchId:10,isActive:true}]));
};
beforeEach(() => { window.requestAnimationFrame = (callback) => { callback(); return 0; }; window.cancelAnimationFrame = () => {}; });
afterEach(() => { cleanup(); vi.clearAllMocks(); capabilityState.master = { canView: true, canCreate: true, canEdit: true }; capabilityState.scopes = { canView: true, canCreate: true, canEdit: true }; });
describe("OrganizationAdministrationPage",()=>{
 it("renders companies and saves a new company through the mounted form",async()=>{ seed(); organizationService.saveCompany.mockResolvedValue(response({})); mount(); expect(await screen.findByText("Company")).toBeTruthy(); fireEvent.click(screen.getByText("Add Company")); fireEvent.change(screen.getByLabelText("Code*"), {target:{value:"NEW"}}); fireEvent.change(screen.getByLabelText("Name*"), {target:{value:"New Company"}}); fireEvent.click(screen.getByRole("button", {name:"Save"})); await waitFor(()=>expect(organizationService.saveCompany).toHaveBeenCalledWith(undefined,{code:"NEW",name:"New Company",isActive:true})); });
 it("edits a company and retains its active status",async()=>{ seed(); organizationService.saveCompany.mockResolvedValue(response({})); mount(); await screen.findByText("Company"); fireEvent.click(screen.getAllByRole("button", {name:"Edit"})[0]); fireEvent.change(screen.getByLabelText("Name*"), {target:{value:"Company edited"}}); fireEvent.click(screen.getByRole("button", {name:"Save"})); await waitFor(()=>expect(organizationService.saveCompany).toHaveBeenCalledWith(1,{code:"C1",name:"Company edited",isActive:true})); });
 it("renders branch management and its company filter",async()=>{ seed(); mount(); await screen.findByText("Company"); fireEvent.click(screen.getByRole("button", {name:"Branches"})); expect(await screen.findByText("Branch One")).toBeTruthy(); expect(screen.getByRole("combobox", {name:"Company"})).toBeTruthy(); expect(screen.getByRole("button", {name:"Add Branch"})).toBeTruthy(); });
 it("opens the mounted scope-assignment workspace",async()=>{ seed(); mount(); await screen.findByText("Company"); fireEvent.click(screen.getByRole("button", {name:"User Access"})); expect(screen.getByRole("combobox")).toBeTruthy(); expect(screen.getByText("Select a user to manage access.")).toBeTruthy(); });
 it("hides master and assignment write controls for read-only permissions",async()=>{ seed(); capabilityState.master = {canView:true,canCreate:false,canEdit:false}; capabilityState.scopes = {canView:true,canCreate:false,canEdit:false}; mount(); await waitFor(()=>expect(organizationService.companies).toHaveBeenCalled()); expect(screen.queryByText("Add Company")).toBeNull(); expect(screen.queryByRole("button",{name:"Edit"})).toBeNull(); fireEvent.click(screen.getByRole("button", {name:"User Access"})); expect(screen.queryByRole("button",{name:"Grant access"})).toBeNull(); });
});
