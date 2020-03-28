import { async, ComponentFixture, TestBed } from "@angular/core/testing";

import { DrawCadComponent } from "./draw-cad.component";

describe("DrawCadComponent", () => {
  let component: DrawCadComponent;
  let fixture: ComponentFixture<DrawCadComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ DrawCadComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DrawCadComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
