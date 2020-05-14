import {async, ComponentFixture, TestBed} from "@angular/core/testing";

import {CadOptionsComponent} from "./cad-options.component";

describe("CadOptionsComponent", () => {
	let component: CadOptionsComponent;
	let fixture: ComponentFixture<CadOptionsComponent>;

	beforeEach(async(() => {
		TestBed.configureTestingModule({
			declarations: [CadOptionsComponent]
		}).compileComponents();
	}));

	beforeEach(() => {
		fixture = TestBed.createComponent(CadOptionsComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it("should create", () => {
		expect(component).toBeTruthy();
	});
});
