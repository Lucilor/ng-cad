import {async, ComponentFixture, TestBed} from "@angular/core/testing";

import {CadInfoComponent} from "./cad-info.component";

describe("CadInfoComponent", () => {
	let component: CadInfoComponent;
	let fixture: ComponentFixture<CadInfoComponent>;

	beforeEach(async(() => {
		TestBed.configureTestingModule({
			declarations: [CadInfoComponent]
		}).compileComponents();
	}));

	beforeEach(() => {
		fixture = TestBed.createComponent(CadInfoComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it("should create", () => {
		expect(component).toBeTruthy();
	});
});
