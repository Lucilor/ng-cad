import {async, ComponentFixture, TestBed} from "@angular/core/testing";

import {CadDimensionComponent} from "./cad-dimension.component";

describe("CadDimensionComponent", () => {
	let component: CadDimensionComponent;
	let fixture: ComponentFixture<CadDimensionComponent>;

	beforeEach(async(() => {
		TestBed.configureTestingModule({
			declarations: [CadDimensionComponent]
		}).compileComponents();
	}));

	beforeEach(() => {
		fixture = TestBed.createComponent(CadDimensionComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it("should create", () => {
		expect(component).toBeTruthy();
	});
});
