import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GametimerSkeltonComponent } from './gametimer-skelton.component';

describe('GametimerSkeltonComponent', () => {
  let component: GametimerSkeltonComponent;
  let fixture: ComponentFixture<GametimerSkeltonComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ GametimerSkeltonComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(GametimerSkeltonComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
