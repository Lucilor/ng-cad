import {SessionStorage} from "@lucilor/utils";
import {OnDestroy} from "@angular/core";

export abstract class MenuComponent implements OnDestroy {
	session = new SessionStorage("ngCadMenu");

	constructor() {
		this.loadStatus();
		window.addEventListener("beforeunload", () => this.saveStatus());
	}

	ngOnDestroy() {
		this.saveStatus();
	}

	abstract saveStatus(): void;

	abstract loadStatus(): void;
}
