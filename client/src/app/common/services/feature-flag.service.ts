import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class FeatureFlagService {

  private STORAGE_KEY = 'featureFlags';

  // Save API response
  saveFlags(apiResponse: any) {
    const flagsObj = {};
    apiResponse.data.forEach((item: any) => {
      flagsObj[item.feature_name] = item.enabled_status;
    });
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(flagsObj));
  }

  // Get all flags
  getFlags() {
    return JSON.parse(localStorage.getItem(this.STORAGE_KEY) || '{}');
  }

  // Get single flag
  isEnabled(flagName: string): boolean {
    const flags = this.getFlags();
    return flags[flagName] === true;
  }

  clearFlags() {
    localStorage.removeItem(this.STORAGE_KEY);
  }
}
