import { TestBed } from '@angular/core/testing';

import { SkeltonVideoService } from './skelton-video.service';

describe('SkeltonVideoService', () => {
  let service: SkeltonVideoService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SkeltonVideoService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
