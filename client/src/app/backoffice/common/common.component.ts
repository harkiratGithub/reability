import { findIndex, forEach, includes, reduce, map, filter, isEmpty, isNil, some, find, intersection } from 'lodash';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, Subscription } from 'rxjs';
import { select } from '@angular-redux/store';
import moment from 'moment';
import * as XLSX from 'xlsx';

import { AuthenticationService } from '../../common/services/authentication.service';
import { AjaxAdmin } from '../../common/services/ajax_admin.service';
import * as util from '../backoffice-util';
import * as consts from '../backoffice-constants';
import {
  IBackOfficeTabAction,
  IBackOfficeTabFilter,
  IFilterDetails,
  IMultiSelectOptions,
  IUserFilters,
} from '../../../types';
import { PendingValues, SuspendValues, TechIssueValues } from '../../../constants';
import { getFormattedOfferings } from '../../common/helpers/booking-utils';
import { getWeek } from '../../common/date-util';
import { BackOfficeActions } from '../backoffice-actions';
import { IAppState } from 'src/app/app.state';
import { TABS_WITH_SHARED_FILTERS } from '../backoffice-constants';
import { AjaxService } from 'src/app/therapist/services/ajax.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-common',
  templateUrl: './common.component.html',
  styleUrls: ['./common.component.scss'],
})
export class CommonComponent implements OnInit {
  @select((state: IAppState) => state.backOffice.lastPatientId) readonly lastPatientId$: Observable<number>;
  @select((state: IAppState) => state.backOffice.userFilters) readonly userFilters$: Observable<IUserFilters>;
  subscription: Subscription = new Subscription();
  currentView = consts.mode.view;
  currentTabIndex = consts.Tabs.patients;
  tabs = consts.tabsData;
  table = { columns: [], filtered: [], rows: [] };
  allInstitutes = [];
  allDepartments = [];
  allProfessions = [];
  allExpertises = [];
  allFollowups = [];
  allTherapists = [];
  filterFunc: (data: any[], text?: string) => void;
  isLoading = true;
  editedEntity;
  minSessionTime: string = '00:15:00';
  filteredText = '';
  currentDeleteMessage: string;
  currentDeleteEntityId: number;
  isDeleteConfirmationMessageShown = false;
  isDeleteEnabledInDeleteConfirmationMessage = true;
  currentProfessionName = '';
  currentProfessionId: number;
  lastPatientId: number;
  allDepartmentOptions: IMultiSelectOptions[];
  selectedUserFilters: IUserFilters;
  currentProfessionExpertise = [];
  activeItemsMode = true;
  activeInactiveOptions = consts.ACTIVE_INACTIVE_SELECT_OPTIONS;
  selectedActiveInactiveOptions: IMultiSelectOptions[] = [consts.ACTIVE_INACTIVE_SELECT_OPTIONS[0]];
  helperMethodsForExcelExport = {
    admins: this.http.getActiveAdmins(),
    therapists: this.http.getActiveTherapists(),
    patients: this.http.getActivePatients(),
    games: this.http.getServerLogs(),
    institutes: this.http.getAllInstitutes(),
    followups: this.http.getAllFollowups(),
    professions: this.http.getAllProfessions(),
    leads: this.http.getAllLeads(),
    rtm: this.http.getAllRtmReport(),
  };
  currentSearchText = '';

  activeItemsTabsAdditionalActions: Record<string, IBackOfficeTabAction[]> = {
    [consts.Tabs.professions]: [
      {
        text: 'Schedule',
        action: (row) => this.showProfessionSchedule(row),
        image: 'assets/backoffice/icon_back_office_schedule.svg',
        enabled: true,
      },
      {
        text: 'Expertise',
        action: (row) => this.showProfessionExpertise(row),
        image: 'assets/backoffice/icon_back_office_edit.svg',
        enabled: true,
      },
      {
        text: 'Edit',
        action: (row) => this.editRow(row),
        image: 'assets/backoffice/icon_back_office_edit.svg',
        enabled: true,
      },
    ],
    [consts.Tabs.institutes]: [
      {
        text: 'Edit',
        action: (row) => this.editRow(row),
        image: 'assets/backoffice/icon_back_office_edit.svg',
        enabled: true,
      },
    ],
    [consts.Tabs.therapists]: [
      {
        text: 'Schedule',
        action: (row) => this.openTherapistScheduler(row),
        image: 'assets/backoffice/icon_back_office_schedule.svg',
        enabled: true,
      },
      {
        text: 'Edit',
        action: (row) => this.editRow(row),
        image: 'assets/backoffice/icon_back_office_edit.svg',
        enabled: true,
      },
      {
        text: 'Delete',
        action: (row) => this.deleteRow(row),
        image: 'assets/backoffice/icon_back_office_delete.svg',
        enabled: true,
      },
    ],
    [consts.Tabs.followups]: [
      {
        text: 'Edit',
        action: (row) => this.editRow(row),
        image: 'assets/backoffice/icon_back_office_edit.svg',
        enabled: true,
      },
      {
        text: 'Delete',
        action: (row) => this.deleteRow(row),
        image: 'assets/backoffice/icon_back_office_delete.svg',
        enabled: true,
      },
    ],
    [consts.Tabs.patients]: [
      {
        text: 'Schedule',
        action: (row) => this.editPatientRow(row, consts.PatientView.Schedule),
        image: 'assets/backoffice/icon_back_office_schedule.svg',
        enabled: true,
      },
      {
        text: 'Followup',
        action: (row) => this.addFollowup(row),
        image: 'assets/backoffice/icon_back_office_followup.svg',
        enabled: true,
      },
      {
        text: 'Prescription',
        action: (row) => this.editPatientRow(row, consts.PatientView.Treatments),
        image: 'assets/backoffice/icon_back_office_edit.svg',
        enabled: true,
      },
      {
        text: 'Edit',
        action: (row) => this.editPatientRow(row, consts.PatientView.Details),
        image: 'assets/backoffice/icon_back_office_edit.svg',
        enabled: true,
      },
      {
        text: 'Delete',
        action: (row) => this.deleteRow(row),
        image: 'assets/backoffice/icon_back_office_delete.svg',
        enabled: true,
      },
    ],
    [consts.Tabs.admins]: [
      {
        text: 'Edit',
        action: (row) => this.editRow(row),
        image: 'assets/backoffice/icon_back_office_edit.svg',
        enabled: true,
      },
      {
        text: 'Delete',
        action: (row) => this.deleteRow(row),
        image: 'assets/backoffice/icon_back_office_delete.svg',
        enabled: true,
      },
    ],
    [consts.Tabs.leads]: [
      {
        text: 'Edit',
        action: (row) => this.editRow(row),
        image: 'assets/backoffice/icon_back_office_edit.svg',
        enabled: true,
      },
      {
        text: 'Convert to Patient',
        action: (row) => this.convertLeadToPatient(row),
        image: 'assets/backoffice/icon_back_office_followup.svg',
        enabled: true,
      },
      {
        text: 'Delete',
        action: (row) => this.deleteRow(row),
        image: 'assets/backoffice/icon_back_office_delete.svg',
        enabled: true,
      },
    ],
  };

