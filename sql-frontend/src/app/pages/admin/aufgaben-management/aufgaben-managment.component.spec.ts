import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AufgabenManagmentComponent } from './aufgaben-managment.component';

describe('AufgabenManagmentComponent', () => {
  let component: AufgabenManagmentComponent;
  let fixture: ComponentFixture<AufgabenManagmentComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AufgabenManagmentComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AufgabenManagmentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
