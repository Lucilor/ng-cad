import {Component, OnInit, Input} from "@angular/core";
import {CadMenu} from "../cad-menu.common";
import {Vector2, Color} from "three";
import {getColorLightness} from "@lucilor/utils";
import {MatSelectChange} from "@angular/material/select";
import {CadLine} from "@src/app/cad-viewer/cad-data/cad-entity/cad-line";
import {CadTransformation} from "@src/app/cad-viewer/cad-data/cad-transformation";
import {CadEntity} from "@src/app/cad-viewer/cad-data/cad-entity/cad-entity";
import {CadEntities} from "@src/app/cad-viewer/cad-data/cad-entities";
import {CadArc} from "@src/app/cad-viewer/cad-data/cad-entity/cad-arc";

@Component({
	selector: "app-cad-line",
	templateUrl: "./cad-line.component.html",
	styleUrls: ["./cad-line.component.scss"]
})
export class CadLineComponent implements OnInit {
	@Input() menu: CadMenu;
	tLine: {start: Vector2; end: Vector2};
	get data() {
		return this.menu.getData();
	}
	get selectedLines() {
		return this.menu.cad.selectedEntities.line;
	}
	focusedField = "";
	readonly selectableColors = ["#ffffff", "#ff0000", "#00ff00", "#0000ff"];
	constructor() {}

	ngOnInit() {
		const {cad} = this.menu;
		cad.controls.on("entityselect", () => {
			this.updateTLine();
		});
		cad.controls.on("entityunselect", () => {
			this.updateTLine();
		});
		cad.controls.on("drag", () => this.updateTLine());
		cad.controls.on("wheel", () => this.updateTLine());
	}

	expandLine(line: CadLine, d: number) {
		const theta = line.theta;
		const translate = new Vector2(Math.cos(theta), Math.sin(theta)).multiplyScalar(d);
		line.end.add(translate);
		return translate;
	}

	getLineLength() {
		const lines = this.selectedLines;
		if (lines.length === 1) {
			return lines[0].length.toFixed(2);
		}
		return "";
	}

	setLineLength(event: InputEvent) {
		const {selectedLines, menu} = this;
		menu.updatePointsMap();
		selectedLines.forEach((line) => {
			const entities = this.findAllAdjacentLines(line, line.end);
			const length = Number((event.target as HTMLInputElement).value);
			const d = line.length - length;
			const translate = this.expandLine(line, d);
			entities.transform(new CadTransformation({translate}));
		});
		menu.getData().updatePartners().updateComponents();
		menu.cad.render();
		menu.updateCadLength();
		this.updateTLine();
	}

	findAdjacentLines(entity: CadEntity, point?: Vector2): CadEntity[] {
		const {pointsMap, accuracy} = this.menu;
		if (!point && entity instanceof CadLine) {
			const adjStart = this.findAdjacentLines(entity, entity.start);
			const adjEnd = this.findAdjacentLines(entity, entity.end);
			return [...adjStart, ...adjEnd];
		}
		const pal = pointsMap.find((v) => v.point.distanceTo(point) <= accuracy);
		if (pal) {
			const lines = pal.lines.filter((v) => v.id !== entity.id);
			return lines;
		}
		return [];
	}

	findAllAdjacentLines(entity: CadEntity, point: Vector2) {
		const entities = new CadEntities();
		const id = entity.id;
		const accuracy = this.menu.accuracy;
		while (entity && point) {
			entity = this.findAdjacentLines(entity, point)[0];
			if (entity?.id === id) {
				break;
			}
			if (entity) {
				if (entity instanceof CadLine) {
					entities.line.push(entity);
					const {start, end} = entity;
					if (start.distanceTo(point) <= accuracy) {
						point = end;
					} else if (end.distanceTo(point) < accuracy) {
						point = start;
					} else {
						point = null;
					}
				}
				if (entity instanceof CadArc) {
					entities.arc.push(entity);
					const curve = entity.curve;
					const start = curve.getPoint(0);
					const end = curve.getPoint(1);
					if (start.distanceTo(point) <= accuracy) {
						point = end;
					} else if (end.distanceTo(point) <= accuracy) {
						point = start;
					} else {
						point = null;
					}
				}
			}
		}
		return entities;
	}

	getCssColor(colorStr?: string) {
		const lines = this.selectedLines;
		if (colorStr) {
			const color = new Color(colorStr);
			return getColorLightness(color.getHex()) < 0.5 ? "black" : "white";
		}
		if (lines.length === 1) {
			return "#" + lines[0].color.getHexString();
		}
		if (lines.length) {
			const strs = Array.from(new Set(lines.map((l) => "#" + l.color.getHexString())));
			if (strs.length === 1) {
				return strs[0];
			}
		}
		return "white";
	}

	setLineColor(event: MatSelectChange) {
		const color = parseInt(event.value.slice("1"), 16);
		this.selectedLines.forEach((e) => e.color.set(color));
		this.menu.cad.render();
	}

	getLineText(field: "mingzi" | "qujian" | "gongshi") {
		const lines = this.selectedLines;
		if (lines.length === 1) {
			return lines[0][field];
		}
		if (lines.length) {
			const texts = Array.from(new Set(lines.map((l) => l[field])));
			if (texts.length === 1) {
				return texts[0];
			}
			return field === this.focusedField ? "" : "多个值";
		}
		return "";
	}

	setLineText(event: Event, field: string) {
		const value = (event.target as HTMLInputElement).value;
		this.selectedLines.forEach((e) => (e[field] = value));
	}

	updateTLine() {
		const lines = this.selectedLines;
		if (lines.length === 1) {
			const start = this.menu.cad.translatePoint(lines[0].start);
			const end = this.menu.cad.translatePoint(lines[0].end);
			this.tLine = {start, end};
		} else {
			this.tLine = null;
		}
	}
}
