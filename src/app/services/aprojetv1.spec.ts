import { TestBed } from '@angular/core/testing';

import { Aprojetv1 } from './aprojetv1';

describe('Aprojetv1', () => {
  let service: Aprojetv1;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Aprojetv1);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
