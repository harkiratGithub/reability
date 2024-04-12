import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AjaxService } from 'src/app/therapist/services/ajax.service';
import { FormGroup, Validators, FormBuilder } from '@angular/forms';
import { ReCaptchaV3Service } from 'ng-recaptcha';
import { Subscription } from 'rxjs';
import { environment } from 'src/environments/environment';

enum PAGE_STATUS {
  CHECK_EXPIRED_TOKEN,
  WAITING_USERS_INPUT,
  PASSWORD_CHANGED,
  ERROR_TOKEN_NOT_VALID,
}

@Component({
  selector: 'app-email-change-token',
  templateUrl: './email-change-token.component.html',
  styleUrls: ['./email-change-token.component.scss'],
})
export class EmailChangeTokenPageComponent implements OnInit, OnDestroy {
  pageStatus: PAGE_STATUS = PAGE_STATUS.CHECK_EXPIRED_TOKEN;
  enumConst = PAGE_STATUS;
  showNewPassword = false;
  showConfirmPassword = false;
  loginForm: FormGroup;
  submitted = false;
  errorMessage = '';
  token: string;
  username: string;
  password: string;
  private captchaSubscription: Subscription;

  constructor(
    private route: ActivatedRoute,
    private ajax: AjaxService,
    private formBuilder: FormBuilder,
    private recaptchaV3Service: ReCaptchaV3Service
  ) { }

  ngOnInit() {
    this.showCaptchaBadge();
    this.loginForm = this.formBuilder.group({
      password: ['', Validators.required],
      rePassword: ['', Validators.required],
    });

    this.route.params.subscribe((params) => {
      if (!params.token) {
        this.pageStatus = PAGE_STATUS.ERROR_TOKEN_NOT_VALID;
        return;
      }
      this.token = params.token;

      this.captchaSubscription = this.recaptchaV3Service
        .execute('check_token')
        .subscribe(
          (captchaToken) => {
            this.ajax
              .checkValidEmailToken(params.token, captchaToken)
              .subscribe(
                (res) => {
                  this.username = res.username;
                  this.pageStatus = PAGE_STATUS.WAITING_USERS_INPUT;
                },
                (err) => (this.pageStatus = PAGE_STATUS.ERROR_TOKEN_NOT_VALID)
              );
          },
          (err) => (this.pageStatus = PAGE_STATUS.ERROR_TOKEN_NOT_VALID)
        );
    });
  }

  ngOnDestroy() {
    if (this.captchaSubscription) {
      this.captchaSubscription.unsubscribe();
    }
    this.hideCaptchaBadge();
  }

  // convenience getter for easy access to form fields
  get f() {
    return this.loginForm.controls;
  }

  async onSubmit() {
    this.submitted = true;
    if (
      this.f.password.value.length < 8 ||
      this.checkPasswordStrength(this.f.password.value)
    ) {
      this.errorMessage = 'PASSWORD_NOT_STRONG';
      return;
    }
    if (this.f.password.value !== this.f.rePassword.value) {
      this.errorMessage = 'PASSWORD_NOT_MATCH';
      return;
    }

    try {
      this.errorMessage = '';
      const captchaToken = await this.recaptchaV3Service
        .execute('forgot_password')
        .toPromise();
      await this.ajax.changePassword(
        this.token,
        this.f.password.value,
        captchaToken
      ).toPromise();
      this.password = this.f.password.value;
      this.pageStatus = PAGE_STATUS.PASSWORD_CHANGED;
    } catch (error) {
      this.pageStatus = PAGE_STATUS.ERROR_TOKEN_NOT_VALID
    }
  }

  checkPasswordStrength = (password) => {
    const passwordRegex = new RegExp(
      '^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.{8,})'
    );
    return !passwordRegex.test(password);
  };

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
}
