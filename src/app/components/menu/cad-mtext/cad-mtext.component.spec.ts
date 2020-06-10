import {async, ComponentFixture, TestBed} from "@angular/core/testing";

import {CadMtextComponent} from "./cad-mtext.component";

describe("CadMtextComponent", () => {
	let component: CadMtextComponent;
	let fixture: ComponentFixture<CadMtextComponent>;

	beforeEach(async(() => {
		TestBed.configureTestingModule({
			declarations: [CadMtextComponent]
		}).compileComponents();
	}));

	beforeEach(() => {
		fixture = TestBed.createComponent(CadMtextComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it("should create", () => {
		expect(component).toBeTruthy();
	});
});
