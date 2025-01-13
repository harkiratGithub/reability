import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AjaxService } from 'src/app/therapist/services/ajax.service';
import { AuthenticationService } from '../../../common/services/authentication.service';

@Component({
  selector: 'app-mobile-popup',
  templateUrl: './mobile-popup.component.html',
  styleUrls: ['./mobile-popup.component.scss']
})
export class MobilePopupComponent implements OnInit {

  constructor(
    private ajax: AjaxService,
    private router: Router,
    private authenticationService: AuthenticationService
  ) {}
  painValue: number = 0;
  patient_note: string = '';
  patientId: number = -1;
  isMobileModelOpen: boolean = false;

  async ngOnInit() {
    try {
      const userData = await this.ajax.getUserData().toPromise();
      if (userData?.isMobileModelOpen) {
        this.isMobileModelOpen = userData.isMobileModelOpen;
        this.patientId = userData.patientId;
        this.router.navigate(['/mobile_popup']);
      } else {
        this.router.navigate(['/games_lobby']);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  }

  onSliderChange(event: any): void {
    this.painValue = +event.target.value;
  }

 

  async logout() {
    await this.authenticationService.logout();
  }

}