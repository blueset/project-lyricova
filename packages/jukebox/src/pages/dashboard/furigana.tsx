import { gql, useApolloClient, useQuery } from "@apollo/client";
import { getLayout } from "../../components/dashboard/layouts/DashboardLayout";
import type { FuriganaMapping } from "lyricova-common/models/FuriganaMapping";
import {
  DataGrid,
  GridActionsCellItem,
  GridColDef,
  GridColumns,
  GridEditInputCell,
  GridRenderEditCellParams,
  GridRowId,
  GridRowModel,
  GridRowModes,
  GridRowModesModel,
  GridValidRowModel,
} from "@mui/x-data-grid";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Stack,
  TextField,
  Tooltip,
  TooltipProps,
  styled,
  tooltipClasses,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import SaveIcon from "@mui/icons-material/Save";
import CancelIcon from "@mui/icons-material/Close";
import { useMemo, useState } from "react";
import { useSnackbar } from "notistack";

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

const UPDATE_FURIGANA_MAPPINGS_MUTATION = gql`
  mutation UpdateFuriganaMappings($mappings: [FuriganaMappingInput!]!) {
    updateFuriganaMappings(mappings: $mappings)
  }
`;

const StyledBox = styled(Box)(({ theme }) => ({
  minHeight: "calc(100vh - 7em)",
  display: "flex",
  flexDirection: "column",
  "& .MuiDataGrid-cell--editable": {
    "& .MuiInputBase-root": {
      height: "100%",
    },
  },
  "& .Mui-error": {
    color: theme.palette.error.light,
  },
}));

const StyledTooltip = styled(({ className, ...props }: TooltipProps) => (
  <Tooltip {...props} classes={{ popper: className }} />
))(({ theme }) => ({
  [`& .${tooltipClasses.tooltip}`]: {
    backgroundColor: theme.palette.error.dark,
    color: theme.palette.error.contrastText,
  },
}));

function renderEditText(params: GridRenderEditCellParams) {
  // Prefill the value if it’s empty
  const value =
    params.value ||
    (params.field === "segmentedFurigana"
      ? params.row.furigana
      : params.row.text);
  return (
    <StyledTooltip open={!!params.error} title={params.error}>
      <GridEditInputCell {...params} value={value} />
    </StyledTooltip>
  );
}

