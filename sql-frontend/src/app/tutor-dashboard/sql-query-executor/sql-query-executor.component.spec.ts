import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SqlQueryExecutorComponent } from './sql-query-executor.component';

describe('SqlQueryExecutorComponent', () => {
  let component: SqlQueryExecutorComponent;
  let fixture: ComponentFixture<SqlQueryExecutorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SqlQueryExecutorComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SqlQueryExecutorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
