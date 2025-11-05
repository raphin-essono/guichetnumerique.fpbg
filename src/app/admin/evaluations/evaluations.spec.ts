import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Evaluations } from './evaluations';

describe('Evaluations', () => {
  let component: Evaluations;
  let fixture: ComponentFixture<Evaluations>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Evaluations]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Evaluations);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