  inactiveItemsTabsAdditionalActions: Record<string, IBackOfficeTabAction[]> = {
    [consts.Tabs.professions]: [],
    [consts.Tabs.institutes]: [],
    [consts.Tabs.therapists]: [],
    [consts.Tabs.followups]: [],
    [consts.Tabs.patients]: [
      {
        text: 'Undelete',
        action: (row) => this.activatePatient(row.id, row),
        image: 'assets/backoffice/icon_back_office_delete.svg',
        enabled: true,
      },
    ],
    [consts.Tabs.admins]: [],
    [consts.Tabs.leads]: [
      {
        text: 'Undelete',
        action: (row) => this.activateLead(row.id, row),
        image: 'assets/backoffice/icon_back_office_delete.svg',
        enabled: true,
      },
    ],
  };

  activeItemsSharedFilters: IBackOfficeTabFilter[] = [
    {
      displayText: 'Departments',
      isActive: false,
      filter: (data) => {
        this.toggleSharedActivity('departments');
        this.filterFunc(data, this.filteredText);
      },
      setSelectedOptions: (options, data) => {
        this.setFilterOptions('departments', options);
        const value = map(options, (o) => o.value);
        this.http.setUserFilters('departments', value).toPromise();
        this.filterFunc(data, this.filteredText);
      },
      allOptions: [],
      selectedOptions: [],
    },
  ];

  // instituteItemsSharedFilters: IBackOfficeTabFilter[] = [
  //   {
  //     displayText: 'Institutes',
  //     isActive: false,
  //     filter: (data) => {
  //       this.toggleSharedActivity('institutes');
  //       this.filterFunc(data, this.filteredText);
  //     },
  //     setSelectedOptions: (options, data) => {
  //       console.log('234: ', options, data);
  //       this.setFilterOptions('institutes', options);
  //       const value = map(options, (o) => o.value);
  //       console.log(value, 'values');
  //       this.http.setUserFilters('institutes', value).toPromise();
  //       this.filterFunc(data, this.filteredText);
  //     },
  //     allOptions: [],
  //     selectedOptions: [],
  //   },
  // ];

  inactiveItemsSharedFilters: IBackOfficeTabFilter[] = [];

  activeItemsTabsAdditionalFilters: Record<string, IBackOfficeTabFilter[]> = {
    [consts.Tabs.professions]: [],
    [consts.Tabs.institutes]: [],
    [consts.Tabs.therapists]: [],
    [consts.Tabs.followups]: [],
    [consts.Tabs.patients]: [
      {
        displayText: 'Suspend',
        amount: 0,
        filter: (data) => {
          this.toggleFilterActivity(
            consts.Tabs.patients,
            consts.PatientFilterOrder.suspend,
            consts.PatientFilterOrder[consts.PatientFilterOrder.suspend]
          );
          this.filterPatientTable(data, this.filteredText);
        },
        setSelectedOptions: (options, data) => {
          this.setFilterOptions(consts.PatientFilterOrder[consts.PatientFilterOrder.suspend], options);
          this.filterPatientTable(data, this.filteredText);
        },
        isActive: false,
        allOptions: [],
        selectedOptions: [],
        isOneAtTime: true,
        isSingleSelect: true,
      },
      {
        displayText: 'Tech Issue',
        amount: 0,
        filter: (data) => {
          this.toggleFilterActivity(
            consts.Tabs.patients,
            consts.PatientFilterOrder.techIssue,
            consts.PatientFilterOrder[consts.PatientFilterOrder.techIssue]
          );
          this.filterPatientTable(data, this.filteredText);
        },
        isActive: false,
        isOneAtTime: true,
        isSingleSelect: true,
      },
      {
        displayText: 'Pending',
        filter: (data) => {
          this.toggleFilterActivity(
            consts.Tabs.patients,
            consts.PatientFilterOrder.pending,
            consts.PatientFilterOrder[consts.PatientFilterOrder.pending]
          );
          this.filterPatientTable(data, this.filteredText);
        },
        setSelectedOptions: (options, data) => {
          this.setFilterOptions(consts.PatientFilterOrder[consts.PatientFilterOrder.pending], options);
          this.filterPatientTable(data, this.filteredText);
        },
        isActive: false,
        allOptions: [],
        selectedOptions: [],
        isOneAtTime: true,
        isSingleSelect: true,
      },
    ],
  };

  inactiveItemsTabsAdditionalFilters: Record<string, IBackOfficeTabFilter[]> = {
    [consts.Tabs.professions]: [],
    [consts.Tabs.institutes]: [],
    [consts.Tabs.therapists]: [],
    [consts.Tabs.followups]: [],
    [consts.Tabs.patients]: [],
  };

  tabsAdditionalActions: Record<string, IBackOfficeTabAction[]> = this.activeItemsTabsAdditionalActions;
  tabsAdditionalFilters: Record<string, IBackOfficeTabFilter[]> = this.activeItemsTabsAdditionalFilters;
  sharedFilters: IBackOfficeTabFilter[] = this.activeItemsSharedFilters;
  // rtmSharedFilters: IBackOfficeTabFilter[] = this.instituteItemsSharedFilters;

  toggleSharedActivity(filterName: string) {
    const filterDetailsInStore: IFilterDetails = this.selectedUserFilters.departments;
    const isActiveToUpdate = !filterDetailsInStore.isActive;
    if (isActiveToUpdate === false) {
      this.backOfficeActions.setUserFilter({
        [filterName]: { data: [], isActive: isActiveToUpdate },
      });
      if (filterName === 'departments') {
        this.http.setUserFilters('departments', []).toPromise();
      }
    }
    if (isActiveToUpdate === true) {
      this.backOfficeActions.setUserFilter({
        [filterName]: { ...filterDetailsInStore, isActive: isActiveToUpdate },
      });
    }
  }
  setFilterOptions(filterName: string, options: IMultiSelectOptions[]) {
    const filterDetailsInStore: IFilterDetails | undefined = this.selectedUserFilters[filterName];
    this.backOfficeActions.setUserFilter({
      [filterName]: { ...filterDetailsInStore, data: options },
    });
  }

