import {async, ComponentFixture, TestBed} from "@angular/core/testing";

import {BezierComponent} from "./bezier.component";

describe("BezierComponent", () => {
	let component: BezierComponent;
	let fixture: ComponentFixture<BezierComponent>;

	beforeEach(async(() => {
		TestBed.configureTestingModule({
			declarations: [BezierComponent]
		}).compileComponents();
	}));

	beforeEach(() => {
		fixture = TestBed.createComponent(BezierComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it("should create", () => {
		expect(component).toBeTruthy();
	});
});
