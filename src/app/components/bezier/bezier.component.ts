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
	miniMenu = false;
	get points() {
		return this.drawer?.curve.ctrlPoints || [];
	}
	constructor() {}

	ngAfterViewInit() {
		const drawer = new BezierDrawer({width: innerWidth, height: innerHeight, duration: 1000, backgroundColor: 0xffffff});
		// tslint:disable-next-line: no-string-literal
		window["drawer"] = drawer;
		setTimeout(() => {
			this.drawer = drawer;
			this.container.nativeElement.append(drawer.dom);
		}, 0);

		drawer.dom.addEventListener("click", (event) => {
			drawer.addCtrlPoint(new Vector2(event.clientX, event.clientY));
		});
	}

	getPointNum(point: Vector2, axis: "x" | "y") {
		return point[axis].toFixed(2);
	}

	setPointNum(event: InputEvent, point: Vector2, axis: "x" | "y") {
		const value = (event.target as HTMLInputElement).value;
		point[axis] = Number(value);
		this.drawer.start();
	}
}
