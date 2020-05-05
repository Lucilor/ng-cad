import {async, ComponentFixture, TestBed} from "@angular/core/testing";

import {CadAssembleComponent} from "./cad-assemble.component";

describe("CadAssembleComponent", () => {
	let component: CadAssembleComponent;
	let fixture: ComponentFixture<CadAssembleComponent>;

	beforeEach(async(() => {
		TestBed.configureTestingModule({
			declarations: [CadAssembleComponent]
		}).compileComponents();
	}));

	beforeEach(() => {
		fixture = TestBed.createComponent(CadAssembleComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it("should create", () => {
		expect(component).toBeTruthy();
	});
});
