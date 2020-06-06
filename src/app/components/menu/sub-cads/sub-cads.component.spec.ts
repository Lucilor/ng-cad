import {async, ComponentFixture, TestBed} from "@angular/core/testing";

import {SubCadsComponent} from "./sub-cads.component";

describe("SubCadsComponent", () => {
	let component: SubCadsComponent;
	let fixture: ComponentFixture<SubCadsComponent>;

	beforeEach(async(() => {
		TestBed.configureTestingModule({
			declarations: [SubCadsComponent]
		}).compileComponents();
	}));

	beforeEach(() => {
		fixture = TestBed.createComponent(SubCadsComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it("should create", () => {
		expect(component).toBeTruthy();
	});
});
