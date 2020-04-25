import {async, ComponentFixture, TestBed} from "@angular/core/testing";

import {EditCadComponent} from "./edit-cad.component";

describe("EditCadComponent", () => {
	let component: EditCadComponent;
	let fixture: ComponentFixture<EditCadComponent>;

	beforeEach(async(() => {
		TestBed.configureTestingModule({
			declarations: [EditCadComponent]
		}).compileComponents();
	}));

	beforeEach(() => {
		fixture = TestBed.createComponent(EditCadComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it("should create", () => {
		expect(component).toBeTruthy();
	});
});
