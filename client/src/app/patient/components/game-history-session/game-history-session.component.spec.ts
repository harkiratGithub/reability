import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GameHistorySessionComponent } from './game-history-session.component';

describe('GameHistorySessionComponent', () => {
  let component: GameHistorySessionComponent;
  let fixture: ComponentFixture<GameHistorySessionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ GameHistorySessionComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(GameHistorySessionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
