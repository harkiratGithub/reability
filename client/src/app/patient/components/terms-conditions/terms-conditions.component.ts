import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthenticationService } from 'src/app/common/services/authentication.service';
import { AjaxService } from 'src/app/therapist/services/ajax.service';
import moment from 'moment';

@Component({
  selector: 'app-terms-conditions',
  templateUrl: './terms-conditions.component.html',
  styleUrls: ['./terms-conditions.component.scss'],
})
export class TermsConditionsComponent implements OnInit {
  userId: number = -1;
  isChecked: boolean = false;
  date_agreed_terms: boolean = false;
  userPainLevel: number;
  constructor(
    private router: Router,
    private ajax: AjaxService,
    private authenticationService: AuthenticationService
  ) {}

  async ngOnInit() {
    try {
      const userData = await this.ajax.getUserData().toPromise();
      if (userData?.date_agreed_terms) {
        this.date_agreed_terms = userData.date_agreed_terms;
        this.userId = userData?.peerId;
        this.userPainLevel = userData.isPainModelOpen;
        this.router.navigate(['/terms_conditions']);
      } else {
        this.router.navigate(['/games_lobby']);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  }

  onCheckboxChange() {
    console.log('Checkbox state:', this.isChecked);
  }

  onLogout() {
    this.logout();
    this.router.navigate(['/login']);
  }

  onContinue() {
    if (this.isChecked) {
      const currentDate = moment().format('YYYY-MM-DD HH:mm:ss.SSSZ');
      console.log('Terms accepted. Sending current date:', currentDate);
      try {
        this.ajax.sendTermsConditions(this.userId, currentDate).subscribe({
          next: (response) => {
            if (this.userPainLevel) {
              this.router.navigate(['/games_lobby']);
            }
            this.router.navigate(['/pain_scale']);
          },
          error: (error) => {
            console.error('Error while sending terms acceptance:', error);
          },
        });
      } catch (error) {
        console.error('Terms & Conditions submission error:', error);
      }
    }
  }

  async logout() {
    await this.authenticationService.logout();
  }
}
