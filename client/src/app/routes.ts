import { FastLoginComponent } from './common/password-routes/fast-login/fast-login.component';
import { LoginPageComponent } from './common/password-routes/login/login.component';
import { AuthGuard } from './_guards';
import { AdminComponent } from './therapist/adminPage/therapist.component';
import { GameWrapperComponent } from './patient/components/game_wrapper/game_wrapper.component';
import { MenuOptionsComponent } from './patient/components/menu-options/menu-options.component';
import { CommonComponent as Backoffice } from './backoffice/common/common.component';
import { VideoPatientComponent } from './patient/components/psychology_session/psychology_session.component';
import { Role } from 'src/constants';
import { EmailChangeTokenPageComponent } from './common/password-routes/email-change-token/email-change-token.component';
import { ForgotPasswordComponent } from './common/password-routes/forgot-password/forgot-password.component';

export const ROUTES = {
  LOGIN: 'login',
  EMAIL_AUTH: 'email_auth',
  FORGET_PASSWORD: 'forgot_password',
  PATIENT_HOME_PAGE: 'games_lobby',
  PATIENT_GAME_WRAPPER: 'game_wrapper',
  THERAPIST_HOME_PAGE: 'admin',
  ADMIN_HOME_PAGE: 'backoffice',
  PATIENT_VIDEO_HOME_PAGE: 'video_patient',
  FAST_LOGIN: 'fast_login',

};

export const routes = [
  { path: ROUTES.LOGIN, component: LoginPageComponent },
  {
    path: `${ROUTES.EMAIL_AUTH}/:token`,
    component: EmailChangeTokenPageComponent,
  },
  {
    path: `${ROUTES.FAST_LOGIN}/:token`,
    component: FastLoginComponent,
  },
  { path: ROUTES.FORGET_PASSWORD, component: ForgotPasswordComponent },
  {
    path: ROUTES.PATIENT_HOME_PAGE,
    component: MenuOptionsComponent,
    canActivate: [AuthGuard],
    data: { roles: [Role.Patient] },
  },
  {
    path: ROUTES.PATIENT_GAME_WRAPPER,
    component: GameWrapperComponent,
    canActivate: [AuthGuard],
    data: { roles: [Role.Patient] },
  },
  {
    path: ROUTES.THERAPIST_HOME_PAGE,
    component: AdminComponent,
    canActivate: [AuthGuard],
    data: { roles: [Role.Therapist] },
  },
  {
    path: ROUTES.ADMIN_HOME_PAGE,
    component: Backoffice,
    canActivate: [AuthGuard],
    data: { roles: [Role.Admin] },
  },
  {
    path: ROUTES.PATIENT_VIDEO_HOME_PAGE,
    component: VideoPatientComponent,
    canActivate: [AuthGuard],
    data: { roles: [Role.Patient] },
  },
  { path: '**', redirectTo: ROUTES.LOGIN },
];

export const roleMainRoute = (role) => {
  switch (role) {
    case Role.Admin:
      return ROUTES.ADMIN_HOME_PAGE;
    case Role.Patient:
      return ROUTES.PATIENT_HOME_PAGE;
    case Role.Video_Patient:
      return ROUTES.PATIENT_VIDEO_HOME_PAGE;
    case Role.Therapist:
      return ROUTES.THERAPIST_HOME_PAGE;
    default:
      return ROUTES.LOGIN;
  }
};
