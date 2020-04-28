import {async, ComponentFixture, TestBed} from "@angular/core/testing";

import {LineIndicatorComponent} from "./line-indicator.component";

describe("LineIndicatorComponent", () => {
	let component: LineIndicatorComponent;
	let fixture: ComponentFixture<LineIndicatorComponent>;

	beforeEach(async(() => {
		TestBed.configureTestingModule({
			declarations: [LineIndicatorComponent]
		}).compileComponents();
	}));

	beforeEach(() => {
		fixture = TestBed.createComponent(LineIndicatorComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it("should create", () => {
		expect(component).toBeTruthy();
	});
});
