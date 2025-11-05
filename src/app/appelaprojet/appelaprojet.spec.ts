import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Appelaprojet } from './appelaprojet';

describe('Appelaprojet', () => {
  let component: Appelaprojet;
  let fixture: ComponentFixture<Appelaprojet>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Appelaprojet]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Appelaprojet);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
