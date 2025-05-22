import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DatenbankenComponent } from './datenbanken.component';

describe('DatenbankenComponent', () => {
  let component: DatenbankenComponent;
  let fixture: ComponentFixture<DatenbankenComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DatenbankenComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DatenbankenComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
