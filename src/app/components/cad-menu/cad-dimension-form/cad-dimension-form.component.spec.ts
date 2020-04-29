import {async, ComponentFixture, TestBed} from "@angular/core/testing";

import {CadDimensionFormComponent} from "./cad-dimension-form.component";

describe("CadDimensionFormComponent", () => {
	let component: CadDimensionFormComponent;
	let fixture: ComponentFixture<CadDimensionFormComponent>;

	beforeEach(async(() => {
		TestBed.configureTestingModule({
			declarations: [CadDimensionFormComponent]
		}).compileComponents();
	}));

	beforeEach(() => {
		fixture = TestBed.createComponent(CadDimensionFormComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it("should create", () => {
		expect(component).toBeTruthy();
	});
});
