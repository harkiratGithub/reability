import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class PatientScoreService {
  // Map to store score data for each patient by peer ID
  private patientScores = new Map<string, BehaviorSubject<any[]>>();
  
  // Get score data observable for a specific patient
  getPatientScoreData(patientPeerId: string) {
    if (!this.patientScores.has(patientPeerId)) {
      this.patientScores.set(patientPeerId, new BehaviorSubject<any[]>([]));
    }
    return this.patientScores.get(patientPeerId)!.asObservable();
  }
  
  // Update score data for a specific patient
  updatePatientScoreData(patientPeerId: string, scoreData: any[]) {
    if (!this.patientScores.has(patientPeerId)) {
      this.patientScores.set(patientPeerId, new BehaviorSubject<any[]>([]));
    }
    this.patientScores.get(patientPeerId)!.next(scoreData);
  }
  
  // Add new score for a specific patient
  addPatientScore(patientPeerId: string, newScore: any) {
    if (!this.patientScores.has(patientPeerId)) {
      this.patientScores.set(patientPeerId, new BehaviorSubject<any[]>([]));
    }
    
    const currentScores = this.patientScores.get(patientPeerId)!.value;
    const updatedScores = [...currentScores, newScore];
    this.patientScores.get(patientPeerId)!.next(updatedScores);
  }
  
  // Clear score data for a specific patient
  clearPatientScoreData(patientPeerId: string) {
    if (this.patientScores.has(patientPeerId)) {
      this.patientScores.get(patientPeerId)!.next([]);
    }
  }
  
  // Remove patient data when patient disconnects
  removePatientData(patientPeerId: string) {
    this.patientScores.delete(patientPeerId);
  }
}
