import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AjaxService } from 'src/app/therapist/services/ajax.service';
import { AuthenticationService } from '../../../common/services/authentication.service';
import { isMobileDevice, MOBILE_OR_SMALL_RESOLUTION } from '../../../common/utils';

@Component({
  selector: 'app-pain-scale',
  templateUrl: './pain-scale.component.html',
  styleUrls: ['./pain-scale.component.scss'],
})
export class PainScaleComponent implements OnInit {

  painValue: number = 0;
  patient_note: string = '';
  patientId: number = -1;
  isPainModelOpen: boolean = false;
  isSaving: boolean = false; 
  isMobileScreen: boolean = false; 
  patient_data: any = [];
  constructor(
    private ajax: AjaxService,
    private router: Router,
    private authenticationService: AuthenticationService
  ) {
    this.isMobileScreen = MOBILE_OR_SMALL_RESOLUTION ? true : false;
    window.addEventListener('resize', () => {
      this.isMobileScreen = MOBILE_OR_SMALL_RESOLUTION ? true : false;
    });
  }

  async ngOnInit() {
    try {
      const userData = await this.ajax.getUserData().toPromise();      
      if (userData?.isPainModelOpen) {
        this.isPainModelOpen = userData.isPainModelOpen;
        this.patientId = userData.patientId;
        this.router.navigate(['/pain_scale']);
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

  savePainValue(): void {
    if (this.isSaving) return; 
    this.isSaving = true
    try {    
      this.patient_data =  this.ajax.getActivePatient(this.patientId).subscribe((response)=>{
        console.log("===response===",response);
        this.patient_data = response;
       });  
      this.ajax.sendPatientPainScale(this.patientId, this.painValue, this.patient_note).subscribe(
        (response) => {          
          //this.ajax.sendEmailAfterLogin(this.patient_data).subscribe((data) => { console.log("===data===",data)});   
          if (this.patient_data?.login_notification_email) {
            this.ajax.sendEmailAfterLogin(this.patient_data).subscribe((data) => {
              console.log("===Email sent===", data);
            });
          }
          this.isPainModelOpen = false;
          this.isSaving = false;
          this.router.navigate(['/games_lobby']);
        },
        (error) => {
          console.error('Error saving pain value:', error);
          this.isSaving = false;
        }
      );
    } catch (error) {
      console.log('Pain level error:', error);
      this.isSaving = false;
    }
  }

  async logout() {
    await this.authenticationService.logout();
  }
}
