"use client";

import { gql, useApolloClient, useQuery } from "@apollo/client";
import type { FuriganaMapping } from "@lyricova/api/graphql/types";
import {
  Alert,
  AlertDescription,
} from "@lyricova/components/components/ui/alert";
import { Button } from "@lyricova/components/components/ui/button";
import { DataTable } from "@lyricova/components";
import { DataTableColumnHeader } from "@lyricova/components";
import type { ColumnDef } from "@tanstack/react-table";
import { NavHeader } from "../NavHeader";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@lyricova/components/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lyricova/components/components/ui/tooltip";
import { Edit, Eye, EyeOff, Database, Save, X } from "lucide-react";
import { useState, useMemo, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Textarea } from "@lyricova/components/components/ui/textarea";
import { Input } from "@lyricova/components/components/ui/input";

const GET_FURIGANA_MAPPING_QUERY = gql`
  query FuriganaMappings {
    furiganaMappings {
      text
      furigana
      segmentedText
      segmentedFurigana
    }
  }
`;

const COMPUTE_FURIGANA_MAPPINGS_QUERY = gql`
  query ComputeFuriganaMappings($mapping: [FuriganaMappingInput!]!) {
    computeFuriganaMappings(mapping: $mapping) {
      segmentedFurigana
      segmentedText
    }
  }
`;

const UPDATE_FURIGANA_MAPPINGS_MUTATION = gql`
  mutation UpdateFuriganaMappings($mappings: [FuriganaMappingInput!]!) {
    updateFuriganaMappings(mappings: $mappings)
  }
`;

declare module "@tanstack/react-table" {
  interface TableMeta<TData> {
    editingRowId: string | null;
    editFormData: EditFormData | null;
    validationErrors: {
      segmentedText?: string;
      segmentedFurigana?: string;
    };
    handleEditClick: (row: FuriganaMappingRow) => void;
    handleSaveClick: () => void;
    handleCancelClick: () => void;
    handleInputChange: (
      e: React.ChangeEvent<HTMLInputElement>,
      field: keyof EditFormData
    ) => void;
    handleValueChange: (
      field: keyof EditFormData,
      value: string | null
    ) => void;
  }
}

type FuriganaMappingRow = {
  id: string;
  text: string;
  furigana: string;
  segmentedText: string | null;
  segmentedFurigana: string | null;
  status: "complete" | "incomplete";
};

type EditFormData = Omit<FuriganaMappingRow, "id" | "status">;

