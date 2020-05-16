import {Component, AfterViewInit, ViewChild, ElementRef} from "@angular/core";
import {BezierDrawer} from "@src/app/bezier-drawer/bezier-drawer";
import {Vector2} from "three";

@Component({
	selector: "app-bezier",
	templateUrl: "./bezier.component.html",
	styleUrls: ["./bezier.component.scss"]
})
export class BezierComponent implements AfterViewInit {
	@ViewChild("container", {read: ElementRef}) container: ElementRef<HTMLElement>;
	drawer: BezierDrawer;
	ctrlPoints: Vector2[] = [];
	constructor() {}

	ngAfterViewInit() {
		const drawer = new BezierDrawer({width: innerWidth, height: innerHeight, duration: 1000});
		// tslint:disable-next-line: no-string-literal
		window["drawer"] = drawer;
		this.drawer = drawer;
		this.container.nativeElement.append(drawer.dom);

		drawer.dom.addEventListener("click", (event) => {
			drawer.addCtrlPoint(new Vector2(event.clientX, event.clientY));
		});
	}
}
