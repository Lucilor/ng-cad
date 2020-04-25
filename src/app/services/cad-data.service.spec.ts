import {TestBed} from "@angular/core/testing";

import {CadDataService} from "./cad-data.service";

describe("CadDataService", () => {
	let service: CadDataService;

	beforeEach(() => {
		TestBed.configureTestingModule({});
		service = TestBed.inject(CadDataService);
	});

	it("should be created", () => {
		expect(service).toBeTruthy();
	});
});
