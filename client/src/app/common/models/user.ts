// import { Role } from '../../../constants';

export class User {
  // patient/therapist id
  id: number;
  username: string;
  firstName: string;
  lastName: string;
  isTherapist: boolean;
  role: string;
  token?: string;
  // peerId is the userId
  peerId: string;
  isInSession: boolean;
  waitingForSession: boolean;
  missedLastCall: boolean;
  validGames?: { name: string; url: string };
  disabledSkeleton: boolean;
  hasCamera: boolean;
  notification_email?: string;
  login_notification_email?: string;
  instituteLogo?: string; 
  isMobile: boolean;
  patientId?: number;
}
