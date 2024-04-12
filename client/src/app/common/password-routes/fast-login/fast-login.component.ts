import { AppActions } from "./../../../app.actions";
import { AuthenticationService } from "./../../services/authentication.service";
import { Subscription } from "rxjs";
import { ROUTES, roleMainRoute } from "./../../../routes";
import { ReCaptchaV3Service } from "ng-recaptcha";
import { AjaxService } from "src/app/therapist/services/ajax.service";
import { ActivatedRoute, Router } from "@angular/router";
import { Component, OnDestroy, OnInit } from "@angular/core";

enum PAGE_STATUS {
  FAST_LOGIN,
  ERROR_TOKEN_NOT_VALID,
}

@Component({
  selector: "app-fast-login",
  templateUrl: "./fast-login.component.html",
  styleUrls: ["./fast-login.component.scss"],
})
export class FastLoginComponent implements OnInit {
  token: string;
  pageStatus: PAGE_STATUS = PAGE_STATUS.FAST_LOGIN;
  enumConst = PAGE_STATUS;

  constructor(
    private route: ActivatedRoute,
    private ajax: AjaxService,
    private recaptchaV3Service: ReCaptchaV3Service,
    private router: Router,
    private authenticationService: AuthenticationService,
    private appActions: AppActions
  ) { }

  ngOnInit(): void {
    this.route.params.subscribe((params) => {
      if (!params.token) {
        this.pageError();
        return;
      }
      this.token = params.token;
      const cookieEnabled = navigator.cookieEnabled;
      if (!cookieEnabled) {
        this.appActions.openCallModal({
          panelClass: 'generic-dialog-container',
          header: 'ENABLE COOKIES',
          content: 'Please allow cookies in your browser',
          acceptBtnImg: '../../../../assets/buttons/btn_decline.png',
          acceptBtnImgHover: '../../../../assets/buttons/btn_decline_hover.png',
          approveCallback: async () => await this.authenticationService.logout(),
          declineCallback: async () => await this.authenticationService.logout(),
        }, false);
      } else {
        this.recaptchaV3Service
          .execute("fastLogin")
          .toPromise().then(
            (captchaToken) => {
              this.ajax.fastLogin(this.token, captchaToken).toPromise().then(
                (user) => {
                  this.authenticationService.updateUser(user);
                  this.appActions.setTherapist(user.isTherapist);
                  const route = user.fast_login_link === 'Video Consultation' ? ROUTES.PATIENT_VIDEO_HOME_PAGE : roleMainRoute(user.role);
                  this.router.navigate([route]);
                },
                (err) => {
                  console.log("fastLogin err ? ", err);
                  this.pageError();
                }
              );
            },
            (err) => {
              console.log("captchaToken err ? ", err);
              this.pageError();
            }
          );
      }

    });
  }

  pageError() {
    this.pageStatus = PAGE_STATUS.ERROR_TOKEN_NOT_VALID;
    setTimeout(() => {
      this.router.navigate([ROUTES.LOGIN]);
    }, 5000);
  }
}
