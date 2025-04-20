"use client";

import {
  ColumnDef,
  SortingState,
  ColumnFiltersState,
  VisibilityState,
  ColumnMeta,
  RowData,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  GlobalFilterTableState,
  TableMeta,
} from "@tanstack/react-table";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@lyricova/components/components/ui/table";
import { Input } from "@lyricova/components/components/ui/input";
import { DataTablePagination } from "./DataTablePagination";
import { useState } from "react";
import { DataTableViewOptions } from "./DataTableViewOptions";

declare module "@tanstack/react-table" {
  interface ColumnMeta<TData extends RowData, TValue> {
    width?: string;
  }
}
interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  meta?: TableMeta<TData>;
  columnVisibility?: VisibilityState;
  controls?: React.ReactNode;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  columnVisibility: defaultColumnVisibility = {},
  controls,
  meta,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(
    defaultColumnVisibility
  );
  const [globalFilter, setGlobalFilter] = useState<
    GlobalFilterTableState["globalFilter"]
  >([]);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    globalFilterFn: "auto",
    onColumnVisibilityChange: setColumnVisibility,
    onGlobalFilterChange: setGlobalFilter,
    meta,
    initialState: {
      pagination: {
        pageSize: 100,
      },
    },
    state: {
      sorting,
      columnFilters,
      globalFilter,
      columnVisibility,
    },
  });

  return (
    <div className="flex flex-col gap-2 grow h-0">
      <div className="flex items-center justify-between gap-2">
        <Input
          placeholder="Filter..."
          onChange={(event) => table.setGlobalFilter(event.target.value)}
          className="max-w-sm h-7 grow w-0"
        />
        <div className="flex items-center gap-2">
          {controls}
          <DataTableViewOptions table={table} />
        </div>
      </div>
      <div className="rounded-md border grow overflow-x-auto h-full [&>[data-slot=table-container]]:h-full">
        <Table
          className="grid h-full grid-rows-[auto_1fr]"
          style={{
            gridTemplateColumns: table
              .getVisibleFlatColumns()
              .map((column) => column.columnDef.meta?.width || "1fr")
              .join(" "),
          }}
        >
          <TableHeader className="grid col-span-full grid-cols-subgrid top-0 sticky bg-background">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow
                className="grid col-span-full grid-cols-subgrid"
                key={headerGroup.id}
              >
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id} className="content-center">
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody className="grid col-span-full grid-cols-subgrid self-stretch items-start content-start">
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  className="grid col-span-full grid-cols-subgrid"
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className="truncate content-center"
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow className="grid col-span-full grid-cols-subgrid">
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center col-span-full content-center"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <DataTablePagination table={table} />
    </div>
  );
}
