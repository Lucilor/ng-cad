import {async, ComponentFixture, TestBed} from "@angular/core/testing";

import {CadSubcadComponent} from "./cad-subcad.component";

describe("CadSubcadComponent", () => {
	let component: CadSubcadComponent;
	let fixture: ComponentFixture<CadSubcadComponent>;

	beforeEach(async(() => {
		TestBed.configureTestingModule({
			declarations: [CadSubcadComponent]
		}).compileComponents();
	}));

	beforeEach(() => {
		fixture = TestBed.createComponent(CadSubcadComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it("should create", () => {
		expect(component).toBeTruthy();
	});
});
