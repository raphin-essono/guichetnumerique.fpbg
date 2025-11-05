import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AideSupport } from './aide-support';

describe('AideSupport', () => {
  let component: AideSupport;
  let fixture: ComponentFixture<AideSupport>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AideSupport]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AideSupport);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
