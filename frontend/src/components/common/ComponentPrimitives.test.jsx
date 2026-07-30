import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import AppButton from "./AppButton";
import AppInput from "./AppInput";
import AppModal from "./AppModal";
import AppSelect from "./AppSelect";
import AppTooltip from "./AppTooltip";
import DataTableShell from "./DataTableShell";
import MaterialTypePill from "./MaterialTypePill";
import PageHeader from "./PageHeader";
import StatCards from "./StatCards";

const getClassNames = (markup) =>
  [...markup.matchAll(/class="([^"]*)"/g)].map((match) => match[1]);

describe("component primitive contracts", () => {
  it("exposes readable forwardRef component names", () => {
    for (const [component, displayName] of [
      [AppButton, "AppButton"],
      [AppInput, "AppInput"],
      [AppSelect, "AppSelect"],
    ]) {
      expect(component.$$typeof).toBe(Symbol.for("react.forward_ref"));
      expect(component.displayName).toBe(displayName);
    }
  });

  it("normalizes only explicitly controlled AppInput values", () => {
    const controlledMarkup = renderToStaticMarkup(
      <AppInput onChange={() => {}} value={undefined} />,
    );
    const uncontrolledMarkup = renderToStaticMarkup(
      <AppInput defaultValue="Initial" />,
    );

    expect(controlledMarkup).toContain('value=""');
    expect(uncontrolledMarkup).toContain('value="Initial"');
  });

  it("supports AppInput labels, hints, errors, sizes, and aliases", () => {
    const markup = renderToStaticMarkup(
      <AppInput
        error="Required"
        hint="Use the registered name"
        id="supplier-name"
        isDisabled
        label="Supplier"
        size="sm"
        value=""
        onChange={() => {}}
      />,
    );
    const classes = getClassNames(markup);
    const inputClassName = classes.find((className) =>
      className.includes("placeholder:text-slate-500"),
    );

    expect(markup).toContain('for="supplier-name"');
    expect(markup).toContain('id="supplier-name-hint"');
    expect(markup).toContain('id="supplier-name-error"');
    expect(markup).toContain("disabled");
    expect(inputClassName).toContain("h-9");
    expect(inputClassName).toContain("min-h-11");
    expect(inputClassName).toContain("px-3");
    expect(inputClassName).toContain("border-red-400");
  });

  it("lets callers override AppInput and AppSelect container utilities", () => {
    const inputClasses = getClassNames(
      renderToStaticMarkup(
        <AppInput
          className="h-8 border-slate-900 px-2"
          value=""
          onChange={() => {}}
        />,
      ),
    );
    const inputClassName = inputClasses.find((className) =>
      className.includes("placeholder:text-slate-500"),
    );
    const selectClassName = getClassNames(
      renderToStaticMarkup(
        <AppSelect className="min-w-full" options={[]} value="" />,
      ),
    )[0];

    expect(inputClassName).toContain("h-8");
    expect(inputClassName).toContain("min-h-11");
    expect(inputClassName).toContain("border-slate-900");
    expect(inputClassName).toContain("px-2");
    expect(inputClassName).not.toContain("border-slate-200");
    expect(inputClassName).not.toContain("px-4");
    expect(selectClassName).toContain("min-w-full");
    expect(selectClassName).not.toContain("min-w-0");
  });

  it("uses mobile keyboard hints that match numeric precision", () => {
    const integerMarkup = renderToStaticMarkup(
      <AppInput type="number" step="1" />,
    );
    const decimalMarkup = renderToStaticMarkup(
      <AppInput type="number" step="0.01" />,
    );

    expect(integerMarkup).toContain('inputMode="numeric"');
    expect(decimalMarkup).toContain('inputMode="decimal"');
  });

  it("normalizes AppSelect values and renders its field contract", () => {
    const markup = renderToStaticMarkup(
      <AppSelect
        error="Choose a warehouse"
        hint="Only active warehouses are shown"
        id="warehouse"
        isDisabled
        label="Warehouse"
        options={[]}
        size="sm"
        value={undefined}
      />,
    );
    const classes = getClassNames(markup);
    const triggerClassName = classes.find((className) =>
      className.includes("justify-between"),
    );

    expect(markup).toContain('for="warehouse"');
    expect(markup).toContain('value=""');
    expect(markup).toContain('id="warehouse-hint"');
    expect(markup).toContain('id="warehouse-error"');
    expect(markup).toContain("disabled");
    expect(triggerClassName).toContain("h-9");
    expect(triggerClassName).not.toContain("h-10");
  });

  it("lets callers override every shared container primitive", () => {
    const headerClasses = getClassNames(
      renderToStaticMarkup(
        <PageHeader className="flex-row" title="Inventory" />,
      ),
    )[0];
    const pillClasses = getClassNames(
      renderToStaticMarkup(
        <MaterialTypePill className="bg-red-50 text-red-700" value={1} />,
      ),
    )[0];
    const statClasses = getClassNames(
      renderToStaticMarkup(
        <StatCards
          cards={[{ key: "one", label: "One", value: 1 }]}
          className="lg:grid-cols-2"
        />,
      ),
    )[0];
    const tooltipClasses = getClassNames(
      renderToStaticMarkup(
        <AppTooltip className="block" label="Reason">
          <button type="button">Action</button>
        </AppTooltip>,
      ),
    )[0];

    expect(headerClasses).toContain("flex-row");
    expect(headerClasses).not.toMatch(/(?:^|\s)flex-col(?:\s|$)/);
    expect(pillClasses).toContain("bg-red-50");
    expect(pillClasses).toContain("text-red-700");
    expect(pillClasses).not.toContain("bg-sky-50");
    expect(statClasses).toContain("lg:grid-cols-2");
    expect(statClasses).not.toContain("lg:grid-cols-3");
    expect(tooltipClasses).toContain("block");
    expect(tooltipClasses).not.toContain("inline-flex");
  });

  it("lets DataTableShell callers override table and scroller classes", () => {
    const markup = renderToStaticMarkup(
      <DataTableShell
        className="min-w-0 table-auto"
        columnCount={1}
        head={<th scope="col">Reference</th>}
        scrollerClassName="overflow-x-hidden"
      >
        <tr>
          <td>PO-1</td>
        </tr>
      </DataTableShell>,
    );
    const classes = getClassNames(markup);
    const scrollerClassName = classes.find((className) =>
      className.includes("overflow-x-hidden"),
    );
    const tableClassName = classes.find((className) =>
      className.includes("table-auto"),
    );

    expect(scrollerClassName).not.toContain("overflow-x-auto");
    expect(tableClassName).toContain("min-w-0");
    expect(tableClassName).not.toContain("min-w-[760px]");
    expect(tableClassName).not.toContain("table-fixed");
  });

  it("lets AppModal callers override its width", () => {
    const markup = renderToStaticMarkup(
      <AppModal
        className="max-w-sm"
        isOpen
        maxWidth="max-w-lg"
        title="Confirm"
      >
        Details
      </AppModal>,
    );
    const dialogClassName = getClassNames(markup).find((className) =>
      className.includes("max-w-sm"),
    );

    expect(dialogClassName).not.toContain("max-w-lg");
  });
});
