import {Component, ViewChild, ElementRef, AfterViewInit} from "@angular/core";
import {Vector2} from "three";
import {BezierDrawer} from "@src/app/bezier-drawer/bezier-drawer";

@Component({
	selector: "app-playground",
	templateUrl: "./playground.component.html",
	styleUrls: ["./playground.component.scss"]
})
export class PlaygroundComponent implements AfterViewInit {
	@ViewChild("container", {read: ElementRef}) container: ElementRef<HTMLElement>;
	drawer: BezierDrawer;
	ctrlPoints: Vector2[] = [];
	constructor() {}

	ngAfterViewInit() {
		const drawer = new BezierDrawer({width: innerWidth, height: innerHeight});
		// tslint:disable-next-line: no-string-literal
		window["drawer"] = drawer;
		this.drawer = drawer;
		this.container.nativeElement.append(drawer.dom);

		drawer.dom.addEventListener("click", (event) => {
			drawer.addCtrlPoint(new Vector2(event.clientX, event.clientY));
		});
	}
}
