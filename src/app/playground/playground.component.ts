import {Component, ViewChild, ElementRef, AfterViewInit} from "@angular/core";
import data from "../../cad.json";
import p5 from "p5";

@Component({
	selector: "app-playground",
	templateUrl: "./playground.component.html",
	styleUrls: ["./playground.component.scss"]
})
export class PlaygroundComponent implements AfterViewInit {
	@ViewChild("cadEl", {read: ElementRef}) cadEl: ElementRef<HTMLElement>;
	constructor() {}

	ngAfterViewInit() {
		// const aData = data as any;
		// const cad = new CadViewer(aData, innerWidth, innerHeight).render(true);
		// console.log(cad);
		// this.cadEl.nativeElement.append(cad.view);

		// tslint:disable-next-line: no-unused-expression
		new p5((sketch: p5) => {
			sketch.setup = () => {
				sketch.createCanvas(innerWidth, innerHeight);
				sketch.noLoop();
			};

			sketch.draw = () => {
				for (const id in data.entities) {
					const e = data.entities[id];
					if (e.type === "LINE") {
						sketch;
					}
				}
			};
		});
	}
}
