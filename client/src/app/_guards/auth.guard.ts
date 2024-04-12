import { Injectable } from '@angular/core';
import { Router, CanActivate, ActivatedRouteSnapshot } from '@angular/router';

import { AjaxService } from '../therapist/services/ajax.service';
import { AuthenticationService } from '../common/services/authentication.service';

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  constructor(
    private router: Router,
    private ajax: AjaxService,
    private authenticationService: AuthenticationService
  ) {}

  async canActivate(route: ActivatedRouteSnapshot): Promise<boolean> {
    try {
      const isAuthenticateResult = await this.ajax.checkIsAuthenticate().toPromise();
      if (!isAuthenticateResult || !isAuthenticateResult.isAuthenticated) {
        throw new Error('no open session');
      }
      const currentUser = this.authenticationService.currentUserValue;
      if (route.data.roles && route.data.roles.indexOf(currentUser.role) === -1) {
        throw new Error('not authorize');
      }
      return true;
    } catch (err) {
      return false;
    }
  }
}
