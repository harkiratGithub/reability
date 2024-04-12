import { UrlSegment, UrlSegmentGroup, Route } from '@angular/router';
import { AuthenticationService } from './common/services/authentication.service';
import { AppInjector } from '../app-injector';
import { Role } from 'src/constants';

export function adminMatcher(segments: UrlSegment[], group: UrlSegmentGroup, route: Route) {
  const userService = AppInjector.get(AuthenticationService);
  if (!userService.currentUserValue) {
    return null;
  }
  const isPathMatch = segments.length === 0;
  const isUserTypeMatch = userService.currentUserValue.role === Role.Admin;
  if (isPathMatch && isUserTypeMatch) {
    return { consumed: [new UrlSegment('admin', {})] };
  } else {
    return null;
  }
}
