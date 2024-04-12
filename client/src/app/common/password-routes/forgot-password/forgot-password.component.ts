import { Component, OnDestroy, OnInit } from '@angular/core';
import { AjaxService } from 'src/app/therapist/services/ajax.service';
import { ReCaptchaV3Service } from 'ng-recaptcha';
import { MOBILE_OR_SMALL_RESOLUTION } from '../../utils';

@Component({
  selector: 'app-forgot-password',
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.scss'],
})
export class ForgotPasswordComponent implements OnInit, OnDestroy {
  username: string = '';
  message: string = '';
  onError = false;
  beforeEmailSent = true;
  isMobile = false;

  constructor(private ajax: AjaxService, private recaptchaV3Service: ReCaptchaV3Service) {
    this.isMobile = MOBILE_OR_SMALL_RESOLUTION ? true : false;
    window.addEventListener('resize', () => {
      this.isMobile = MOBILE_OR_SMALL_RESOLUTION ? true : false;
    });
  }

  ngOnInit() {
    this.showCaptchaBadge();
  }

  ngOnDestroy() {
    this.hideCaptchaBadge();
  }

  async onSubmit() {
    try {
      const token = await this.recaptchaV3Service.execute('forgot_password').toPromise();
      await this.ajax.forgotPassword(this.username, token).toPromise();
      this.onError = false;
      this.beforeEmailSent = false;
    } catch (err) {
      this.message = 'The username you entered is not valid';
      this.onError = true;
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
}
