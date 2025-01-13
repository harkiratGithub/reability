import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MobilePopupComponent } from './mobile-popup.component';

describe('MobilePopupComponent', () => {
  let component: MobilePopupComponent;
  let fixture: ComponentFixture<MobilePopupComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ MobilePopupComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(MobilePopupComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
