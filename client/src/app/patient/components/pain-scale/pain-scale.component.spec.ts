import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PainScaleComponent } from './pain-scale.component';

describe('PainScaleComponent', () => {
  let component: PainScaleComponent;
  let fixture: ComponentFixture<PainScaleComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PainScaleComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(PainScaleComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
