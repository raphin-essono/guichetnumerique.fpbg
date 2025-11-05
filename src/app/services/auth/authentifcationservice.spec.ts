import { TestBed } from '@angular/core/testing';

import { Authentifcationservice } from './authentifcationservice';

describe('Authentifcationservice', () => {
  let service: Authentifcationservice;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Authentifcationservice);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
