import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { ReCaptchaV3Service } from 'ng-recaptcha';
import { ActivatedRoute, Router } from '@angular/router';
import _ from 'lodash';

import { AlertService } from '../../services/alert.service';
import { AppActions } from '../../../app.actions';
import { AuthenticationService } from '../../services/authentication.service';
import { version } from '../../../../../../package.json';
import { AjaxService } from '../../../therapist/services/ajax.service';
import { roleMainRoute, ROUTES } from '../../../routes';
import { isMobileDevice, MOBILE_OR_SMALL_RESOLUTION } from '../../utils';
import { environment } from '../../../../environments/environment';
import { FeatureFlagService } from '../../services/feature-flag.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginPageComponent implements OnInit, OnDestroy {
  loginForm: FormGroup;
  loading = false;
  submitted = false;

  statusPassword = 'password';
  iconPassword = '/../../../assets/login/show_password_white.svg';
  textPassword = '';
  appVersion = version;
  isMobile = false;
  mainMenu;
  ShowLoginErrorMobile = false;
  patient_data: any = [];
  
  constructor(
    private formBuilder: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private authenticationService: AuthenticationService,
    private alertService: AlertService,
    private appActions: AppActions,
    private ajax: AjaxService,
    private recaptchaV3Service: ReCaptchaV3Service,
    private ref: ChangeDetectorRef,
    private flagService: FeatureFlagService,
  ) {
    this.isMobile = MOBILE_OR_SMALL_RESOLUTION ? true : false;
    window.addEventListener('resize', () => {
      this.isMobile = MOBILE_OR_SMALL_RESOLUTION ? true : false;
    });
  }

  ngOnInit() {
    this.loginForm = this.formBuilder.group({
      username: ['', Validators.required],
      password: ['', Validators.required],
    });
    this.showCaptchaBadge();
  }

  ngOnDestroy() {
    this.hideCaptchaBadge();
  }

  // convenience getter for easy access to form fields
  get f() {
    return this.loginForm.controls;
  }

  async onSubmit() {
    this.ShowLoginErrorMobile = false;
    try {
      var cookieEnabled = navigator.cookieEnabled;
      if (!cookieEnabled) {
        this.appActions.openCallModal(
          {
            panelClass: 'generic-dialog-container',
            header: 'ENABLE COOKIES',
            content: 'Please allow cookies in your browser',
            acceptBtnImg: '../../../../assets/buttons/btn_decline.png',
            acceptBtnImgHover: '../../../../assets/buttons/btn_decline_hover.png',
            approveCallback: async () => await this.authenticationService.logout(),
            declineCallback: async () => await this.authenticationService.logout(),
          },
          false
        );
      } else {
        this.submitted = true;
        this.loading = true;
        this.f.username.setErrors(null);
        const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const token = await this.recaptchaV3Service.execute('login').toPromise();
        const user = await this.ajax.login(this.f.username.value, this.f.password.value, token,userTimezone).toPromise();
        if (window && (window as any).NREUM) {
          (window as any).NREUM.addPageAction('LoginSuccess', {
            username: this.f.username.value,
            isTherapist: user.isTherapist,
            userRole: user.role,
          });
        }
        // Find the feature flag   
        await this.loadFeatureFlags(user.id, user.role); 
        this.appActions.setTherapist(user?.isTherapist);
        this.authenticationService.updateUser(user);          
        if (['admin'].includes(user.role)) {
          localStorage.setItem('verified2FA', 'false');
          if (user?.is_two_factor_enabled) {
            this.router.navigate([`/${ROUTES.VERIFY_2FA.split(':id')[0]}${user.peerId}`], {
              queryParams: { enable2FA: true },
            });
          } else {
            this.router.navigate([`/${ROUTES.VERIFY_2FA.split(':id')[0]}${user.peerId}`], {
              queryParams: { enable2FA: false },
            });
          }
        } else {
          localStorage.setItem('verified2FA', 'true');
          const tncFlag = this.flagService.isEnabled('TERM_CONDITION_POPUP_FLAG');
          console.log("======tncflag=1111====",tncFlag);
          if (user?.role === 'patient' && tncFlag && user?.date_agreed_terms) {
            this.router.navigate([`${roleMainRoute('TERMS_CONDITIONS')}`]);
          }
         else if(this.isMobile ===true && user?.isRTM===true && user?.role === 'patient'  && user?.isMobileModelOpen) { 
            this.router.navigate([`${roleMainRoute('MOBILE_POPUP')}`]);
          } else if (user?.role === 'patient' && environment.rtmPopupFlag && user?.isPainModelOpen) {
            this.router.navigate([`${roleMainRoute('RTM')}`]);
          } else {
            if (user?.role === 'patient' && user?.isPainModelOpen===false && user?.isRTM===true) {
              this.patient_data =  this.ajax.getActivePatient(user?.patientId).subscribe((response)=>{
                this.patient_data = response;
                if (this.patient_data?.login_notification_email) {
                  this.ajax.sendEmailAfterLogin(this.patient_data).subscribe((data) => {
                    console.log("===Email sent===", data);
                  });
                }
                //this.ajax.sendEmailAfterLogin(this.patient_data).subscribe((data) => { console.log("===data===",data)});   
              }); 
            }
            this.router.navigate([`${roleMainRoute(user.role)}`]);
          }
        }
      }
    } catch (error) {
      console.log('login errors !:', error);
      if (window && (window as any).NREUM) {
        (window as any).NREUM.addPageAction('LoginError', {
          username: this.f.username.value,
          errorMessage: error.message || 'Unknown error',
        });
      }

      this.alertService.error(error);
      if (error && _.includes(error, 'already connected')) {
        this.f.username.setErrors({ errorName: 'already_connected' });
      } else {
        this.f.username.setErrors({ errorName: 'not_valid' });
      }
      this.ShowLoginErrorMobile = true;
      this.loading = false;
      this.ref.detectChanges();
    }
  }

  seePassword() {
    if (this.statusPassword === 'password') {
      this.statusPassword = 'text';
      this.iconPassword = '/../../../assets/login/hide_password_white.svg';
    } else {
      this.statusPassword = 'password';
      this.iconPassword = '/../../../assets/login/show_password_white.svg';
    }
  }

  private showCaptchaBadge = () => {
    const elements = document.getElementsByClassName('grecaptcha-badge');
    if (elements.length > 0) {
      elements[0].setAttribute('id', 'grecaptcha_badge');
      document.getElementById('grecaptcha_badge').style.display = 'block';
    }
  };

  private hideCaptchaBadge = () => {
    const elements = document.getElementsByClassName('grecaptcha-badge');
    if (elements.length > 0) {
      elements[0].setAttribute('id', 'grecaptcha_badge');
      document.getElementById('grecaptcha_badge').style.display = 'none';
    }
  };

  async loadFeatureFlags(userId: string, role: string) {
    await this.ajax.getFeatureFlag(userId, role).subscribe(res => {
      if (res.success) {
        this.flagService.saveFlags(res);
        console.log('Feature Flags Saved:', this.flagService.getFlags());
      }
    });
  }
}
