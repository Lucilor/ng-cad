import {async, ComponentFixture, TestBed} from "@angular/core/testing";

import {AngleInputComponent} from "./angle-input.component";

describe("AngleInputComponent", () => {
	let component: AngleInputComponent;
	let fixture: ComponentFixture<AngleInputComponent>;

	beforeEach(async(() => {
		TestBed.configureTestingModule({
			declarations: [AngleInputComponent]
		}).compileComponents();
	}));

	beforeEach(() => {
		fixture = TestBed.createComponent(AngleInputComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it("should create", () => {
		expect(component).toBeTruthy();
	});
});