  toggleFilterActivity(tab: consts.Tabs, filterIndex: number, filterName: string) {
    const filterDetailsInStore: IFilterDetails | undefined = this.selectedUserFilters[filterName];
    if (!filterDetailsInStore) {
      return;
    }
    const activityToSet = !filterDetailsInStore.isActive;
    const isOneAtTime = this.tabsAdditionalFilters?.[tab]?.[filterIndex].isOneAtTime;
    this.backOfficeActions.setUserFilter({
      [filterName]: {
        isActive: activityToSet,
        data: this.selectedUserFilters[consts.FILTERS_ORDER[tab]?.[filterIndex]].data,
      },
    });

    if (activityToSet && isOneAtTime) {
      forEach(this.tabsAdditionalFilters[tab], (e, index) => {
        if (
          index !== filterIndex &&
          e.isOneAtTime &&
          this.selectedUserFilters[consts.FILTERS_ORDER[tab]?.[index]].isActive === true
        ) {
          this.backOfficeActions.setUserFilter({
            [consts.FILTERS_ORDER[tab]?.[index]]: {
              isActive: false,
              data: this.selectedUserFilters[consts.FILTERS_ORDER[tab]?.[index]].data,
            },
          });
        }
      });
    }
  }
  updateFilters(tab: consts.Tabs = this.currentTabIndex) {
    forEach(this.tabsAdditionalFilters[tab], (e, index) => {
      const selectedOptions = this.selectedUserFilters?.[consts.FILTERS_ORDER[tab]?.[index]]?.data;
      const active = this.selectedUserFilters?.[consts.FILTERS_ORDER[tab]?.[index]]?.isActive;
      if (isNil(active)) {
        return;
      }
      e.isActive = active;
      e.selectedOptions = selectedOptions;
    });
    this.sharedFilters[0].isActive = this.selectedUserFilters?.departments?.isActive;
    this.sharedFilters[0].selectedOptions = this.selectedUserFilters?.departments?.data;
  }

  constructor(
    private http: AjaxAdmin,
    private ajax: AjaxService,
    private snackBar: MatSnackBar,
    private authenticationService: AuthenticationService,
    private backOfficeActions: BackOfficeActions
  ) {}

  get showAddButton(): boolean {
    const FollowupTab = [consts.Tabs.followups];
    const rtmTab = [consts.Tabs.rtm];
    return !includes(FollowupTab, this.currentTabIndex) && !includes(rtmTab, this.currentTabIndex);
  }

  get showActiveInactiveFilter(): boolean {
    const PatientTab = [consts.Tabs.patients];
    const LeadTab = [consts.Tabs.leads];
    return includes(PatientTab, this.currentTabIndex) || includes(LeadTab, this.currentTabIndex);
  }

  get showExportSessionsButton(): boolean {
    const TherapistTab = [consts.Tabs.therapists];
    return includes(TherapistTab, this.currentTabIndex);
  }

  get showRtmExportSessionsButton(): boolean {
    const RtmTab = [consts.Tabs.rtm];
    return includes(RtmTab, this.currentTabIndex);
  }

  get gamesTab(): any {
    return consts.Tabs.games;
  }

