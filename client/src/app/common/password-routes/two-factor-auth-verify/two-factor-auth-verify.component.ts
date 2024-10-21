import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { roleMainRoute } from 'src/app/routes';
import { AjaxService } from 'src/app/therapist/services/ajax.service';
import { AlertService } from '../../services/alert.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-two-factor-auth-verify',
  templateUrl: './two-factor-auth-verify.component.html',
  styleUrls: ['./two-factor-auth-verify.component.scss'],
})
export class TwoFactorAuthVerifyComponent implements OnInit {
  user = null;
  dialogRef: null;
  is2faEnabled = false;
  viewTab = 'generatedQR';
  userId: number = null;
  qrCodeUrl: string = '';
  verificationCode: string = '';

  constructor(
    private router: Router,
    private ajax: AjaxService,
    private snackBar: MatSnackBar,
    private activatedRoute: ActivatedRoute
  ) {}

  async ngOnInit() {
    this.is2faEnabled = this.activatedRoute.snapshot?.queryParams?.enable2FA == 'true'; 
    this.viewTab = this.is2faEnabled ? 'verifyOtp' : 'generatedQR';
    this.userId = this.activatedRoute.snapshot?.params?.id;
    this.user = await this.ajax.getUserData().toPromise();
    if (!this.is2faEnabled) {
      this.enable2FA();
    } else {
      this.viewTab = 'verifyOtp';
    }
  }

  isNumberKey(event: KeyboardEvent): boolean {
    const charCode = event.which ? event.which : event.keyCode;
    if (charCode < 48 || charCode > 57) {
      event.preventDefault();
      return false;
    }
    return true;
  }

  enable2FA() {
    this.ajax.enable2FA(this.userId, { enable2FA: true })?.subscribe({
      next: (response) => {
        this.viewTab = 'generatedQR';
        this.qrCodeUrl = response?.qrCodeData;
      },
      error: (error) => {
        this.verificationCode = '';
        this.snackBar.open(error, 'Invalid OTP !!!', {
          duration: 1000,
          verticalPosition: 'top',
          horizontalPosition: 'right',
          panelClass: ['error-snackbar'],
        });
      },
      complete: () => {
        this.verificationCode = '';
      },
    });
  }

 

  verifyCode() {
    this.ajax.verify2FA(this.userId, this.verificationCode)?.subscribe({
      next: (response) => {
        if (response?.success) {
          this.viewTab = 'verified';
          if (this.user?.role) {
            this.snackBar.open('Admin 2FA verified successfully', 'Hurray !!!', {
              duration: 1000,
              verticalPosition: 'top',
              horizontalPosition: 'right',
            });
            this.router.navigate([`${roleMainRoute(this.user.role)}`]);
            this.verificationCode = '';
          }
          localStorage.setItem('verified2FA', 'true');
        }
      },
      error: (error) => {
        this.verificationCode = '';
        this.snackBar.open(error, '', {
          duration: 1000,
          verticalPosition: 'top',
          horizontalPosition: 'right',
          panelClass: ['error-snackbar'],
        });
      },
      complete: () => {
        this.verificationCode = '';
      },
    });
  }

  resendOTP() {
    this.ajax.reVerify2FA(this.userId)?.subscribe({
      next: (response) => {
        this.viewTab = 'generatedQR';
        this.qrCodeUrl = response?.qrCodeData;
      },
      error: (error) => {
        this.verificationCode = '';
        this.snackBar.open(error, 'Invalid OTP !!!', {
          duration: 1000,
          verticalPosition: 'top',
          horizontalPosition: 'right',
          panelClass: ['error-snackbar'],
        });
      },
      complete: () => {
        this.verificationCode = '';
      },
    });
    
  }
  onEnter(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      this.verifyCode();
    }
  }

}
