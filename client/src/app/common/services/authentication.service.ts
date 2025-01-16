import { Injectable, OnDestroy, OnInit } from '@angular/core';
import { BehaviorSubject, Observable, Subscription } from 'rxjs';
import { Router } from '@angular/router';
import { User } from '../models/user';
import { heartbeatTimer } from '../../../../../constants/heartbeat';
import { MenuOptionsAppActions } from 'src/app/patient/components/menu-options/menu-options.actions';
import { AjaxService } from 'src/app/therapist/services/ajax.service';
import { select } from '@angular-redux/store';
import { ROUTES } from 'src/app/routes';

@Injectable({ providedIn: 'root' })
export class AuthenticationService implements OnDestroy {
  private currentUserSubject: BehaviorSubject<User>;
  public currentUser: Observable<User>;
  subscription: Subscription = new Subscription();
  @select((state) => state.menu_options.is_in_game)
  readonly isInGame$: Observable<boolean>;
  @select((state) => state.menu_options.inTherapistSession)
  readonly inTherapistSession$: Observable<boolean>;
  isInGame = false;
  inTherapistSession = false;
  heartBeatInterval;

  constructor(
    private ajax: AjaxService,
    private menuOptionsActions: MenuOptionsAppActions,
    private router: Router
  ) {
    this.currentUserSubject = new BehaviorSubject<User>(null);
    this.currentUser = this.currentUserSubject.asObservable();
    this.subscription.add(
      this.isInGame$.subscribe((inGame) => (this.isInGame = inGame))
    );
    this.subscription.add(
      this.inTherapistSession$.subscribe(
        (inSession) => (this.inTherapistSession = inSession)
      )
    );
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
    this.closeHeartBeatInterval();
  }

  startHeartBeatInterval = () => {
    this.heartBeatInterval = setInterval(() => {
      if (this.currentUserValue && this.currentUserValue.peerId) {
        this.ajax.sendHeartBeat(
          this.inTherapistSession,
          this.isInGame
        );
      }
    }, heartbeatTimer);
  };

  closeHeartBeatInterval = () => {
    clearInterval(this.heartBeatInterval);
  };

  public get currentUserValue(): User {
    if (this.currentUserSubject) {
      return this.currentUserSubject.value;
    }
  }

  updateUser = (user): User => {
    if (user) {
      this.startHeartBeatInterval();
      if (!user.isTherapist) {
        this.menuOptionsActions.setValidGames(user.validGames);
      }
      this.currentUserSubject.next(user);
    }
    return user;
  };

  // logout = async () => {
  //   try {
  //     await this.ajax.logout().toPromise();
  //   } catch (err) {
  //     console.log(err);
  //   }
  //   this.currentUserSubject.next(null);
  //   this.closeHeartBeatInterval();
  //   this.router.navigate([ROUTES.LOGIN]);
  // };

  logout = async () => {
    try {
      await this.ajax.logout().toPromise();
      if (window && (window as any).NREUM) {
        (window as any).NREUM.addPageAction('LogoutSuccess', {
          username: this.currentUserValue?.username,
          isTherapist: this.currentUserValue?.isTherapist,
          userRole: this.currentUserValue?.role,
        });
      }
    } catch (err) {
      console.log('Logout failed:', err);
      if (window && (window as any).NREUM) {
        (window as any).NREUM.addPageAction('LogoutError', {
          username: this.currentUserValue?.username,
          errorMessage: err.message || 'Unknown error',
        });
      }
    } finally {
      this.currentUserSubject.next(null);
      this.closeHeartBeatInterval();
      this.router.navigate([ROUTES.LOGIN]);
    }
  };
    
}
