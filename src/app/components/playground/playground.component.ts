import {Component, ViewChild, ElementRef, AfterViewInit} from "@angular/core";
import {Vector2, Vector3} from "three";
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
		window["drawer"] = drawer;
		this.drawer = drawer;
		this.container.nativeElement.append(drawer.dom);
		drawer.curve.ctrlPoints = [new Vector2(-20, -10), new Vector2(-5, 10), new Vector2(10, -10), new Vector2(25, 10)];
		// this.updateCtrlPoints();
		drawer.needsUpdate = true;

		drawer.dom.addEventListener("click", (event) => {
			drawer.addCtrlPoint(new Vector2(event.clientX, event.clientY));
		});
	}

	updateCtrlPoints() {
		this.ctrlPoints.length = 0;
		this.drawer.curve.ctrlPoints.forEach((p) => {
			this.ctrlPoints.push(this.drawer.getScreenPoint(new Vector3(p.x, p.y, 0)));
			// console.log(this.drawer.getWorldPoint(this.drawer.getScreenPoint(new Vector3(p.x, p.y, 0))));
		});
	}

	addPoint() {}
}
