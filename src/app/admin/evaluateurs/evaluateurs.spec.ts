import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Evaluateurs } from './evaluateurs';

describe('Evaluateurs', () => {
  let component: Evaluateurs;
  let fixture: ComponentFixture<Evaluateurs>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Evaluateurs]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Evaluateurs);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
