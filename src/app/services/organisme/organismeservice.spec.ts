import { TestBed } from '@angular/core/testing';

import { Organismeservice } from './organismeservice';

describe('Organismeservice', () => {
  let service: Organismeservice;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Organismeservice);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