  ngOnInit() {
    if (this.currentTabIndex === consts.Tabs.patients) {
      this.subscription.add(
        this.lastPatientId$.subscribe((patientId) => {
          this.lastPatientId = patientId;
        })
      );
      this.subscription.add(
        this.userFilters$.subscribe((selectedFilters) => {
          this.selectedUserFilters = selectedFilters;
          this.updateFilters();
        })
      );
    }

    this.fetchCurrentTabData(this.currentTabIndex);
    this.filterFunc = this.filterTable(this.currentTabIndex);
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  fetchCurrentTabData(currentTabIndex) {
    this.setLoading(true);
    switch (currentTabIndex) {
      case consts.Tabs.admins:
        this.fetchAdmins();
        break;
      case consts.Tabs.therapists:
        this.fetchTherapists();
        break;
      case consts.Tabs.patients:
        this.activeItemsMode ? this.fetchPatients() : this.fetchInactivePatients();
        break;
      case consts.Tabs.games:
        break;
      case consts.Tabs.institutes:
        this.fetchInstitutes();
        break;
      case consts.Tabs.followups:
        this.fetchFollowups();
        break;
      case consts.Tabs.professions:
        this.fetchProfessions();
        break;
      case consts.Tabs.leads:
        this.fetchLeads();
        break;
      case consts.Tabs.rtm:
        this.fetchRtmReport();
        break;
      default:
        this.setLoading(false);
        console.error('current tab index is not valid');
    }
    const timer = setInterval(() => {
      if (this.isLoading === false) {
        this.filterFunc(this.table.filtered, this.currentSearchText);
        clearInterval(timer);
        return;
      }
    }, 50);
  }

  setTable(columns, rows, filtered = null) {
    this.table = {
      columns,
      rows,
      filtered: filtered || rows,
    };
  }
  fetchTherapists() {
    this.http.getActiveTherapists().subscribe((data) => {
      const rows = util.transformUsers(data);
      this.setTable(consts.tableColumns.therapists, rows);
      this.setLoading(false);
    });
    this.http.getAllInstitutes().subscribe((data) => {
      const rows = util.transformInstitutes(data);
      this.allInstitutes = rows;
    });
    this.http.getAllDepartments().subscribe((data) => {
      this.allDepartments = data;
    });
    this.http.getAllProfessions().subscribe((data) => {
      const rows = util.transformProfessions(data);
      this.allProfessions = rows;
    });
    this.http.getAllExpertises().subscribe((data) => {
      this.allExpertises = data;
    });
  }

  fetchAdmins() {
    this.http.getActiveAdmins().subscribe((data) => {
      const rows = util.transformUsers(data);
      this.setTable(consts.tableColumns.admins, rows);
      this.setLoading(false);
    });
  }

  addFollowupPatientClickHandle(followupColumns) {
    const index = findIndex(followupColumns, { fieldName: 'patient_full_name' });
    const editedCell = { ...followupColumns[index], onClick: (row) => this.editPatient(row.patient_id) };
    return [
      ...followupColumns.slice(0, index),
      editedCell,
      ...followupColumns.slice(index + 1, followupColumns.length),
    ];
  }
  fetchFollowups() {
    this.http.getAllFollowups().subscribe((data) => {
      const rows = data;
      this.allFollowups = rows;
      const columns = this.addFollowupPatientClickHandle(consts.tableColumns.followups);
      this.setTable(columns, rows);
      this.setLoading(false);
    });
    this.http.getActiveTherapists().subscribe((data) => {
      const rows = util.transformUsers(data);
      this.allTherapists = rows;
    });
  }
  fetchPatients() {
    this.http.getActivePatients().subscribe((data) => {
      const rows = util.transformUsers(data);
      const sortedRows = this.getRowsWithLastPatientTop(rows);
      this.setTable(consts.tableColumns.patients, sortedRows);
      this.setLoading(false);
      this.setInitialFilterCounts();
    });
    // TODO unnecessary calls this should be done only when editing patient - start
    this.http.getAllInstitutes().subscribe((data) => {
      const rows = util.transformInstitutes(data);
      this.allInstitutes = rows;
    });
    this.http.getAllDepartments().subscribe((data) => {
      this.allDepartments = data;
      this.setAllPossibleFiltersOptions();
      this.fetchDepartmentFilter();
    });
    this.http.getAllProfessions().subscribe((data) => {
      const rows = util.transformProfessions(data);
      this.allProfessions = rows;
    });
    this.http.getAllExpertises().subscribe((data) => {
      this.allExpertises = data;
    });
    this.http.getActiveTherapists().subscribe((data) => {
      this.allTherapists = data;
    });
    // end
  }

  fetchInactivePatients() {
    this.http.getInactivePatients().subscribe((data) => {
      const rows = util.transformUsers(data);
      const sortedRows = this.getRowsWithLastPatientTop(rows);
      this.setTable(consts.tableColumns.patients, sortedRows);
      this.setLoading(false);
    });
  }

  fetchDepartmentFilter() {
    const userId = this.authenticationService.currentUserValue.id;
    this.http.getUserFilters(userId).subscribe((userFilters: any) => {
      const departmentIds = userFilters?.department_ids;
      if (isEmpty(departmentIds)) {
        return;
      }
      const selectedDepartments: IMultiSelectOptions[] = filter(this.allDepartmentOptions, (department) =>
        includes(userFilters.department_ids, department.value)
      );
      if (!isEmpty(selectedDepartments)) {
        this.backOfficeActions.setUserFilter({
          departments: { isActive: true, data: selectedDepartments },
        });
        this.filterPatientTable(this.table.filtered);
      }
    });
  }
  fetchInstitutes() {
    this.http.getAllInstitutes().subscribe((data) => {
      const rows = util.transformInstitutes(data);
      this.setTable(consts.tableColumns.institutes, rows);
      this.setLoading(false);
    });
  }

  fetchRtmReport() {
    this.http
      .getAllRtmReport({ month: String(moment().month() + 1), year: String(moment().year()) })
      .subscribe((response) => {
        let rows = [];
        if (response?.data?.allData?.length && response?.data?.cumulativeData?.length) {
          const { allData, cumulativeData } = response?.data;
          rows = util.transformRtm(allData, cumulativeData);
        }
        // this.helperMethodsForExcelExport.institutes.subscribe((response) => {
        //   let filterData = response
        //     ?.filter((item) => item?.department_name?.toLowerCase() == 'rtm')
        //     ?.map((ele) => ({
        //       value: ele?.id,
        //       displayName: ele?.institute_name,
        //     }));
        //   console.log('Institute Data: ', filterData, response );
        //   this.sharedFilters[0].allOptions = filterData;
        // });
        this.setTable(
          consts.tableColumns.rtm,
          rows.sort((a, b): any => a.institute_id > b.institute_id)
        );
        this.setLoading(false);
      });
  }

  filterRtmReport(params: { month?: string; year?: string }) {
    this.http.getAllRtmReport(params).subscribe((response) => {
      let rows = [];
      if (response?.data?.allData?.length && response?.data?.cumulativeData?.length) {
        const { allData, cumulativeData } = response?.data;
        rows = util.transformRtm(allData, cumulativeData);
      }
      this.setTable(consts.tableColumns.rtm, rows);
      this.setLoading(false);
    });
  }

  async sendRtmMailSessionsData(params: { month?: string; year?: string; sendMail?: boolean }) {
    try {
      const userData = await this.ajax.getUserData().toPromise();
      const updatedParams = {
        month: params?.month || String(moment().month() + 1),
        year: params?.year || String(moment().year()),
        sendMail: true,
      };
      await this.http.sendRtmMailSessions(updatedParams).toPromise();
      this.snackBar.open('Mail sent successfully to', `${userData.email}`, {
        duration: 3000,
        verticalPosition: 'top',
        horizontalPosition: 'right',
      });
    } catch (error) {
      console.error('Error sending mail', error);
    }
  }

  fetchProfessions() {
    this.http.getAllProfessions().subscribe((data) => {
      const rows = util.transformProfessions(data);
      this.setTable(consts.tableColumns.professions, rows);
      this.setLoading(false);
    });
  }

  fetchLeads() {
    this.http.getAllLeads().subscribe((data) => {
      const rows = util.transformLeads(data, this.activeItemsMode);
      this.setTable(consts.tableColumns.leads, rows);
      this.setLoading(false);
    });
  }
  convertLeadToPatient(row) {
    this.currentSearchText = '';
    const { id, contact_email, contact_full_name, contact_phone, ...rest } = row;
    this.setEditedEntity({
      ...rest,
      lead_id: id,
      primary_contact_full_name: contact_full_name,
      primary_contact_email: contact_email,
      primary_contact_phone: contact_phone,
    });
    this.currentTabIndex = consts.Tabs.patients;
    this.setCurrentView(consts.mode.create);
  }

  showProfessionSchedule(row) {
    this.currentProfessionId = row.id;
    this.currentProfessionName = row.name;
    this.setProfessionSlots(moment());
  }

  showProfessionExpertise(row) {
    this.currentProfessionId = row.id;
    this.currentProfessionName = row.name;
    this.fetchProfessionExpertise();
    this.setCurrentView(consts.mode.expertise);
    this.currentTabIndex = consts.Tabs.professions;
  }

  setProfessionSlots(date) {
    const { weekNumber: week, year } = getWeek(moment(date));
    this.http.getProfessionSlots({ professionId: this.currentProfessionId, week, year }).subscribe((data) => {
      const allOfferings = getFormattedOfferings(data.therapistAvailabilities, data.therapistsBooking);

      const filteredOfferingsByTherapistsDepartments =
        this.selectedUserFilters.departments?.data.length === 0
          ? allOfferings
          : filter(allOfferings, (offering) => {
              const { therapistId } = offering;
              const therapist = find(this.allTherapists, (therapist) => therapist.id === therapistId);
              if (!therapist) {
                return false;
              }
              const filteredDepartmentIds = map(this.selectedUserFilters.departments?.data, (item) => item.value);
              const includedDepartments = intersection(therapist.departments_ids, filteredDepartmentIds);
              return includedDepartments.length > 0;
            });

      this.editedEntity = { ...this.editedEntity, offerings: filteredOfferingsByTherapistsDepartments };
      this.setCurrentView(consts.mode.schedule);
      this.currentTabIndex = consts.Tabs.professions;
    });
  }

  createExpertise(expertise) {
    this.http.createExpertise(expertise).subscribe((data) => {
      this.http.getAllExpertises().subscribe((data) => {
        this.allExpertises = data;
        this.fetchProfessionExpertise();
      });
    });
  }

  updateExpertise(expertise) {
    this.http.editExpertise(expertise).subscribe((data) => {
      this.http.getAllExpertises().subscribe((data) => {
        this.allExpertises = data;
        this.fetchProfessionExpertise();
      });
    });
  }

  deleteExpertise = async (expertiseId): Promise<any> => {
    const data = await this.http.deleteExpertise(expertiseId).toPromise();

    if (!data?.numberOfTreatments && !data?.numberOfTherapists) {
      this.http.getAllExpertises().subscribe((expertiseData) => {
        this.allExpertises = expertiseData;
        this.fetchProfessionExpertise();
      });
    }

    return data;
  };

  fetchProfessionExpertise() {
    this.currentProfessionExpertise = filter(
      this.allExpertises,
      (expertise) => expertise.profession_id === this.currentProfessionId
    );
  }

  deleteTherapist(id) {
    this.http.deleteTherapist(id).subscribe((data) => {
      this.fetchTherapists();
    });
  }

  deleteFollowup(id) {
    this.http.deleteFollowup(id).subscribe((data) => {
      this.fetchFollowups();
    });
  }

  deletePatient(id) {
    this.http.deletePatient(id).subscribe((data) => {
      this.fetchPatients();
    });
  }

  deleteAdmin(id) {
    this.http.deleteAdmin(id).subscribe((data) => {
      this.fetchAdmins();
    });
  }

  deleteInstitute(id) {
    this.http.deleteInstitute(id).subscribe((data) => {
      this.fetchInstitutes();
    });
  }

  deleteLead = (id: number) => {
    this.http
      .editLead({
        id,
        active: false,
      })
      .subscribe((data) => {
        this.fetchLeads();
      });
  };

  activateLead = (id: number, row) => {
    this.http
      .editLead({
        id,
        active: true,
      })
      .subscribe((data) => {
        this.editRow(row);
        this.fetchLeads();
      });
  };

  showDeleteConfirmation(
    entityId: number,
    entityName: string,
    isDeleteEnabledInDeleteConfirmationMessage = true,
    deleteMessage: string = null
  ) {
    this.isDeleteEnabledInDeleteConfirmationMessage = isDeleteEnabledInDeleteConfirmationMessage;
    this.currentDeleteEntityId = entityId;
    if (deleteMessage) {
      this.currentDeleteMessage = deleteMessage;
    } else {
      this.currentDeleteMessage = consts.getRemoveEntityVerificationText(this.tabs[this.currentTabIndex], entityName);
    }
    this.isDeleteConfirmationMessageShown = true;
  }

  hideDeleteConfirmation() {
    this.isDeleteConfirmationMessageShown = false;
  }

  deleteRow(row) {
    switch (this.currentTabIndex) {
      case consts.Tabs.patients:
        this.validateDeletePatient(row);
        break;
      default:
        this.showDeleteConfirmation(row.id, row[this.tabs[this.currentTabIndex].nameField]);
    }
  }

  validateDeletePatient(row) {
    this.http.getFuturePatientBookingStatistics(row.id).subscribe((statistics) => {
      if (statistics.numberOfBookings === 0 && statistics.numberOfPatientTreatments === 0) {
        this.showDeleteConfirmation(row.id, row[this.tabs[this.currentTabIndex].nameField]);
        return;
      }
      const deleteMessage = statistics.numberOfBookings
        ? `There are ${statistics.numberOfBookings} sessions booked for this patient.\nPlease remove them and their prescription treatments before deleting the patient`
        : `Please delete the patient's prescriptions (${statistics.numberOfPatientTreatments} items) before deleting the patient.`;

      this.showDeleteConfirmation(row.id, row[this.tabs[this.currentTabIndex].nameField], false, deleteMessage);
    });
  }

  deleteEntity() {
    this.hideDeleteConfirmation();
    const id = this.currentDeleteEntityId;
    switch (this.currentTabIndex) {
      case consts.Tabs.therapists:
        this.deleteTherapist(id);
        break;
      case consts.Tabs.patients:
        this.deletePatient(id);
        break;
      case consts.Tabs.institutes:
        this.deleteInstitute(id);
        break;
      case consts.Tabs.followups:
        this.deleteFollowup(id);
        break;
      case consts.Tabs.leads:
        this.deleteLead(id);
        break;
      case consts.Tabs.admins:
        this.deleteAdmin(id);
        break;
      default:
        console.error('current tab index is not valid');
    }
    this.currentSearchText = '';
  }

  editRow(row) {
    this.setEditedEntity(row);
    this.setCurrentView(consts.mode.edit);
  }

  editPatientRow(row: any, patientView: consts.PatientView): void {
    const { id: patientId, full_name: patientName, phone, tech_issue: techIssue } = row;
    this.backOfficeActions.setLastPatientId(patientId);

    switch (patientView) {
      case consts.PatientView.Details:
        this.editPatient(patientId);
        break;
      case consts.PatientView.Treatments:
        this.editPatientTreatments(patientId, patientName, phone);
        break;
      case consts.PatientView.Schedule:
        this.editPatientScheduler(patientId, patientName, phone, techIssue);
        break;
    }
  }

  editPatientScheduler(patientId: number, patientName: string, phone: string, techIssue: TechIssueValues): void {
    this.http.getPatientActiveTreatments(patientId).subscribe((treatments) => {
      this.setEditedEntity({
        patientId,
        patientName,
        phone,
        techIssue,
        treatments,
        allProfessions: this.allProfessions,
        allExpertises: this.allExpertises,
        patientView: consts.PatientView.Schedule,
      });
      this.setCurrentView(consts.mode.edit);
      this.currentTabIndex = consts.Tabs.patients;
    });
  }

  editPatientTreatments(patientId: number, patientName: string, phone: string): void {
    this.http.getPatientActiveTreatments(patientId).subscribe((treatments) => {
      this.setEditedEntity({
        patientId,
        patientName,
        phone,
        treatments,
        allProfessions: this.allProfessions,
        allExpertises: this.allExpertises,
        patientView: consts.PatientView.Treatments,
      });
      this.setCurrentView(consts.mode.edit);
      this.currentTabIndex = consts.Tabs.patients;
    });
  }

  openTherapistScheduler(row: any): void {
    this.setEditedEntity(row);
    this.setCurrentView(consts.mode.schedule);
  }

  addFollowup(row): void {
    this.currentSearchText = '';
    this.setEditedEntity({ patient_id: row.id, patient_full_name: row.full_name });
    this.setCurrentView(consts.mode.create);
    this.currentTabIndex = consts.Tabs.followups;
  }

  editPatient(patientId): void {
    this.http.getActivePatient(patientId).subscribe((patientDetails) => {
      const {
        id,
        first_name,
        last_name,
        phone,
        user_name,
        email,
        institute_id,
        departments_ids,
        suspend,
        tech_issue,
        tech_reason,
        notification_email,
        login_notification_email,
        referral,
        user_id,
        contactDetails,
        patientLog,
      } = patientDetails;

      const {
        full_name: primary_contact_full_name = '',
        phone: primary_contact_phone = '',
        email: primary_contact_email = '',
      } = contactDetails[0] ? contactDetails[0] : {};

      const {
        full_name: secondary_contact_full_name = '',
        phone: secondary_contact_phone = '',
        email: secondary_contact_email = '',
      } = contactDetails[1] ? contactDetails[1] : {};

      const userFullName = `${first_name} ${last_name}`;
      const userLog = util.getFormattedUserLog(patientLog, userFullName);

      this.setEditedEntity({
        id,
        first_name,
        last_name,
        user_name,
        phone,
        email,
        institute_id,
        departments_ids,
        suspend,
        tech_issue,
        tech_reason,
        notification_email,
        login_notification_email,
        referral,
        primary_contact_full_name,
        primary_contact_phone,
        primary_contact_email,
        secondary_contact_full_name,
        secondary_contact_phone,
        secondary_contact_email,
        user_id,
        userLog,
        patientView: consts.PatientView.Details,
      });

      this.setCurrentView(consts.mode.edit);
      this.currentTabIndex = consts.Tabs.patients;
    });
  }

  setLoading(isLoading: boolean) {
    this.isLoading = isLoading;
  }

  setEditedEntity(entity) {
    this.editedEntity = entity;
  }

  onClickTab(index) {
    if (index === this.currentTabIndex) {
      return;
    }
    this.currentSearchText = '';
    this.setCurrentTab(index);
    this.setCurrentView(consts.mode.view);
    this.filterFunc = this.filterTable(this.currentTabIndex);
    this.filteredText = '';
    this.setEditedEntity(null);
    this.fetchCurrentTabData(this.currentTabIndex);
    // if (index == consts.Tabs.rtm) {
    //   this.sharedFilters = this.instituteItemsSharedFilters;
    // } else {
    //   this.sharedFilters = this.activeItemsSharedFilters;
    // }
  }

  setCurrentTab(index) {
    this.currentTabIndex = index;
  }

  getCurrentTab() {
    return this.tabs[this.currentTabIndex];
  }

  isCurrentTab(index) {
    return this.currentTabIndex === index;
  }

  onClickNew() {
    this.setCurrentView(consts.mode.create);
  }

  setCurrentView(view) {
    this.currentView = view;
  }

  isViewMode() {
    return this.currentView === consts.mode.view;
  }

  isEditMode() {
    return this.currentView === consts.mode.edit;
  }

  isScheduleMode() {
    return this.currentView === consts.mode.schedule;
  }

  isExpertiseMode() {
    return this.currentView === consts.mode.expertise;
  }

  onReturnFromAddEdit(view = null) {
    this.setCurrentView(consts.mode.view);
    if (view === consts.PatientView.Schedule) {
      const { patientId, patientName, phone, techIssue } = this.editedEntity;
      this.editPatientScheduler(patientId, patientName, phone, techIssue);
    }
    if (!view) {
      this.setEditedEntity(null);
      this.fetchCurrentTabData(this.currentTabIndex);
      this.filterTable(this.currentTabIndex);
    }
  }

  async logout() {
    await this.authenticationService.logout();
  }

  filterTable(currentTabIndex) {
    switch (currentTabIndex) {
      case consts.Tabs.patients:
        return this.filterPatientTable;
      case consts.Tabs.therapists:
        return this.filterTherapistTable;
      case consts.Tabs.rtm:
        this.filterRtmReport;
      default:
        return this.filterTableByText;
    }
  }

  filterTherapistTable = (data: [], filterText: string = '') => {
    const filteredData = data.filter((row: any): boolean => {
      return (
        this.isTherapistInDepartment(row.departments_ids, this.sharedFilters[0].isActive) &&
        this.isTextInRow(row, filterText)
      );
    });
    this.setFilteredData(filteredData);
  };

  isTherapistInDepartment = (departmentIds: number[], isActive: boolean): boolean => {
    const subFilterDepartments = this.selectedUserFilters.departments?.data;
    if (isEmpty(subFilterDepartments)) {
      return true;
    }
    return isActive
      ? some(
          departmentIds,
          (id) =>
            !!find(subFilterDepartments, (selectOptions) => {
              return selectOptions.value === id;
            })
        )
      : true;
  };

  setFilteredData(filteredData): void {
    if (filteredData) {
      this.table.filtered = [...filteredData];
    }
  }

  filterTableByText = (data: [], filterText: string) => {
    if (!filterText) {
      this.setFilteredData(this.table.rows);
      return;
    }
    const filteredData = this.filterDataByText(data, filterText);
    this.setFilteredData(filteredData);
  };
  filterDataByText = (data: [], filterText: string) => {
    const lowerCaseFilterText = filterText.toLowerCase();
    return data.filter((row: any) => this.isTextInRow(row, lowerCaseFilterText));
  };

  isTextInRow = (row, text: string) => {
    const lowerCaseText = text.toLowerCase();
    return Object.keys(row).some((key) => row[key]?.toString().toLowerCase().includes(lowerCaseText));
  };

  filterPatientTable = (data: any[], filterText: string = ''): void => {
    this.filteredText = filterText;
    const isSuspendFilter = this.tabsAdditionalFilters[consts.Tabs.patients][0]?.isActive;
    const isTechFilterActive = this.tabsAdditionalFilters[consts.Tabs.patients][1]?.isActive;
    const isPendingBookingActive = this.tabsAdditionalFilters[consts.Tabs.patients][2]?.isActive;
    const isDepartmentFilterActive = this.sharedFilters[0]?.isActive;

    const filteredData = this.filterPatientData(
      data,
      isTechFilterActive,
      isSuspendFilter,
      isPendingBookingActive,
      isDepartmentFilterActive,
      filterText
    );
    this.setFilteredData(filteredData);
  };

  filterPatientData = (
    data,
    isTechFilterActive: boolean,
    isSuspendFilter: boolean,
    isPendingBookingActive: boolean,
    isDepartmentFilterActive: boolean,
    filterText: string
  ): void => {
    this.resetFilters(false);
    return data.filter((row): boolean => {
      this.countFilterFields(row);
      return (
        this.isPatientSuspended(row.suspend, isSuspendFilter) &&
        this.isPatientHavingTechIssue(row.tech_issue, isTechFilterActive, row.suspend) &&
        this.isPatientPendingBooking(
          row.no_prescription,
          row.no_booking,
          row.under_booked,
          row.over_booked,
          row.tech_issue,
          row.has_followup,
          row.final_sessions,
          row.suspend,
          isPendingBookingActive
        ) &&
        this.isPatientInDepartment(row.departments_ids, isDepartmentFilterActive) &&
        this.isTextInRow(row, filterText)
      );
    });
  };

  countFilterFields = (row) => {
    if (row.suspend && row.suspend !== SuspendValues.empty) {
      this.tabsAdditionalFilters[consts.Tabs.patients][0].amount++;
    }
    if (row.tech_issue && row.tech_issue !== TechIssueValues.empty && row.suspend === SuspendValues.empty) {
      this.tabsAdditionalFilters[consts.Tabs.patients][1].amount++;
    }
  };
  setInitialFilterCounts = () => {
    this.resetFilters(false);
    forEach(this.table.rows, (row) => this.countFilterFields(row));
  };

  resetFilters = (resetStatus: boolean = true) =>
    forEach(this.tabsAdditionalFilters[consts.Tabs.patients], (filter) => {
      if (filter.amount) {
        filter.amount = 0;
      }
      if (resetStatus) {
        filter.isActive = false;
      }
    });

  isPatientSuspended = (suspendStatus: string, isActive: boolean): boolean => {
    if (!isActive) {
      return true;
    }

    const subFilterSuspend =
      this.tabsAdditionalFilters[consts.Tabs.patients][consts.PatientFilterOrder.suspend].selectedOptions;
    if (!isEmpty(subFilterSuspend)) {
      return subFilterSuspend[0].displayName === suspendStatus;
    }
    return suspendStatus !== SuspendValues.empty;
  };

  isPatientHavingTechIssue = (techIssueStatus: string, isActive: boolean, suspendStatus: string): boolean =>
    isActive ? techIssueStatus !== TechIssueValues.empty && suspendStatus === SuspendValues.empty : true;

  isPatientPendingBooking = (
    noPrescription: boolean,
    noBooking: boolean,
    underBooked: boolean,
    overBooked: boolean,
    techSupport: TechIssueValues,
    hasFollowup: boolean,
    finalSessions: boolean,
    suspendStatus: string,
    isActive: boolean
  ): boolean => {
    if (!isActive) {
      return true;
    }

    if (suspendStatus !== SuspendValues.empty) {
      return false;
    }

    const subFilterPending =
      this.tabsAdditionalFilters[consts.Tabs.patients][consts.PatientFilterOrder.pending].selectedOptions;

    if (isEmpty(subFilterPending)) {
      return true;
    }

    const selectedPendingValue = subFilterPending?.[0]?.displayName;

    switch (selectedPendingValue) {
      case PendingValues.noPrescription:
        return noPrescription;
      case PendingValues.noBooking:
        return noBooking && !noPrescription;
      case PendingValues.underBooked:
        return underBooked;
      case PendingValues.overBooked:
        return overBooked;
      case PendingValues.techSupport:
        return techSupport !== TechIssueValues.empty;
      case PendingValues.followups:
        return hasFollowup;
      case PendingValues.finalSessions:
        return finalSessions;
      default:
        return true;
    }
  };

  isPatientInDepartment = (departmentIds: number[], isActive: boolean) => {
    const subFilterDepartments = this.selectedUserFilters.departments?.data;
    if (isEmpty(subFilterDepartments)) {
      return true;
    }
    return isActive
      ? some(
          departmentIds,
          (id) =>
            !!find(subFilterDepartments, (selectOptions) => {
              return selectOptions.value === id;
            })
        )
      : true;
  };

  onRefreshPatientDetails = (patientId: number) => {
    this.editPatient(patientId);
  };

  getRowsWithLastPatientTop = (rows: any) => {
    if (!this.lastPatientId) {
      return rows;
    }
    return reduce(
      rows,
      (result, curr) => {
        if (curr.id === this.lastPatientId) {
          return [curr, ...result];
        }
        return [...result, curr];
      },
      []
    );
  };

  setAllPossibleFiltersOptions = () => {
    const departmentsSelectOptions: IMultiSelectOptions[] = map(this.allDepartments, (department) => ({
      value: department.id,
      displayName: department.name,
    }));
    this.allDepartmentOptions = departmentsSelectOptions;
    this.sharedFilters[0].allOptions = departmentsSelectOptions;

    const suspendSelectOptions: IMultiSelectOptions[] = map(Object.keys(SuspendValues), (suspendValueKey) => ({
      value: suspendValueKey,
      displayName: SuspendValues[suspendValueKey],
    })).filter((option) => option.displayName !== SuspendValues.empty);
    this.tabsAdditionalFilters[consts.Tabs.patients][consts.PatientFilterOrder.suspend].allOptions =
      suspendSelectOptions;

    const pendingSelectOptions: IMultiSelectOptions[] = map(Object.keys(PendingValues), (pendingValueKey) => ({
      value: pendingValueKey,
      displayName: PendingValues[pendingValueKey],
    }));
    this.tabsAdditionalFilters[consts.Tabs.patients][consts.PatientFilterOrder.pending].allOptions =
      pendingSelectOptions;
  };
  getSharedFilters(tabIndex) {
    if (includes(TABS_WITH_SHARED_FILTERS, tabIndex)) {
      return this.sharedFilters;
      // return tabIndex == consts.Tabs.rtm ? this.rtmSharedFilters : this.sharedFilters;
    }
    return [];
  }

  activeInactiveSubmit(selectedOptions: IMultiSelectOptions[]) {
    if (selectedOptions.length === 0) {
      return;
    }

    this.selectedActiveInactiveOptions = selectedOptions;
    this.activeItemsMode = selectedOptions[0].value;
    this.fetchCurrentTabData(this.currentTabIndex);
    this.tabsAdditionalActions = this.activeItemsMode
      ? this.activeItemsTabsAdditionalActions
      : this.inactiveItemsTabsAdditionalActions;

    this.tabsAdditionalFilters = this.activeItemsMode
      ? this.activeItemsTabsAdditionalFilters
      : this.inactiveItemsTabsAdditionalFilters;

    this.sharedFilters = this.activeItemsMode ? this.activeItemsSharedFilters : this.inactiveItemsSharedFilters;
    // this.rtmSharedFilters = this.activeItemsMode ? this.activeItemsSharedFilters : this.inactiveItemsSharedFilters;
  }

  activatePatient(patientId, row) {
    this.http.activatePatient(patientId).subscribe(() => {
      this.editPatientRow(row, consts.PatientView.Details);
      this.fetchCurrentTabData(this.currentTabIndex);
    });
  }

  exportTableToExcel() {
    const tabName = this.getCurrentTab().name;
    if (tabName == 'rtm') {
      this.helperMethodsForExcelExport[tabName].subscribe((response) => {
        const { allData, cumulativeData } = response.data;
        const formattedData = this.formatReportData(allData, tabName, cumulativeData);
        this.downloadExcel(formattedData, tabName);
      });
    } else
      this.helperMethodsForExcelExport[tabName].subscribe((data) => {
        const formattedData = this.formatReportData(data, tabName);
        this.downloadExcel(formattedData, tabName);
      });
  }

  exportSessions() {
    this.http.getTherapistsSessions().subscribe((data) => {
      data.sort((a, b) => {
        const dateA = a.date;
        const dateB = b.date;
        if (dateA < dateB) return -1;
        if (dateA > dateB) return 1;
        return 0;
      });
      const formattedData = data.map((item) => {
        const date = new Date(item.date + 'Z');
        const formattedTime = date.toLocaleTimeString();
        return {
          ...item,
          date: this.splitDateFromTime(item.date),
          start_time: formattedTime,
          session_duration: this.timeToSeconds(item.session_duration),
        };
      });
      this.downloadExcel(formattedData, 'sessions');
    });
  }

  splitDateFromTime(date) {
    return date.split(' ')[0];
  }

  // formatReportData(data, tabName) {
  //   const formattedData = data.map((item) => {
  //     if (tabName === 'rtm') {
  //       delete item?.therapist_first_name;
  //       delete item?.therapist_last_name;
  //       delete item?.therapist_username;
  //       delete item?.data;
  //       delete item?.email;
  //       return {
  //         patient_id: item.patient_id || '',
  //         first_name: item.first_name || '',
  //         last_name: item.last_name || '',
  //         phone: item.phone || '',
  //         since: item.since || '',
  //         therapist_session_minutes: item?.event?.minutes_spent || '',
  //         daysDataTransmittedInMonth: item?.event?.daysDataTransmittedInMonth || '',
  //         M_98975: item['98975'] || 0,
  //         M_98977: item['98977'] || 0,
  //         M_98980: item['98980'] || 0,
  //         M_98981: item['98981'] || 0,
  //       };
  //     }
  //     if (item.created_at) {
  //       item.created_at = this.splitDateFromTime(item.created_at);
  //     }
  //     if (item.updated_at) {
  //       item.updated_at = this.splitDateFromTime(item.updated_at);
  //     }
  //     for (const key in item) {
  //       if (Array.isArray(item[key])) {
  //         item[key] = JSON.stringify(item[key]).replace(/[\[\]"\']/g, '');
  //       }
  //     }
  //     return item;
  //   });
  //   return formattedData;
  // }

  formatReportData(allData, tabName, cumulativeData?) {
    if (tabName === 'rtm') {
      return cumulativeData.map((cumData) => {
        return {
          institute_name: cumData?.institute_name || '',
          patient_id: cumData?.patient_id || '',
          first_name: cumData?.first_name || '',
          last_name: cumData?.last_name || '',
          since: cumData?.since || '',
          therapist_session_minutes: cumData?.therapist_session_minutes || '-',
          daysDataTransmittedInMonth: cumData?.daysDataTransmittedInMonth
            ? String(cumData?.daysDataTransmittedInMonth)
            : '-',
          M_98975: cumData['98975'] || 0,
          M_98977: cumData['98977'] || 0,
          M_98980: cumData['98980'] || 0,
          M_98981: cumData['98981'] || 0,
        };
      });
    } else {
      return allData.map((item) => {
        if (item.created_at) {
          item.created_at = this.splitDateFromTime(item.created_at);
        }
        if (item.updated_at) {
          item.updated_at = this.splitDateFromTime(item.updated_at);
        }
        for (const key in item) {
          if (Array.isArray(item[key])) {
            item[key] = JSON.stringify(item[key]).replace(/[\[\]"\']/g, '');
          }
        }
        return item;
      });
    }
  }

  timeToSeconds(timeStr) {
    const [hours, minutes, seconds] = timeStr.split(':').map(Number);
    const totalSeconds = hours * 3600 + minutes * 60 + seconds;
    return totalSeconds;
  }

  downloadExcel(data, reportName) {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws);
    XLSX.writeFile(wb, reportName + 'Table.xlsx');
  }

  setCurrentSearchText(value: string) {
    this.currentSearchText = value;
  }
}
