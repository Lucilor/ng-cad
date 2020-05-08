import {Component, OnInit, Input} from "@angular/core";
import {CadMenu} from "../cad-menu.common";
import {CadLine, CadTransformation} from "@app/cad-viewer/cad-data";
import {Vector2} from "three";
import {getColorLightness} from "@lucilor/utils";
import {MatSelectChange} from "@angular/material/select";

@Component({
	selector: "app-cad-line",
	templateUrl: "./cad-line.component.html",
	styleUrls: ["./cad-line.component.scss"]
})
export class CadLineComponent implements OnInit {
	@Input() menu: CadMenu;
	line: CadLine;
	tLine: {start: Vector2; end: Vector2};
	get data() {
		return this.menu.getData();
	}
	readonly selectableColors = ["#ffffff", "#ff0000", "#00ff00", "#0000ff"];
	constructor() {}

	ngOnInit() {
		const {cad, mode} = this.menu;
		cad.controls.on("entityselect", (event, entity) => {
			if (mode.type === "normal" && entity instanceof CadLine) {
				this.line = entity;
				this.updateTLine();
			}
		});
		cad.controls.on("drag", () => this.updateTLine());
		cad.controls.on("wheel", () => this.updateTLine());
	}

	setLineLength(event: InputEvent) {
		const {line, menu} = this;
		const length = Number((event.target as HTMLInputElement).value);
		const d = line.length - length;
		const theta = line.theta;
		const offset = new Vector2(Math.cos(theta), Math.sin(theta)).multiplyScalar(d);
		line.end.x += offset.x;
		line.end.y += offset.y;
		menu.generatePointsMap();
		const entities = menu.findAllAdjacentLines(line, line.end);
		entities.transform(new CadTransformation().setTranslate(offset.x, offset.y));
		menu.getData().updatePartners();
		menu.cad.render();
		menu.updateCadLength();
		this.updateTLine();
	}

	getCssColor(color?: string) {
		if (color) {
			return getColorLightness(color) < 0.5 ? "black" : "white";
		} else if (this.line) {
			return "#" + this.line.color.toString(16).padStart(6, "0");
		}
		return "white";
	}

	setLineColor(event: MatSelectChange) {
		if (this.line) {
			const color = parseInt(event.value.slice("1"), 16);
			this.line.color = color;
			this.menu.cad.render();
		}
	}

	setLineText(event: Event, field: string) {
		if (this.line) {
			const value = (event.target as HTMLInputElement).value;
			this.line[field] = value;
			this.menu.cad.render();
		}
	}

	updateTLine() {
		if (this.line) {
			const start = this.menu.cad.translatePoint(this.line.start);
			const end = this.menu.cad.translatePoint(this.line.end);
			this.tLine = {start, end};
		}
	}
}