export default function FuriganaManager() {
  const [showAll, setShowAll] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [bulkUpdateInput, setBulkUpdateInput] = useState("");
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<EditFormData | null>(null);
  const [validationErrors, setValidationErrors] = useState<{
    segmentedText?: string;
    segmentedFurigana?: string;
  }>({});
  const apolloClient = useApolloClient();

  const { data, loading, error, refetch } = useQuery<{
    furiganaMappings: FuriganaMapping[];
  }>(GET_FURIGANA_MAPPING_QUERY);

  const rows = useMemo(() => {
    if (!data?.furiganaMappings) return [];

    const mappings = showAll
      ? data.furiganaMappings
      : data.furiganaMappings.filter(
          (i) => !i.segmentedText || !i.segmentedFurigana
        );

    return mappings.map(
      (mapping) =>
        ({
          id: `${mapping.text},${mapping.furigana}`,
          text: mapping.text,
          furigana: mapping.furigana,
          segmentedText: mapping.segmentedText,
          segmentedFurigana: mapping.segmentedFurigana,
          status:
            mapping.segmentedText && mapping.segmentedFurigana
              ? "complete"
              : "incomplete",
        } as FuriganaMappingRow)
    );
  }, [data, showAll]);

  const validateRow = useCallback(
    (data: EditFormData | null): boolean => {
      if (!data) return false;
      const errors: typeof validationErrors = {};
      const segText = data.segmentedText || "";
      const segFurigana = data.segmentedFurigana || "";

      const segTextCount = segText ? segText.split(",").length : 0;
      const segFuriganaCount = segFurigana ? segFurigana.split(",").length : 0;

      if (segText && !segFurigana) {
        errors.segmentedFurigana = "Segmented furigana is required.";
      } else if (!segText && segFurigana) {
        errors.segmentedText = "Segmented text is required.";
      } else if (segText && segFurigana && segTextCount !== segFuriganaCount) {
        errors.segmentedText = "Segment counts do not match.";
        errors.segmentedFurigana = "Segment counts do not match.";
      } else if (segText.replaceAll(",", "") !== data.text) {
        errors.segmentedText = "Segmented text does not match original text.";
      } else if (segFurigana.replaceAll(",", "") !== data.furigana) {
        errors.segmentedFurigana =
          "Segmented furigana does not match original furigana.";
      }

      setValidationErrors(errors);
      return Object.keys(errors).length === 0;
    },
    [setValidationErrors]
  );

  const handleEditClick = useCallback((row: FuriganaMappingRow) => {
    setEditingRowId(row.id);
    setEditFormData({
      text: row.text,
      furigana: row.furigana,
      segmentedText: row.segmentedText,
      segmentedFurigana: row.segmentedFurigana,
    });
    setValidationErrors({});
  }, []);

  const handleCancelClick = useCallback(() => {
    setEditingRowId(null);
    setEditFormData(null);
    setValidationErrors({});
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>, field: keyof EditFormData) => {
      setEditFormData((currentData) => {
        if (!currentData) return null;
        return { ...currentData, [field]: e.target.value || null };
      });
    },
    [setEditFormData]
  );

  const processRowUpdate = useCallback(
    async (newRow: EditFormData) => {
      try {
        const result = await apolloClient.mutate<{
          updateFuriganaMappings: boolean;
        }>({
          mutation: UPDATE_FURIGANA_MAPPINGS_MUTATION,
          variables: {
            mappings: [
              {
                text: newRow.text,
                furigana: newRow.furigana,
                segmentedText: newRow.segmentedText || null,
                segmentedFurigana: newRow.segmentedFurigana || null,
              },
            ],
          },
        });

        if (result.errors) {
          throw new Error(result.errors[0].message);
        }
        if (!result.data?.updateFuriganaMappings) {
          throw new Error(`Failed to update ${newRow.text}.`);
        }

        await refetch();
        toast.success(
          `Updated ${newRow.text} to ${newRow.segmentedText ?? "null"}, ${
            newRow.segmentedFurigana ?? "null"
          }.`
        );
      } catch (error) {
        handleProcessRowUpdateError(error as Error);
      }
    },
    [apolloClient, refetch]
  );

  const handleSaveClick = useCallback(async () => {
    if (!editFormData || !editingRowId) return;

    if (validateRow(editFormData)) {
      await processRowUpdate(editFormData);
      setEditingRowId(null);
      setEditFormData(null);
      setValidationErrors({});
    } else {
      toast.error("Validation failed. Please check the fields.");
    }
  }, [editFormData, editingRowId, validateRow, processRowUpdate]);

  const handleProcessRowUpdateError = useCallback((error: Error) => {
    console.error(error);
    toast.error(error.message);
  }, []);

  const handleBulkUpdate = useCallback(
    async (input: string) => {
      try {
        const mappings = input
          .trim()
          .split("\n")
          .map((line) => {
            const [segmentedText, segmentedFurigana] = line.split(";");
            return {
              segmentedText,
              segmentedFurigana,
              text: segmentedText.replaceAll(",", ""),
              furigana: segmentedFurigana.replaceAll(",", ""),
            };
          });

        await apolloClient.mutate<{ updateFuriganaMappings: boolean }>({
          mutation: UPDATE_FURIGANA_MAPPINGS_MUTATION,
          variables: { mappings },
        });

        await refetch();
        toast.success("Updated furigana mappings successfully");
        setIsDialogOpen(false);
        setBulkUpdateInput("");
      } catch (err) {
        console.error(err);
        toast.error(err.message);
      }
    },
    [apolloClient, refetch]
  );

  const handlePredictMapping = useCallback(async () => {
    try {
      const result = await apolloClient.query<{
        computeFuriganaMappings: FuriganaMapping[];
      }>({
        query: COMPUTE_FURIGANA_MAPPINGS_QUERY,
        variables: {
          mapping: rows
            .filter((row) => row.status === "incomplete")
            .map((row) => ({
              text: row.text,
              furigana: row.furigana,
            })),
        },
      });

      if (result.data) {
        setBulkUpdateInput(
          result.data.computeFuriganaMappings
            .map((i) => `${i.segmentedText};${i.segmentedFurigana}`)
            .join("\n")
        );
      }
    } catch (err) {
      console.error(err);
      toast.error(err.message);
    }
  }, [apolloClient, rows]);

  const prompt = useMemo(
    () =>
      data?.furiganaMappings
        ? `Your task is to split a Japanese kanji word and it's yomigana into separated kanji when possible, unless it's a Jukujikun or Ateji that are not separable.

---
Input:
世界;せかい
歌声;うたごえ
今日;きょう
宇宙;うちゅう
宇宙;そら
Output:
世,界;せ,かい
歌,声;うた,ごえ
今日;きょう
宇,宙;う,ちゅう
宇宙;そら
---
Input:
${data.furiganaMappings
  .filter((i) => !i.segmentedText || !i.segmentedFurigana)
  .map((i) => i.text + ";" + i.furigana)
  .join("\n")}
Output:
`
        : null,
    [data]
  );

  // Define the type for the editable form data if it's not already accessible
  // Assuming EditFormData is defined in the parent scope or imported
  // type EditFormData = {
  //   text: string;
  //   furigana: string;
  //   segmentedText: string | null;
  //   segmentedFurigana: string | null;
  // };

  interface EditableCellProps {
    initialValue: string | null;
    onSave: (field: keyof EditFormData, value: string | null) => void;
    field: keyof EditFormData;
    error?: string;
  }

  function EditableCell({
    initialValue,
    onSave,
    field,
    error,
  }: EditableCellProps) {
    const [value, setValue] = useState(initialValue ?? "");

    // Effect to reset local state if the initialValue prop changes externally
    // This happens when editing is cancelled or saved, resetting editFormData
    useEffect(() => {
      setValue(initialValue ?? "");
    }, [initialValue]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setValue(e.target.value);
    };

    const handleBlur = () => {
      // Call the onSave callback provided by the parent component
      // This updates the central editFormData state only on blur
      onSave(field, value.trim() || null); // Trim and treat empty string as null
    };

    return (
      <div className="flex flex-col">
        <Input
          value={value}
          onChange={handleChange}
          onBlur={handleBlur}
          className={error ? "border-destructive" : ""}
        />
        {error && (
          <p className="text-xs text-destructive-foreground mt-1">{error}</p>
        )}
      </div>
    );
  }

  // Modified handleInputChange in the parent component (FuriganaManager)
  // Rename it to handleValueChange to better reflect its purpose
  const handleValueChange = useCallback(
    (field: keyof EditFormData, value: string | null) => {
      setEditFormData((currentData) => {
        if (!currentData) return null;
        // Ensure a new object is created for state update
        return { ...currentData, [field]: value };
      });
      // Optional: Trigger validation on blur if desired
      // setValidationErrors({}); // Clear previous errors for this field potentially
    },
    [setEditFormData]
  );

  // Pass handleValueChange down via table meta in FuriganaManager
  /*
    const tableMeta = useMemo(
      () => ({
        // ... other meta properties
        handleValueChange, // Add this
      }),
      [
        // ... other dependencies
        handleValueChange, // Add this
      ]
    );
  */

  const columns = useMemo<ColumnDef<FuriganaMappingRow>[]>(
    () => [
      {
        id: "text",
        accessorKey: "text",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Text" />
        ),
      },
      {
        id: "furigana",
        accessorKey: "furigana",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Furigana" />
        ),
      },
      {
        id: "segmentedText",
        accessorKey: "segmentedText",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Segmented Text" />
        ),
        cell: ({ row, table }) => {
          // Ensure the meta type includes handleValueChange
          const meta = table.options.meta;
          const isEditing = meta.editingRowId === row.original.id;

          return isEditing && meta.editFormData ? (
            <EditableCell
              initialValue={
                meta.editFormData.segmentedText || meta.editFormData.text
              }
              onSave={meta.handleValueChange}
              field="segmentedText"
              error={meta.validationErrors.segmentedText}
            />
          ) : (
            <div>{row.original.segmentedText || "—"}</div>
          );
        },
      },
      {
        id: "segmentedFurigana",
        accessorKey: "segmentedFurigana",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Segmented Furigana" />
        ),
        cell: ({ row, table }) => {
          // Ensure the meta type includes handleValueChange
          const meta = table.options.meta;
          const isEditing = meta.editingRowId === row.original.id;

          return isEditing && meta.editFormData ? (
            <EditableCell
              initialValue={
                meta.editFormData.segmentedFurigana ||
                meta.editFormData.furigana
              }
              onSave={meta.handleValueChange}
              field="segmentedFurigana"
              error={meta.validationErrors.segmentedFurigana}
            />
          ) : (
            <div>{row.original.segmentedFurigana || "—"}</div>
          );
        },
      },
      {
        id: "actions",
        cell: ({ row, table }) => {
          // Ensure the meta type includes necessary action handlers
          const meta = table.options.meta as {
            editingRowId: string | null;
            handleEditClick: (row: FuriganaMappingRow) => void;
            handleSaveClick: () => void;
            handleCancelClick: () => void;
          };
          const isEditing = meta.editingRowId === row.original.id;

          if (isEditing) {
            return (
              <div className="flex gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={meta.handleSaveClick}
                    >
                      <Save />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Save</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={meta.handleCancelClick}
                    >
                      <X />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Cancel</TooltipContent>
                </Tooltip>
              </div>
            );
          }

          return (
            <div className="flex gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => meta.handleEditClick(row.original)}
                  >
                    <Edit />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Edit Mapping</p>
                </TooltipContent>
              </Tooltip>
            </div>
          );
        },
        meta: {
          width: "max-content",
        },
      },
    ],
    [] // Dependencies for useMemo should include anything external used inside,
    // but since column definitions are usually static or depend on stable functions,
    // an empty array might be acceptable if handlers passed via meta are stable refs.
    // If handlers change, they should be included or wrapped in useCallback.
  );

  const tableMeta = useMemo(
    () => ({
      editingRowId,
      editFormData,
      validationErrors,
      handleEditClick,
      handleSaveClick,
      handleCancelClick,
      handleInputChange,
      handleValueChange,
    }),
    [
      editingRowId,
      editFormData,
      validationErrors,
      handleEditClick,
      handleSaveClick,
      handleCancelClick,
      handleInputChange,
      handleValueChange,
    ]
  );

  const tableControls = useMemo(() => {
    return (
      <div className="flex items-center gap-x-2">
        <div className="text-sm text-muted-foreground">
          {rows.length} furigana mappings
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline">
              <Database />
              Batch Update
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-6xl max-h-full flex flex-col">
            <DialogHeader>
              <DialogTitle>Batch Update Mappings</DialogTitle>
              <DialogDescription>
                Update multiple furigana mappings at once.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 overflow-auto -mx-6 px-6">
              <Button
                variant="outline"
                onClick={handlePredictMapping}
                className="w-full"
              >
                <Database />
                Predict with Dictionary
              </Button>
              <details className="text-sm text-muted-foreground">
                <summary className="cursor-pointer">GPT-4 Prompt</summary>
                <pre className="mt-2 rounded bg-muted p-4 overflow-x-auto whitespace-pre-wrap">
                  {prompt}
                </pre>
              </details>
              <Textarea
                value={bulkUpdateInput}
                onChange={(e) => setBulkUpdateInput(e.target.value)}
                placeholder="Enter mappings in format: segmentedText;segmentedFurigana"
                className="h-40"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => handleBulkUpdate(bulkUpdateInput)}
                disabled={!bulkUpdateInput}
              >
                Update
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline" onClick={() => setShowAll(!showAll)}>
              {showAll ? <EyeOff /> : <Eye />}
              <span className="hidden @5xl/dashboard:inline">
                {showAll ? "Hide reviewed" : "Show all"}
              </span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{showAll ? "Hide reviewed" : "Show all"}</p>
          </TooltipContent>
        </Tooltip>
      </div>
    );
  }, [
    rows.length,
    isDialogOpen,
    setIsDialogOpen,
    handlePredictMapping,
    prompt,
    bulkUpdateInput,
    setBulkUpdateInput,
    handleBulkUpdate,
    showAll,
    setShowAll,
  ]);

  let content: React.ReactNode = null;
  if (loading) {
    content = (
      <Alert>
        <AlertDescription>Loading...</AlertDescription>
      </Alert>
    );
  } else if (error) {
    content = (
      <Alert variant="destructive">
        <AlertDescription>{`${error}`}</AlertDescription>
      </Alert>
    );
  } else {
    content = (
      <DataTable
        data={rows}
        columns={columns}
        meta={tableMeta}
        controls={tableControls}
      />
    );
  }

  return (
    <>
      <NavHeader
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          {
            label: `Furigana (${rows.length})`,
          },
        ]}
      />
      <div className="h-full mx-4 flex flex-col gap-4 mb-2">{content}</div>
    </>
  );
}
