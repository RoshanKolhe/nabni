import isEqual from 'lodash/isEqual';
import { useState, useCallback, useEffect } from 'react';
import { useSnackbar } from 'notistack';
import axiosInstance from 'src/utils/axios';
// @mui
import { alpha } from '@mui/material/styles';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import LoadingButton from '@mui/lab/LoadingButton';
import Container from '@mui/material/Container';
import TableBody from '@mui/material/TableBody';
import TableContainer from '@mui/material/TableContainer';
// routes
import { paths } from 'src/routes/paths';
import { useParams, useRouter } from 'src/routes/hook';
import { RouterLink } from 'src/routes/components';
// _mock
// hooks
import { useBoolean } from 'src/hooks/use-boolean';
// components
import Label from 'src/components/label';
import Iconify from 'src/components/iconify';
import Scrollbar from 'src/components/scrollbar';
import { ConfirmDialog } from 'src/components/custom-dialog';
import { useSettingsContext } from 'src/components/settings';
import CustomBreadcrumbs from 'src/components/custom-breadcrumbs';
import {
  useTable,
  getComparator,
  emptyRows,
  TableNoData,
  TableEmptyRows,
  TableHeadCustom,
  TableSelectedAction,
  TablePaginationCustom,
} from 'src/components/table';
//
import { useGetDocuments } from 'src/api/documents';

import { _roles, DocumentsStatusOption, STATUS_COLOR_MAP } from 'src/utils/constants';
import { useLocales } from 'src/locales';
import DocumentsTableToolbar from '../documents-table-toolbar';
import DocumentsTableFiltersResult from '../documents-table-filters-result';
import DocumentsTableRow from '../documents-table-row';
import DocumentsRiskyClausesDialog from '../documents-risky-clauses-dialog';

// ----------------------------------------------------------------------

const STATUS_OPTIONS = [{ value: 'all', label: 'all' }, ...DocumentsStatusOption];

const defaultFilters = {
  name: '',
  role: [],
  status: 'all',
};

// ----------------------------------------------------------------------