export default function FuriganaManager() {
  const [rowModesModel, setRowModesModel] = useState<GridRowModesModel>({});
  const [isBulkUpdateDialogOpen, setIsBulkUpdateDialogOpen] = useState(false);
  const [bulkUpdateInput, setBulkUpdateInput] = useState("");
  const snackbar = useSnackbar();

  const { data, loading, error, refetch } = useQuery<{
    furiganaMappings: FuriganaMapping[];
  }>(GET_FURIGANA_MAPPING_QUERY);

  const prompt = useMemo(
    () =>
      data?.furiganaMappings
        ? `Your task is to split a Japanese kanji word and it’s yomigana into separated kanji when possible, unless it’s a Jukujikun or Ateji that are not separable.

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

  const apolloClient = useApolloClient();

  const handleEditClick = (id: GridRowId) => () => {
    setRowModesModel({ ...rowModesModel, [id]: { mode: GridRowModes.Edit } });
  };

  const handleSaveClick = (id: GridRowId) => () => {
    setRowModesModel({ ...rowModesModel, [id]: { mode: GridRowModes.View } });
  };

  const handleCancelClick = (id: GridRowId) => () => {
    setRowModesModel({
      ...rowModesModel,
      [id]: { mode: GridRowModes.View, ignoreModifications: true },
    });
  };

  const processRowUpdate = async (
    newRow: GridRowModel,
    oldRow: GridRowModel
  ) => {
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
    await refetch();

    snackbar.enqueueSnackbar(
      `Updated ${newRow.text} to ${newRow.segmentedText}, ${newRow.segmentedFurigana}.`,
      { variant: "success" }
    );

    if (result.errors) {
      snackbar.enqueueSnackbar(result.errors[0].message, {
        variant: "error",
      });
      throw new Error(result.errors[0].message);
    }

    if (!result.data?.updateFuriganaMappings) {
      snackbar.enqueueSnackbar(`Failed to update ${newRow.text}.`, {
        variant: "error",
      });
      return oldRow;
    }

    const updatedRow = { ...newRow, isNew: false };
    return updatedRow;
  };

  const handleProcessRowUpdateError = (error: Error) => {
    console.error(error);
    snackbar.enqueueSnackbar(error.message, { variant: "error" });
  };

  const columns: GridColumns = [
    { field: "text", headerName: "Text", width: 200 },
    { field: "furigana", headerName: "Furigana", width: 200 },
    {
      field: "segmentedText",
      headerName: "Segmented Text",
      width: 200,
      editable: true,
      renderEditCell: renderEditText,
      preProcessEditCellProps(params) {
        const segUnmatch =
          params.props.value?.split(",").length !==
          params.otherFieldsProps.segmentedFurigana.value?.split(",").length;
        const bothReq =
          !params.props.value &&
          !!params.otherFieldsProps.segmentedFurigana.value;
        return {
          ...params.props,
          error: bothReq
            ? "Segmented text is required"
            : segUnmatch
            ? "Segment count not matching."
            : undefined,
        };
      },
    },
    {
      field: "segmentedFurigana",
      headerName: "Segmented Furigana",
      width: 200,
      editable: true,
      renderEditCell: renderEditText,
      preProcessEditCellProps(params) {
        const segUnmatch =
          params.props.value?.split(",").length !==
          params.otherFieldsProps.segmentedText.value?.split(",").length;
        const bothReq =
          !params.props.value && !!params.otherFieldsProps.segmentedText.value;
        return {
          ...params.props,
          error: bothReq
            ? "Segmented furigana is required"
            : segUnmatch
            ? "Segment count not matching."
            : undefined,
        };
      },
    },
    {
      field: "actions",
      type: "actions",
      headerName: "Actions",
      width: 100,
      cellClassName: "actions",
      getActions: (params) => {
        const { id } = params;
        const isInEditMode = rowModesModel[id]?.mode === GridRowModes.Edit;
        if (isInEditMode) {
          return [
            <GridActionsCellItem
              icon={<SaveIcon />}
              label="Save"
              key="Save"
              onClick={handleSaveClick(id)}
            />,
            <GridActionsCellItem
              icon={<CancelIcon />}
              label="Cancel"
              key="Cancel"
              className="textPrimary"
              onClick={handleCancelClick(id)}
              color="inherit"
            />,
          ];
        }
        return [
          <GridActionsCellItem
            icon={<EditIcon />}
            label="Edit"
            key="Edit"
            className="textPrimary"
            onClick={handleEditClick(id)}
            color="inherit"
          />,
        ];
      },
    },
  ];

  return (
    <StyledBox>
      <div>
        {loading && "Loading..."}
        {error && `Error occurred while loading credentials: ${error}`}
        {data && <>{data.furiganaMappings?.length} furigana mappings found.</>}
        <Button
          disabled={!data?.furiganaMappings}
          onClick={() => {
            setIsBulkUpdateDialogOpen(true);
            setBulkUpdateInput("");
          }}
        >
          Batch update
        </Button>
      </div>
      {data && (
        <DataGrid
          rows={data.furiganaMappings ?? []}
          columns={columns}
          pageSize={50}
          editMode="row"
          disableIgnoreModificationsIfProcessingProps
          rowModesModel={rowModesModel}
          onRowModesModelChange={(newModel) => setRowModesModel(newModel)}
          processRowUpdate={processRowUpdate}
          onProcessRowUpdateError={handleProcessRowUpdateError}
          experimentalFeatures={{ newEditingApi: true }}
          getRowId={(row) => `${row.text},${row.furigana}`}
          style={{
            flexGrow: 1,
          }}
        />
      )}
      <Dialog
        open={isBulkUpdateDialogOpen}
        onClose={() => setIsBulkUpdateDialogOpen(false)}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
        fullWidth
        maxWidth="md"
        scroll="paper"
      >
        <form
          onSubmit={async (evt) => {
            evt.preventDefault();
            try {
              const input = bulkUpdateInput
                .trim()
                .split("\n")
                .map((l) => {
                  const [segmentedText, segmentedFurigana] = l.split(";");
                  return {
                    segmentedText,
                    segmentedFurigana,
                    text: segmentedText.replaceAll(",", ""),
                    furigana: segmentedFurigana.replaceAll(",", ""),
                  };
                });
              const result = await apolloClient.mutate<{
                updateFuriganaMappings: boolean;
              }>({
                mutation: UPDATE_FURIGANA_MAPPINGS_MUTATION,
                variables: { mappings: input },
              });
              await refetch();
              snackbar.enqueueSnackbar("Updated with specified input.", {
                variant: "success",
              });
              setIsBulkUpdateDialogOpen(false);
              setBulkUpdateInput("");
            } catch (e) {
              console.error(e);
              snackbar.enqueueSnackbar(e.message, { variant: "error" });
            }
          }}
        >
          <DialogTitle id="alert-dialog-title">
            Bulk update with GPT4
          </DialogTitle>
          <DialogContent dividers>
            <Stack spacing={2}>
              <DialogContentText id="alert-dialog-description">
                Batch update with GPT4 prompt.
              </DialogContentText>
              <TextField
                label="Prompt"
                variant="standard"
                multiline
                value={prompt}
              />
              <TextField
                label="Outcome"
                multiline
                value={bulkUpdateInput}
                onChange={(e) => setBulkUpdateInput(e.target.value)}
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setIsBulkUpdateDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Submit</Button>
          </DialogActions>
        </form>
      </Dialog>
    </StyledBox>
  );
}

FuriganaManager.layout = getLayout("Manage furigana mapping");
