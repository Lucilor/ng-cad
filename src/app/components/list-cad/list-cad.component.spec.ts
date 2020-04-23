import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ListCadComponent } from './list-cad.component';

describe('ListCadComponent', () => {
  let component: ListCadComponent;
  let fixture: ComponentFixture<ListCadComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ListCadComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ListCadComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
