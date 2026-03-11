import { Component, OnInit } from '@angular/core';
import { ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { roleMainRoute } from 'src/app/routes';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AlertService } from '../../services/alert.service';
import { AjaxService } from 'src/app/therapist/services/ajax.service';
import { AuthenticationService } from '../../services/authentication.service';

@Component({
  selector: 'app-two-factor-auth-verify',
  templateUrl: './two-factor-auth-verify.component.html',
  styleUrls: ['./two-factor-auth-verify.component.scss'],
})
export class TwoFactorAuthVerifyComponent implements OnInit {
  user = null;
  dialogRef: null;
  is2faEnabled = false;
  userId: number = null;
  qrCodeUrl: string = '';
  viewTab = 'generatedQR';
  isReverifyClicked = false;
  verificationCode: string = '';
  authIcon = '../../../../assets/login/2F-auth.png';

  constructor(
    private router: Router,
    private ajax: AjaxService,
    private snackBar: MatSnackBar,
    private cdRef: ChangeDetectorRef,
    private activatedRoute: ActivatedRoute,
    private authService: AuthenticationService
  ) {}

  async ngOnInit() {
    this.is2faEnabled = this.activatedRoute.snapshot?.queryParams?.enable2FA == 'true';
    this.viewTab = this.is2faEnabled ? 'verifyOtp' : 'generatedQR';
    this.userId = this.activatedRoute.snapshot?.params?.id;
    this.user = await this.ajax.getUserData().toPromise();
    this.reloadImage();
    if (!this.is2faEnabled) {
      this.enable2FA();
    } else {
      this.viewTab = 'verifyOtp';
    }
  }

  reloadImage() {
    const img = new Image();
    img.src = this.authIcon;
    img.onload = () => {
      this.authIcon = img.src;
    };
    img.onerror = () => {
      console.log('Image failed to load, retrying...');
      setTimeout(() => this.reloadImage(), 1000);
    };
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

  enterOtp(): void {
    console.log('nhhkl');
    this.viewTab = 'verifyOtp';
    this.isReverifyClicked = false;
    this.cdRef.detectChanges();
    console.log('viewTab:', this.viewTab); // Debugging to ensure the viewTab is set
    console.log('isReverifyClicked:', this.isReverifyClicked);
  }

  reverifyAccount() {
    this.isReverifyClicked = true;
    this.ajax.reVerify2FA(this.userId)?.subscribe({
      next: () => {
        this.snackBar.open('Re-Verify Steps have been sent to your email. Please check !!', '', {
          duration: 2000,
          verticalPosition: 'top',
          horizontalPosition: 'right',
        });

        // this.viewTab = 'generatedQR';
        // this.qrCodeUrl = response?.qrCodeData;
      },
      error: (error) => {
        this.snackBar.open(error, 'Error in sending email!', {
          duration: 2000,
          verticalPosition: 'top',
          horizontalPosition: 'right',
          panelClass: ['error-snackbar'],
        });

        // this.verificationCode = '';
        // this.snackBar.open(error, 'Invalid OTP !!!', {
        //   duration: 1000,
        //   verticalPosition: 'top',
        //   horizontalPosition: 'right',
        //   panelClass: ['error-snackbar'],
        // });
      },
      complete: () => {
        // this.verificationCode = '';
      },
    });
  }

  onEnter(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      this.verifyCode();
    }
  }

  backToLogin(): void {
    this.authService.logout();
  }
}
