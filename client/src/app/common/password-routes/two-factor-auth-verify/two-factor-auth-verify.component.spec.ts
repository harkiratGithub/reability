import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TwoFactorAuthVerifyComponent } from './two-factor-auth-verify.component';

describe('TwoFactorAuthVerifyComponent', () => {
  let component: TwoFactorAuthVerifyComponent;
  let fixture: ComponentFixture<TwoFactorAuthVerifyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ TwoFactorAuthVerifyComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(TwoFactorAuthVerifyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
