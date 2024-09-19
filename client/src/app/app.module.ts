import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { NgModule } from '@angular/core';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { NgReduxRouterModule, NgReduxRouter } from '@angular-redux/router';
import { AppComponent } from './app.component';
import { NgReduxModule, NgRedux, DevToolsExtension } from '@angular-redux/store';
import { IAppState, INITIAL_STATE } from './app.state';
import { rootReducer } from './app.reducer';
import { ErrorInterceptor } from './common/auth';
import { RouterModule } from '@angular/router';
import { routes } from './routes';
import { AdminComponent } from './therapist/adminPage/therapist.component';
import { LoginPageComponent } from './common/password-routes/login/login.component';
import { MatTabsModule } from '@angular/material/tabs';
import { MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { AppActions } from './app.actions';
import { MenuOptionsComponent } from './patient/components/menu-options/menu-options.component';
import { GameWrapperComponent } from './patient/components/game_wrapper/game_wrapper.component';
import { HandDirective } from './patient/directives/hand.directive';
import { BodyHandleService } from './common/services/draw_body.service';
import { EventsService } from './patient/services/events.service';
import { AuthenticationService } from './common/services/authentication.service';
import { GameIntroductionComponent } from './patient/components/game_introduction/game_introduction.component';
import { WebRtcService } from './therapist/services/therapist_web_rtc.service';
import { GameTimerComponent } from './patient/components/game_timer/game_timer.component';
import { GameMissionProgressComponent } from './patient/components/game_mission_progress/game_mission_progress.component';
import { EndGameComponent } from './patient/components/end_game/end_game.component';
import { GameScoreComponent } from './patient/components/game-score/game_score.component';
import { WebRTCVideoComponent } from './patient/components/web_rtc_video/web_rtc_video.component';
import { TherapitWebRTCVideoComponent } from './therapist/components/therapist_web_rtc_video/therapist_web_rtc_video.component';
import { UrlSanitaizer } from './pipes/url-sanitaizer.pipe';
import { DepthCameraSocketService } from './common/services/depth_camera_socket.service';
import { PatientWebRtcService } from './patient/services/patient_web_rtc.service';
import { MatGridListModule } from '@angular/material/grid-list';
import { Injector } from '@angular/core';
import { setAppInjector } from '../app-injector';
import { CallModalComponent } from './common/call-modal/call_modal.component';
import { MenuOptionsAppActions } from './patient/components/menu-options/menu-options.actions';
import { WebCamSkeletonService } from './common/services/posenet_camera.service';
import { PatientListComponent } from './therapist/components/patient_list/patient_list.component';
import { CommonComponent } from './backoffice/common/common.component';
import { TableComponent } from './backoffice/table/table.component';
import { SearchComponent } from './backoffice/search/search.component';
import { ClickOutsideDirective } from './common/directives/click-outside.directive';
import { AddEditComponent } from './backoffice/add-edit/add-edit.component';
import { SelectComponent } from './backoffice/select/select.component';
import { AddEditTherapistComponent } from './backoffice/add-edit/add-edit-therapist/add-edit-therapist.component';
import { AddEditPatientComponent } from './backoffice/add-edit/add-edit-patient/add-edit-patient.component';
import { AddEditInstituteComponent } from './backoffice/add-edit/add-edit-institute/add-edit-institute.component';
import { AjaxService } from './therapist/services/ajax.service';
import { FullScreenViewComponent } from './therapist/components/full_screen_view/full_screen_view.component';
import { SplitScreenScalerService } from './therapist/services/split_screen_scaler.service';
import { StreamHandlerService } from './therapist/services/stream_handler.service';
import { TooltipDirective } from './common/directives/tooltip.directive';
import { DatePipe } from './pipes/date.pipe';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { FullScreenVideoSessionComponent } from './therapist/components/full_screen_video_session/full_screen_video_session.component';
import { DisconnectedVideoSessionComponent } from './common/video-session-disconneted-modal/video_session_disconneted_modal.component';
import { VideoPatientComponent } from './patient/components/psychology_session/psychology_session.component';
import { EmailChangeTokenPageComponent } from './common/password-routes/email-change-token/email-change-token.component';
import { ForgotPasswordComponent } from './common/password-routes/forgot-password/forgot-password.component';
import { ModalComponent } from './common/modal/modal.component';
import { CountDownAnimationComponent } from './patient/components/count-down-animation/count-down-animation.component';
import { ConfiguratorModalComponent } from './therapist/components/configurator-modal/configurator-modal.component';
import { RECAPTCHA_V3_SITE_KEY, RecaptchaV3Module } from 'ng-recaptcha';
import { environment } from '../environments/environment';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatNativeDateModule, MAT_DATE_FORMATS, DateAdapter } from '@angular/material/core';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatRadioModule } from '@angular/material/radio';
import {
  NgxMatMomentModule,
  NgxMatMomentAdapter,
  NGX_MAT_MOMENT_DATE_ADAPTER_OPTIONS,
} from '@angular-material-components/moment-adapter';
import {
  NgxMatDatetimePickerModule,
  NgxMatTimepickerModule,
  NGX_MAT_DATE_FORMATS,
  NgxMatDateAdapter,
} from '@angular-material-components/datetime-picker';
import { GeneralModalComponent } from './common/general-modal/general-modal.component';
import { SendFastLoginModalComponent } from './common/general-modals/send-fast-login-modal/send-fast-login-modal.component';
import { FastLoginComponent } from './common/password-routes/fast-login/fast-login.component';
import { DurationPipe } from '../app/pipes/duration.pipe';
import { AddEditFollowupComponent } from './backoffice/add-edit/add-edit-followup/add-edit-followup.component';
import { APP_DATE_FORMATS, AppDateAdapter } from './backoffice/format-datepicker.component';
import { MatMenuModule } from '@angular/material/menu';
import { AddEditProfessionComponent } from './backoffice/add-edit/add-edit-profession/add-edit-profession.component';
import { TherapistScheduleComponent } from './therapist/components/therapist-schedule/therapist-schedule.component';
import { CalendarComponent } from './common/calendar/calendar.component';
import { CalendarHeaderComponent } from './common/calendar-header/calendar-header.component';
import { AvailabilityManagementComponent } from './therapist/components/availability-management/availability-management.component';
import { AddEditPatientTreatmentComponent } from './backoffice/add-edit/add-edit-patient-treatment/add-edit-patient-treatment.component';
import { AddEditPatientScheduleComponent } from './backoffice/add-edit/patient-schedule/patient-schedule.component';
import { BookingComponent } from './backoffice/add-edit/patient-booking/patient-booking.component';
import { TimePipe } from './pipes/time.pipe';
import { MinutesToDuration } from './pipes/minutesToDuration.pipe';
import { DayPipe } from './pipes/day.pipe';
import { GridContainerDirective } from './common/directives/grid.container.directive';
import { GridItemDirective } from './common/directives/grid.item.directive';
import { CalendarManagementDialogComponent } from './therapist/components/calendar-management-dialog/calendar-management-dialog.component';
import { AdminScheduleComponent } from './backoffice/admin-therapist-schedule/admin-therapist-schedule.component';
import { CalendarItemModalComponent } from './common/calendar-item-modal/calendar-item-modal.component';
import { SideMenuComponent } from './common/side-menu/side-menu.component';
import { TreatmentListComponent } from './common/treatment-list/treatment-list.component';
import { UserLogEntryComponent } from './common/user-log-entry/user-log-entry.component';
import { AddEditAdminComponent } from './backoffice/add-edit/add-edit-admin/add-edit-admin.component';
import { AddEditLeadComponent } from './backoffice/add-edit/add-edit-lead/add-edit-lead.component';
import { AdminProfessionScheduleComponent } from './backoffice/admin-profession-schedule/admin-profession-schedule.component';
import { BackOfficeActions } from './backoffice/backoffice-actions';
import { GenericModalComponent } from './common/generic-modal/generic-modal.component';
import { FromToSelectComponent } from './common/from-to-select/from-to-select.component';
import { MultiSelectComponent } from './common/multi-select/multi-select.component';
import { AddEditExpertiseComponent } from './backoffice/add-edit/add-edit-expertise/add-edit-expertise.component';
import { CamelCasePipe } from '../app/pipes/camelCase.pipe';
import { GameMessageComponent } from './patient/components/game-message/game-message.component';
import { NgxFileDropModule } from 'ngx-file-drop';
import { FileUploaderComponent } from './backoffice/file-uploader/file-uploader.component';
import { GameLogsComponent } from './patient/components/game-logs/game-logs.component';
import { ExportToExcelComponent } from './backoffice/export-to-excel/export-to-excel.component';
import { PatientGeneralModalComponent } from './common/patient-general-modal/patient_general_modal.component';
import { FeedbackFormComponent } from './patient/components/feedback-form/feedback-form.component';

