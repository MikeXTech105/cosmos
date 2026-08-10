import { AlertTriangle, ClipboardPaste } from "lucide-react";
import { useMemo, useState } from "react";

import AppButton from "../../components/common/AppButton";
import AppModal from "../../components/common/AppModal";
import {
  getPasteDimensions,
  isDataBookHeaderRow,
} from "./dataBookPaste";

const DataBookPasteModal = ({
  columns,
  isOpen,
  matrix,
  onCancel,
  onConfirm,
  sheetName,
  startColumn,
}) => {
  const headerDetected = useMemo(
    () => isDataBookHeaderRow(matrix[0], columns, startColumn),
    [columns, matrix, startColumn],
  );
  const [skipHeader, setSkipHeader] = useState(headerDetected);

  const selectedMatrix = skipHeader ? matrix.slice(1) : matrix;
  const dimensions = getPasteDimensions(selectedMatrix);
  const availableColumns = 3 - startColumn;
  const hasOverflow = dimensions.columns > availableColumns;
  const preview = selectedMatrix.slice(0, 5);

  return (
    <AppModal
      isOpen={isOpen}
      maxWidth="max-w-3xl"
      onClose={onCancel}
      title="Preview pasted cells"
    >
      <div className="flex items-start gap-3 rounded-xl border border-brand/20 bg-brand-light/40 p-4">
        <ClipboardPaste className="mt-0.5 h-5 w-5 shrink-0 text-brand" />
        <div>
          <p className="text-sm font-semibold text-slate-900">
            Paste {dimensions.rows} rows × {dimensions.columns} columns into {sheetName}?
          </p>
          <p className="mt-1 text-xs leading-5 text-slate-600">
            Nothing is saved yet. The pasted rows will stay dirty so you can review them first.
          </p>
        </div>
      </div>

      {headerDetected ? (
        <label className="mt-4 flex cursor-pointer items-center gap-2 text-sm text-slate-700">
          <input
            checked={skipHeader}
            className="h-4 w-4 rounded border-slate-300 accent-brand focus:ring-brand"
            type="checkbox"
            onChange={(event) => setSkipHeader(event.target.checked)}
          />
          Skip first row (headers)
        </label>
      ) : null}

      {hasOverflow ? (
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs leading-5 text-amber-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            This block is wider than the remaining grid columns. Columns after Description will be dropped from this paste.
          </p>
        </div>
      ) : null}

      <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] table-fixed border-collapse text-xs">
            <tbody>
              {preview.map((row, rowIndex) => (
                <tr key={rowIndex} className="border-b border-slate-100 last:border-0">
                  {row.slice(0, availableColumns).map((cell, columnIndex) => (
                    <td
                      key={columnIndex}
                      className="truncate border-r border-slate-100 px-3 py-2 text-slate-700 last:border-0"
                      title={cell}
                    >
                      {cell || <span className="text-slate-300">Blank</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {selectedMatrix.length > preview.length ? (
          <p className="border-t border-slate-100 bg-slate-50 px-3 py-2 text-center text-[11px] text-slate-500">
            + {selectedMatrix.length - preview.length} more rows
          </p>
        ) : null}
      </div>

      <div className="mt-6 flex justify-end gap-2">
        <AppButton variant="secondary" onClick={onCancel}>Cancel</AppButton>
        <AppButton
          disabled={selectedMatrix.length === 0}
          onClick={() => onConfirm(selectedMatrix)}
        >
          <ClipboardPaste className="h-4 w-4" />
          Paste
        </AppButton>
      </div>
    </AppModal>
  );
};

export default DataBookPasteModal;
