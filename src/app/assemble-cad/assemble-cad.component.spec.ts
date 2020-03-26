import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { AssembleCadComponent } from './assemble-cad.component';

describe('AssembleCadComponent', () => {
  let component: AssembleCadComponent;
  let fixture: ComponentFixture<AssembleCadComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ AssembleCadComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(AssembleCadComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