export const CUSTOM_MOMENT_FORMATS = {
  parse: {
    dateInput: 'l, LTS',
  },
  display: {
    dateInput: 'DD/MM/YYYY HH:mm',
    monthYearLabel: 'MMM YYYY',
    dateA11yLabel: 'LL',
    monthYearA11yLabel: 'MMMM YYYY',
  },
};
@NgModule({
  declarations: [
    AppComponent,
    AdminComponent,
    MenuOptionsComponent,
    LoginPageComponent,
    GameWrapperComponent,
    GameTimerComponent,
    GameMissionProgressComponent,
    EndGameComponent,
    GameScoreComponent,
    WebRTCVideoComponent,
    TherapitWebRTCVideoComponent,
    HandDirective,
    UrlSanitaizer,
    CallModalComponent,
    PatientListComponent,
    CommonComponent,
    TableComponent,
    SearchComponent,
    ClickOutsideDirective,
    SelectComponent,
    AddEditComponent,
    AddEditTherapistComponent,
    AddEditPatientComponent,
    AddEditInstituteComponent,
    FullScreenViewComponent,
    TooltipDirective,
    DatePipe,
    FullScreenVideoSessionComponent,
    DisconnectedVideoSessionComponent,
    VideoPatientComponent,
    EmailChangeTokenPageComponent,
    ForgotPasswordComponent,
    ModalComponent,
    GameIntroductionComponent,
    CountDownAnimationComponent,
    ConfiguratorModalComponent,
    GeneralModalComponent,
    SendFastLoginModalComponent,
    FastLoginComponent,
    DurationPipe,
    AddEditFollowupComponent,
    AddEditProfessionComponent,
    TherapistScheduleComponent,
    CalendarComponent,
    CalendarHeaderComponent,
    AvailabilityManagementComponent,
    AddEditPatientTreatmentComponent,
    AddEditPatientScheduleComponent,
    BookingComponent,
    TimePipe,
    MinutesToDuration,
    DayPipe,
    GridContainerDirective,
    GridItemDirective,
    CalendarManagementDialogComponent,
    AdminScheduleComponent,
    CalendarItemModalComponent,
    SideMenuComponent,
    TreatmentListComponent,
    UserLogEntryComponent,
    AddEditAdminComponent,
    AddEditLeadComponent,
    AdminProfessionScheduleComponent,
    GenericModalComponent,
    FromToSelectComponent,
    MultiSelectComponent,
    AddEditExpertiseComponent,
    CamelCasePipe,
    GameMessageComponent,
    FileUploaderComponent,
    GameLogsComponent,
    ExportToExcelComponent,
    PatientGeneralModalComponent,
    FeedbackFormComponent,
  ],
  imports: [
    RouterModule.forRoot(routes, { useHash: true }),
    BrowserModule,
    NgReduxModule,
    NgReduxRouterModule.forRoot(),
    MatDialogModule,
    MatIconModule,
    MatTabsModule,
    MatSlideToggleModule,
    FormsModule,
    ReactiveFormsModule,
    HttpClientModule,
    BrowserAnimationsModule,
    MatGridListModule,
    DragDropModule,
    RecaptchaV3Module,
    MatDatepickerModule,
    MatFormFieldModule,
    MatNativeDateModule,
    MatInputModule,
    MatButtonModule,
    MatRadioModule,
    NgxMatMomentModule,
    NgxMatDatetimePickerModule,
    NgxMatTimepickerModule,
    MatMenuModule,
    MatSnackBarModule,
    NgxFileDropModule,
  ],
  providers: [
    NgReduxRouter,
    AppActions,
    BodyHandleService,
    WebRtcService,
    EventsService,
    AuthenticationService,
    DepthCameraSocketService,
    WebCamSkeletonService,
    PatientWebRtcService,
    MenuOptionsAppActions,
    AjaxService,
    SplitScreenScalerService,
    StreamHandlerService,
    { provide: HTTP_INTERCEPTORS, useClass: ErrorInterceptor, multi: true },
    { provide: RECAPTCHA_V3_SITE_KEY, useValue: environment.recaptchaKey },
    { provide: NGX_MAT_MOMENT_DATE_ADAPTER_OPTIONS, useValue: { useUtc: false } },
    { provide: NGX_MAT_DATE_FORMATS, useValue: CUSTOM_MOMENT_FORMATS },
    { provide: NgxMatDateAdapter, useClass: NgxMatMomentAdapter },
    { provide: DateAdapter, useClass: AppDateAdapter },
    { provide: MAT_DATE_FORMATS, useValue: APP_DATE_FORMATS },
    TimePipe,
    BackOfficeActions,
  ],
  bootstrap: [AppComponent],
  entryComponents: [
    CallModalComponent,
    DisconnectedVideoSessionComponent,
    ModalComponent,
    ConfiguratorModalComponent,
    PatientGeneralModalComponent,
    FeedbackFormComponent,
  ],
})
export class AppModule {
  constructor(
    injector: Injector,
    ngRedux: NgRedux<IAppState>,
    private devTools: DevToolsExtension,
    ngReduxRouter: NgReduxRouter
  ) {
    const storeEnhancers = this.devTools.isEnabled() ? [this.devTools.enhancer()] : [];
    ngRedux.configureStore(rootReducer, INITIAL_STATE, [], storeEnhancers);
    ngReduxRouter.initialize();
    setAppInjector(injector);
  }
}
