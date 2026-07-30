const AccessibleChartTable = ({ caption, columns, rows }) => (
  <table className="sr-only">
    <caption>{caption}</caption>
    <thead>
      <tr>
        {columns.map((column) => (
          <th key={column.key} scope="col">
            {column.label}
          </th>
        ))}
      </tr>
    </thead>
    <tbody>
      {rows.map((row, rowIndex) => (
        <tr key={row.id ?? row.key ?? rowIndex}>
          {columns.map((column) => (
            <td key={column.key}>
              {column.render ? column.render(row) : row[column.key]}
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  </table>
);

export default AccessibleChartTable;
