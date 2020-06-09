import {async, ComponentFixture, TestBed} from "@angular/core/testing";

import {ExpressionAnalysisComponent} from "./expression-analysis.component";

describe("ExpressionAnalysisComponent", () => {
	let component: ExpressionAnalysisComponent;
	let fixture: ComponentFixture<ExpressionAnalysisComponent>;

	beforeEach(async(() => {
		TestBed.configureTestingModule({
			declarations: [ExpressionAnalysisComponent]
		}).compileComponents();
	}));

	beforeEach(() => {
		fixture = TestBed.createComponent(ExpressionAnalysisComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it("should create", () => {
		expect(component).toBeTruthy();
	});
});
