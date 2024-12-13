import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AjaxService } from 'src/app/therapist/services/ajax.service';
import { AuthenticationService } from '../../../common/services/authentication.service';

@Component({
  selector: 'app-pain-scale',
  templateUrl: './pain-scale.component.html',
  styleUrls: ['./pain-scale.component.scss'],
})
export class PainScaleComponent implements OnInit {
  constructor(
    private ajax: AjaxService,
    private router: Router,
    private authenticationService: AuthenticationService
  ) {}
  painValue: number = 0;
  patient_note: string = '';
  patientId: number = -1;
  isPainModelOpen: boolean = false;
  isSaving: boolean = false; 

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
      this.ajax.sendPatientPainScale(this.patientId, this.painValue, this.patient_note).subscribe(
        (response) => {
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
