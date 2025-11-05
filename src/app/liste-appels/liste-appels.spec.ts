import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ListeAppels } from './liste-appels';

describe('ListeAppels', () => {
  let component: ListeAppels;
  let fixture: ComponentFixture<ListeAppels>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ListeAppels]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ListeAppels);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