export default function DocumentsListView() {

  const params = useParams();

  const { id: propertyTypeId } = params;

  const [isProcessing, setIsProcessing] = useState(false);
  const { enqueueSnackbar } = useSnackbar();
  const table = useTable({ defaultOrderBy: 'createdAt', defaultOrder: 'desc' });
  const { t } = useLocales();
  const TABLE_HEAD = [
    { id: 'file_name', label: t('name'), width: 180 },
    { id: 'type_name', label: t('document_type'), width: 180 },
    // { id: 'property_name', label: t('property_name') },
    { id: 'created_at', label: t('created_at') },
    { id: 'status', label: t('status'), width: 100 },
    { id: '', width: 88 },
  ];
  const settings = useSettingsContext();

  const router = useRouter();

  const confirm = useBoolean();

  const [tableData, setTableData] = useState([]);

  const [filters, setFilters] = useState(defaultFilters);
  const [riskyClauseOpen, setRiskyClauseOpen] = useState(false);
  const [riskyClauseSelectedRowId, setRiskyClauseSelectedRowId] = useState();

  const filter = propertyTypeId ? `property_name_id=${propertyTypeId}` : '';
  const { documents, refreshDocuments } = useGetDocuments(filter);

  const dataFiltered = applyFilter({
    inputData: tableData,
    comparator: getComparator(table.order, table.orderBy),
    filters,
  });

  const dataInPage = dataFiltered.slice(
    table.page * table.rowsPerPage,
    table.page * table.rowsPerPage + table.rowsPerPage
  );

  const denseHeight = table.dense ? 52 : 72;

  const canReset = !isEqual(defaultFilters, filters);

  const notFound = (!dataFiltered.length && canReset) || !dataFiltered.length;

  const handleFilters = useCallback(
    (name, value) => {
      table.onResetPage();
      setFilters((prevState) => ({
        ...prevState,
        [name]: value,
      }));
    },
    [table]
  );

  const handleDeleteRow = useCallback(
    (id) => {
      const deleteRow = tableData.filter((row) => row.id !== id);
      setTableData(deleteRow);

      table.onUpdatePageDeleteRow(dataInPage.length);
    },
    [dataInPage.length, table, tableData]
  );

  const handleEditRow = useCallback(
    (id) => {
      router.push(paths.dashboard.documents.edit(id));
    },
    [router]
  );

  const handleViewRow = useCallback(
    (id) => {
      router.push(paths.dashboard.documents.extractedData(id));
    },
    [router]
  );

  const handleFilterStatus = useCallback(
    (event, newValue) => {
      handleFilters('status', newValue);
    },
    [handleFilters]
  );

  const handleResetFilters = useCallback(() => {
    setFilters(defaultFilters);
  }, []);

  const handleRiskyClauseClick = useCallback((id) => {
    setRiskyClauseSelectedRowId(id);
    setRiskyClauseOpen(true);
  }, []);

  useEffect(() => {
    if (documents) {
      setTableData(documents);
    }
  }, [documents]);

  return (
    <>
      <Container maxWidth={settings.themeStretch ? false : 'lg'}>
        <CustomBreadcrumbs
          heading={t('list')}
          links={[
            { name: t('dashboard'), href: paths.dashboard.root },
            { name: t('documents'), href: paths.dashboard.documents.root },
            { name: t('list') },
          ]}
          sx={{
            mb: { xs: 3, md: 5 },
          }}
        />

        <Card>
          <Tabs
            value={filters.status}
            onChange={handleFilterStatus}
            sx={{
              px: 2.5,
              boxShadow: (theme) => `inset 0 -2px 0 0 ${alpha(theme.palette.grey[500], 0.08)}`,
            }}
          >
            {STATUS_OPTIONS.map((tab) => {
              const tabValue = tab.value;

              const isSelected = tabValue === 'all' || tabValue === filters.status;
              const labelColor =
                tabValue === 'all' ? 'default' : STATUS_COLOR_MAP[tabValue] || 'default';

              const count =
                tabValue === 'all'
                  ? tableData.length
                  : tableData.filter((row) => row.status === tabValue).length;

              return (
                <Tab
                  key={tabValue}
                  iconPosition="end"
                  value={tabValue}
                  label={t(tab.label)}
                  icon={
                    <Label
                      variant={isSelected ? 'filled' : 'soft'}
                      sx={{
                        backgroundColor: labelColor,
                        color: '#fff',
                        fontSize: 12,
                      }}
                    >
                      {count}
                    </Label>
                  }
                />
              );
            })}
          </Tabs>

          <DocumentsTableToolbar
            filters={filters}
            onFilters={handleFilters}
            //
            roleOptions={_roles}
          />

          {canReset && (
            <DocumentsTableFiltersResult
              filters={filters}
              onFilters={handleFilters}
              //
              onResetFilters={handleResetFilters}
              //
              results={dataFiltered.length}
              sx={{ p: 2.5, pt: 0 }}
            />
          )}

          <TableContainer sx={{ position: 'relative', overflow: 'unset' }}>
            <TableSelectedAction
              dense={table.dense}
              numSelected={table.selected.length}
              rowCount={tableData.filter((row) => row.status === 'Received').length}
              onSelectAllRows={(checked) =>
                table.onSelectAllRows(
                  checked,
                  tableData.filter((row) => row.status === 'Received').map((row) => row.id)
                )
              }
              action={
                <Button
                  variant="outlined"
                  color="primary"
                  onClick={confirm.onTrue}
                  sx={{
                    borderColor: '#FFFFFF',
                    color: '#FFFFFF',
                    '&:hover': {
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      borderColor: '#FFFFFF',
                    },
                  }}
                >
                  {t('process')}
                </Button>
              }
            />

            <Scrollbar>
              <Table size={table.dense ? 'small' : 'medium'} sx={{ minWidth: 960 }}>
                <TableHeadCustom
                  order={table.order}
                  orderBy={table.orderBy}
                  headLabel={TABLE_HEAD}
                  rowCount={tableData.length}
                  numSelected={table.selected.length}
                  onSort={table.onSort}
                  onSelectAllRows={(checked) =>
                    table.onSelectAllRows(
                      checked,
                      tableData.filter((row) => row.status === 'Received').map((row) => row.id)
                    )
                  }
                />

                <TableBody>
                  {dataFiltered
                    .slice(
                      table.page * table.rowsPerPage,
                      table.page * table.rowsPerPage + table.rowsPerPage
                    )
                    .map((row) => (
                      <DocumentsTableRow
                        key={row.id}
                        row={row}
                        selected={table.selected.includes(row.id)}
                        onSelectRow={() => table.onSelectRow(row.id)}
                        onDeleteRow={() => handleDeleteRow(row.id)}
                        onEditRow={() => handleEditRow(row.id)}
                        onViewRow={() => handleViewRow(row.id)}
                        onViewRiskyClause={() => handleRiskyClauseClick(row.id)}
                      />
                    ))}

                  <TableEmptyRows
                    height={denseHeight}
                    emptyRows={emptyRows(table.page, table.rowsPerPage, tableData.length)}
                  />

                  <TableNoData notFound={notFound} />
                </TableBody>
              </Table>
            </Scrollbar>
          </TableContainer>

          <TablePaginationCustom
            count={dataFiltered.length}
            page={table.page}
            rowsPerPage={table.rowsPerPage}
            onPageChange={table.onChangePage}
            onRowsPerPageChange={table.onChangeRowsPerPage}
            //
            dense={table.dense}
            onChangeDense={table.onChangeDense}
          />
        </Card>
      </Container>

      <ConfirmDialog
        open={confirm.value}
        onClose={confirm.onFalse}
        title={t('confirmation_heading')}
        content={<>{t('confirmation_subheading')}</>}
        action={
          <LoadingButton
            loading={isProcessing}
            variant="contained"
            color="success"
            onClick={async () => {
              setIsProcessing(true);
              try {
                const selectedRows = tableData.filter((row) => table.selected.includes(row.id));
                const payload = selectedRows.map((row) => ({
                  id: row.id,
                  property_type_id: row.property_type_id,
                  document_type_id: row.document_type_id,
                }));
                console.log(payload);
                // eslint-disable-next-line no-unreachable
                await axiosInstance.post('/process-documents', payload);
                refreshDocuments();
                table.onSelectAllRows(false, []);
                enqueueSnackbar(t('documents_processed_successfully'), { variant: 'success' });
                confirm.onFalse();
              } catch (error) {
                console.error('Processing error:', error);
                enqueueSnackbar(error.message || t('error_processing_documents'), {
                  variant: 'error',
                });
              } finally {
                setIsProcessing(false);
              }
            }}
          >
            {t('process')}
          </LoadingButton>
        }
      />

      <DocumentsRiskyClausesDialog
        open={riskyClauseOpen}
        onClose={() => setRiskyClauseOpen(false)}
        docId={riskyClauseSelectedRowId}
      />
    </>
  );
}

// ----------------------------------------------------------------------

function applyFilter({ inputData, comparator, filters }) {
  const { name, status, role } = filters;
  const stabilizedThis = inputData.map((el, index) => [el, index]);
  const roleMapping = {
    production_head: 'Production Head',
    initiator: 'Initiator',
    validator: 'Validator',
  };
  stabilizedThis.sort((a, b) => {
    const order = comparator(a[0], b[0]);
    if (order !== 0) return order;
    return a[1] - b[1];
  });

  inputData = stabilizedThis.map((el) => el[0]);

  if (name) {
    inputData = inputData.filter((documents) =>
      Object.values(documents).some((value) =>
        String(value).toLowerCase().includes(name.toLowerCase())
      )
    );
  }

  if (status !== 'all') {
    inputData = inputData.filter((documents) => documents.status === status);
  }

  if (role.length) {
    inputData = inputData.filter(
      (documents) =>
        documents.permissions &&
        documents.permissions.some((documentsRole) => {
          console.log(documentsRole);
          const mappedRole = roleMapping[documentsRole];
          console.log('Mapped Role:', mappedRole); // Check the mapped role
          return mappedRole && role.includes(mappedRole);
        })
    );
  }

  return inputData;
}
