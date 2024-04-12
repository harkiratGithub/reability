import { Injectable } from '@angular/core';
import { HttpRequest, HttpHandler, HttpEvent, HttpInterceptor } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AppActions } from 'src/app/app.actions';
import { AuthenticationService } from '../services/authentication.service';

@Injectable()
export class ErrorInterceptor implements HttpInterceptor {
  constructor(private authenticationService: AuthenticationService, private appActions: AppActions) {}

  intercept(
    request: HttpRequest<any>,
    next: HttpHandler
  ): Observable<HttpEvent<any>> {
    return next.handle(request).pipe(
      catchError((err) => {
        const error = err.error.message || err.statusText;
        // don't open modal on login request
        //console.error('error ? ', error)
        //console.error('err ? ', err)
        if(err.status === 401 && !err.url.includes('login') && !err.url.includes('fastLogin')) {
            this.openModal();
        }
        return throwError(error);
      })
    );
  }

  openModal = () => {
    const approve = async () => {
        await this.authenticationService.logout();
    }
    this.appActions.openCallModal({
      panelClass: 'generic-dialog-container',
      header: 'CONNECTION ERROR',
      content: 'Session terminated due to connecting in another machine or session timed out',
      acceptBtnImg: '../../../assets/buttons/btn_decline.png',
      acceptBtnImgHover: '../../../assets/buttons/btn_decline_hover.png',
      approveCallback: async () => approve(),
      declineCallback: async () => approve(),
    }, false);
  };
}