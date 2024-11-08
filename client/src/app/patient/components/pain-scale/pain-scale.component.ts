import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AjaxService } from 'src/app/therapist/services/ajax.service';

@Component({
  selector: 'app-pain-scale',
  templateUrl: './pain-scale.component.html',
  styleUrls: ['./pain-scale.component.scss'],
})
export class PainScaleComponent implements OnInit {
  constructor(private ajax: AjaxService, private router: Router) {}
  painValue: number = 0;
  patientId: number = -1;
  isPainModelOpen: boolean = false;
  hasPainValueChanged: boolean = false;


  async ngOnInit() {
    try {
      const userData = await this.ajax.getUserData().toPromise();
      console.log(userData, 'userData');
      if (userData?.isPainModelOpen) {
        this.isPainModelOpen = userData.isPainModelOpen;
        this.patientId = userData.patientId;
        console.log('user RTM:', this.isPainModelOpen, this.patientId);
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
    this.hasPainValueChanged = true;
  }

  savePainValue(): void {
    if (!this.hasPainValueChanged) return; 
    try {
      this.ajax.sendPatientPainScale(this.patientId, this.painValue).subscribe((response) => {
        this.isPainModelOpen = false;
        this.router.navigate(['/games_lobby']);
      });
    } catch (error) {
      console.log('Pain level error:', error);
    }
  }
}
