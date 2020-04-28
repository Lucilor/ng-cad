import {async, ComponentFixture, TestBed} from "@angular/core/testing";

import {CadLineComponent} from "./cad-line.component";

describe("CadLineComponent", () => {
	let component: CadLineComponent;
	let fixture: ComponentFixture<CadLineComponent>;

	beforeEach(async(() => {
		TestBed.configureTestingModule({
			declarations: [CadLineComponent]
		}).compileComponents();
	}));

	beforeEach(() => {
		fixture = TestBed.createComponent(CadLineComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it("should create", () => {
		expect(component).toBeTruthy();
	});
});
