import {SessionStorage} from "@lucilor/utils";
import {OnDestroy} from "@angular/core";

export abstract class MenuComponent implements OnDestroy {
	session = new SessionStorage("ngCadMenu");
	contextMenuPosition = {x: "0px", y: "0px"};

	constructor() {
		this.loadStatus();
		window.addEventListener("beforeunload", () => this.saveStatus());
	}

	ngOnDestroy() {
		this.saveStatus();
	}

	abstract saveStatus(): void;

	abstract loadStatus(): void;

	onContextMenu(event: PointerEvent, ...args: any[]) {
		event.preventDefault();
		this.contextMenuPosition.x = event.clientX + "px";
		this.contextMenuPosition.y = event.clientY + "px";
	}
}
